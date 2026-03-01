import { describe, expect, it } from 'vitest';
import { __testables } from '@server/services/horizon/agent.js';

describe('Horizon agent detectors', () => {
    it('detects mempool spike and sender concentration incidents', () => {
        const snapshot = {
            raw_payload: {
                telemetry: {
                    mempool: {
                        count: 320,
                        top_sender: 'dytallix1attacker0000000000000000000000000',
                        top_sender_count: 180,
                        top_sender_share: 0.5625,
                    },
                },
            },
        };

        const incidents = __testables.detectMempoolIncidents(snapshot, null);
        const types = incidents.map(item => item.incident_type);

        expect(types).toContain('mempool_spike');
        expect(types).toContain('mempool_concentration');
    });

    it('detects emission pool drain anomalies across snapshots', () => {
        const previousSnapshot = {
            emission_pools: {
                bridge_operations: '100000000',
                staking_rewards: '200000000',
            },
        };
        const snapshot = {
            emission_pools: {
                bridge_operations: '65000000',
                staking_rewards: '198000000',
            },
        };

        const incidents = __testables.detectPoolIncidents(snapshot, previousSnapshot);

        expect(incidents.length).toBeGreaterThan(0);
        expect(incidents[0].incident_type).toBe('pool_drain');
        expect(incidents[0].details.pool).toBe('bridge_operations');
    });

    it('collapses duplicate candidates by fingerprint and keeps highest severity', () => {
        const duplicateCandidates = [
            {
                incident_type: 'mempool_spike',
                severity: 'high',
                risk_score: 0.78,
                confidence: 0.8,
                summary: 'High mempool',
                details: { pending_count: 280 },
                fingerprint_key: 'size',
            },
            {
                incident_type: 'mempool_spike',
                severity: 'critical',
                risk_score: 0.91,
                confidence: 0.86,
                summary: 'Critical mempool',
                details: { pending_count: 520 },
                fingerprint_key: 'size',
            },
        ];

        const collapsed = __testables.collapseCandidates(duplicateCandidates);

        expect(collapsed).toHaveLength(1);
        expect(collapsed[0].severity).toBe('critical');
        expect(collapsed[0].risk_score).toBeGreaterThan(0.9);
        expect(typeof __testables.buildIncidentFingerprint(collapsed[0])).toBe('string');
    });
});
