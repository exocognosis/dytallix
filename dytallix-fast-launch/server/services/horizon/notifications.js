import { transporter } from '../../email/transport.js';
import { logInfo, logWarn } from '../../logger.js';

const severityRank = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0,
};

const parseBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on', 'y'].includes(String(value).trim().toLowerCase());
};

const toPositiveInt = (value, fallback, min = 1) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed < min) return fallback;
    return parsed;
};

const toCsvList = (value) => {
    if (!value) return [];
    return String(value)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
};

const sanitizeSeverity = (value, fallback = 'high') => {
    const normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(severityRank, normalized)
        ? normalized
        : fallback;
};

const severityAtLeast = (severity, minimum) => {
    const sev = sanitizeSeverity(severity, 'low');
    const min = sanitizeSeverity(minimum, 'high');
    return (severityRank[sev] || 0) >= (severityRank[min] || 0);
};

const clip = (value, max = 2800) => {
    const raw = String(value || '');
    if (raw.length <= max) return raw;
    return `${raw.slice(0, Math.max(0, max - 3))}...`;
};

const toPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildNotificationConfig = (env = process.env) => {
    const slackWebhookUrl = String(env.HORIZON_SLACK_WEBHOOK_URL || '').trim();
    const emailTargetsRaw = env.HORIZON_NOTIFY_EMAIL_TO || env.HORIZON_ALERT_EMAIL_TO || '';
    const emailRecipients = toCsvList(emailTargetsRaw);

    return {
        enabled: parseBool(env.HORIZON_NOTIFY_ENABLED, true),
        minSeverity: sanitizeSeverity(env.HORIZON_NOTIFY_MIN_SEVERITY, 'high'),
        slackWebhookUrl,
        slackTimeoutMs: Math.max(1_000, toPositiveInt(env.HORIZON_SLACK_TIMEOUT_MS, 5_000, 250)),
        emailRecipients,
        emailFrom: String(env.HORIZON_NOTIFY_EMAIL_FROM || env.EMAIL_FROM || 'noreply@dytallix.com').trim(),
    };
};

export const getHorizonNotificationConfig = () => {
    const config = buildNotificationConfig();
    return {
        enabled: config.enabled,
        min_severity: config.minSeverity,
        slack: {
            enabled: Boolean(config.slackWebhookUrl),
            timeout_ms: config.slackTimeoutMs,
        },
        email: {
            enabled: config.emailRecipients.length > 0,
            recipients_count: config.emailRecipients.length,
            from: config.emailFrom,
        },
    };
};

const summarizeCircuitActions = (actions = []) => {
    const summary = {
        total: 0,
        executed: 0,
        active: 0,
        failed: 0,
    };

    for (const action of actions) {
        summary.total += 1;
        const status = String(action?.status || '').toLowerCase();
        if (status === 'executed' || status === 'resolved') summary.executed += 1;
        if (status === 'active') summary.active += 1;
        if (status === 'failed') summary.failed += 1;
    }

    return summary;
};

export const buildNotificationMessage = ({
    incident,
    attestationResult = null,
    circuitActions = [],
    snapshotHash = null,
}) => {
    const severity = String(incident?.severity || 'unknown').toUpperCase();
    const risk = toPercent(incident?.risk_score);
    const confidence = toPercent(incident?.confidence);
    const incidentType = String(incident?.incident_type || 'unknown');
    const incidentId = String(incident?.incident_id || 'unknown');
    const onChainStatus = String(attestationResult?.on_chain_status || 'not-submitted');
    const actionSummary = summarizeCircuitActions(circuitActions);
    const shortSnapshot = snapshotHash ? String(snapshotHash).slice(0, 16) : 'n/a';

    const subject = `[Horizon][${severity}] ${incidentType} (${incidentId})`;
    const headline = `${severity} Horizon incident: ${incidentType}`;
    const lines = [
        headline,
        `Incident: ${incidentId}`,
        `Risk: ${risk} | Confidence: ${confidence}`,
        `On-chain attestation: ${onChainStatus}`,
        `Circuit actions: total=${actionSummary.total}, executed=${actionSummary.executed}, active=${actionSummary.active}, failed=${actionSummary.failed}`,
        `Snapshot: ${shortSnapshot}`,
        `Summary: ${incident?.summary || 'No summary provided.'}`,
    ];
    const text = clip(lines.join('\n'), 3_500);

    const html = `
<p><strong>${escapeHtml(headline)}</strong></p>
<ul>
  <li><strong>Incident:</strong> ${escapeHtml(incidentId)}</li>
  <li><strong>Risk:</strong> ${escapeHtml(risk)} | <strong>Confidence:</strong> ${escapeHtml(confidence)}</li>
  <li><strong>On-chain attestation:</strong> ${escapeHtml(onChainStatus)}</li>
  <li><strong>Circuit actions:</strong> total=${actionSummary.total}, executed=${actionSummary.executed}, active=${actionSummary.active}, failed=${actionSummary.failed}</li>
  <li><strong>Snapshot:</strong> ${escapeHtml(shortSnapshot)}</li>
</ul>
<p><strong>Summary:</strong> ${escapeHtml(incident?.summary || 'No summary provided.')}</p>
`.trim();

    return {
        subject,
        text,
        html,
        slackText: clip(`${subject}\n${text}`, 3_500),
    };
};

const sendSlackNotification = async ({
    webhookUrl,
    text,
    timeoutMs,
}) => {
    if (!webhookUrl) {
        return { attempted: false, success: false, skipped: true, reason: 'slack_not_configured' };
    }

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal,
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            return {
                attempted: true,
                success: false,
                status: response.status,
                error: clip(body || `HTTP_${response.status}`, 500),
            };
        }

        return {
            attempted: true,
            success: true,
            status: response.status,
        };
    } catch (error) {
        return {
            attempted: true,
            success: false,
            error: error?.name === 'AbortError'
                ? `timeout_after_${timeoutMs}ms`
                : (error?.message || 'slack_send_failed'),
        };
    } finally {
        clearTimeout(abortTimer);
    }
};

const sendEmailNotification = async ({
    recipients,
    from,
    subject,
    text,
    html,
}) => {
    if (!recipients || recipients.length === 0) {
        return { attempted: false, success: false, skipped: true, reason: 'email_not_configured' };
    }

    try {
        const info = await transporter.sendMail({
            from,
            to: recipients.join(', '),
            subject,
            text,
            html,
        });

        return {
            attempted: true,
            success: true,
            message_id: info?.messageId || null,
        };
    } catch (error) {
        return {
            attempted: true,
            success: false,
            error: error?.message || 'email_send_failed',
        };
    }
};

export const notifyHorizonIncident = async ({
    incident,
    attestationResult = null,
    circuitActions = [],
    snapshotHash = null,
} = {}) => {
    if (!incident) {
        return {
            success: false,
            skipped: true,
            reason: 'missing_incident',
            attempted_channels: 0,
            sent_channels: 0,
            failed_channels: 0,
        };
    }

    const config = buildNotificationConfig();
    if (!config.enabled) {
        return {
            success: false,
            skipped: true,
            reason: 'notifications_disabled',
            attempted_channels: 0,
            sent_channels: 0,
            failed_channels: 0,
        };
    }

    if (!severityAtLeast(incident.severity, config.minSeverity)) {
        return {
            success: false,
            skipped: true,
            reason: 'severity_below_threshold',
            attempted_channels: 0,
            sent_channels: 0,
            failed_channels: 0,
        };
    }

    const channelsConfigured = Boolean(config.slackWebhookUrl) || config.emailRecipients.length > 0;
    if (!channelsConfigured) {
        return {
            success: false,
            skipped: true,
            reason: 'no_channels_configured',
            attempted_channels: 0,
            sent_channels: 0,
            failed_channels: 0,
        };
    }

    const message = buildNotificationMessage({
        incident,
        attestationResult,
        circuitActions,
        snapshotHash,
    });

    const [slack, email] = await Promise.all([
        sendSlackNotification({
            webhookUrl: config.slackWebhookUrl,
            text: message.slackText,
            timeoutMs: config.slackTimeoutMs,
        }),
        sendEmailNotification({
            recipients: config.emailRecipients,
            from: config.emailFrom,
            subject: message.subject,
            text: message.text,
            html: message.html,
        }),
    ]);

    const attemptedChannels = [slack, email].filter(item => item.attempted).length;
    const sentChannels = [slack, email].filter(item => item.success).length;
    const failedChannels = [slack, email].filter(item => item.attempted && !item.success).length;

    if (failedChannels > 0) {
        logWarn('Horizon notifications partially failed', {
            incident_id: incident.incident_id,
            attempted_channels: attemptedChannels,
            sent_channels: sentChannels,
            failed_channels: failedChannels,
            slack,
            email,
        });
    }

    if (sentChannels > 0) {
        logInfo('Horizon notifications sent', {
            incident_id: incident.incident_id,
            attempted_channels: attemptedChannels,
            sent_channels: sentChannels,
            failed_channels: failedChannels,
        });
    }

    return {
        success: failedChannels === 0 && sentChannels > 0,
        partial: sentChannels > 0 && failedChannels > 0,
        skipped: false,
        attempted_channels: attemptedChannels,
        sent_channels: sentChannels,
        failed_channels: failedChannels,
        channels: {
            slack,
            email,
        },
    };
};

export const __testables = {
    buildNotificationConfig,
    severityAtLeast,
    buildNotificationMessage,
};

export default {
    notifyHorizonIncident,
    getHorizonNotificationConfig,
};
