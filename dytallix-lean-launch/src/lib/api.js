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
export async function requestFaucet(address, denom = 'DGT') {
  const response = await fetch('/api/faucet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, denom })
  })
  if (!response.ok) throw new Error(`Faucet request failed: ${response.status}`)
  return response.json()
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