import express from 'express';
import fetch from 'node-fetch';
const app = express();
app.use(express.json());
app.post('/scan', async (req, res) => {
  const r = await fetch(process.env.CODESHIELD_API + '/scan', { method: 'POST' });
  const j = await r.json().catch(()=>({}));
  res.status(r.status).json(j);
});
app.get('/report/:id', async (req, res) => {
  const r = await fetch(process.env.CODESHIELD_API + '/report/' + req.params.id);
  const j = await r.json().catch(()=>({}));
  res.status(r.status).json(j);
});
app.get('/health', (_req, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 7081, () => console.log('Proxy on :' + (process.env.PORT||7081)));
