/**
 * Aegis Insights Service
 * Predictive + "agentic" recommendations based on recent telemetry.
 */

import { getAegisTimeseries, getTopRiskyWallets } from './database.js';
import { getQueueStats } from './review-queue.js';
import { getThrottledWallets } from './throttle.js';

const clampInt = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(n)));
};

const toIsoNoMs = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

const estimateForecastConfidence = (points) => {
    const n = clampInt(points, 0, 10_000, 0);
    if (n >= 48) return 0.85;
    if (n >= 24) return 0.75;
    if (n >= 12) return 0.65;
    if (n >= 6) return 0.55;
    if (n >= 3) return 0.45;
    return 0.35;
};

const weightedLast3 = (values) => {
    const xs = (Array.isArray(values) ? values : []).filter(v => Number.isFinite(v));
    if (xs.length === 0) return { predicted: 0, method: 'empty' };
    if (xs.length === 1) return { predicted: xs[0], method: 'last_value' };
    if (xs.length === 2) return { predicted: 0.4 * xs[0] + 0.6 * xs[1], method: 'weighted_last_2' };

    const a = xs[xs.length - 3];
    const b = xs[xs.length - 2];
    const c = xs[xs.length - 1];
    return { predicted: 0.2 * a + 0.3 * b + 0.5 * c, method: 'weighted_last_3' };
};

const stddev = (values) => {
    const xs = (Array.isArray(values) ? values : []).filter(v => Number.isFinite(v));
    if (xs.length < 2) return 0;
    const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
    const variance = xs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / xs.length;
    return Math.sqrt(variance);
};

const forecastCount = (values) => {
    const xs = (Array.isArray(values) ? values : []).filter(v => Number.isFinite(v));
    const { predicted, method } = weightedLast3(xs);
    const s = stddev(xs.slice(-6));
    const pred = Math.max(0, predicted);
    const lower = Math.max(0, pred - 1.96 * s);
    const upper = Math.max(0, pred + 1.96 * s);
    return {
        predicted: Math.round(pred),
        lower: Math.round(lower),
        upper: Math.round(upper),
        method
    };
};

const forecastRatio = (values) => {
    const xs = (Array.isArray(values) ? values : []).filter(v => Number.isFinite(v)).map(v => Math.max(0, Math.min(1, v)));
    const { predicted, method } = weightedLast3(xs);
    const s = stddev(xs.slice(-6));
    const pred = Math.max(0, Math.min(1, predicted));
    const lower = Math.max(0, Math.min(1, pred - 1.96 * s));
    const upper = Math.max(0, Math.min(1, pred + 1.96 * s));
    return { predicted: pred, lower, upper, method };
};

const buildRecommendations = ({ forecastNext, queue, totalLast6 }) => {
    const recs = [];

    if (queue?.critical > 0) {
        recs.push({
            id: 'review-critical',
            severity: 'critical',
            title: 'Critical reviews pending',
            message: `${queue.critical} CRITICAL transaction(s) are waiting in the review queue.`,
            action: 'open_review_queue'
        });
    }

    if (queue?.pending > 10) {
        recs.push({
            id: 'review-backlog',
            severity: 'warn',
            title: 'Review backlog growing',
            message: `${queue.pending} pending transaction(s) in queue. Consider prioritizing CRITICAL/HIGH first.`,
            action: 'open_review_queue'
        });
    }

    if (forecastNext.total >= 10 && forecastNext.high_ratio >= 0.25) {
        recs.push({
            id: 'high-risk-trend',
            severity: 'warn',
            title: 'High-risk activity likely to rise',
            message: `Next bucket forecast: ~${forecastNext.high} HIGH risk of ~${forecastNext.total} total (${Math.round(forecastNext.high_ratio * 100)}%).`,
            action: 'monitor_alerts'
        });
    }

    if (totalLast6 === 0) {
        recs.push({
            id: 'no-telemetry',
            severity: 'info',
            title: 'No recent telemetry',
            message: 'No analyses detected in the recent window. Run a transaction analysis to populate the predictive model.',
            action: 'none'
        });
    }

    return recs;
};

export const getAegisInsights = ({ hoursBack = 24, bucketMinutes = 60, topWalletsLimit = 5 } = {}) => {
    const hours = clampInt(hoursBack, 1, 168, 24);
    const bucketMins = clampInt(bucketMinutes, 5, 360, 60);
    const topLimit = clampInt(topWalletsLimit, 1, 25, 5);

    const ts = getAegisTimeseries({ hoursBack: hours, bucketMinutes: bucketMins });
    const series = ts.series || [];

    const totals = series.map(p => Number(p.total || 0));
    const highs = series.map(p => Number(p.high || 0));
    const mediums = series.map(p => Number(p.medium || 0));
    const lows = series.map(p => Number(p.low || 0));

    const totalForecast = forecastCount(totals);

    const highRatios = series.map(p => {
        const total = Number(p.total || 0);
        const high = Number(p.high || 0);
        return total > 0 ? (high / total) : 0;
    });
    const highRatioForecast = forecastRatio(highRatios);

    const predictedTotal = totalForecast.predicted;
    let predictedHigh = Math.round(predictedTotal * highRatioForecast.predicted);

    // Keep medium/low proportional to last-window mix (fallback to 70/30 if no history).
    const totalHist = totals.reduce((s, v) => s + v, 0);
    const medHist = mediums.reduce((s, v) => s + v, 0);

    const mediumShare = totalHist > 0 ? (medHist / totalHist) : 0.7;

    let predictedMedium = Math.round(predictedTotal * mediumShare);
    let predictedLow = Math.max(0, predictedTotal - predictedHigh - predictedMedium);

    // Guard if rounding pushes totals negative/over.
    if (predictedHigh < 0) predictedHigh = 0;
    if (predictedMedium < 0) predictedMedium = 0;
    if (predictedLow < 0) predictedLow = 0;
    const sum = predictedHigh + predictedMedium + predictedLow;
    if (sum !== predictedTotal) {
        // Adjust low first, then medium.
        const delta = predictedTotal - sum;
        predictedLow = Math.max(0, predictedLow + delta);
    }

    const bucketSeconds = bucketMins * 60;
    const lastT = series.length ? Date.parse(series[series.length - 1].t) : Date.now();
    const nextBucketT = toIsoNoMs(new Date(lastT + bucketSeconds * 1000));

    const forecastNext = {
        t: nextBucketT,
        bucket_minutes: bucketMins,
        total: predictedTotal,
        high: predictedHigh,
        medium: predictedMedium,
        low: predictedLow,
        high_ratio: predictedTotal > 0 ? (predictedHigh / predictedTotal) : 0,
        confidence: estimateForecastConfidence(series.length),
        method: totalForecast.method
    };

    const queue = getQueueStats();
    const throttled_wallets = getThrottledWallets(null).length;
    const top_wallets = getTopRiskyWallets({ hoursBack: hours, limit: topLimit });

    const totalLast6 = totals.slice(-6).reduce((s, v) => s + v, 0);
    const recommendations = buildRecommendations({ forecastNext, queue, totalLast6 });

    return {
        generated_at: new Date().toISOString(),
        window: ts.window,
        series,
        forecast: {
            next_bucket: {
                ...forecastNext,
                total_ci: { lower: totalForecast.lower, upper: totalForecast.upper },
                high_ratio_ci: { lower: highRatioForecast.lower, upper: highRatioForecast.upper }
            }
        },
        queue,
        throttled_wallets,
        top_wallets,
        recommendations
    };
};

export default {
    getAegisInsights
};
