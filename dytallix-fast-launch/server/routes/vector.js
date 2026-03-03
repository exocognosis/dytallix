import express from 'express';
import { logError } from '../logger.js';
import {
  fetchVectorAddress,
  fetchVectorFeed,
  fetchVectorProfiles,
  getVectorSnapshot,
  runVectorCycle,
} from '../services/vector/agent.js';

const router = express.Router();

const toPositiveInt = (value, fallback, max = 500) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

router.get('/health', async (_req, res) => {
  try {
    const snapshot = await getVectorSnapshot();
    const hasError = Boolean(snapshot?.agent?.last_error);
    res.status(hasError ? 503 : 200).json({
      success: !hasError,
      service: 'vector',
      status: hasError ? 'degraded' : 'healthy',
      running: Boolean(snapshot?.agent?.running),
      last_run_at: snapshot?.agent?.last_run_at || null,
      last_error: snapshot?.agent?.last_error || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'vector',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const snapshot = await getVectorSnapshot();
    res.json(snapshot);
  } catch (error) {
    logError('Vector status endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to load Vector status',
      message: error.message,
    });
  }
});

router.post('/run', async (req, res) => {
  try {
    const maxAddresses = req.body?.max_addresses;
    const result = await runVectorCycle({
      manual: true,
      maxAddresses,
    });

    const status = result.success ? 200 : result.skipped ? 409 : 500;
    res.status(status).json(result);
  } catch (error) {
    logError('Vector run endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to run Vector cycle',
      message: error.message,
    });
  }
});

router.get('/feed', (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 100);
    const riskTier = req.query.risk_tier ? String(req.query.risk_tier).toLowerCase() : null;
    const items = fetchVectorFeed({ limit, riskTier });

    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    logError('Vector feed endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to load Vector feed',
      message: error.message,
    });
  }
});

router.get('/profiles', (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 100);
    const riskTier = req.query.risk_tier ? String(req.query.risk_tier).toLowerCase() : null;
    const items = fetchVectorProfiles({ limit, riskTier });

    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    logError('Vector profiles endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to load Vector profiles',
      message: error.message,
    });
  }
});

router.get('/address/:address', (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit, 20, 200);
    const payload = fetchVectorAddress({
      address: req.params.address,
      limit,
    });

    if (!payload) {
      return res.status(404).json({
        success: false,
        error: 'Address not found',
      });
    }

    return res.json({
      success: true,
      ...payload,
    });
  } catch (error) {
    logError('Vector address endpoint failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to load address profile',
      message: error.message,
    });
  }
});

export default router;
