/**
 * Aegis Security Posture Service
 * Goal-oriented KPIs for "security posture" (time-to-containment, SLA, FP rate).
 *
 * Notes:
 * - "False positive rate" is approximated from review outcomes: approved == likely FP, rejected == likely TP.
 * - "Containment" is operationalized here as time-to-review-decision for queued transactions.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../..', 'data', 'leads.db');

let db = null;

const getDb = () => {
    if (!db) db = new Database(dbPath);
    return db;
};

export const closeAegisPostureDb = () => {
    try {
        if (db) db.close();
    } catch {
        // ignore shutdown errors
    } finally {
        db = null;
    }
};

const clampInt = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
};

const safeDiv = (a, b) => (b > 0 ? (a / b) : 0);

const round1 = (n) => Math.round(n * 10) / 10;

const percentile = (sortedNumbers, p) => {
    const xs = Array.isArray(sortedNumbers) ? sortedNumbers : [];
    if (xs.length === 0) return 0;
    const clamped = Math.max(0, Math.min(1, p));
    const idx = Math.floor((xs.length - 1) * clamped);
    return xs[idx];
};

const summarizeDurations = (durationsMinutes) => {
    const xs = (Array.isArray(durationsMinutes) ? durationsMinutes : [])
        .filter(v => Number.isFinite(v) && v >= 0)
        .sort((a, b) => a - b);

    if (xs.length === 0) {
        return {
            count: 0,
            avg_minutes: 0,
            p50_minutes: 0,
            p90_minutes: 0,
            p95_minutes: 0
        };
    }

    const avg = xs.reduce((s, v) => s + v, 0) / xs.length;
    return {
        count: xs.length,
        avg_minutes: round1(avg),
        p50_minutes: round1(percentile(xs, 0.5)),
        p90_minutes: round1(percentile(xs, 0.9)),
        p95_minutes: round1(percentile(xs, 0.95))
    };
};

export const getAegisSecurityPosture = ({ windowDays = 7 } = {}) => {
    const days = clampInt(windowDays, 1, 90, 7);
    const dbi = getDb();

    // SLA thresholds aligned with review-queue expirations.
    const sla = {
        critical_minutes: 60,
        high_minutes: 360
    };

    // Current pending breaches (now).
    const pendingBreachedStmt = dbi.prepare(`
        SELECT COUNT(*) as count
        FROM aegis_review_queue
        WHERE status = 'pending' AND priority = ? AND expires_at < datetime('now')
    `);
    const pendingDueSoonStmt = dbi.prepare(`
        SELECT COUNT(*) as count
        FROM aegis_review_queue
        WHERE status = 'pending' AND priority = ? AND expires_at <= datetime('now', ?)
    `);

    const critical_breached = pendingBreachedStmt.get(2).count || 0;
    const high_breached = pendingBreachedStmt.get(1).count || 0;
    const critical_due_15m = pendingDueSoonStmt.get(2, '+15 minutes').count || 0;
    const high_due_60m = pendingDueSoonStmt.get(1, '+60 minutes').count || 0;

    // Decision rows for the posture window.
    const decidedRows = dbi.prepare(`
        SELECT priority, status, created_at, reviewed_at
        FROM aegis_review_queue
        WHERE reviewed_at IS NOT NULL
          AND reviewed_at >= datetime('now', ?)
    `).all(`-${days} days`);

    const durations = { critical: [], high: [], overall: [] };
    const outcomes = {
        critical: { approved: 0, rejected: 0 },
        high: { approved: 0, rejected: 0 },
        overall: { approved: 0, rejected: 0 }
    };
    const slaMet = {
        critical_within: 0,
        critical_total: 0,
        high_within: 0,
        high_total: 0
    };

    for (const row of decidedRows) {
        const createdAt = Date.parse(row.created_at);
        const reviewedAt = Date.parse(row.reviewed_at);
        if (!Number.isFinite(createdAt) || !Number.isFinite(reviewedAt)) continue;
        const minutes = (reviewedAt - createdAt) / (1000 * 60);
        if (!Number.isFinite(minutes) || minutes < 0) continue;

        durations.overall.push(minutes);

        if (row.status === 'approved') {
            outcomes.overall.approved += 1;
        } else if (row.status === 'rejected') {
            outcomes.overall.rejected += 1;
        }

        if (row.priority === 2) {
            durations.critical.push(minutes);
            slaMet.critical_total += 1;
            if (minutes <= sla.critical_minutes) slaMet.critical_within += 1;
            if (row.status === 'approved') outcomes.critical.approved += 1;
            else if (row.status === 'rejected') outcomes.critical.rejected += 1;
        } else if (row.priority === 1) {
            durations.high.push(minutes);
            slaMet.high_total += 1;
            if (minutes <= sla.high_minutes) slaMet.high_within += 1;
            if (row.status === 'approved') outcomes.high.approved += 1;
            else if (row.status === 'rejected') outcomes.high.rejected += 1;
        }
    }

    // Expired counts in window (based on created_at because reviewed_at is typically null for expired).
    const expiredByPriority = dbi.prepare(`
        SELECT priority, COUNT(*) as count
        FROM aegis_review_queue
        WHERE status = 'expired'
          AND created_at >= datetime('now', ?)
        GROUP BY priority
    `).all(`-${days} days`);
    const expired = { critical: 0, high: 0, overall: 0 };
    for (const row of expiredByPriority) {
        if (row.priority === 2) expired.critical = Number(row.count || 0);
        else if (row.priority === 1) expired.high = Number(row.count || 0);
        expired.overall += Number(row.count || 0);
    }

    const decided_summary = {
        overall: summarizeDurations(durations.overall),
        critical: summarizeDurations(durations.critical),
        high: summarizeDurations(durations.high)
    };

    const falsePositiveRate = (approved, rejected) => {
        const denom = approved + rejected;
        return denom > 0 ? (approved / denom) : 0;
    };

    const posture = {
        generated_at: new Date().toISOString(),
        window: { days },
        sla: {
            critical: {
                minutes: sla.critical_minutes,
                pending_breached: critical_breached,
                pending_due_soon: critical_due_15m,
                decided_total: slaMet.critical_total,
                decided_within_sla: slaMet.critical_within,
                compliance_rate: safeDiv(slaMet.critical_within, slaMet.critical_total)
            },
            high: {
                minutes: sla.high_minutes,
                pending_breached: high_breached,
                pending_due_soon: high_due_60m,
                decided_total: slaMet.high_total,
                decided_within_sla: slaMet.high_within,
                compliance_rate: safeDiv(slaMet.high_within, slaMet.high_total)
            }
        },
        time_to_decision_minutes: decided_summary,
        outcomes: {
            critical: {
                ...outcomes.critical,
                expired: expired.critical,
                false_positive_rate: falsePositiveRate(outcomes.critical.approved, outcomes.critical.rejected)
            },
            high: {
                ...outcomes.high,
                expired: expired.high,
                false_positive_rate: falsePositiveRate(outcomes.high.approved, outcomes.high.rejected)
            },
            overall: {
                ...outcomes.overall,
                expired: expired.overall,
                false_positive_rate: falsePositiveRate(outcomes.overall.approved, outcomes.overall.rejected)
            }
        },
        notes: [
            'False-positive rate is approximated as approved/(approved+rejected) for reviewed queue items.',
            'Containment is proxied by time-to-review-decision for queued transactions.'
        ]
    };

    return posture;
};

export default {
    getAegisSecurityPosture,
    closeAegisPostureDb
};
