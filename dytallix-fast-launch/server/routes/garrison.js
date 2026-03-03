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
    auditCalls: 0,
    queuedJobs: 0,
    attestations: 0,
  },
  jobs: [],
  mode: 'fast-launch',
});

// NOTE: This router is mounted at /api in server/index.js.
// Keep routes namespaced to avoid collisions.
router.get('/garrison/health', (_req, res) => {
  res.json({ success: true, ok: true, service: 'garrison', mode: 'fast-launch' });
});

router.get('/garrison/status', (_req, res) => {
  res.json(buildStatus());
});

router.post('/garrison/run', (_req, res) => {
  res.json({
    success: true,
    skipped: true,
    reason: 'garrison_stub_mode',
    mode: 'fast-launch',
  });
});

router.get('/garrison/jobs', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    jobs: [],
    mode: 'fast-launch',
  });
});

router.post('/garrison/jobs', (_req, res) => {
  res.status(202).json({
    success: true,
    job: {
      id: `stub-${Date.now()}`,
      status: 'queued',
      created_at: new Date().toISOString(),
    },
    mode: 'fast-launch',
  });
});

router.get('/garrison/attestations', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    items: [],
    mode: 'fast-launch',
  });
});

router.get('/garrison/attestations/:contractHash', (req, res) => {
  res.json({
    success: true,
    contract_hash: req.params.contractHash,
    attestation: null,
    mode: 'fast-launch',
  });
});

export default router;
