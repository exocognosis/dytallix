import fetch from 'node-fetch'

export class DytClient {
  constructor(public rpc: string) {}

  async getBalance(address: string) {
    const r = await fetch(`${this.rpc}/balance/${encodeURIComponent(address)}`)
    if (!r.ok) throw new Error(`RPC ${r.status}`)
    return r.json()
  }

  async getStats() {
    const r = await fetch(`${this.rpc}/api/stats`)
    if (!r.ok) throw new Error(`RPC ${r.status}`)
    return r.json()
  }

  async getAccount(address: string) {
    const r = await fetch(`${this.rpc}/account/${encodeURIComponent(address)}`)
    if (!r.ok) throw new Error(`RPC ${r.status}`)
    return r.json()
  }

  async getGovParams() {
    const r = await fetch(`${this.rpc}/gov/config`)
    if (!r.ok) throw new Error(`RPC ${r.status}`)
    return r.json()
  }

  async submitSignedTx(signed: any) {
    const r = await fetch(`${this.rpc}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ signed_tx: signed })
    })
    if (!r.ok) {
      const t = await r.text().catch(() => '')
      throw new Error(`submit ${r.status} ${t}`)
    }
    return r.json()
  }
}
