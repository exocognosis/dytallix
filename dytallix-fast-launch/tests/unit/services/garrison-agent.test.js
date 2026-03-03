import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const makeJsonResponse = (payload, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
});

const setTestEnv = () => {
    process.env.GARRISON_AGENT_ENABLED = 'true';
    process.env.GARRISON_AUTO_REMEDIATE = 'true';
    process.env.DYT_GARRISON_PASS_THRESHOLD = '0.9';
    process.env.GARRISON_AI_SERVICE_URL = 'http://garrison-ai.test';
    process.env.GARRISON_AI_TIMEOUT_MS = '2500';
    process.env.GARRISON_MAX_JOBS_PER_CYCLE = '5';
    process.env.GARRISON_MAX_RETAINED_JOBS = '200';
};

const loadAgent = async () => {
    vi.resetModules();
    return import('@server/services/garrison/agent.js');
};

describe.sequential('Garrison Agent Service', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        setTestEnv();
    });

    afterEach(async () => {
        vi.unstubAllGlobals();
        process.env = originalEnv;
        const agent = await loadAgent();
        agent.__testResetGarrisonState();
    });

    it('runs queued jobs and auto-remediates when audit score is below threshold', async () => {
        const fetchMock = vi.fn(async (url) => {
            if (String(url).includes('/audit/remediate')) {
                return makeJsonResponse({
                    contract_hash: '0xabc',
                    re_audit: { score: 0.95, issues: [], passes_threshold: true },
                    threshold: 0.9,
                    onchain: { attempted: true, submitted: true },
                });
            }
            if (String(url).includes('/audit')) {
                return makeJsonResponse({
                    score: 0.62,
                    contract_hash: '0xabc',
                    issues: ["Detected 'tx.origin' usage - Phishing Risk"],
                    onchain: { attempted: true, submitted: true },
                });
            }
            throw new Error(`Unexpected URL: ${url}`);
        });
        vi.stubGlobal('fetch', fetchMock);

        const agent = await loadAgent();
        agent.__testResetGarrisonState();

        const queued = agent.enqueueGarrisonJob({
            contract_code: 'contract T { function x() public {} }',
            source: 'unit-test',
        });
        expect(queued.status).toBe('queued');

        const cycle = await agent.runGarrisonCycle({ manual: true });
        expect(cycle.success).toBe(true);
        expect(cycle.processed).toBe(1);
        expect(cycle.failed).toBe(0);
        expect(cycle.onchain_submitted).toBe(2);

        const snapshot = await agent.getGarrisonSnapshot();
        expect(snapshot.totals.jobsQueued).toBe(1);
        expect(snapshot.totals.jobsProcessed).toBe(1);
        expect(snapshot.totals.auditCalls).toBe(1);
        expect(snapshot.totals.remediationCalls).toBe(1);
        expect(snapshot.totals.onChainSubmitted).toBe(2);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toContain('/audit');
        expect(fetchMock.mock.calls[1][0]).toContain('/audit/remediate');
    });

    it('skips remediation when audit score already meets threshold', async () => {
        const fetchMock = vi.fn(async (url) => {
            if (String(url).includes('/audit/remediate')) {
                throw new Error('remediation should not be called');
            }
            if (String(url).includes('/audit')) {
                return makeJsonResponse({
                    score: 0.97,
                    contract_hash: '0xdef',
                    issues: [],
                    onchain: { attempted: true, submitted: false, error: 'test' },
                });
            }
            throw new Error(`Unexpected URL: ${url}`);
        });
        vi.stubGlobal('fetch', fetchMock);

        const agent = await loadAgent();
        agent.__testResetGarrisonState();
        agent.enqueueGarrisonJob({
            contract_code: 'contract U { function y() public {} }',
            source: 'unit-test',
        });

        const cycle = await agent.runGarrisonCycle({ manual: true });
        expect(cycle.success).toBe(true);
        expect(cycle.processed).toBe(1);
        expect(cycle.failed).toBe(0);
        expect(cycle.onchain_submitted).toBe(0);
        expect(cycle.onchain_failed).toBe(1);

        const snapshot = await agent.getGarrisonSnapshot();
        expect(snapshot.totals.auditCalls).toBe(1);
        expect(snapshot.totals.remediationCalls).toBe(0);
        expect(snapshot.totals.onChainFailed).toBe(1);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toContain('/audit');
    });
});

