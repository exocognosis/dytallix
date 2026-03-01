import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setTestEnv = () => {
    process.env.VECTOR_AGENT_ENABLED = 'true';
    process.env.VECTOR_ONCHAIN_RELAY_ENABLED = 'false';
    process.env.VECTOR_POLL_INTERVAL_MS = '60000';
    process.env.VECTOR_ANALYSIS_WINDOW_HOURS = '24';
    process.env.VECTOR_MAX_ADDRESSES_PER_CYCLE = '25';
    process.env.VECTOR_MIN_REPUBLISH_SEC = '600';
};

const loadAgent = async () => {
    vi.resetModules();
    return import('@server/services/vector/agent.js');
};

describe.sequential('Vector Agent Scoring Model', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        setTestEnv();
    });

    afterEach(async () => {
        process.env = originalEnv;
        const agent = await loadAgent();
        agent.__testResetVectorState();
    });

    it('assigns high risk tier for concentrated malicious behavior patterns', async () => {
        const agent = await loadAgent();
        const features = {
            tx_count: 18,
            tx_count_last_hour: 14,
            avg_risk_score: 92,
            max_risk_score: 99,
            high_risk_tx_count: 16,
            critical_risk_tx_count: 9,
            unique_counterparties: 2,
            feedback_count: 6,
            confirmed_risk_feedback: 6,
            wallet_score: 90,
            wallet_total_transactions: 22,
        };

        const score = agent.__testables.scoreAddressBehavior(features);

        expect(score.risk_score_0_1).toBeGreaterThan(0.75);
        expect(['high', 'critical']).toContain(score.risk_tier);
        expect(score.reputation_score).toBeLessThan(40);
        expect(score.recommended_action).not.toBe('allow_with_monitoring');
    });

    it('assigns low risk tier for diverse low-risk behavior patterns', async () => {
        const agent = await loadAgent();
        const features = {
            tx_count: 25,
            tx_count_last_hour: 1,
            avg_risk_score: 12,
            max_risk_score: 21,
            high_risk_tx_count: 0,
            critical_risk_tx_count: 0,
            unique_counterparties: 18,
            feedback_count: 4,
            confirmed_risk_feedback: 0,
            wallet_score: 18,
            wallet_total_transactions: 120,
        };

        const score = agent.__testables.scoreAddressBehavior(features);

        expect(score.risk_score_0_1).toBeLessThan(0.35);
        expect(score.risk_tier).toBe('low');
        expect(score.reputation_score).toBeGreaterThan(60);
        expect(score.recommended_action).toBe('allow_with_monitoring');
    });

    it('publishes on tier change but suppresses near-identical profiles inside republish window', async () => {
        const agent = await loadAgent();
        const now = Date.now();

        const previousLow = {
            risk_score: 0.22,
            risk_tier: 'low',
            on_chain_status: 'submitted',
            last_analyzed_at: new Date(now).toISOString(),
        };

        const nextLow = {
            risk_score_0_1: 0.23,
            risk_tier: 'low',
        };

        const shouldSkip = agent.__testables.shouldPublishProfile(previousLow, nextLow, now);
        expect(shouldSkip).toBe(false);

        const nextHigh = {
            risk_score_0_1: 0.72,
            risk_tier: 'high',
        };

        const shouldPublish = agent.__testables.shouldPublishProfile(previousLow, nextHigh, now);
        expect(shouldPublish).toBe(true);
    });
});
