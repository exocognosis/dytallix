import express from 'express';

const router = express.Router();
const startedAt = new Date().toISOString();

const buildStatus = () => ({
  success: true,
  agent: {
    started_at: startedAt,
    last_run_at: null,
    last_run_ms: null,
    running: false,
    run_count: 0,
    last_error: null,
  },
  totals: {
    incidents_total: 0,
    incidents_open: 0,
    circuit_breakers_total: 0,
    circuit_breakers_active: 0,
    snapshots_indexed: 0,
    attestations_relayed: 0,
    incidents_detected: 0,
  },
  mode: 'fast-launch',
});

router.get('/health', (_req, res) => {
  res.json({ success: true, ok: true, service: 'horizon', mode: 'fast-launch' });
});

router.get('/status', (_req, res) => {
  res.json(buildStatus());
});

router.post('/run', (_req, res) => {
  res.json({
    success: true,
    skipped: true,
    reason: 'horizon_stub_mode',
    mode: 'fast-launch',
  });
});

router.get('/incidents', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    incidents: [],
    mode: 'fast-launch',
  });
});

router.get('/circuit-breakers', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    actions: [],
    mode: 'fast-launch',
  });
});

router.get('/telemetry', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    snapshots: [],
    mode: 'fast-launch',
  });
});

export default router;
