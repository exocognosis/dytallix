import { describe, expect, it } from 'vitest';
import { __testables } from '@server/routes/aegis.js';

describe('Aegis search helpers', () => {
    it('detects typed prefixes and auto-detected entity types', () => {
        expect(__testables.detectSearchType('attestation:0xabc', 'auto')).toBe('attestation');
        expect(__testables.detectSearchType('anchor:0xabc', 'auto')).toBe('anchoring');
        expect(__testables.detectSearchType('12345', 'auto')).toBe('block');
        expect(__testables.detectSearchType('dytallix1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', 'auto')).toBe('wallet');
        expect(__testables.detectSearchType('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'auto')).toBe('transaction');
    });

    it('normalizes risk scores from 0-1 and 0-100 ranges', () => {
        expect(__testables.normalizeRiskScore(0.83)).toBe(83);
        expect(__testables.normalizeRiskScore(77)).toBe(77);
        expect(__testables.normalizeRiskScore('not-a-number')).toBeNull();
    });

    it('builds risk summaries with recommendation bands', () => {
        const low = __testables.buildRiskSummary(18, 0.6);
        const medium = __testables.buildRiskSummary(58, 0.7);
        const high = __testables.buildRiskSummary(92, 0.9);

        expect(low.recommendation).toBe('APPROVE');
        expect(medium.recommendation).toBe('CAUTION');
        expect(high.recommendation).toBe('REVIEW');
        expect(high.risk_level).toBe('HIGH');
    });
});

