import { describe, expect, it } from 'vitest';
import { __testables } from '@server/services/horizon/notifications.js';

describe('Horizon notifications', () => {
    it('builds notification config with parsed recipients', () => {
        const config = __testables.buildNotificationConfig({
            HORIZON_NOTIFY_ENABLED: 'true',
            HORIZON_NOTIFY_MIN_SEVERITY: 'medium',
            HORIZON_SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T000/B000/XXX',
            HORIZON_NOTIFY_EMAIL_TO: 'alerts@dytallix.com,ops@dytallix.com',
            HORIZON_NOTIFY_EMAIL_FROM: 'horizon@dytallix.com',
        });

        expect(config.enabled).toBe(true);
        expect(config.minSeverity).toBe('medium');
        expect(config.slackWebhookUrl).toContain('hooks.slack.com');
        expect(config.emailRecipients).toEqual([
            'alerts@dytallix.com',
            'ops@dytallix.com',
        ]);
        expect(config.emailFrom).toBe('horizon@dytallix.com');
    });

    it('compares severity against minimum threshold', () => {
        expect(__testables.severityAtLeast('critical', 'high')).toBe(true);
        expect(__testables.severityAtLeast('high', 'high')).toBe(true);
        expect(__testables.severityAtLeast('medium', 'high')).toBe(false);
    });

    it('builds a notification envelope with incident and action context', () => {
        const message = __testables.buildNotificationMessage({
            incident: {
                incident_id: 'hzn-abc123',
                incident_type: 'bridge_backlog',
                severity: 'critical',
                risk_score: 0.95,
                confidence: 0.88,
                summary: 'Bridge backlog exceeded threshold',
            },
            attestationResult: {
                on_chain_status: 'submitted',
            },
            circuitActions: [
                { action_type: 'BRIDGE_HALT', status: 'active' },
                { action_type: 'GOVERNANCE_PARAMETER_SHIFT', status: 'executed' },
            ],
            snapshotHash: '0123456789abcdef-fedcba9876543210',
        });

        expect(message.subject).toContain('[Horizon][CRITICAL]');
        expect(message.text).toContain('hzn-abc123');
        expect(message.text).toContain('On-chain attestation: submitted');
        expect(message.text).toContain('Circuit actions: total=2');
        expect(message.html).toContain('Bridge backlog exceeded threshold');
        expect(message.slackText).toContain('bridge_backlog');
    });
});
