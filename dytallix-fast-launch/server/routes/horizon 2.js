import express from 'express/lib/express.js';
import { logError } from '../logger.js';
import {
    fetchHorizonCircuitBreakers,
    fetchHorizonIncidents,
    fetchHorizonTelemetry,
    getHorizonSnapshot,
    runHorizonCycle,
} from '../services/horizon/agent.js';

const router = express.Router();

const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
};

router.get('/status', async (req, res) => {
    try {
        const snapshot = await getHorizonSnapshot();
        res.json(snapshot);
    } catch (error) {
        logError('Horizon status endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to load Horizon status',
            message: error.message,
        });
    }
});

router.post('/run', async (req, res) => {
    try {
        const result = await runHorizonCycle({ manual: true });
        const status = result.success ? 200 : result.skipped ? 409 : 500;
        res.status(status).json(result);
    } catch (error) {
        logError('Horizon run endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to run Horizon cycle',
            message: error.message,
        });
    }
});

router.get('/incidents', async (req, res) => {
    try {
        const status = req.query.status ? String(req.query.status) : 'all';
        const incidentType = req.query.type ? String(req.query.type) : null;
        const limit = toPositiveInt(req.query.limit, 100);
        const incidents = fetchHorizonIncidents({ status, limit, incidentType });

        res.json({
            success: true,
            count: incidents.length,
            incidents,
        });
    } catch (error) {
        logError('Horizon incidents endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to list incidents',
            message: error.message,
        });
    }
});

router.get('/circuit-breakers', async (req, res) => {
    try {
        const status = req.query.status ? String(req.query.status) : 'all';
        const limit = toPositiveInt(req.query.limit, 100);
        const actions = fetchHorizonCircuitBreakers({ status, limit });

        res.json({
            success: true,
            count: actions.length,
            actions,
        });
    } catch (error) {
        logError('Horizon circuit breakers endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to list circuit-breaker actions',
            message: error.message,
        });
    }
});

router.get('/telemetry', async (req, res) => {
    try {
        const limit = toPositiveInt(req.query.limit, 60);
        const snapshots = fetchHorizonTelemetry({ limit });

        res.json({
            success: true,
            count: snapshots.length,
            snapshots,
        });
    } catch (error) {
        logError('Horizon telemetry endpoint failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to list telemetry snapshots',
            message: error.message,
        });
    }
});

router.get('/health', async (req, res) => {
    try {
        const snapshot = await getHorizonSnapshot();
        const hasError = Boolean(snapshot?.agent?.last_error);
        res.status(hasError ? 503 : 200).json({
            success: !hasError,
            service: 'Horizon',
            status: hasError ? 'degraded' : 'healthy',
            running: Boolean(snapshot?.agent?.running),
            last_run_at: snapshot?.agent?.last_run_at || null,
            last_error: snapshot?.agent?.last_error || null,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            service: 'Horizon',
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

export default router;
