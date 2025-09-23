type RequestInit = {
  method?: string
  headers?: Record<string, string>
  body?: string
}

type FetchResponse = {
  ok: boolean
  status: number
  text(): Promise<string>
}

type FetchLike = (url: string, init?: RequestInit) => Promise<FetchResponse>

const fetchFn: FetchLike = (globalThis as any).fetch
  ? ((globalThis as any).fetch.bind(globalThis) as FetchLike)
  : (() => {
      throw new Error('Global fetch API is not available in this runtime')
    })

function normalizeUrl(base: string, path: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return path.startsWith('/') ? `${trimmed}${path}` : `${trimmed}/${path}`
}

async function parseJson(res: FetchResponse) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export class DytClient {
  constructor(private readonly rpcEndpoint: string) {}

  private async request(path: string, init?: RequestInit) {
    const url = normalizeUrl(this.rpcEndpoint, path)
    const response = await fetchFn(url, init)
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`RPC ${response.status} ${body}`.trim())
    }
    return parseJson(response)
  }

  private get(path: string) {
    return this.request(path)
  }

  private post(path: string, payload: unknown) {
    return this.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  async getBalance(address: string) {
    return this.get(`/balance/${encodeURIComponent(address)}`)
  }

  async getStats() {
    return this.get('/api/stats')
  }

  async getAccount(address: string) {
    return this.get(`/account/${encodeURIComponent(address)}`)
  }

  async submitSignedTx(signed: any) {
    return this.post('/submit', { signed_tx: signed })
  }

  async getGovParams() {
    return this.get('/gov/config')
  }

  async govSubmitProposal(input: { title: string; description: string; key: string; value: string }) {
    return this.post('/gov/submit', input)
  }

  async govDeposit(input: { depositor: string; proposal_id: number; amount: number }) {
    return this.post('/gov/deposit', input)
  }

  async govVote(input: { voter: string; proposal_id: number; option: 'yes' | 'no' | 'abstain' | 'no_with_veto' }) {
    return this.post('/gov/vote', input)
  }

  async govListProposals() {
    return this.get('/api/governance/proposals')
  }

  async govTally(proposalId: number) {
    return this.get(`/gov/tally/${proposalId}`)
  }

  async govExecute(input: { proposal_id: number }) {
    return this.post('/gov/execute', input)
  }

  async contractDeploy(wasm: Uint8Array, gasLimit: number) {
    const payload = {
      code: Buffer.from(wasm).toString('base64'),
      gas_limit: gasLimit,
      init_data: '{}'
    }
    return this.post('/api/contract/deploy', payload)
  }

  async contractExecute(address: string, method: string, args?: Record<string, unknown>, gasLimit = 100_000) {
    const payload: Record<string, unknown> = {
      contract_id: address,
      method,
      gas_limit: gasLimit
    }
    if (args !== undefined) {
      payload.args = args
    }
    return this.post('/api/contract/call', payload)
  }
}
