import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getBalances, getChainId, subscribeWS } from '../../chain/cosmosAdapter'

// Minimal tests focusing on environment behavior and LCD call shape

describe('cosmosAdapter', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn(async (url: string) => ({ ok: true, json: async () => ({ balances: [], url }) }))
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads chain id as string', () => {
    const id = getChainId()
    expect(typeof id).toBe('string')
  })

  it('fetches balances via LCD', async () => {
    const addr = 'dyt1testaddress'
    const res = await getBalances(addr)
    expect(res).toBeTruthy()
    // ensure our stub was called once
    expect((global.fetch as any).mock.calls.length).toBe(1)
    const calledUrl = (global.fetch as any).mock.calls[0][0]
    expect(String(calledUrl)).toContain('/cosmos/bank/v1beta1/balances/')
    expect(String(calledUrl)).toContain(addr)
  })

  it('subscribeWS returns an unsubscribe function', () => {
    const origWS = (global as any).WebSocket
    class MockWS {
      url: string; onopen: any; onmessage: any; onclose: any; onerror: any
      constructor(url: string){ this.url = url; setTimeout(()=> this.onopen && this.onopen({} as any), 0) }
      send(_d: any){}
      close(){ this.onclose && this.onclose({} as any) }
    }
    ;(global as any).WebSocket = MockWS as any

    const off = subscribeWS({ onNewBlock: ()=>{}, onTx: ()=>{} })
    expect(typeof off).toBe('function')
    off()
    ;(global as any).WebSocket = origWS
  })
})
