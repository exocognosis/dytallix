// Cosmos faucet helper
// Uses centralized environment configuration

import { faucetBaseUrl } from '../config/env.ts'

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

export async function requestCosmosFaucet(address: string, token: 'DGT' | 'DRT' = 'DRT'): Promise<FaucetResponse> {
  const url = faucetBaseUrl
  if (!url) throw new Error('Faucet URL not configured')
  
  const body = JSON.stringify({ address, token })
  const res = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body
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
  if (data && !(data as any).token) (data as any).token = token
  return (data as FaucetResponse) || { ok: true, token }
}
