/**
 * Consul Governance Modeling
 * Core simulation + quorum/dispute math shared by the Consul agent and API.
 */

const STATUS_BASE_RISK = {
    DepositPeriod: 0.62,
    VotingPeriod: 0.48,
    Passed: 0.24,
    Rejected: 0.34,
    Failed: 0.42,
    FailedExecution: 0.58,
    Executed: 0.2,
};

const KEY_IMPACT_BPS = {
    gas_limit: { upside: 90, downside: 230 },
    max_gas_per_block: { upside: 110, downside: 260 },
    quorum: { upside: 55, downside: 130 },
    threshold: { upside: 70, downside: 170 },
    veto_threshold: { upside: 45, downside: 140 },
    min_deposit: { upside: 80, downside: 200 },
    voting_period: { upside: 35, downside: 120 },
    deposit_period: { upside: 25, downside: 110 },
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const parseU128String = (value, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return fallback;
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : fallback;
};

const parseProposalTypeKey = (typeRaw) => {
    if (typeof typeRaw !== 'string') return null;
    const match = typeRaw.match(/^ParameterChange\((.+)\)$/);
    if (match?.[1]) return match[1].trim().toLowerCase();
    return null;
};

const extractVotingStats = (proposal) => {
    const tally = proposal?.current_tally || {};
    const yes = parseU128String(tally.yes, 0);
    const no = parseU128String(tally.no, 0);
    const abstain = parseU128String(tally.abstain, 0);
    const noWithVeto = parseU128String(tally.no_with_veto, 0);
    const totalVotingPower = parseU128String(tally.total_voting_power, 0);
    const participatingVotingPower = parseU128String(tally.participating_voting_power, 0);
    const participating = Math.max(yes + no + abstain + noWithVeto, participatingVotingPower);

    const yesShare = participating > 0 ? yes / participating : 0;
    const vetoShare = participating > 0 ? noWithVeto / participating : 0;
    const noShare = participating > 0 ? no / participating : 0;
    const participationShare = totalVotingPower > 0 ? participatingVotingPower / totalVotingPower : 0;

    return {
        yes,
        no,
        abstain,
        noWithVeto,
        participating,
        totalVotingPower,
        participatingVotingPower,
        yesShare,
        noShare,
        vetoShare,
        participationShare,
        quorumMet: Boolean(tally.quorum_met),
    };
};

const computeImpactRangeBps = (proposal, riskScore) => {
    const key = parseProposalTypeKey(proposal?.type);
    const impactProfile = key ? KEY_IMPACT_BPS[key] : null;
    const baselineUpside = impactProfile?.upside ?? 60;
    const baselineDownside = impactProfile?.downside ?? 180;

    // Downside scales more aggressively with risk to reflect governance failure cascades.
    const downsideBps = Math.round(baselineDownside * (0.7 + riskScore * 1.1));
    const upsideBps = Math.round(baselineUpside * (1.1 - riskScore * 0.45));

    // Expected impact is signed basis points around baseline value.
    const expectedImpactBps = Math.round(upsideBps * 0.45 - downsideBps * riskScore);

    return {
        expectedImpactBps,
        downsideBps,
        upsideBps: Math.max(0, upsideBps),
        policyKey: key,
    };
};

const deriveRecommendation = ({ status, riskScore, yesShare, quorumMet }) => {
    if (status === 'DepositPeriod') {
        return {
            recommendation: 'escalate',
            reason: 'Proposal is still in deposit period; additional oracle review and sponsor diligence required.',
        };
    }

    if (riskScore >= 0.72) {
        return {
            recommendation: 'reject',
            reason: 'Modeled downside and coordination risk exceed acceptable governance tolerance.',
        };
    }

    if (riskScore >= 0.58) {
        return {
            recommendation: 'escalate',
            reason: 'Outcome uncertainty remains elevated; require quorum corroboration before final vote posture.',
        };
    }

    if (quorumMet && yesShare >= 0.55) {
        return {
            recommendation: 'support',
            reason: 'Participation and support levels indicate acceptable execution risk under current model assumptions.',
        };
    }

    return {
        recommendation: 'abstain',
        reason: 'Signal quality is mixed; abstain until quorum and directional confidence improve.',
    };
};

/**
 * Simulate governance downside for one proposal and produce a machine-actionable stance.
 */
export const simulateProposalRisk = (proposal) => {
    const status = proposal?.status || 'VotingPeriod';
    const baseRisk = STATUS_BASE_RISK[status] ?? 0.5;
    const voting = extractVotingStats(proposal);

    // Risk drivers are weighted to keep output stable for C-level consumption.
    const participationPenalty = (1 - voting.participationShare) * 0.32;
    const vetoPressure = voting.vetoShare * 0.26;
    const directionalSignal = voting.yesShare * -0.17 + voting.noShare * 0.14;
    const quorumPenalty = voting.quorumMet ? -0.08 : 0.11;

    const riskScore = clamp01(baseRisk + participationPenalty + vetoPressure + directionalSignal + quorumPenalty);
    const confidence = clamp01(0.42 + voting.participationShare * 0.4 + (voting.participating > 0 ? 0.16 : -0.08));
    const impact = computeImpactRangeBps(proposal, riskScore);
    const recommendation = deriveRecommendation({
        status,
        riskScore,
        yesShare: voting.yesShare,
        quorumMet: voting.quorumMet,
    });

    return {
        proposalId: Number(proposal?.id || 0),
        title: proposal?.title || `Proposal ${proposal?.id || 'N/A'}`,
        status,
        modelId: 'consul-governance-v1',
        riskScore01: Number(riskScore.toFixed(4)),
        scoreStr: riskScore.toFixed(4),
        confidence01: Number(confidence.toFixed(4)),
        recommendation: recommendation.recommendation,
        recommendationReason: recommendation.reason,
        expectedImpactBps: impact.expectedImpactBps,
        downsideBps: impact.downsideBps,
        upsideBps: impact.upsideBps,
        policyKey: impact.policyKey,
        voting,
        drivers: [
            { label: 'Status baseline', value: Number(baseRisk.toFixed(4)), weight: 1.0 },
            { label: 'Participation penalty', value: Number(participationPenalty.toFixed(4)), weight: 0.32 },
            { label: 'Veto pressure', value: Number(vetoPressure.toFixed(4)), weight: 0.26 },
            { label: 'Directional signal', value: Number(directionalSignal.toFixed(4)), weight: 0.31 },
            { label: 'Quorum adjustment', value: Number(quorumPenalty.toFixed(4)), weight: 0.19 },
        ],
        generatedAt: new Date().toISOString(),
    };
};

/**
 * Deterministic persona perturbation for multi-oracle simulation in first-iteration deployments.
 */
export const applyOraclePersona = (baseAnalysis, oracleIndex = 0) => {
    const shift = (oracleIndex - 1) * 0.045;
    const confidenceShift = (oracleIndex === 0 ? 0.04 : -0.015 * oracleIndex);
    const adjustedRisk = clamp01(baseAnalysis.riskScore01 + shift);
    const adjustedConfidence = clamp01(baseAnalysis.confidence01 + confidenceShift);

    const recommendation = deriveRecommendation({
        status: baseAnalysis.status,
        riskScore: adjustedRisk,
        yesShare: baseAnalysis.voting.yesShare,
        quorumMet: baseAnalysis.voting.quorumMet,
    });

    return {
        ...baseAnalysis,
        riskScore01: Number(adjustedRisk.toFixed(4)),
        scoreStr: adjustedRisk.toFixed(4),
        confidence01: Number(adjustedConfidence.toFixed(4)),
        recommendation: recommendation.recommendation,
        recommendationReason: recommendation.reason,
    };
};

export const computeQuorum = (attestations, minQuorum = 2) => {
    if (!Array.isArray(attestations) || attestations.length === 0) {
        return {
            totalAttestations: 0,
            uniqueOracles: 0,
            minQuorum,
            quorumMet: false,
            consensusRecommendation: null,
            consensusShare: 0,
            avgRiskScore: null,
            riskStdDev: null,
            disputed: false,
            recommendationBreakdown: {},
        };
    }

    const normalized = attestations
        .filter((item) => item && item.oracle_id)
        .map((item) => ({
            oracle_id: String(item.oracle_id),
            recommendation: String(item.recommendation || '').toLowerCase() || 'abstain',
            risk_score: Number(item.risk_score ?? item.riskScore01 ?? 0),
        }));

    const uniqueOracles = new Set(normalized.map((item) => item.oracle_id)).size;
    const recommendationBreakdown = {};
    for (const item of normalized) {
        recommendationBreakdown[item.recommendation] = (recommendationBreakdown[item.recommendation] || 0) + 1;
    }

    let consensusRecommendation = null;
    let consensusVotes = 0;
    for (const [recommendation, votes] of Object.entries(recommendationBreakdown)) {
        if (votes > consensusVotes) {
            consensusVotes = votes;
            consensusRecommendation = recommendation;
        }
    }

    const riskScores = normalized.map((item) => item.risk_score);
    const mean = riskScores.reduce((sum, value) => sum + value, 0) / riskScores.length;
    const variance = riskScores.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / riskScores.length;
    const stdDev = Math.sqrt(variance);
    const consensusShare = uniqueOracles > 0 ? consensusVotes / uniqueOracles : 0;
    const recommendationCount = Object.keys(recommendationBreakdown).length;
    const disputed = recommendationCount > 1 && consensusShare < 0.75;
    const quorumMet = uniqueOracles >= minQuorum && consensusVotes >= minQuorum;

    return {
        totalAttestations: normalized.length,
        uniqueOracles,
        minQuorum,
        quorumMet,
        consensusRecommendation,
        consensusShare: Number(consensusShare.toFixed(4)),
        avgRiskScore: Number(mean.toFixed(4)),
        riskStdDev: Number(stdDev.toFixed(4)),
        disputed,
        recommendationBreakdown,
    };
};

export const shouldFileDispute = (quorum, attestations) => {
    if (!quorum || !Array.isArray(attestations) || attestations.length < 2) return false;
    if (quorum.disputed) return true;

    const scores = attestations
        .map((item) => Number(item.risk_score ?? item.riskScore01))
        .filter((value) => Number.isFinite(value));

    if (scores.length < 2) return false;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return (max - min) >= 0.28;
};

export default {
    simulateProposalRisk,
    applyOraclePersona,
    computeQuorum,
    shouldFileDispute,
};
