import crypto from 'crypto';
import { getNodeBase } from '../blockchain-client.js';
import { signData, getPublicKeys } from '../aegis/crypto.js';
import { submitAiRiskBatch } from '../aegis/oracle-relayer.js';
import { applyThrottle } from '../aegis/throttle.js';
import { logError, logInfo, logWarn } from '../../logger.js';
import {
    getHorizonNotificationConfig,
    notifyHorizonIncident,
} from './notifications.js';
import {
    closeHorizonDatabase,
    getHorizonStats,
    getLatestTelemetrySnapshot,
    getOpenIncidentByFingerprint,
    getRecentTelemetrySnapshots,
    listCircuitBreakerActions,
    listExpiredActiveBreakers,
    listIncidents,
    resolveIncident,
    saveCircuitBreakerAction,
    saveIncident,
    saveTelemetrySnapshot,
    updateCircuitBreakerAction,
    updateIncidentAttestation,
} from './database.js';

const HORIZON_CTX = process.env.HORIZON_ATTESTATION_CTX || 'dytallix-oracle';
const HORIZON_ATTESTATION_VERSION = 'dytallix-attestation-v2';
const HORIZON_ATTESTATION_KIND = 'horizon_incident';

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on', 'y'].includes(String(value).trim().toLowerCase());
};

const toPositiveInt = (value, fallback, min = 1) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed < min) return fallback;
    return parsed;
};

const toRatio = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
};

const clamp01 = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(1, parsed));
};

const formatScore = (score) => {
    const value = clamp01(score);
    const fixed = value.toFixed(6);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return trimmed.includes('.') ? trimmed : `${trimmed}.0`;
};

const nowIso = () => new Date().toISOString();

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const toBigInt = (value) => {
    try {
        if (typeof value === 'bigint') return value >= 0n ? value : 0n;
        if (typeof value === 'number') {
            if (!Number.isFinite(value) || value <= 0) return 0n;
            return BigInt(Math.floor(value));
        }
        if (typeof value === 'string') {
            const raw = value.trim();
            if (!raw) return 0n;
            if (/^-?\d+$/.test(raw)) {
                const parsed = BigInt(raw);
                return parsed >= 0n ? parsed : 0n;
            }
            const numeric = Number(raw);
            if (!Number.isFinite(numeric) || numeric <= 0) return 0n;
            return BigInt(Math.floor(numeric));
        }
    } catch {
        return 0n;
    }
    return 0n;
};

const bigIntDeltaRatio = (prev, curr) => {
    if (prev <= 0n) return 0;
    const delta = prev > curr ? prev - curr : curr - prev;
    return Number((delta * 10_000n) / prev) / 10_000;
};

const severityOrder = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
};

const shouldReplaceCandidate = (existing, next) => {
    const existingSeverity = severityOrder[existing.severity] || 0;
    const nextSeverity = severityOrder[next.severity] || 0;
    if (nextSeverity > existingSeverity) return true;
    if (nextSeverity < existingSeverity) return false;
    return Number(next.risk_score || 0) > Number(existing.risk_score || 0);
};

const HORIZON_CONFIG = {
    enabled: parseBool(process.env.HORIZON_AGENT_ENABLED, true),
    pollIntervalMs: Math.max(10_000, toPositiveInt(process.env.HORIZON_POLL_INTERVAL_MS, 30_000, 1_000)),
    onChainRelayEnabled: parseBool(process.env.HORIZON_ONCHAIN_RELAY_ENABLED, true),
    attestationTtlSec: Math.max(60, toPositiveInt(process.env.HORIZON_ATTESTATION_TTL_SEC, 900, 60)),
    modelId: process.env.HORIZON_MODEL_ID || 'horizon-monitor-v1',
    oracleId: process.env.HORIZON_ORACLE_ID || 'horizon-primary',
    relayerId: process.env.HORIZON_RELAYER_ID || 'horizon-relayer',
    minBridgeValidators: Math.max(2, toPositiveInt(process.env.HORIZON_BRIDGE_MIN_VALIDATORS, 3, 2)),
    bridgePendingThreshold: Math.max(1, toPositiveInt(process.env.HORIZON_BRIDGE_PENDING_THRESHOLD, 25, 1)),
    bridgeCustodySpikePct: toRatio(process.env.HORIZON_BRIDGE_CUSTODY_SPIKE_PCT, 0.30),
    poolDrainThresholdPct: toRatio(process.env.HORIZON_POOL_DRAIN_THRESHOLD_PCT, 0.20),
    mempoolHighWatermark: Math.max(10, toPositiveInt(process.env.HORIZON_MEMPOOL_HIGH_WATERMARK, 250, 10)),
    mempoolConcentrationThreshold: toRatio(process.env.HORIZON_MEMPOOL_CONCENTRATION_THRESHOLD, 0.35),
    mempoolConcentrationMinCount: Math.max(5, toPositiveInt(process.env.HORIZON_MEMPOOL_CONCENTRATION_MIN_COUNT, 12, 5)),
    autoBridgeHalt: parseBool(process.env.HORIZON_AUTO_BRIDGE_HALT, true),
    autoBridgeResume: parseBool(process.env.HORIZON_AUTO_BRIDGE_RESUME, true),
    bridgeHaltTtlSec: Math.max(60, toPositiveInt(process.env.HORIZON_BRIDGE_HALT_TTL_SEC, 900, 60)),
    autoWalletThrottle: parseBool(process.env.HORIZON_AUTO_WALLET_THROTTLE, true),
    autoGovProposal: parseBool(process.env.HORIZON_AUTO_GOVERNANCE_PROPOSAL, true),
    govProposalCooldownSec: Math.max(300, toPositiveInt(process.env.HORIZON_GOV_PROPOSAL_COOLDOWN_SEC, 21_600, 60)),
    govMaxGasReductionPct: toRatio(process.env.HORIZON_GOV_MAX_GAS_REDUCTION_PCT, 0.20),
    govGasLimitReductionPct: toRatio(process.env.HORIZON_GOV_GAS_LIMIT_REDUCTION_PCT, 0.25),
};

const horizonState = {
    startedAt: null,
    lastRunAt: null,
    lastRunMs: null,
    lastError: null,
    running: false,
    runCount: 0,
    timer: null,
    totals: {
        snapshotsIndexed: 0,
        incidentsDetected: 0,
        attestationsSigned: 0,
        attestationsRelayed: 0,
        circuitActionsExecuted: 0,
        circuitActionsFailed: 0,
        notificationChannelsSent: 0,
        notificationChannelsFailed: 0,
    },
    recentRuns: [],
    latestIncidents: [],
    latestCircuitActions: [],
    recentGovernanceActions: new Map(),
};

const remember = (list, item, max = 100) => {
    list.unshift(item);
    if (list.length > max) list.length = max;
};

const generateId = (prefix) => `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

const parseNumericMap = (value) => {
    if (!value || typeof value !== 'object') return {};
    const out = {};
    for (const [key, item] of Object.entries(value)) {
        out[key] = String(item ?? '0');
    }
    return out;
};

const mapTopSender = (pendingTransactions) => {
    const counts = new Map();
    for (const tx of pendingTransactions) {
        const sender = String(tx?.from || '').trim();
        if (!sender) continue;
        counts.set(sender, (counts.get(sender) || 0) + 1);
    }

    let topSender = null;
    let topCount = 0;
    for (const [sender, count] of counts.entries()) {
        if (count > topCount) {
            topSender = sender;
            topCount = count;
        }
    }

    return {
        topSender,
        topCount,
        senderCounts: counts,
    };
};

const makeNodeRequest = async (path, options = {}) => {
    const endpoint = `${getNodeBase()}${path}`;
    const requestOptions = {
        method: options.method || 'GET',
        headers: {
            accept: 'application/json',
            ...(options.body ? { 'content-type': 'application/json' } : {}),
            ...(options.headers || {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    const response = await fetch(endpoint, requestOptions);
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

const fetchTelemetrySnapshot = async () => {
    const [bridgeResult, pendingResult, statsResult, govConfigResult] = await Promise.allSettled([
        makeNodeRequest('/bridge/state'),
        makeNodeRequest('/transactions/pending'),
        makeNodeRequest('/stats'),
        makeNodeRequest('/gov/config'),
    ]);

    if (statsResult.status !== 'fulfilled') {
        throw statsResult.reason;
    }

    const bridgePayload = bridgeResult.status === 'fulfilled' ? bridgeResult.value : {};
    const pendingPayload = pendingResult.status === 'fulfilled' ? pendingResult.value : {};
    const statsPayload = statsResult.value || {};
    const govConfigPayload = govConfigResult.status === 'fulfilled' ? govConfigResult.value : {};

    const pendingTransactions = Array.isArray(pendingPayload?.pending_transactions)
        ? pendingPayload.pending_transactions
        : [];
    const mempoolCount = Number(pendingPayload?.count ?? statsPayload?.mempool_size ?? pendingTransactions.length ?? 0) || 0;

    const { topSender, topCount } = mapTopSender(pendingTransactions);
    const topSenderShare = mempoolCount > 0 ? topCount / mempoolCount : 0;

    const bridgeCustody = parseNumericMap(bridgePayload?.custody);
    const bridgeCustodyTotal = Object.values(bridgeCustody)
        .map(toBigInt)
        .reduce((acc, value) => acc + value, 0n)
        .toString();

    const emissionPools = parseNumericMap(statsPayload?.emission_pools);
    const governanceConfig = govConfigPayload && typeof govConfigPayload === 'object'
        ? govConfigPayload
        : {};

    const normalized = {
        bridge: {
            halted: Boolean(bridgePayload?.halted),
            pending_count: Array.isArray(bridgePayload?.pending) ? bridgePayload.pending.length : Number(bridgePayload?.pending_count || 0),
            validator_count: Array.isArray(bridgePayload?.validators) ? bridgePayload.validators.length : Number(bridgePayload?.validator_count || 0),
            custody: bridgeCustody,
            custody_total: bridgeCustodyTotal,
        },
        mempool: {
            count: mempoolCount,
            top_sender: topSender,
            top_sender_count: topCount,
            top_sender_share: topSenderShare,
        },
        pools: emissionPools,
        governance: {
            gas_limit: Number(governanceConfig?.gas_limit || 0) || null,
            max_gas_per_block: Number(governanceConfig?.max_gas_per_block || 0) || null,
        },
    };

    const snapshotHash = sha256(JSON.stringify(normalized));
    return {
        snapshot_hash: snapshotHash,
        bridge_halted: normalized.bridge.halted,
        bridge_pending_count: normalized.bridge.pending_count,
        bridge_validator_count: normalized.bridge.validator_count,
        bridge_custody_total: normalized.bridge.custody_total,
        mempool_count: normalized.mempool.count,
        mempool_top_sender: normalized.mempool.top_sender,
        mempool_top_sender_share: normalized.mempool.top_sender_share,
        emission_pools: normalized.pools,
        governance: normalized.governance,
        raw_payload: {
            bridge: bridgePayload,
            pending: pendingPayload,
            stats: statsPayload,
            governance: governanceConfig,
            telemetry: normalized,
        },
        collected_at: nowIso(),
    };
};

const makeIncidentCandidate = ({
    incident_type,
    severity,
    risk_score,
    confidence,
    summary,
    details,
    fingerprint_key,
    subject_address = null,
}) => ({
    incident_type,
    severity,
    risk_score: clamp01(risk_score),
    confidence: clamp01(confidence),
    summary,
    details: details || {},
    fingerprint_key: fingerprint_key || 'global',
    subject_address,
});

const buildIncidentFingerprint = (candidate) => {
    const incidentType = String(candidate?.incident_type || 'unknown');
    const key = String(candidate?.fingerprint_key || 'global');
    return sha256(`${incidentType}:${key}`);
};

const detectBridgeIncidents = (snapshot, previousSnapshot) => {
    const incidents = [];
    const bridge = snapshot?.raw_payload?.telemetry?.bridge || {};
    const previousBridge = previousSnapshot?.raw_payload?.telemetry?.bridge || null;

    if (bridge.halted) {
        incidents.push(makeIncidentCandidate({
            incident_type: 'bridge_halted',
            severity: 'critical',
            risk_score: 0.98,
            confidence: 0.97,
            summary: 'Bridge is currently halted and requires governance review for recovery.',
            details: {
                halted: true,
                pending_count: bridge.pending_count || 0,
                validator_count: bridge.validator_count || 0,
            },
            fingerprint_key: 'halted',
        }));
    }

    if (Number(bridge.pending_count || 0) >= HORIZON_CONFIG.bridgePendingThreshold) {
        const ratio = Number(bridge.pending_count || 0) / HORIZON_CONFIG.bridgePendingThreshold;
        incidents.push(makeIncidentCandidate({
            incident_type: 'bridge_backlog',
            severity: ratio >= 2 ? 'critical' : 'high',
            risk_score: Math.min(0.98, 0.70 + Math.min(0.24, (ratio - 1) * 0.14)),
            confidence: Math.min(0.95, 0.70 + Math.min(0.20, ratio * 0.05)),
            summary: `Bridge backlog exceeded threshold (${bridge.pending_count}/${HORIZON_CONFIG.bridgePendingThreshold}).`,
            details: {
                pending_count: Number(bridge.pending_count || 0),
                threshold: HORIZON_CONFIG.bridgePendingThreshold,
                ratio: Number(ratio.toFixed(3)),
            },
            fingerprint_key: 'backlog',
        }));
    }

    if (bridge.validator_count > 0 && bridge.validator_count < HORIZON_CONFIG.minBridgeValidators) {
        const severity = bridge.validator_count <= 1 ? 'critical' : 'high';
        incidents.push(makeIncidentCandidate({
            incident_type: 'bridge_validator_quorum_low',
            severity,
            risk_score: severity === 'critical' ? 0.95 : 0.82,
            confidence: 0.9,
            summary: `Bridge validator quorum is below policy minimum (${bridge.validator_count}/${HORIZON_CONFIG.minBridgeValidators}).`,
            details: {
                validator_count: bridge.validator_count,
                min_validators: HORIZON_CONFIG.minBridgeValidators,
            },
            fingerprint_key: 'validator_quorum',
        }));
    }

    if (previousBridge && previousBridge.custody_total) {
        const prev = toBigInt(previousBridge.custody_total);
        const current = toBigInt(bridge.custody_total);
        if (prev > 0n && current > prev) {
            const changeRatio = bigIntDeltaRatio(prev, current);
            if (changeRatio >= HORIZON_CONFIG.bridgeCustodySpikePct) {
                incidents.push(makeIncidentCandidate({
                    incident_type: 'bridge_custody_surge',
                    severity: changeRatio >= HORIZON_CONFIG.bridgeCustodySpikePct * 2 ? 'critical' : 'high',
                    risk_score: Math.min(0.96, 0.68 + Math.min(0.26, changeRatio)),
                    confidence: 0.83,
                    summary: `Bridge custody surged ${(changeRatio * 100).toFixed(1)}% within one Horizon interval.`,
                    details: {
                        previous_total: prev.toString(),
                        current_total: current.toString(),
                        change_pct: Number((changeRatio * 100).toFixed(2)),
                    },
                    fingerprint_key: 'custody_surge',
                }));
            }
        }
    }

    return incidents;
};

const detectPoolIncidents = (snapshot, previousSnapshot) => {
    const incidents = [];
    if (!previousSnapshot?.emission_pools) return incidents;

    const pools = snapshot?.emission_pools || {};
    const previousPools = previousSnapshot?.emission_pools || {};
    const poolNames = new Set([...Object.keys(previousPools), ...Object.keys(pools)]);

    for (const poolName of poolNames) {
        const prev = toBigInt(previousPools[poolName]);
        const current = toBigInt(pools[poolName]);
        if (prev <= 0n || current >= prev) continue;

        const drainRatio = bigIntDeltaRatio(prev, current);
        if (drainRatio < HORIZON_CONFIG.poolDrainThresholdPct) continue;

        const severity = drainRatio >= HORIZON_CONFIG.poolDrainThresholdPct * 2 ? 'critical' : 'high';
        incidents.push(makeIncidentCandidate({
            incident_type: 'pool_drain',
            severity,
            risk_score: Math.min(0.97, 0.72 + Math.min(0.20, drainRatio)),
            confidence: 0.88,
            summary: `Emission pool ${poolName} drained ${(drainRatio * 100).toFixed(1)}% in one interval.`,
            details: {
                pool: poolName,
                previous_balance: prev.toString(),
                current_balance: current.toString(),
                drain_pct: Number((drainRatio * 100).toFixed(2)),
            },
            fingerprint_key: poolName,
        }));
    }

    return incidents;
};

const detectMempoolIncidents = (snapshot, previousSnapshot) => {
    const incidents = [];
    const mempool = snapshot?.raw_payload?.telemetry?.mempool || {};
    const previousMempool = previousSnapshot?.raw_payload?.telemetry?.mempool || null;
    const count = Number(mempool.count || 0);

    if (count >= HORIZON_CONFIG.mempoolHighWatermark) {
        const ratio = count / HORIZON_CONFIG.mempoolHighWatermark;
        incidents.push(makeIncidentCandidate({
            incident_type: 'mempool_spike',
            severity: ratio >= 2 ? 'critical' : 'high',
            risk_score: Math.min(0.99, 0.74 + Math.min(0.22, (ratio - 1) * 0.13)),
            confidence: 0.89,
            summary: `Mempool load spiked to ${count} pending transactions.`,
            details: {
                pending_count: count,
                threshold: HORIZON_CONFIG.mempoolHighWatermark,
                ratio: Number(ratio.toFixed(3)),
                previous_count: Number(previousMempool?.count || 0),
            },
            fingerprint_key: 'size',
        }));
    }

    const share = Number(mempool.top_sender_share || 0);
    const sender = String(mempool.top_sender || '').trim();
    const senderCount = Number(mempool.top_sender_count || 0);
    if (
        sender
        && senderCount >= HORIZON_CONFIG.mempoolConcentrationMinCount
        && share >= HORIZON_CONFIG.mempoolConcentrationThreshold
    ) {
        const severity = share >= Math.max(0.6, HORIZON_CONFIG.mempoolConcentrationThreshold + 0.15)
            ? 'critical'
            : 'high';
        incidents.push(makeIncidentCandidate({
            incident_type: 'mempool_concentration',
            severity,
            risk_score: Math.min(0.98, 0.72 + Math.min(0.22, share)),
            confidence: 0.91,
            summary: `Mempool concentration detected: ${sender} controls ${(share * 100).toFixed(1)}% of pending flow.`,
            details: {
                top_sender: sender,
                top_sender_count: senderCount,
                top_sender_share: Number((share * 100).toFixed(2)),
                threshold_pct: Number((HORIZON_CONFIG.mempoolConcentrationThreshold * 100).toFixed(2)),
                pending_count: count,
            },
            fingerprint_key: sender,
            subject_address: sender,
        }));
    }

    return incidents;
};

const collapseCandidates = (candidates) => {
    const byFingerprint = new Map();
    for (const candidate of candidates) {
        const fingerprint = buildIncidentFingerprint(candidate);
        const withFingerprint = {
            ...candidate,
            fingerprint,
        };
        const existing = byFingerprint.get(fingerprint);
        if (!existing || shouldReplaceCandidate(existing, withFingerprint)) {
            byFingerprint.set(fingerprint, withFingerprint);
        }
    }
    return Array.from(byFingerprint.values());
};

const buildIncidentRecord = (candidate, snapshotHash) => {
    const incidentId = generateId('hzn');
    const fingerprint = candidate.fingerprint || buildIncidentFingerprint(candidate);
    const incidentHash = sha256(`${fingerprint}:${incidentId}:${Date.now()}`);
    return {
        incident_id: incidentId,
        fingerprint,
        incident_hash: incidentHash,
        incident_type: candidate.incident_type,
        severity: candidate.severity,
        risk_score: clamp01(candidate.risk_score),
        confidence: clamp01(candidate.confidence),
        summary: candidate.summary,
        details: {
            ...(candidate.details || {}),
            subject_address: candidate.subject_address || null,
        },
        source_snapshot_hash: snapshotHash,
        status: 'open',
    };
};

const signAndRelayIncident = async (incident) => {
    const riskScore = clamp01(incident.risk_score);
    const scoreStr = formatScore(riskScore);
    const txHash = `0x${incident.incident_hash}`;
    const issuedAt = Math.floor(Date.now() / 1000);
    const nonce = `${incident.incident_id}:${issuedAt}`;
    const canonicalPayload = `${txHash}:${scoreStr}:${HORIZON_CONFIG.modelId}:${issuedAt}:${nonce}`;

    const signatureData = await signData(canonicalPayload, { context: HORIZON_CTX });
    const expiresAt = issuedAt + HORIZON_CONFIG.attestationTtlSec;

    const attestation = {
        tx_hash: txHash,
        model_id: HORIZON_CONFIG.modelId,
        risk_score_0_1: riskScore,
        score_str: scoreStr,
        confidence: clamp01(incident.confidence),
        signature_b64: signatureData.signature,
        oracle_pubkey_b64: signatureData.publicKey,
        expires_at: expiresAt,
        nonce,
        source_oracle_id: HORIZON_CONFIG.oracleId,
        submitter: HORIZON_CONFIG.relayerId,
        attestation_version: HORIZON_ATTESTATION_VERSION,
        ctx: HORIZON_CTX,
        issued_at: issuedAt,
        ttl_sec: HORIZON_CONFIG.attestationTtlSec,
        kind: HORIZON_ATTESTATION_KIND,
        from_address: incident.details?.subject_address || null,
        payload: {
            kind: HORIZON_ATTESTATION_KIND,
            target: `incident:${incident.incident_id}`,
            tx_hash: txHash,
            model_id: HORIZON_CONFIG.modelId,
            score_str: scoreStr,
            issued_at: issuedAt,
            nonce,
        },
    };

    let relay = {
        success: false,
        skipped: true,
        reason: 'HORIZON_ONCHAIN_RELAY_ENABLED=false',
    };

    if (HORIZON_CONFIG.onChainRelayEnabled) {
        relay = await submitAiRiskBatch([attestation]);
    }

    return {
        canonical_payload: canonicalPayload,
        signature: signatureData.signature,
        oracle_pubkey: signatureData.publicKey,
        attestation,
        relay,
        on_chain_status: relay.success ? 'submitted' : (relay.skipped ? 'skipped' : 'failed'),
    };
};

const rememberGovernanceAction = (key) => {
    horizonState.recentGovernanceActions.set(key, Date.now());
};

const governanceActionRecentlySubmitted = (key) => {
    const previous = horizonState.recentGovernanceActions.get(key);
    if (!previous) return false;
    return Date.now() - previous < HORIZON_CONFIG.govProposalCooldownSec * 1000;
};

const buildGovernanceShift = (incident, snapshot, attestation) => {
    if (incident.incident_type === 'pool_drain') {
        const current = Number(snapshot?.governance?.max_gas_per_block || 0) || 50_000_000;
        const reduction = Math.min(0.75, Math.max(0.05, HORIZON_CONFIG.govMaxGasReductionPct));
        const nextValue = Math.max(1_000_000, Math.floor(current * (1 - reduction)));
        return {
            key: 'consensus.max_gas_per_block',
            value: String(nextValue),
            title: `[Horizon] Throttle block gas due to pool drain (${incident.incident_id})`,
            description: [
                `Horizon incident ${incident.incident_id} (${incident.incident_type}) detected high-confidence pool depletion dynamics.`,
                `Attestation hash target: ${attestation?.attestation?.tx_hash || 'unavailable'}.`,
                `Proposal recommends temporary reduction of consensus.max_gas_per_block to ${nextValue} while incident triage runs.`,
            ].join(' '),
        };
    }

    const currentGasLimit = Number(snapshot?.governance?.gas_limit || 0) || 2_000;
    const reduction = Math.min(0.75, Math.max(0.05, HORIZON_CONFIG.govGasLimitReductionPct));
    const nextGasLimit = Math.max(1_000, Math.floor(currentGasLimit * (1 - reduction)));

    return {
        key: 'gas_limit',
        value: String(nextGasLimit),
        title: `[Horizon] Temporary gas-limit throttle (${incident.incident_id})`,
        description: [
            `Horizon incident ${incident.incident_id} (${incident.incident_type}) indicates elevated execution risk.`,
            `Attestation hash target: ${attestation?.attestation?.tx_hash || 'unavailable'}.`,
            `Proposal recommends temporary reduction of gas_limit to ${nextGasLimit} under governance policy.`,
        ].join(' '),
    };
};

const executeCircuitBreakersForIncident = async (incident, snapshot, attestationResult) => {
    const actions = [];
    const isSevere = incident.severity === 'critical' || incident.severity === 'high';

    if (
        HORIZON_CONFIG.autoBridgeHalt
        && isSevere
        && ['bridge_halted', 'bridge_backlog', 'bridge_validator_quorum_low', 'bridge_custody_surge'].includes(incident.incident_type)
    ) {
        const actionId = generateId('hzn-brk');
        const baseAction = {
            action_id: actionId,
            incident_id: incident.incident_id,
            fingerprint: incident.fingerprint,
            action_type: 'BRIDGE_HALT',
            scope: 'bridge',
            severity: incident.severity,
            reason: incident.summary,
            ttl_seconds: HORIZON_CONFIG.bridgeHaltTtlSec,
            action_payload: {
                action: 'halt',
                incident_type: incident.incident_type,
            },
        };

        try {
            let result = { halted: true, skipped: true, reason: 'already_halted' };
            if (!snapshot.bridge_halted) {
                result = await makeNodeRequest('/bridge/halt', {
                    method: 'POST',
                    body: { action: 'halt' },
                });
            }

            const expiresAt = new Date(Date.now() + HORIZON_CONFIG.bridgeHaltTtlSec * 1000).toISOString();
            const status = result?.halted === true ? 'active' : 'failed';
            const persisted = {
                ...baseAction,
                status,
                expires_at: status === 'active' ? expiresAt : null,
                action_result: result,
            };
            saveCircuitBreakerAction(persisted);
            actions.push(normalizeActionForState(persisted));
            if (status === 'active') horizonState.totals.circuitActionsExecuted += 1;
            else horizonState.totals.circuitActionsFailed += 1;
        } catch (error) {
            const persisted = {
                ...baseAction,
                status: 'failed',
                action_result: {
                    error: error.message,
                    status: error.status || null,
                },
            };
            saveCircuitBreakerAction(persisted);
            actions.push(normalizeActionForState(persisted));
            horizonState.totals.circuitActionsFailed += 1;
        }
    }

    if (
        HORIZON_CONFIG.autoWalletThrottle
        && isSevere
        && incident.incident_type === 'mempool_concentration'
        && incident.details?.subject_address
    ) {
        const actionId = generateId('hzn-thr');
        const target = String(incident.details.subject_address);
        const riskScore100 = Math.round(clamp01(incident.risk_score) * 100);
        const action = {
            action_id: actionId,
            incident_id: incident.incident_id,
            fingerprint: incident.fingerprint,
            action_type: 'WALLET_THROTTLE',
            scope: target,
            severity: incident.severity,
            reason: incident.summary,
            status: 'executed',
            action_payload: {
                address: target,
                risk_score: riskScore100,
            },
            action_result: applyThrottle(target, riskScore100),
        };
        saveCircuitBreakerAction(action);
        actions.push(normalizeActionForState(action));
        horizonState.totals.circuitActionsExecuted += 1;
    }

    if (HORIZON_CONFIG.autoGovProposal && isSevere) {
        const proposal = buildGovernanceShift(incident, snapshot, attestationResult);
        const dedupeKey = `${proposal.key}:${incident.incident_type}`;

        if (!governanceActionRecentlySubmitted(dedupeKey)) {
            const actionId = generateId('hzn-gov');
            const baseAction = {
                action_id: actionId,
                incident_id: incident.incident_id,
                fingerprint: incident.fingerprint,
                action_type: 'GOVERNANCE_PARAMETER_SHIFT',
                scope: proposal.key,
                severity: incident.severity,
                reason: incident.summary,
                action_payload: proposal,
            };

            try {
                const result = await makeNodeRequest('/gov/submit', {
                    method: 'POST',
                    body: proposal,
                });
                const status = result?.proposal_id ? 'executed' : 'failed';
                const persisted = {
                    ...baseAction,
                    status,
                    action_result: result,
                };
                saveCircuitBreakerAction(persisted);
                actions.push(normalizeActionForState(persisted));
                rememberGovernanceAction(dedupeKey);
                if (status === 'executed') horizonState.totals.circuitActionsExecuted += 1;
                else horizonState.totals.circuitActionsFailed += 1;
            } catch (error) {
                const persisted = {
                    ...baseAction,
                    status: 'failed',
                    action_result: {
                        error: error.message,
                        status: error.status || null,
                    },
                };
                saveCircuitBreakerAction(persisted);
                actions.push(normalizeActionForState(persisted));
                horizonState.totals.circuitActionsFailed += 1;
            }
        }
    }

    return actions;
};

const normalizeActionForState = (action) => ({
    action_id: action.action_id,
    incident_id: action.incident_id || null,
    action_type: action.action_type,
    scope: action.scope || null,
    status: action.status,
    severity: action.severity || null,
    reason: action.reason || null,
    expires_at: action.expires_at || null,
    created_at: action.created_at || nowIso(),
    action_payload: action.action_payload || {},
    action_result: action.action_result || null,
});

const processExpiredBridgeHalts = async (snapshot) => {
    if (!HORIZON_CONFIG.autoBridgeResume) return [];
    const expired = listExpiredActiveBreakers().filter((item) => item.action_type === 'BRIDGE_HALT');
    if (expired.length === 0) return [];

    const openBridgeIncidents = listIncidents({ status: 'open', limit: 200 })
        .filter((incident) => String(incident.incident_type || '').startsWith('bridge_'));

    const actions = [];
    for (const breaker of expired) {
        if (openBridgeIncidents.length > 0) {
            const nextExpiry = new Date(Date.now() + HORIZON_CONFIG.bridgeHaltTtlSec * 1000).toISOString();
            updateCircuitBreakerAction(breaker.action_id, {
                status: 'active',
                expires_at: nextExpiry,
                action_result: {
                    deferred: true,
                    reason: 'open_bridge_incidents',
                    open_incidents: openBridgeIncidents.length,
                },
            });
            continue;
        }

        if (!snapshot.bridge_halted) {
            updateCircuitBreakerAction(breaker.action_id, {
                status: 'resolved',
                resolved_at: nowIso(),
                action_result: {
                    resumed: true,
                    skipped: true,
                    reason: 'already_resumed',
                },
            });
            continue;
        }

        const actionId = generateId('hzn-resume');
        const action = {
            action_id: actionId,
            incident_id: breaker.incident_id || null,
            fingerprint: breaker.fingerprint || null,
            action_type: 'BRIDGE_RESUME',
            scope: 'bridge',
            severity: 'medium',
            reason: 'Bridge halt TTL elapsed with no active bridge incidents.',
            action_payload: {
                action: 'resume',
                source_action_id: breaker.action_id,
            },
        };

        try {
            const result = await makeNodeRequest('/bridge/halt', {
                method: 'POST',
                body: { action: 'resume' },
            });

            const status = result?.halted === false ? 'executed' : 'failed';
            const persisted = {
                ...action,
                status,
                action_result: result,
            };
            saveCircuitBreakerAction(persisted);
            actions.push(normalizeActionForState(persisted));

            if (status === 'executed') {
                updateCircuitBreakerAction(breaker.action_id, {
                    status: 'resolved',
                    resolved_at: nowIso(),
                    action_result: {
                        resumed_by: actionId,
                        resumed_at: nowIso(),
                    },
                });
                horizonState.totals.circuitActionsExecuted += 1;
            } else {
                horizonState.totals.circuitActionsFailed += 1;
            }
        } catch (error) {
            const persisted = {
                ...action,
                status: 'failed',
                action_result: {
                    error: error.message,
                    status: error.status || null,
                },
            };
            saveCircuitBreakerAction(persisted);
            actions.push(normalizeActionForState(persisted));
            horizonState.totals.circuitActionsFailed += 1;
        }
    }

    return actions;
};

const reconcileResolvedIncidents = (activeFingerprints) => {
    const openIncidents = listIncidents({ status: 'open', limit: 500 });
    let resolved = 0;

    for (const incident of openIncidents) {
        if (!activeFingerprints.has(incident.fingerprint)) {
            const result = resolveIncident(incident.incident_id);
            if (result.success) resolved += 1;
        }
    }

    return resolved;
};

export const runHorizonCycle = async ({ manual = false } = {}) => {
    if (!HORIZON_CONFIG.enabled) {
        return {
            success: false,
            skipped: true,
            reason: 'HORIZON_AGENT_ENABLED=false',
        };
    }

    if (horizonState.running) {
        return {
            success: false,
            skipped: true,
            reason: 'cycle_already_running',
        };
    }

    horizonState.running = true;
    const startedMs = Date.now();
    const startedAt = nowIso();

    const summary = {
        success: true,
        started_at: startedAt,
        manual,
        incidents_detected: 0,
        incidents_deduped: 0,
        incidents_resolved: 0,
        attestations_submitted: 0,
        notification_channels_sent: 0,
        notification_channels_failed: 0,
        circuit_actions: [],
    };

    try {
        const previousSnapshot = getLatestTelemetrySnapshot();
        const snapshot = await fetchTelemetrySnapshot();

        saveTelemetrySnapshot(snapshot);
        horizonState.totals.snapshotsIndexed += 1;

        const candidates = collapseCandidates([
            ...detectBridgeIncidents(snapshot, previousSnapshot),
            ...detectPoolIncidents(snapshot, previousSnapshot),
            ...detectMempoolIncidents(snapshot, previousSnapshot),
        ]);

        const activeFingerprints = new Set(candidates.map(candidate => candidate.fingerprint));

        for (const candidate of candidates) {
            const existing = getOpenIncidentByFingerprint(candidate.fingerprint);
            if (existing) {
                summary.incidents_deduped += 1;
                continue;
            }

            const incident = buildIncidentRecord(candidate, snapshot.snapshot_hash);
            saveIncident(incident);
            summary.incidents_detected += 1;
            horizonState.totals.incidentsDetected += 1;

            let attestationResult = null;
            try {
                attestationResult = await signAndRelayIncident(incident);
                updateIncidentAttestation(incident.incident_id, {
                    canonical_payload: attestationResult.canonical_payload,
                    signature: attestationResult.signature,
                    oracle_pubkey: attestationResult.oracle_pubkey,
                    attestation: attestationResult.attestation,
                    on_chain_status: attestationResult.on_chain_status,
                    on_chain_result: attestationResult.relay,
                });

                horizonState.totals.attestationsSigned += 1;
                if (attestationResult.relay?.success) {
                    horizonState.totals.attestationsRelayed += 1;
                    summary.attestations_submitted += 1;
                }
            } catch (error) {
                updateIncidentAttestation(incident.incident_id, {
                    canonical_payload: null,
                    signature: null,
                    oracle_pubkey: null,
                    attestation: null,
                    on_chain_status: 'failed',
                    on_chain_result: { error: error.message },
                });
                logWarn('Horizon incident attestation failed', {
                    incident_id: incident.incident_id,
                    error: error.message,
                });
            }

            const actionResults = await executeCircuitBreakersForIncident(incident, snapshot, attestationResult);
            summary.circuit_actions.push(...actionResults);

            try {
                const notificationResult = await notifyHorizonIncident({
                    incident,
                    attestationResult,
                    circuitActions: actionResults,
                    snapshotHash: snapshot.snapshot_hash,
                });
                summary.notification_channels_sent += Number(notificationResult?.sent_channels || 0);
                summary.notification_channels_failed += Number(notificationResult?.failed_channels || 0);
                horizonState.totals.notificationChannelsSent += Number(notificationResult?.sent_channels || 0);
                horizonState.totals.notificationChannelsFailed += Number(notificationResult?.failed_channels || 0);
            } catch (error) {
                horizonState.totals.notificationChannelsFailed += 1;
                summary.notification_channels_failed += 1;
                logWarn('Horizon incident notification dispatch failed', {
                    incident_id: incident.incident_id,
                    error: error.message,
                });
            }

            remember(horizonState.latestIncidents, {
                ...incident,
                created_at: nowIso(),
                attestation: attestationResult?.attestation || null,
            }, 150);
            for (const action of actionResults) {
                remember(horizonState.latestCircuitActions, action, 200);
            }
        }

        const expirationActions = await processExpiredBridgeHalts(snapshot);
        if (expirationActions.length > 0) {
            summary.circuit_actions.push(...expirationActions);
            for (const action of expirationActions) {
                remember(horizonState.latestCircuitActions, action, 200);
            }
        }

        summary.incidents_resolved = reconcileResolvedIncidents(activeFingerprints);
        summary.duration_ms = Date.now() - startedMs;
        horizonState.lastError = null;

        logInfo('Horizon cycle completed', {
            incidents_detected: summary.incidents_detected,
            incidents_deduped: summary.incidents_deduped,
            incidents_resolved: summary.incidents_resolved,
            attestations_submitted: summary.attestations_submitted,
            notification_channels_sent: summary.notification_channels_sent,
            notification_channels_failed: summary.notification_channels_failed,
            circuit_actions: summary.circuit_actions.length,
            duration_ms: summary.duration_ms,
            manual,
        });
    } catch (error) {
        summary.success = false;
        summary.error = error.message;
        summary.duration_ms = Date.now() - startedMs;
        horizonState.lastError = error.message;
        logError('Horizon cycle failed', { error: error.message, stack: error.stack });
    } finally {
        horizonState.running = false;
        horizonState.lastRunAt = nowIso();
        horizonState.lastRunMs = summary.duration_ms;
        horizonState.runCount += 1;
        remember(horizonState.recentRuns, {
            ...summary,
            completed_at: horizonState.lastRunAt,
        }, 120);
    }

    return summary;
};

export const startHorizonAgent = () => {
    if (!HORIZON_CONFIG.enabled) {
        logWarn('Horizon agent disabled by configuration');
        return { started: false, reason: 'HORIZON_AGENT_ENABLED=false' };
    }

    if (horizonState.timer) {
        return { started: true, alreadyRunning: true };
    }

    horizonState.startedAt = nowIso();
    horizonState.lastError = null;

    horizonState.timer = setInterval(() => {
        runHorizonCycle({ manual: false }).catch((error) => {
            horizonState.lastError = error?.message || String(error);
            logError('Horizon scheduled cycle failed', { error: horizonState.lastError });
        });
    }, HORIZON_CONFIG.pollIntervalMs);
    horizonState.timer.unref?.();

    runHorizonCycle({ manual: false }).catch((error) => {
        horizonState.lastError = error?.message || String(error);
        logError('Horizon initial cycle failed', { error: horizonState.lastError });
    });

    logInfo('Horizon agent started', {
        poll_interval_ms: HORIZON_CONFIG.pollIntervalMs,
        on_chain_relay: HORIZON_CONFIG.onChainRelayEnabled,
        auto_bridge_halt: HORIZON_CONFIG.autoBridgeHalt,
        auto_wallet_throttle: HORIZON_CONFIG.autoWalletThrottle,
        auto_governance_proposal: HORIZON_CONFIG.autoGovProposal,
    });

    return { started: true };
};

export const stopHorizonAgent = () => {
    if (horizonState.timer) {
        clearInterval(horizonState.timer);
        horizonState.timer = null;
    }
    horizonState.running = false;
    return { stopped: true };
};

export const shutdownHorizonAgent = () => {
    stopHorizonAgent();
    closeHorizonDatabase();
    return { stopped: true, db_closed: true };
};

export const getHorizonSnapshot = async () => {
    const stats = getHorizonStats();
    return {
        success: true,
        config: {
            enabled: HORIZON_CONFIG.enabled,
            poll_interval_ms: HORIZON_CONFIG.pollIntervalMs,
            on_chain_relay_enabled: HORIZON_CONFIG.onChainRelayEnabled,
            mempool_high_watermark: HORIZON_CONFIG.mempoolHighWatermark,
            mempool_concentration_threshold: HORIZON_CONFIG.mempoolConcentrationThreshold,
            bridge_pending_threshold: HORIZON_CONFIG.bridgePendingThreshold,
            pool_drain_threshold_pct: HORIZON_CONFIG.poolDrainThresholdPct,
            auto_bridge_halt: HORIZON_CONFIG.autoBridgeHalt,
            auto_bridge_resume: HORIZON_CONFIG.autoBridgeResume,
            auto_wallet_throttle: HORIZON_CONFIG.autoWalletThrottle,
            auto_governance_proposal: HORIZON_CONFIG.autoGovProposal,
            oracle_id: HORIZON_CONFIG.oracleId,
            model_id: HORIZON_CONFIG.modelId,
            context: HORIZON_CTX,
            notifications: getHorizonNotificationConfig(),
        },
        agent: {
            started_at: horizonState.startedAt,
            last_run_at: horizonState.lastRunAt,
            last_run_ms: horizonState.lastRunMs,
            running: horizonState.running,
            run_count: horizonState.runCount,
            last_error: horizonState.lastError,
            public_keys: getPublicKeys(),
        },
        totals: {
            ...stats,
            incidents_detected: horizonState.totals.incidentsDetected,
            snapshots_indexed_runtime: horizonState.totals.snapshotsIndexed,
            attestations_signed: horizonState.totals.attestationsSigned,
            attestations_relayed: horizonState.totals.attestationsRelayed,
            circuit_actions_executed: horizonState.totals.circuitActionsExecuted,
            circuit_actions_failed: horizonState.totals.circuitActionsFailed,
            notification_channels_sent: horizonState.totals.notificationChannelsSent,
            notification_channels_failed: horizonState.totals.notificationChannelsFailed,
        },
        latest_incidents: listIncidents({ limit: 20 }),
        latest_circuit_breakers: listCircuitBreakerActions({ limit: 20 }),
        recent_runs: horizonState.recentRuns.slice(0, 30),
    };
};

export const fetchHorizonIncidents = ({ status, limit, incidentType } = {}) => {
    return listIncidents({ status, limit, incidentType });
};

export const fetchHorizonCircuitBreakers = ({ status, limit } = {}) => {
    return listCircuitBreakerActions({ status, limit });
};

export const fetchHorizonTelemetry = ({ limit } = {}) => {
    return getRecentTelemetrySnapshots(limit);
};

export const __testResetHorizonState = () => {
    stopHorizonAgent();
    horizonState.startedAt = null;
    horizonState.lastRunAt = null;
    horizonState.lastRunMs = null;
    horizonState.lastError = null;
    horizonState.running = false;
    horizonState.runCount = 0;
    horizonState.totals = {
        snapshotsIndexed: 0,
        incidentsDetected: 0,
        attestationsSigned: 0,
        attestationsRelayed: 0,
        circuitActionsExecuted: 0,
        circuitActionsFailed: 0,
        notificationChannelsSent: 0,
        notificationChannelsFailed: 0,
    };
    horizonState.recentRuns = [];
    horizonState.latestIncidents = [];
    horizonState.latestCircuitActions = [];
    horizonState.recentGovernanceActions = new Map();
    closeHorizonDatabase();
};

export const __testables = {
    buildIncidentFingerprint,
    detectBridgeIncidents,
    detectPoolIncidents,
    detectMempoolIncidents,
    collapseCandidates,
};

export default {
    startHorizonAgent,
    stopHorizonAgent,
    shutdownHorizonAgent,
    runHorizonCycle,
    getHorizonSnapshot,
    fetchHorizonIncidents,
    fetchHorizonCircuitBreakers,
    fetchHorizonTelemetry,
};
