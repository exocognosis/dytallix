import crypto from 'crypto';
import { signData, getPublicKeys } from '../aegis/crypto.js';
import { submitAiRiskBatch } from '../aegis/oracle-relayer.js';
import { logError, logInfo, logWarn } from '../../logger.js';
import {
    closeVectorDatabase,
    getAddressProfile,
    getAegisAddressFeatures,
    getVectorStats,
    listAddressAttestations,
    listAddressProfiles,
    listAegisCandidateAddresses,
    saveAddressAttestation,
    upsertAddressProfile,
} from './database.js';
import Geometry from './geometry.js';

const VECTOR_CTX = process.env.VECTOR_ATTESTATION_CTX || 'dytallix-vector-attestation-v1';
const VECTOR_ATTESTATION_KIND = 'address_reputation';
const VECTOR_ATTESTATION_VERSION = 'dytallix-attestation-v2';

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on', 'y'].includes(String(value).trim().toLowerCase());
};

const toPositiveInt = (value, fallback, min = 1, max = Number.POSITIVE_INFINITY) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed < min) return fallback;
    return Math.min(parsed, max);
};

const toRatio = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, parsed);
};

const clampRange = (value, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, parsed));
};

const clamp01 = (value) => clampRange(value, 0, 1);

const formatScore = (score01) => {
    const fixed = clamp01(score01).toFixed(6);
    const trimmed = fixed.replace(/\.?0+$/, '');
    return trimmed.includes('.') ? trimmed : `${trimmed}.0`;
};

const nowIso = () => new Date().toISOString();

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const normalizeTier = (tier) => {
    const value = String(tier || '').trim().toLowerCase();
    if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') return value;
    return 'all';
};

const remember = (list, item, max = 50) => {
    list.unshift(item);
    if (list.length > max) list.length = max;
};

const VECTOR_CONFIG = {
    enabled: parseBool(process.env.VECTOR_AGENT_ENABLED, true),
    pollIntervalMs: Math.max(10_000, toPositiveInt(process.env.VECTOR_POLL_INTERVAL_MS, 45_000, 1_000)),
    analysisWindowHours: Math.max(1, toPositiveInt(process.env.VECTOR_ANALYSIS_WINDOW_HOURS, 24, 1, 24 * 30)),
    maxAddressesPerCycle: Math.max(1, toPositiveInt(process.env.VECTOR_MAX_ADDRESSES_PER_CYCLE, 40, 1, 500)),
    minTxPerAddress: Math.max(1, toPositiveInt(process.env.VECTOR_MIN_TX_PER_ADDRESS, 1, 1, 1000)),
    onChainRelayEnabled: parseBool(process.env.VECTOR_ONCHAIN_RELAY_ENABLED, true),
    attestationTtlSec: Math.max(60, toPositiveInt(process.env.VECTOR_ATTESTATION_TTL_SEC, 900, 60, 86_400)),
    minRepublishSec: Math.max(60, toPositiveInt(process.env.VECTOR_MIN_REPUBLISH_SEC, 600, 60, 86_400)),
    republishDelta: clampRange(toRatio(process.env.VECTOR_REPUBLISH_DELTA, 0.03), 0.001, 1),
    modelId: process.env.VECTOR_MODEL_ID || 'vector-identity-v1',
    modelVersion: process.env.VECTOR_MODEL_VERSION || '2026.02',
    oracleId: process.env.VECTOR_ORACLE_ID || 'vector-primary',
    relayerId: process.env.VECTOR_RELAYER_ID || 'vector-relayer',
    velocityNormalization: Math.max(1, toPositiveInt(process.env.VECTOR_VELOCITY_NORMALIZATION, 12, 1, 500)),
    maturityTxBaseline: Math.max(1, toPositiveInt(process.env.VECTOR_MATURITY_BASELINE_TX, 50, 1, 10_000)),
    mediumRiskThreshold: clampRange(toRatio(process.env.VECTOR_MEDIUM_THRESHOLD, 0.4), 0.05, 0.95),
    highRiskThreshold: clampRange(toRatio(process.env.VECTOR_HIGH_THRESHOLD, 0.65), 0.1, 0.99),
    criticalRiskThreshold: clampRange(toRatio(process.env.VECTOR_CRITICAL_THRESHOLD, 0.85), 0.2, 1),
};

if (VECTOR_CONFIG.mediumRiskThreshold > VECTOR_CONFIG.highRiskThreshold) {
    VECTOR_CONFIG.mediumRiskThreshold = VECTOR_CONFIG.highRiskThreshold;
}
if (VECTOR_CONFIG.highRiskThreshold > VECTOR_CONFIG.criticalRiskThreshold) {
    VECTOR_CONFIG.highRiskThreshold = VECTOR_CONFIG.criticalRiskThreshold;
}

const vectorState = {
    startedAt: null,
    lastRunAt: null,
    lastRunMs: null,
    lastError: null,
    running: false,
    runCount: 0,
    timer: null,
    totals: {
        addressesScored: 0,
        attestationsSigned: 0,
        attestationsRelayed: 0,
        cyclesSucceeded: 0,
        cyclesFailed: 0,
    },
    recentRuns: [],
};

const computeRiskTier = (riskScore01) => {
    const risk = clamp01(riskScore01);
    if (risk >= VECTOR_CONFIG.criticalRiskThreshold) return 'critical';
    if (risk >= VECTOR_CONFIG.highRiskThreshold) return 'high';
    if (risk >= VECTOR_CONFIG.mediumRiskThreshold) return 'medium';
    return 'low';
};

const recommendedActionForTier = (riskTier) => {
    switch (riskTier) {
        case 'critical':
            return 'block_and_manual_review';
        case 'high':
            return 'throttle_and_review';
        case 'medium':
            return 'monitor_and_step_up_auth';
        default:
            return 'allow_with_monitoring';
    }
};

export const scoreAddressBehavior = (features) => {
    const txCount = Math.max(0, Number(features?.tx_count || 0));
    const txCountLastHour = Math.max(0, Number(features?.tx_count_last_hour || 0));
    const avgRiskScore = clampRange(Number(features?.avg_risk_score || 0), 0, 100);
    const maxRiskScore = clampRange(Number(features?.max_risk_score || 0), 0, 100);
    const walletRiskScore = clampRange(Number(features?.wallet_score || 0), 0, 100);
    const uniqueCounterparties = Math.max(0, Number(features?.unique_counterparties || 0));
    const highRiskTxCount = Math.max(0, Number(features?.high_risk_tx_count || 0));
    const criticalRiskTxCount = Math.max(0, Number(features?.critical_risk_tx_count || 0));
    const feedbackCount = Math.max(0, Number(features?.feedback_count || 0));
    const confirmedRiskFeedback = Math.max(0, Number(features?.confirmed_risk_feedback || 0));
    const walletTotalTransactions = Math.max(0, Number(features?.wallet_total_transactions || 0));

    const txRiskComponent = clamp01((((avgRiskScore * 0.7) + (maxRiskScore * 0.3)) / 100));
    const walletRiskComponent = clamp01(walletRiskScore / 100);
    const concentrationComponent = txCount > 0
        ? clamp01(1 - Math.min(uniqueCounterparties / txCount, 1))
        : 0;
    const velocityComponent = clamp01(txCountLastHour / VECTOR_CONFIG.velocityNormalization);
    const feedbackComponent = feedbackCount > 0
        ? clamp01(confirmedRiskFeedback / feedbackCount)
        : 0;
    const highRiskDensityComponent = txCount > 0
        ? clamp01((highRiskTxCount + (criticalRiskTxCount * 1.5)) / txCount)
        : 0;
    const maturityComponent = clamp01(1 - Math.min(
        Math.max(txCount, walletTotalTransactions) / VECTOR_CONFIG.maturityTxBaseline,
        1
    ));

    // --- INFORMATION GEOMETRY: Predictive Topological Scoring ---

    // 1. Calculate Counterparty Distribution Risk
    // Scammer Reference Profile: High exposure to Critical and High risk elements
    const SCAMMER_COUNTERPARTY_REF = [0.05, 0.15, 0.40, 0.40]; // Low, Med, High, Crit
    const counterpartyRaw = features?.counterparty_risk_distribution_raw || [0, 0, 0, 0];
    const counterpartyDist = Geometry.normalizeDistribution(counterpartyRaw);
    const counterpartyDivergence = Geometry.calculateKLDivergence(counterpartyDist, SCAMMER_COUNTERPARTY_REF);
    // Transform divergence to risk (closer to scammer = higher risk)
    const topologicalRiskComponent = Geometry.mapDivergenceToRisk(counterpartyDivergence, 1.2);

    // 2. Calculate Temporal Velocity Divergence
    // Scammer Reference Profile: Huge spike in last hour, minimal previously (hit and run)
    const SCAMMER_VELOCITY_REF = [0.80, 0.15, 0.05]; // Last 1h, Prev 5h, Prev 18h
    const velocityRaw = features?.temporal_velocity_distribution_raw || [0, 0, 0];
    const velocityDist = Geometry.normalizeDistribution(velocityRaw);
    const velocityDivergence = Geometry.calculateKLDivergence(velocityDist, SCAMMER_VELOCITY_REF);
    const topologicalVelocityComponent = Geometry.mapDivergenceToRisk(velocityDivergence, 1.5);

    // Fisher Information approximation for trajectory would go here, 
    // requiring us to pass in `previousProfile` to scoreAddressBehavior.
    // For now, we integrate the static topological divergence components.

    const riskScore01 = clamp01(
        (txRiskComponent * 0.25) +
        (walletRiskComponent * 0.15) +
        (concentrationComponent * 0.10) +
        (velocityComponent * 0.10) +
        (feedbackComponent * 0.11) +
        (highRiskDensityComponent * 0.05) +
        (maturityComponent * 0.04) +
        (topologicalRiskComponent * 0.10) +
        (topologicalVelocityComponent * 0.10)
    );

    const evidencePoints = txCount + (feedbackCount * 2) + Math.min(walletTotalTransactions, 25);
    const confidence = clamp01(Math.min(0.97, 0.42 + (Math.min(evidencePoints, 60) * 0.009)));

    const reputationRaw = (1 - riskScore01) * 100;
    const confidenceWeight = 0.75 + (confidence * 0.25);
    const reputationScore = Math.round(clampRange(reputationRaw * confidenceWeight, 0, 100));

    const riskTier = computeRiskTier(riskScore01);

    return {
        reputation_score: reputationScore,
        risk_score_0_1: riskScore01,
        risk_tier: riskTier,
        confidence,
        recommended_action: recommendedActionForTier(riskTier),
        components: {
            tx_risk_component: Number(txRiskComponent.toFixed(4)),
            wallet_risk_component: Number(walletRiskComponent.toFixed(4)),
            concentration_component: Number(concentrationComponent.toFixed(4)),
            velocity_component: Number(velocityComponent.toFixed(4)),
            feedback_component: Number(feedbackComponent.toFixed(4)),
            high_risk_density_component: Number(highRiskDensityComponent.toFixed(4)),
            maturity_component: Number(maturityComponent.toFixed(4)),
            topological_risk_component: Number(topologicalRiskComponent.toFixed(4)),
            topological_velocity_component: Number(topologicalVelocityComponent.toFixed(4)),
        },
    };
};

const shouldPublishProfile = (previousProfile, nextProfile, currentTimeMs = Date.now()) => {
    if (!previousProfile) return true;
    if (!previousProfile.last_analyzed_at) return true;
    if (String(previousProfile.on_chain_status || '') !== 'submitted') return true;

    const prevRisk = clamp01(Number(previousProfile.risk_score || 0));
    const nextRisk = clamp01(Number(nextProfile.risk_score_0_1 || 0));
    if (Math.abs(prevRisk - nextRisk) >= VECTOR_CONFIG.republishDelta) return true;

    const prevTier = normalizeTier(previousProfile.risk_tier);
    const nextTier = normalizeTier(nextProfile.risk_tier);
    if (prevTier !== nextTier) return true;

    const prevAnalyzedMs = new Date(previousProfile.last_analyzed_at).getTime();
    if (!Number.isFinite(prevAnalyzedMs)) return true;

    return (currentTimeMs - prevAnalyzedMs) >= (VECTOR_CONFIG.minRepublishSec * 1000);
};

const buildAddressAttestation = async ({ address, score, features }) => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const nonce = `${address}:${issuedAt}:${crypto.randomUUID().slice(0, 8)}`;
    const scoreStr = formatScore(score.risk_score_0_1);
    const targetHash = sha256(`${VECTOR_ATTESTATION_KIND}:${address}:${issuedAt}:${nonce}`);
    const txHash = `0x${targetHash}`;
    const canonicalPayload = `${txHash}:${scoreStr}:${VECTOR_CONFIG.modelId}:${issuedAt}:${nonce}`;
    const signatureData = await signData(canonicalPayload, { context: VECTOR_CTX });
    const expiresAt = issuedAt + VECTOR_CONFIG.attestationTtlSec;

    const attestation = {
        kind: VECTOR_ATTESTATION_KIND,
        ctx: VECTOR_CTX,
        tx_hash: txHash,
        model_id: VECTOR_CONFIG.modelId,
        model_version: VECTOR_CONFIG.modelVersion,
        risk_score_0_1: score.risk_score_0_1,
        score_str: scoreStr,
        confidence: score.confidence,
        reputation_score: score.reputation_score,
        risk_tier: score.risk_tier,
        signature_b64: signatureData.signature,
        oracle_pubkey_b64: signatureData.publicKey,
        expires_at: expiresAt,
        nonce,
        source_oracle_id: VECTOR_CONFIG.oracleId,
        submitter: VECTOR_CONFIG.relayerId,
        attestation_version: VECTOR_ATTESTATION_VERSION,
        issued_at: issuedAt,
        ttl_sec: VECTOR_CONFIG.attestationTtlSec,
        from_address: address,
        payload: {
            kind: VECTOR_ATTESTATION_KIND,
            target: `address:${address}`,
            address,
            reputation_score: score.reputation_score,
            risk_tier: score.risk_tier,
            score_str: scoreStr,
            model_id: VECTOR_CONFIG.modelId,
            model_version: VECTOR_CONFIG.modelVersion,
            issued_at: issuedAt,
            nonce,
            behavior: {
                tx_count: features.tx_count,
                tx_count_last_hour: features.tx_count_last_hour,
                unique_counterparties: features.unique_counterparties,
                high_risk_tx_count: features.high_risk_tx_count,
                critical_risk_tx_count: features.critical_risk_tx_count,
                feedback_count: features.feedback_count,
                confirmed_risk_feedback: features.confirmed_risk_feedback,
                info_geometry: {
                    counterparty_divergence: score.components.topological_risk_component,
                    velocity_divergence: score.components.topological_velocity_component
                }
            },
            recommended_action: score.recommended_action,
        },
    };

    let relay = {
        success: false,
        skipped: true,
        reason: 'VECTOR_ONCHAIN_RELAY_ENABLED=false',
    };

    if (VECTOR_CONFIG.onChainRelayEnabled) {
        relay = await submitAiRiskBatch([attestation]);
    }

    return {
        attestation_id: `vec-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
        tx_hash: txHash,
        canonical_payload: canonicalPayload,
        signature: signatureData.signature,
        oracle_pubkey: signatureData.publicKey,
        attestation,
        relay,
        on_chain_status: relay.success ? 'submitted' : (relay.skipped ? 'skipped' : 'failed'),
    };
};

export const runVectorCycle = async ({ manual = false, maxAddresses = null } = {}) => {
    if (!VECTOR_CONFIG.enabled && !manual) {
        return {
            success: false,
            skipped: true,
            reason: 'VECTOR_AGENT_ENABLED=false',
        };
    }

    if (vectorState.running) {
        return {
            success: false,
            skipped: true,
            reason: 'vector_cycle_in_progress',
        };
    }

    vectorState.running = true;
    vectorState.lastError = null;
    const startedAt = Date.now();
    const cycleLimit = Math.max(
        1,
        toPositiveInt(maxAddresses, VECTOR_CONFIG.maxAddressesPerCycle, 1, 1000)
    );

    const summary = {
        success: true,
        manual,
        started_at: nowIso(),
        completed_at: null,
        duration_ms: 0,
        addresses_considered: 0,
        addresses_scored: 0,
        addresses_skipped: 0,
        attestations_signed: 0,
        attestations_relayed: 0,
        attestations_skipped: 0,
        high_risk_addresses: 0,
        critical_risk_addresses: 0,
        errors: [],
    };

    try {
        const candidates = listAegisCandidateAddresses({
            windowHours: VECTOR_CONFIG.analysisWindowHours,
            limit: cycleLimit,
            minTxCount: VECTOR_CONFIG.minTxPerAddress,
        });

        summary.addresses_considered = candidates.length;
        const analyzedAt = nowIso();

        for (const candidate of candidates) {
            const address = String(candidate?.address || '').trim();
            if (!address) {
                summary.addresses_skipped += 1;
                continue;
            }

            try {
                const features = getAegisAddressFeatures(address, {
                    windowHours: VECTOR_CONFIG.analysisWindowHours,
                });

                if (features.tx_count <= 0 && features.wallet_total_transactions <= 0) {
                    summary.addresses_skipped += 1;
                    continue;
                }

                const score = scoreAddressBehavior(features);
                const previous = getAddressProfile(address);
                const publish = shouldPublishProfile(previous, score, startedAt);

                let attestationResult = null;
                if (publish) {
                    attestationResult = await buildAddressAttestation({
                        address,
                        score,
                        features,
                    });

                    saveAddressAttestation({
                        attestation_id: attestationResult.attestation_id,
                        address,
                        reputation_score: score.reputation_score,
                        risk_score: score.risk_score_0_1,
                        risk_tier: score.risk_tier,
                        confidence: score.confidence,
                        model_id: VECTOR_CONFIG.modelId,
                        canonical_payload: attestationResult.canonical_payload,
                        signature: attestationResult.signature,
                        oracle_pubkey: attestationResult.oracle_pubkey,
                        behavior: {
                            features,
                            components: score.components,
                            recommended_action: score.recommended_action,
                        },
                        attestation: attestationResult.attestation,
                        on_chain_status: attestationResult.on_chain_status,
                        on_chain_result: attestationResult.relay,
                    });

                    summary.attestations_signed += 1;
                    if (attestationResult.relay?.success) {
                        summary.attestations_relayed += 1;
                    }
                } else {
                    summary.attestations_skipped += 1;
                }

                if (score.risk_tier === 'critical') summary.critical_risk_addresses += 1;
                if (score.risk_tier === 'high' || score.risk_tier === 'critical') {
                    summary.high_risk_addresses += 1;
                }

                upsertAddressProfile({
                    address,
                    reputation_score: score.reputation_score,
                    risk_score: score.risk_score_0_1,
                    risk_tier: score.risk_tier,
                    confidence: score.confidence,
                    model_id: VECTOR_CONFIG.modelId,
                    model_version: VECTOR_CONFIG.modelVersion,
                    behavior: {
                        features,
                        components: score.components,
                        recommended_action: score.recommended_action,
                    },
                    last_seen_at: features.last_seen_at || candidate.last_seen_at || null,
                    last_analyzed_at: analyzedAt,
                    attestation_tx_hash: attestationResult?.tx_hash || previous?.attestation_tx_hash || null,
                    signature: attestationResult?.signature || previous?.signature || null,
                    oracle_pubkey: attestationResult?.oracle_pubkey || previous?.oracle_pubkey || null,
                    on_chain_status: attestationResult?.on_chain_status || previous?.on_chain_status || null,
                    on_chain_result: attestationResult?.relay || previous?.on_chain_result || null,
                });

                summary.addresses_scored += 1;
            } catch (error) {
                summary.errors.push({
                    address,
                    message: error.message,
                });
                logWarn('Vector address scoring failed', {
                    address,
                    error: error.message,
                });
            }
        }

        summary.success = summary.errors.length === 0 || summary.addresses_scored > 0;
    } catch (error) {
        summary.success = false;
        summary.errors.push({ stage: 'cycle', message: error.message });
        vectorState.lastError = error.message;
        logError('Vector cycle failed', { error: error.message });
    } finally {
        summary.completed_at = nowIso();
        summary.duration_ms = Date.now() - startedAt;

        vectorState.lastRunAt = summary.completed_at;
        vectorState.lastRunMs = summary.duration_ms;
        vectorState.runCount += 1;
        vectorState.running = false;

        vectorState.totals.addressesScored += summary.addresses_scored;
        vectorState.totals.attestationsSigned += summary.attestations_signed;
        vectorState.totals.attestationsRelayed += summary.attestations_relayed;
        if (summary.success) vectorState.totals.cyclesSucceeded += 1;
        else vectorState.totals.cyclesFailed += 1;

        if (!summary.success && summary.errors.length > 0) {
            vectorState.lastError = summary.errors[0].message || 'Vector cycle failed';
        }

        remember(vectorState.recentRuns, summary, 60);
    }

    return summary;
};

export const startVectorAgent = () => {
    if (!VECTOR_CONFIG.enabled) {
        logWarn('Vector agent disabled by configuration');
        return { started: false, reason: 'VECTOR_AGENT_ENABLED=false' };
    }

    if (vectorState.timer) {
        return { started: true, alreadyRunning: true };
    }

    vectorState.startedAt = nowIso();
    vectorState.lastError = null;

    vectorState.timer = setInterval(() => {
        runVectorCycle({ manual: false }).catch((error) => {
            vectorState.lastError = error?.message || String(error);
            logError('Vector scheduled cycle failed', { error: vectorState.lastError });
        });
    }, VECTOR_CONFIG.pollIntervalMs);
    vectorState.timer.unref?.();

    runVectorCycle({ manual: false }).catch((error) => {
        vectorState.lastError = error?.message || String(error);
        logError('Vector initial cycle failed', { error: vectorState.lastError });
    });

    logInfo('Vector agent started', {
        poll_interval_ms: VECTOR_CONFIG.pollIntervalMs,
        analysis_window_hours: VECTOR_CONFIG.analysisWindowHours,
        max_addresses_per_cycle: VECTOR_CONFIG.maxAddressesPerCycle,
        on_chain_relay_enabled: VECTOR_CONFIG.onChainRelayEnabled,
        model_id: VECTOR_CONFIG.modelId,
    });

    return { started: true };
};

export const stopVectorAgent = () => {
    if (vectorState.timer) {
        clearInterval(vectorState.timer);
        vectorState.timer = null;
    }
    vectorState.running = false;
    return { stopped: true };
};

export const shutdownVectorAgent = () => {
    stopVectorAgent();
    closeVectorDatabase();
    return { stopped: true, db_closed: true };
};

export const getVectorSnapshot = async () => {
    const stats = getVectorStats();
    return {
        success: true,
        config: {
            enabled: VECTOR_CONFIG.enabled,
            poll_interval_ms: VECTOR_CONFIG.pollIntervalMs,
            analysis_window_hours: VECTOR_CONFIG.analysisWindowHours,
            max_addresses_per_cycle: VECTOR_CONFIG.maxAddressesPerCycle,
            min_tx_per_address: VECTOR_CONFIG.minTxPerAddress,
            on_chain_relay_enabled: VECTOR_CONFIG.onChainRelayEnabled,
            attestation_ttl_sec: VECTOR_CONFIG.attestationTtlSec,
            min_republish_sec: VECTOR_CONFIG.minRepublishSec,
            republish_delta: VECTOR_CONFIG.republishDelta,
            model_id: VECTOR_CONFIG.modelId,
            model_version: VECTOR_CONFIG.modelVersion,
            oracle_id: VECTOR_CONFIG.oracleId,
            context: VECTOR_CTX,
        },
        agent: {
            started_at: vectorState.startedAt,
            last_run_at: vectorState.lastRunAt,
            last_run_ms: vectorState.lastRunMs,
            running: vectorState.running,
            run_count: vectorState.runCount,
            last_error: vectorState.lastError,
            public_keys: getPublicKeys(),
        },
        totals: {
            ...stats,
            addresses_scored_runtime: vectorState.totals.addressesScored,
            attestations_signed_runtime: vectorState.totals.attestationsSigned,
            attestations_relayed_runtime: vectorState.totals.attestationsRelayed,
            cycles_succeeded: vectorState.totals.cyclesSucceeded,
            cycles_failed: vectorState.totals.cyclesFailed,
        },
        top_addresses: listAddressProfiles({ limit: 20 }),
        latest_attestations: listAddressAttestations({ limit: 30 }),
        recent_runs: vectorState.recentRuns.slice(0, 30),
    };
};

export const fetchVectorFeed = ({ limit = 100, riskTier = null } = {}) => {
    return listAddressAttestations({ limit, riskTier });
};

export const fetchVectorProfiles = ({ limit = 100, riskTier = null } = {}) => {
    return listAddressProfiles({ limit, riskTier });
};

export const fetchVectorAddress = ({ address, limit = 20 } = {}) => {
    const normalizedAddress = String(address || '').trim();
    if (!normalizedAddress) return null;
    return {
        address: normalizedAddress,
        profile: getAddressProfile(normalizedAddress),
        attestations: listAddressAttestations({
            address: normalizedAddress,
            limit,
        }),
    };
};

export const __testResetVectorState = () => {
    stopVectorAgent();
    vectorState.startedAt = null;
    vectorState.lastRunAt = null;
    vectorState.lastRunMs = null;
    vectorState.lastError = null;
    vectorState.running = false;
    vectorState.runCount = 0;
    vectorState.totals = {
        addressesScored: 0,
        attestationsSigned: 0,
        attestationsRelayed: 0,
        cyclesSucceeded: 0,
        cyclesFailed: 0,
    };
    vectorState.recentRuns = [];
    closeVectorDatabase();
};

export const __testables = {
    computeRiskTier,
    scoreAddressBehavior,
    shouldPublishProfile,
};

export default {
    startVectorAgent,
    stopVectorAgent,
    shutdownVectorAgent,
    runVectorCycle,
    getVectorSnapshot,
    fetchVectorFeed,
    fetchVectorProfiles,
    fetchVectorAddress,
};
