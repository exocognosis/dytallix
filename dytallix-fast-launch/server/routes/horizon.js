import express from 'express';

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'horizon', mode: 'fast-launch' });
});

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    service: 'horizon',
    mode: 'fast-launch',
    description: 'Network/DeFi monitoring routes are stubbed in fast-launch mode.',
  });
});

export default router;
