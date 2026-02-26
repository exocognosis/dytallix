import express from 'express';

const router = express.Router();

// Fast-launch stub routes (kept lightweight so the server can boot locally).
router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'consul', mode: 'fast-launch' });
});

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'consul',
    mode: 'fast-launch',
    description: 'Governance diplomat routes are stubbed in fast-launch mode.',
  });
});

export default router;
