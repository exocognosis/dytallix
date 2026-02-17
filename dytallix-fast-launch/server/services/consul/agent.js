import crypto from 'crypto';
import { CONFIG } from '../../config/environment.js';
import { logError, logInfo, logWarn } from '../../logger.js';
import { initializeKeys, signData, getPublicKeys } from '../aegis/crypto.js';
import {
    simulateProposalRisk,
    applyOraclePersona,
    computeQuorum,
    shouldFileDispute,
} from './model.js';

const CONSUL_CTX = 'dytallix-oracle';
const DEFAULT_INTERVAL_MS = Math.max(15_000, parseInt(process.env.CONSUL_POLL_INTERVAL_MS || '45000', 10));
const DEFAULT_MIN_QUORUM = Math.max(2, parseInt(process.env.CONSUL_MIN_QUORUM || '2', 10));

const parseOraclePeers = () => {
    const configured = (process.env.CONSUL_ORACLE_PEERS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

    if (configured.length > 0) return configured;

    const primary = process.env.CONSUL_ORACLE_ID || 'consul-primary';
    return [primary, 'consul-peer-1', 'consul-peer-2'];
};

const CONSUL_CONFIG = {
    enabled: process.env.CONSUL_AGENT_ENABLED !== 'false',
    pollIntervalMs: DEFAULT_INTERVAL_MS,
    minQuorum: DEFAULT_MIN_QUORUM,
    modelId: process.env.CONSUL_MODEL_ID || 'consul-governance-v1',
    relayerId: process.env.CONSUL_RELAYER_ID || 'consul-relayer',
    maxProposalsPerCycle: Math.max(1, parseInt(process.env.CONSUL_MAX_PROPOSALS_PER_CYCLE || '30', 10)),
    oraclePeers: parseOraclePeers(),
};

const consulState = {
    startedAt: null,
    lastRunAt: null,
    lastRunMs: null,
    lastError: null,
    running: false,
    runCount: 0,
    totalProposalsAnalyzed: 0,
    totalAttestationsPosted: 0,
    totalDisputesFiled: 0,
    recentRuns: [],
    latestProposals: [],
    latestAttestations: [],
    latestDisputes: [],
    lastQuorumByProposal: {},
    timer: null,
};

const remember = (list, value, max = 100) => {
    list.unshift(value);
    if (list.length > max) list.length = max;
};

const nodeRequest = async (path, options = {}) => {
    const endpoint = `${CONFIG.chain.blockchainNode}${path}`;
    const response = await fetch(endpoint, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(`NODE_${response.status}`);
        error.status = response.status;
        error.endpoint = endpoint;
        error.payload = payload;
        throw error;
    }
    return payload;
};

const buildCanonicalGovernancePayload = ({ proposalId, recommendation, scoreStr, modelId }) => {
    // Must match node runtime canonical verification format:
    // target_hash:score_str:model_id where target_hash = gov:{proposal_id}:{recommendation}
    return `gov:${proposalId}:${recommendation}:${scoreStr}:${modelId}`;
};

const fetchGovernanceProposals = async () => {
    const payload = await nodeRequest('/api/governance/proposals');
    return Array.isArray(payload?.proposals) ? payload.proposals : [];
};

const listOnChainAttestations = async ({ proposalId, limit = 200 } = {}) => {
    const query = new URLSearchParams();
    if (proposalId !== undefined && proposalId !== null) query.set('proposal_id', String(proposalId));
    query.set('limit', String(limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return nodeRequest(`/oracle/governance_attestations${suffix}`);
};

const listOnChainDisputes = async ({ proposalId, status, limit = 200 } = {}) => {
    const query = new URLSearchParams();
    if (proposalId !== undefined && proposalId !== null) query.set('proposal_id', String(proposalId));
    if (status) query.set('status', String(status));
    query.set('limit', String(limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return nodeRequest(`/oracle/governance_disputes${suffix}`);
};

const fetchQuorumSnapshot = async (proposalId) => {
    return nodeRequest(`/oracle/governance_quorum/${proposalId}?min_quorum=${CONSUL_CONFIG.minQuorum}`);
};

const postGovernanceAttestation = async (record) => {
    return nodeRequest('/oracle/governance_attestation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
    });
};

const postGovernanceDispute = async (record) => {
    return nodeRequest('/oracle/governance_dispute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
    });
};

const normalizeOpenProposal = (proposal) => {
    const status = String(proposal?.status || '');
    return status === 'DepositPeriod' || status === 'VotingPeriod';
};

const buildAttestationRecord = async ({ analysis, oracleId }) => {
    const scoreStr = analysis.scoreStr;
    const canonicalPayload = buildCanonicalGovernancePayload({
        proposalId: analysis.proposalId,
        recommendation: analysis.recommendation,
        scoreStr,
        modelId: CONSUL_CONFIG.modelId,
    });

    const signatureData = await signData(canonicalPayload, { context: CONSUL_CTX });
    const ttlSec = Math.max(60, parseInt(process.env.CONSUL_ATTESTATION_TTL_SEC || '600', 10));
    const issuedAt = Math.floor(Date.now() / 1000);

    return {
        proposal_id: analysis.proposalId,
        model_id: CONSUL_CONFIG.modelId,
        risk_score_0_1: analysis.riskScore01,
        score_str: scoreStr,
        recommendation: analysis.recommendation,
        expected_impact_bps: analysis.expectedImpactBps,
        downside_bps: analysis.downsideBps,
        upside_bps: analysis.upsideBps,
        rationale: analysis.recommendationReason,
        confidence: analysis.confidence01,
        signature_b64: signatureData.signature,
        oracle_pubkey_b64: signatureData.publicKey,
        expires_at: issuedAt + ttlSec,
        nonce: crypto.randomUUID(),
        source_oracle_id: oracleId,
        submitter: CONSUL_CONFIG.relayerId,
        attestation_version: 'dytallix-attestation-v2',
        ctx: CONSUL_CTX,
        issued_at: issuedAt,
        ttl_sec: ttlSec,
        kind: 'governance_risk',
    };
};

const ensureOpenDisputeMissing = (proposalId, disputes) => {
    const items = Array.isArray(disputes?.items) ? disputes.items : [];
    return !items.some(item => Number(item.proposal_id) === Number(proposalId) && String(item.status) === 'open');
};

export const runConsulCycle = async ({ manual = false } = {}) => {
    if (!CONSUL_CONFIG.enabled) {
        return {
            success: false,
            skipped: true,
            reason: 'CONSUL_AGENT_ENABLED=false',
        };
    }

    if (consulState.running) {
        return {
            success: false,
            skipped: true,
            reason: 'cycle_already_running',
        };
    }

    consulState.running = true;
    const startedAt = Date.now();
    const cycleSummary = {
        startedAt: new Date(startedAt).toISOString(),
        manual,
        analyzed: 0,
        attestationsPosted: 0,
        disputesFiled: 0,
        errors: [],
    };

    try {
        await initializeKeys();
        const proposals = await fetchGovernanceProposals();
        const openProposals = proposals.filter(normalizeOpenProposal).slice(0, CONSUL_CONFIG.maxProposalsPerCycle);

        for (const proposal of openProposals) {
            const baseAnalysis = simulateProposalRisk(proposal);
            cycleSummary.analyzed += 1;

            const attestationResults = [];
            for (let i = 0; i < CONSUL_CONFIG.oraclePeers.length; i += 1) {
                const oracleId = CONSUL_CONFIG.oraclePeers[i];
                const personaAnalysis = i === 0 ? baseAnalysis : applyOraclePersona(baseAnalysis, i);

                const payload = await buildAttestationRecord({
                    analysis: personaAnalysis,
                    oracleId,
                });

                try {
                    const posted = await postGovernanceAttestation(payload);
                    cycleSummary.attestationsPosted += 1;
                    attestationResults.push({
                        ...payload,
                        on_chain: posted,
                        posted_at: new Date().toISOString(),
                    });
                    remember(consulState.latestAttestations, {
                        proposal_id: payload.proposal_id,
                        oracle_id: payload.source_oracle_id,
                        recommendation: payload.recommendation,
                        risk_score: payload.risk_score_0_1,
                        confidence: payload.confidence,
                        posted_at: new Date().toISOString(),
                    }, 250);
                } catch (error) {
                    cycleSummary.errors.push({
                        proposal_id: baseAnalysis.proposalId,
                        oracle_id: oracleId,
                        stage: 'post_attestation',
                        error: error.message,
                    });
                    logWarn('Consul attestation post failed', {
                        proposal_id: baseAnalysis.proposalId,
                        oracle_id: oracleId,
                        error: error.message,
                    });
                }
            }

            let quorum = computeQuorum(attestationResults.map(item => ({
                oracle_id: item.source_oracle_id,
                recommendation: item.recommendation,
                risk_score: item.risk_score_0_1,
            })), CONSUL_CONFIG.minQuorum);

            try {
                const onChainQuorum = await fetchQuorumSnapshot(baseAnalysis.proposalId);
                quorum = {
                    ...quorum,
                    ...onChainQuorum,
                };
            } catch (error) {
                cycleSummary.errors.push({
                    proposal_id: baseAnalysis.proposalId,
                    stage: 'fetch_quorum',
                    error: error.message,
                });
            }

            consulState.lastQuorumByProposal[String(baseAnalysis.proposalId)] = quorum;

            let dispute = null;
            try {
                const existingDisputes = await listOnChainDisputes({
                    proposalId: baseAnalysis.proposalId,
                    status: 'open',
                    limit: 50,
                });

                if (
                    shouldFileDispute(quorum, attestationResults.map(item => ({
                        risk_score: item.risk_score_0_1,
                        oracle_id: item.source_oracle_id,
                        recommendation: item.recommendation,
                    }))) &&
                    ensureOpenDisputeMissing(baseAnalysis.proposalId, existingDisputes)
                ) {
                    dispute = await postGovernanceDispute({
                        proposal_id: baseAnalysis.proposalId,
                        filer_oracle_id: CONSUL_CONFIG.oraclePeers[0],
                        reason: 'Oracle recommendations diverge or risk spread exceeds tolerance; governance committee review required.',
                        severity: 'high',
                        status: 'open',
                        evidence: JSON.stringify({
                            quorum,
                            proposal_title: baseAnalysis.title,
                            cycle_started_at: cycleSummary.startedAt,
                        }),
                    });
                    cycleSummary.disputesFiled += 1;
                    remember(consulState.latestDisputes, {
                        proposal_id: baseAnalysis.proposalId,
                        dispute_id: dispute.dispute_id,
                        reason: 'Oracle recommendation divergence',
                        status: 'open',
                        created_at: new Date().toISOString(),
                    }, 150);
                }
            } catch (error) {
                cycleSummary.errors.push({
                    proposal_id: baseAnalysis.proposalId,
                    stage: 'dispute',
                    error: error.message,
                });
            }

            remember(consulState.latestProposals, {
                proposal_id: baseAnalysis.proposalId,
                title: baseAnalysis.title,
                status: baseAnalysis.status,
                recommendation: baseAnalysis.recommendation,
                recommendation_reason: baseAnalysis.recommendationReason,
                risk_score: baseAnalysis.riskScore01,
                confidence: baseAnalysis.confidence01,
                expected_impact_bps: baseAnalysis.expectedImpactBps,
                downside_bps: baseAnalysis.downsideBps,
                upside_bps: baseAnalysis.upsideBps,
                policy_key: baseAnalysis.policyKey,
                generated_at: baseAnalysis.generatedAt,
                quorum,
                dispute_opened: Boolean(dispute),
            }, 200);
        }

        const durationMs = Date.now() - startedAt;
        consulState.lastRunAt = new Date().toISOString();
        consulState.lastRunMs = durationMs;
        consulState.lastError = null;
        consulState.runCount += 1;
        consulState.totalProposalsAnalyzed += cycleSummary.analyzed;
        consulState.totalAttestationsPosted += cycleSummary.attestationsPosted;
        consulState.totalDisputesFiled += cycleSummary.disputesFiled;

        remember(consulState.recentRuns, {
            ...cycleSummary,
            durationMs,
            completedAt: new Date().toISOString(),
        }, 60);

        logInfo('Consul cycle completed', {
            analyzed: cycleSummary.analyzed,
            attestations_posted: cycleSummary.attestationsPosted,
            disputes_filed: cycleSummary.disputesFiled,
            duration_ms: durationMs,
            manual,
        });

        return {
            success: true,
            ...cycleSummary,
            durationMs,
        };
    } catch (error) {
        consulState.lastError = error.message;
        logError('Consul cycle failed', { error: error.message, stack: error.stack });
        return {
            success: false,
            error: error.message,
            ...cycleSummary,
        };
    } finally {
        consulState.running = false;
    }
};

export const startConsulAgent = () => {
    if (!CONSUL_CONFIG.enabled) {
        logWarn('Consul agent disabled by environment flag');
        return { started: false, reason: 'CONSUL_AGENT_ENABLED=false' };
    }

    if (consulState.timer) {
        return { started: true, alreadyRunning: true };
    }

    consulState.startedAt = new Date().toISOString();

    // Warm keys once on start for deterministic startup behavior.
    initializeKeys().catch((error) => {
        logWarn('Consul key warmup failed', { error: error.message });
    });

    consulState.timer = setInterval(() => {
        runConsulCycle({ manual: false }).catch((error) => {
            logError('Consul scheduled cycle error', { error: error.message });
        });
    }, CONSUL_CONFIG.pollIntervalMs);
    consulState.timer.unref?.();

    // Run first cycle immediately.
    runConsulCycle({ manual: false }).catch((error) => {
        logError('Consul initial cycle error', { error: error.message });
    });

    logInfo('Consul agent started', {
        poll_interval_ms: CONSUL_CONFIG.pollIntervalMs,
        oracle_peers: CONSUL_CONFIG.oraclePeers,
        min_quorum: CONSUL_CONFIG.minQuorum,
    });

    return { started: true };
};

export const stopConsulAgent = () => {
    if (consulState.timer) {
        clearInterval(consulState.timer);
        consulState.timer = null;
    }
    return { stopped: true };
};

export const getConsulSnapshot = async () => {
    let openDisputes = [];
    let onChainAttestations = [];
    try {
        const [disputes, attestations] = await Promise.all([
            listOnChainDisputes({ status: 'open', limit: 100 }),
            listOnChainAttestations({ limit: 100 }),
        ]);
        openDisputes = Array.isArray(disputes?.items) ? disputes.items : [];
        onChainAttestations = Array.isArray(attestations?.items) ? attestations.items : [];
    } catch (error) {
        // Non-fatal for dashboard responses.
    }

    return {
        success: true,
        agent: {
            started_at: consulState.startedAt,
            last_run_at: consulState.lastRunAt,
            last_run_ms: consulState.lastRunMs,
            running: consulState.running,
            run_count: consulState.runCount,
            last_error: consulState.lastError,
            config: CONSUL_CONFIG,
            public_keys: getPublicKeys(),
        },
        totals: {
            proposals_analyzed: consulState.totalProposalsAnalyzed,
            attestations_posted: consulState.totalAttestationsPosted,
            disputes_filed: consulState.totalDisputesFiled,
            open_disputes: openDisputes.length,
            on_chain_attestations: onChainAttestations.length,
        },
        recent_runs: consulState.recentRuns,
        latest_proposals: consulState.latestProposals,
        latest_attestations: consulState.latestAttestations,
        latest_disputes: consulState.latestDisputes,
        last_quorum_by_proposal: consulState.lastQuorumByProposal,
    };
};

export const fetchConsulProposals = async () => {
    const proposals = await fetchGovernanceProposals();
    return proposals
        .filter(normalizeOpenProposal)
        .slice(0, CONSUL_CONFIG.maxProposalsPerCycle)
        .map(proposal => {
            const base = simulateProposalRisk(proposal);
            const quorum = consulState.lastQuorumByProposal[String(base.proposalId)] || null;
            return {
                proposal_id: base.proposalId,
                title: base.title,
                status: base.status,
                recommendation: base.recommendation,
                recommendation_reason: base.recommendationReason,
                risk_score: base.riskScore01,
                confidence: base.confidence01,
                expected_impact_bps: base.expectedImpactBps,
                downside_bps: base.downsideBps,
                upside_bps: base.upsideBps,
                policy_key: base.policyKey,
                quorum,
                generated_at: base.generatedAt,
            };
        });
};

export const fileManualDispute = async (payload) => {
    const disputePayload = {
        proposal_id: Number(payload.proposal_id),
        filer_oracle_id: payload.filer_oracle_id || CONSUL_CONFIG.oraclePeers[0],
        against_oracle_id: payload.against_oracle_id || null,
        reason: payload.reason || 'Manual governance dispute submitted via dashboard',
        severity: payload.severity || 'medium',
        status: payload.status || 'open',
        evidence: payload.evidence || null,
    };

    const result = await postGovernanceDispute(disputePayload);
    consulState.totalDisputesFiled += 1;
    remember(consulState.latestDisputes, {
        proposal_id: disputePayload.proposal_id,
        dispute_id: result?.dispute_id,
        reason: disputePayload.reason,
        status: disputePayload.status,
        created_at: new Date().toISOString(),
        manual: true,
    }, 150);
    return result;
};

export const queryOnChainAttestations = listOnChainAttestations;
export const queryOnChainDisputes = listOnChainDisputes;
export const queryOnChainQuorum = fetchQuorumSnapshot;

export default {
    startConsulAgent,
    stopConsulAgent,
    runConsulCycle,
    getConsulSnapshot,
    fetchConsulProposals,
    fileManualDispute,
    queryOnChainAttestations,
    queryOnChainDisputes,
    queryOnChainQuorum,
};
