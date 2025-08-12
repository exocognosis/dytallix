// Cosmos faucet helper
// POST to FAUCET_URL with { address: "<bech32>" }

export interface FaucetResponse {
  ok: boolean;
  token?: string;
  amount?: string | number;
  txHash?: string;
  code?: string;
  message?: string;
}

function withTimeout(p: Promise<Response>, ms = 15000) {
  return new Promise<Response>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Timeout contacting faucet')), ms)
    p.then((r) => { clearTimeout(id); resolve(r) }, (e) => { clearTimeout(id); reject(e) })
  })
}

export async function requestCosmosFaucet(address: string): Promise<FaucetResponse> {
  // Prefer Vite client env in browser
  const viteUrl = (import.meta as any)?.env?.VITE_FAUCET_URL
  const nodeUrl = (globalThis as any)?.process?.env?.FAUCET_URL
  const url = viteUrl || nodeUrl || '/api/faucet'
  if (!url) throw new Error('Missing FAUCET_URL')
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address })
  }))
  let data: FaucetResponse | null = null
  try { data = await res.json() } catch { data = null }
  if (!res.ok) {
    const msg = data?.message || data?.code || `HTTP_${res.status}`
    const err: any = new Error(`Faucet error: ${msg}`)
    err.code = data?.code || String(res.status)
    throw err
  }
  // normalize fields
  if (data && (data as any).hash && !data.txHash) (data as any).txHash = (data as any).hash
  if (data && typeof (data as any).amount === 'number') (data as any).amount = String((data as any).amount)
  return (data as FaucetResponse) || { ok: true }
}
