// API client utilities
const API_BASE = '/api'

export const api = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`)
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return response.json()
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return response.json()
  }
}

// Faucet API functions
// Normalized dual-token-capable client used by UI and unit tests
// Accepts object form: { address: string, tokens: string[] | string }
// Backwards compatible with legacy (address, denom) signature
export async function requestFaucet(arg1, arg2) {
  // Normalize input
  let payload
  if (typeof arg1 === 'object' && arg1 !== null) {
    const addr = String(arg1.address || '').trim()
    const tokens = Array.isArray(arg1.tokens) ? arg1.tokens : arg1.tokens ? [arg1.tokens] : []
    payload = { address: addr, tokens }
  } else {
    // Legacy shape: (address, denom)
    payload = { address: String(arg1 || '').trim(), tokens: [String(arg2 || 'DGT')] }
  }

  // Endpoint (relative for same-origin)
  const url = '/api/faucet'
  
  // Perform request
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (e) {
    return { success: false, error: 'NETWORK_ERROR', message: e?.message || 'Network error', dispensed: [], cooldowns: null, retryAfterSeconds: null }
  }

  // Try to parse JSON safely
  let data = null
  let parseError = false
  try { data = await res.json() } catch { parseError = true }

  // Invalid JSON handling and empty payload distinction
  if (res.ok && parseError) {
    return { success: false, error: 'INVALID_RESPONSE', message: 'Server returned invalid JSON response', dispensed: [], cooldowns: null, retryAfterSeconds: null }
  }
  if (res.ok && !data) {
    return { success: false, error: 'EMPTY_RESPONSE', message: 'Empty response from server', dispensed: [], cooldowns: null, retryAfterSeconds: null }
  }

  // Error responses
  if (!res.ok) {
    // Map 429 retry-after header if present
    const retryAfterHeader = (res.headers && (res.headers.get ? res.headers.get('retry-after') : res.headers.get?.['retry-after'])) || null
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) || null : null
    return {
      success: false,
      error: data?.error || String(res.status),
      message: data?.message || `Faucet request failed: ${res.status}`,
      dispensed: [],
      cooldowns: data?.cooldowns || null,
      retryAfterSeconds
    }
  }

  // Success responses — normalize shapes
  // Legacy format { ok:true, token:'DGT', amount: 2, txHash: '0x...' }
  if (data && data.ok && (data.token || data.amount)) {
    const amt = String(data.amount ?? '')
    const sym = data.token || (Array.isArray(payload.tokens) && payload.tokens[0]) || 'DGT'
    const hash = data.txHash || data.hash || data.tx_hash
    return {
      success: true,
      dispensed: [{ symbol: sym, amount: amt, txHash: hash }],
      cooldowns: null,
      message: data.message || undefined,
      error: null,
      retryAfterSeconds: null
    }
  }

  // New dual-token format { success:true, dispensed:[{symbol,amount,txHash?}], cooldowns? }
  if (data && data.success) {
    const disp = Array.isArray(data.dispensed) ? data.dispensed.map((d) => ({
      symbol: d.symbol,
      amount: String(d.amount ?? ''),
      txHash: d.txHash || d.hash || d.tx_hash || undefined
    })) : []
    // Normalize cooldowns: flatten tokens map to { SYMBOL: epochMs }
    let flatCooldowns = null
    if (data.cooldowns && data.cooldowns.tokens) {
      flatCooldowns = {}
      for (const [sym, info] of Object.entries(data.cooldowns.tokens)) {
        if (!info) continue
        let ts = info.nextAllowedAt
        // seconds to ms
        if (typeof ts === 'number' && ts < 1e12) ts = ts * 1000
        flatCooldowns[sym] = ts
      }
    }
    return {
      success: true,
      dispensed: disp,
      cooldowns: flatCooldowns,
      message: data.message || undefined,
      error: null,
      retryAfterSeconds: null
    }
  }

  // Empty response
  if (!data) {
    return { success: false, error: 'EMPTY_RESPONSE', message: 'Empty response from server', dispensed: [], cooldowns: null, retryAfterSeconds: null }
  }

  // Unknown shape
  return { success: false, error: 'INVALID_RESPONSE', message: 'Unexpected response format', dispensed: [], cooldowns: null, retryAfterSeconds: null }
}

// Blockchain API functions
export async function getBlockHeight() {
  const response = await api.get('/status')
  return response.block_height || 0
}

export async function sendTransaction(txData) {
  return api.post('/transactions', txData)
}

export default api

// PQC status (Security & PQC card)
export async function getPQCStatus() {
  try {
    const res = await api.get('/pqc/status')
    return res || { status: 'disabled', enabled: false }
  } catch {
    // Safe fallback to avoid blank card
    return {
      status: 'degraded',
      enabled: false,
      algorithm: 'dilithium',
      runtime: 'mock',
      wasmModules: false,
      walletSupport: 'disabled',
      version: '1.0',
      updatedAt: new Date().toISOString()
    }
  }
}
