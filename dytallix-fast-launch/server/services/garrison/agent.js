import crypto from 'crypto';
import { CONFIG } from '../../config/environment.js';
import { logError, logInfo, logWarn } from '../../logger.js';

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).trim().toLowerCase());
};

const toPositiveInt = (value, fallback, min = 1) => {
    const parsed = parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < min) return fallback;
    return parsed;
};

const toUnitFloat = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(1, parsed));
};

const remember = (list, item, max) => {
    list.unshift(item);
    if (list.length > max) list.length = max;
};

const nowIso = () => new Date().toISOString();

const buildAiServiceUrl = () => {
    const raw = process.env.GARRISON_AI_SERVICE_URL
        || process.env.AI_RISK_URL
        || 'http://127.0.0.1:7001';
    return String(raw).replace(/\/$/, '');
};

const GARRISON_CONFIG = {
    enabled: parseBool(process.env.GARRISON_AGENT_ENABLED, true),
    aiServiceUrl: buildAiServiceUrl(),
    aiTimeoutMs: toPositiveInt(process.env.GARRISON_AI_TIMEOUT_MS, 10_000, 250),
    pollIntervalMs: Math.max(10_000, toPositiveInt(process.env.GARRISON_AGENT_INTERVAL_MS, 30_000, 1000)),
    maxJobsPerCycle: toPositiveInt(process.env.GARRISON_MAX_JOBS_PER_CYCLE, 8, 1),
    passThreshold: toUnitFloat(process.env.DYT_GARRISON_PASS_THRESHOLD, 0.9),
    autoRemediate: parseBool(process.env.GARRISON_AUTO_REMEDIATE, true),
    maxRetainedJobs: Math.max(100, toPositiveInt(process.env.GARRISON_MAX_RETAINED_JOBS, 400, 100)),
    maxRecentRuns: Math.max(25, toPositiveInt(process.env.GARRISON_MAX_RECENT_RUNS, 120, 10)),
};

const garrisonState = {
    startedAt: null,
    lastRunAt: null,
    lastRunMs: null,
    lastError: null,
    running: false,
    runCount: 0,
    timer: null,
    jobs: [],
    recentRuns: [],
    totals: {
        jobsQueued: 0,
        jobsProcessed: 0,
        jobsFailed: 0,
        auditCalls: 0,
        remediationCalls: 0,
        onChainSubmitted: 0,
        onChainFailed: 0,
    },
};

const trimRetainedJobs = () => {
    if (garrisonState.jobs.length <= GARRISON_CONFIG.maxRetainedJobs) return;

    const retained = [];
    for (const job of garrisonState.jobs) {
        if (retained.length < GARRISON_CONFIG.maxRetainedJobs) {
            retained.push(job);
        } else if (job.status !== 'queued' && job.status !== 'processing') {
            // Drop oldest terminal jobs first.
            continue;
        }
    }

    if (retained.length > GARRISON_CONFIG.maxRetainedJobs) {
        retained.length = GARRISON_CONFIG.maxRetainedJobs;
    }
    garrisonState.jobs = retained;
};

const buildJobSummary = (job) => ({
    id: job.id,
    status: job.status,
    source: job.source,
    created_at: job.created_at,
    updated_at: job.updated_at,
    completed_at: job.completed_at,
    contract_hash: job.contract_hash,
    error: job.error,
    attempts: job.attempts,
    audit_score: job.audit_result?.score ?? null,
    remediation_score: job.remediation_result?.re_audit?.score ?? null,
    onchain: {
        audit: job.audit_result?.onchain ?? null,
        remediation: job.remediation_result?.onchain ?? null,
    },
});

const extractOnChainCounters = (auditResult, remediationResult) => {
    const statuses = [auditResult?.onchain, remediationResult?.onchain].filter(Boolean);
    const attempted = statuses.filter(item => item?.attempted).length;
    const submitted = statuses.filter(item => item?.submitted).length;
    return {
        submitted,
        failed: Math.max(0, attempted - submitted),
    };
};

const createUpstreamError = (prefix, status, payload) => {
    const detail = payload?.detail || payload?.error || payload?.message || null;
    const error = new Error(detail ? `${prefix}: ${detail}` : prefix);
    error.status = status;
    error.payload = payload;
    return error;
};

const requestAiService = async (path, payload) => {
    const endpoint = `${GARRISON_CONFIG.aiServiceUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GARRISON_CONFIG.aiTimeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw createUpstreamError(`Garrison upstream ${path} failed`, response.status, body);
        }
        return body;
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Garrison upstream ${path} timed out`);
            timeoutError.status = 504;
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
};

const requestNode = async (path) => {
    const endpoint = `${CONFIG.chain.blockchainNode}${path}`;
    const response = await fetch(endpoint, {
        headers: { accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = createUpstreamError(`Node oracle query failed ${path}`, response.status, payload);
        err.endpoint = endpoint;
        throw err;
    }
    return payload;
};

const createJob = ({ contract_code, contract_hash = null, source = 'api', metadata = {} }) => {
    const ts = nowIso();
    return {
        id: crypto.randomUUID(),
        status: 'queued',
        source,
        created_at: ts,
        updated_at: ts,
        completed_at: null,
        contract_code: contract_code,
        contract_hash: contract_hash || null,
        metadata,
        error: null,
        attempts: 0,
        audit_result: null,
        remediation_result: null,
    };
};

export const runImmediateAudit = async ({ contract_code, contract_hash } = {}) => {
    if (!contract_code || !String(contract_code).trim()) {
        const err = new Error('contract_code is required');
        err.status = 400;
        throw err;
    }

    const payload = { contract_code: String(contract_code) };
    if (contract_hash) payload.contract_hash = String(contract_hash);

    const audit = await requestAiService('/audit', payload);
    garrisonState.totals.auditCalls += 1;
    const onChain = extractOnChainCounters(audit, null);
    garrisonState.totals.onChainSubmitted += onChain.submitted;
    garrisonState.totals.onChainFailed += onChain.failed;
    return audit;
};

export const runImmediateRemediation = async ({ contract_code, contract_hash } = {}) => {
    if (!contract_code || !String(contract_code).trim()) {
        const err = new Error('contract_code is required');
        err.status = 400;
        throw err;
    }

    const payload = { contract_code: String(contract_code) };
    if (contract_hash) payload.contract_hash = String(contract_hash);

    const remediation = await requestAiService('/audit/remediate', payload);
    garrisonState.totals.remediationCalls += 1;
    const onChain = extractOnChainCounters(null, remediation);
    garrisonState.totals.onChainSubmitted += onChain.submitted;
    garrisonState.totals.onChainFailed += onChain.failed;
    return remediation;
};

export const enqueueGarrisonJob = ({ contract_code, contract_hash, source = 'api', metadata = {} } = {}) => {
    if (!contract_code || !String(contract_code).trim()) {
        const err = new Error('contract_code is required');
        err.status = 400;
        throw err;
    }

    const job = createJob({
        contract_code: String(contract_code),
        contract_hash: contract_hash ? String(contract_hash) : null,
        source: String(source || 'api'),
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });

    garrisonState.jobs.unshift(job);
    garrisonState.totals.jobsQueued += 1;
    trimRetainedJobs();
    return buildJobSummary(job);
};

export const shouldRunRemediation = (auditScore, threshold = GARRISON_CONFIG.passThreshold) => {
    const score = Number(auditScore);
    if (!Number.isFinite(score)) return true;
    return score < threshold;
};

const runSingleJob = async (job) => {
    job.status = 'processing';
    job.updated_at = nowIso();
    job.attempts += 1;
    job.error = null;

    try {
        const auditPayload = {
            contract_code: job.contract_code,
            ...(job.contract_hash ? { contract_hash: job.contract_hash } : {}),
        };

        const audit = await requestAiService('/audit', auditPayload);
        garrisonState.totals.auditCalls += 1;
        job.audit_result = audit;
        if (!job.contract_hash && audit?.contract_hash) {
            job.contract_hash = String(audit.contract_hash);
        }

        if (GARRISON_CONFIG.autoRemediate && shouldRunRemediation(audit?.score)) {
            const remediationPayload = {
                contract_code: job.contract_code,
                ...(job.contract_hash ? { contract_hash: job.contract_hash } : {}),
            };
            const remediation = await requestAiService('/audit/remediate', remediationPayload);
            garrisonState.totals.remediationCalls += 1;
            job.remediation_result = remediation;
        }

        const onChain = extractOnChainCounters(job.audit_result, job.remediation_result);
        garrisonState.totals.onChainSubmitted += onChain.submitted;
        garrisonState.totals.onChainFailed += onChain.failed;

        job.status = 'completed';
        job.completed_at = nowIso();
        job.updated_at = job.completed_at;
        garrisonState.totals.jobsProcessed += 1;
        return buildJobSummary(job);
    } catch (error) {
        job.status = 'failed';
        job.updated_at = nowIso();
        job.completed_at = job.updated_at;
        job.error = error?.message || String(error);
        garrisonState.totals.jobsFailed += 1;
        return buildJobSummary(job);
    }
};

export const runGarrisonCycle = async ({ manual = false, maxJobs } = {}) => {
    if (!GARRISON_CONFIG.enabled) {
        return {
            success: false,
            skipped: true,
            reason: 'GARRISON_AGENT_ENABLED=false',
        };
    }

    if (garrisonState.running) {
        return {
            success: false,
            skipped: true,
            reason: 'cycle_already_running',
        };
    }

    garrisonState.running = true;
    const startedMs = Date.now();
    const startedAt = nowIso();
    const limit = Math.max(1, Math.min(50, Number(maxJobs) || GARRISON_CONFIG.maxJobsPerCycle));
    const queuedJobs = garrisonState.jobs
        .filter(job => job.status === 'queued')
        .slice(0, limit);

    const summary = {
        success: true,
        started_at: startedAt,
        manual,
        queued_before_cycle: garrisonState.jobs.filter(job => job.status === 'queued').length,
        processed: 0,
        failed: 0,
        onchain_submitted: 0,
        onchain_failed: 0,
        results: [],
    };

    try {
        for (const job of queuedJobs) {
            const result = await runSingleJob(job);
            summary.results.push(result);
            summary.processed += 1;

            const onchainSubmitted = Number(Boolean(result.onchain?.audit?.submitted))
                + Number(Boolean(result.onchain?.remediation?.submitted));
            const onchainAttempted = Number(Boolean(result.onchain?.audit?.attempted))
                + Number(Boolean(result.onchain?.remediation?.attempted));
            summary.onchain_submitted += onchainSubmitted;
            summary.onchain_failed += Math.max(0, onchainAttempted - onchainSubmitted);

            if (result.status === 'failed') summary.failed += 1;
        }
    } catch (error) {
        summary.success = false;
        summary.error = error?.message || String(error);
        garrisonState.lastError = summary.error;
        logError('Garrison cycle failed', { error: summary.error });
    } finally {
        const durationMs = Date.now() - startedMs;
        garrisonState.lastRunAt = nowIso();
        garrisonState.lastRunMs = durationMs;
        garrisonState.runCount += 1;
        garrisonState.running = false;
        remember(garrisonState.recentRuns, {
            ...summary,
            duration_ms: durationMs,
            finished_at: garrisonState.lastRunAt,
            queued_after_cycle: garrisonState.jobs.filter(job => job.status === 'queued').length,
        }, GARRISON_CONFIG.maxRecentRuns);
        trimRetainedJobs();
    }

    return summary;
};

export const listGarrisonJobs = ({ status, limit = 100 } = {}) => {
    const normalizedLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    const filtered = status
        ? garrisonState.jobs.filter(job => job.status === String(status))
        : garrisonState.jobs;
    return filtered.slice(0, normalizedLimit).map(buildJobSummary);
};

export const queryOnChainAuditAttestations = async ({ contractPrefix, limit = 100 } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', String(Math.max(1, Math.min(500, Number(limit) || 100))));
    if (contractPrefix) params.set('contract_prefix', String(contractPrefix));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return requestNode(`/oracle/audit_attestations${suffix}`);
};

export const queryOnChainAuditAttestation = async (contractHash) => {
    const normalized = String(contractHash || '').trim();
    if (!normalized) {
        const err = new Error('contract_hash is required');
        err.status = 400;
        throw err;
    }
    return requestNode(`/oracle/audit_attestation/${encodeURIComponent(normalized)}`);
};

export const getGarrisonSnapshot = async ({ includeOnChain = false } = {}) => {
    const snapshot = {
        success: true,
        config: {
            enabled: GARRISON_CONFIG.enabled,
            poll_interval_ms: GARRISON_CONFIG.pollIntervalMs,
            ai_service_url: GARRISON_CONFIG.aiServiceUrl,
            max_jobs_per_cycle: GARRISON_CONFIG.maxJobsPerCycle,
            pass_threshold: GARRISON_CONFIG.passThreshold,
            auto_remediate: GARRISON_CONFIG.autoRemediate,
        },
        agent: {
            running: garrisonState.running,
            started_at: garrisonState.startedAt,
            last_run_at: garrisonState.lastRunAt,
            last_run_ms: garrisonState.lastRunMs,
            run_count: garrisonState.runCount,
            last_error: garrisonState.lastError,
            queue_depth: garrisonState.jobs.filter(job => job.status === 'queued').length,
            processing: garrisonState.jobs.filter(job => job.status === 'processing').length,
        },
        totals: { ...garrisonState.totals },
        recent_runs: garrisonState.recentRuns.slice(0, 15),
        latest_jobs: garrisonState.jobs.slice(0, 20).map(buildJobSummary),
    };

    if (includeOnChain) {
        try {
            const payload = await queryOnChainAuditAttestations({ limit: 100 });
            const items = Array.isArray(payload?.items) ? payload.items : [];
            snapshot.on_chain = {
                available: true,
                count: Number(payload?.count ?? items.length ?? 0),
                latest: items.slice(0, 20),
            };
        } catch (error) {
            snapshot.on_chain = {
                available: false,
                error: error?.message || String(error),
            };
        }
    }

    return snapshot;
};

export const startGarrisonAgent = () => {
    if (!GARRISON_CONFIG.enabled) {
        logWarn('Garrison agent disabled by configuration');
        return;
    }

    if (garrisonState.timer) return;

    garrisonState.startedAt = nowIso();
    garrisonState.lastError = null;
    garrisonState.timer = setInterval(() => {
        runGarrisonCycle().catch((error) => {
            const message = error?.message || String(error);
            garrisonState.lastError = message;
            logError('Garrison interval cycle failed', { error: message });
        });
    }, GARRISON_CONFIG.pollIntervalMs);
    garrisonState.timer.unref?.();

    logInfo('Garrison agent started', {
        poll_interval_ms: GARRISON_CONFIG.pollIntervalMs,
        ai_service_url: GARRISON_CONFIG.aiServiceUrl,
        auto_remediate: GARRISON_CONFIG.autoRemediate,
        pass_threshold: GARRISON_CONFIG.passThreshold,
    });
};

export const stopGarrisonAgent = () => {
    if (!garrisonState.timer) return;
    clearInterval(garrisonState.timer);
    garrisonState.timer = null;
    garrisonState.running = false;
    logInfo('Garrison agent stopped');
};

export const __testResetGarrisonState = () => {
    stopGarrisonAgent();
    garrisonState.startedAt = null;
    garrisonState.lastRunAt = null;
    garrisonState.lastRunMs = null;
    garrisonState.lastError = null;
    garrisonState.running = false;
    garrisonState.runCount = 0;
    garrisonState.jobs = [];
    garrisonState.recentRuns = [];
    garrisonState.totals = {
        jobsQueued: 0,
        jobsProcessed: 0,
        jobsFailed: 0,
        auditCalls: 0,
        remediationCalls: 0,
        onChainSubmitted: 0,
        onChainFailed: 0,
    };
};

export const __testConfig = () => ({ ...GARRISON_CONFIG });

