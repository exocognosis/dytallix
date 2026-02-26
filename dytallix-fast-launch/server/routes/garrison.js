import express from 'express';

const router = express.Router();

// NOTE: This router is mounted at /api in server/index.js.
// Keep routes namespaced to avoid collisions.
router.get('/garrison/health', (_req, res) => {
  res.json({ ok: true, service: 'garrison', mode: 'fast-launch' });
});

router.get('/garrison/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'garrison',
    mode: 'fast-launch',
    description: 'Compliance + agentic routes are stubbed in fast-launch mode.',
  });
});

export default router;
