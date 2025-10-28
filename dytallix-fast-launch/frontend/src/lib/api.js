const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

async function http(path, opts={}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const fetchHero = () => http('/api/telemetry/hero');
export const fetchDashboard = () => http('/api/telemetry/dashboard');
export const requestFaucet = (payload) =>
  http('/api/faucet/request', { method: 'POST', body: JSON.stringify(payload) });
