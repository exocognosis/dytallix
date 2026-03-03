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
    proposals_analyzed: 0,
    attestations_posted: 0,
    disputes_filed: 0,
    open_disputes: 0,
    on_chain_attestations: 0,
  },
  latest_attestations: [],
  latest_disputes: [],
  mode: 'fast-launch',
});

router.get('/health', (_req, res) => {
  res.json({ success: true, ok: true, service: 'consul', mode: 'fast-launch' });
});

router.get('/status', (_req, res) => {
  res.json(buildStatus());
});

router.post('/run', (_req, res) => {
  res.json({
    success: true,
    skipped: true,
    reason: 'consul_stub_mode',
    mode: 'fast-launch',
  });
});

router.get('/proposals', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    proposals: [],
    mode: 'fast-launch',
  });
});

router.get('/attestations', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    items: [],
    mode: 'fast-launch',
  });
});

router.get('/disputes', (_req, res) => {
  res.json({
    success: true,
    count: 0,
    items: [],
    mode: 'fast-launch',
  });
});

router.post('/disputes', (req, res) => {
  const { proposal_id, reason } = req.body || {};
  if (!proposal_id || !reason) {
    return res.status(400).json({
      success: false,
      error: 'proposal_id and reason are required',
    });
  }

  return res.status(202).json({
    success: true,
    dispute: {
      dispute_id: `stub-${Date.now()}`,
      proposal_id,
      reason,
      severity: req.body?.severity || 'medium',
      status: 'queued',
      created_at: new Date().toISOString(),
    },
    mode: 'fast-launch',
  });
});

export default router;
