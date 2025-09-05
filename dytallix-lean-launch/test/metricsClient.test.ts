import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOverview, getTimeseries } from '../frontend/src/lib/metricsClient'

global.fetch = vi.fn()

describe('metricsClient', () => {
  beforeEach(()=>{ (fetch as any).mockReset() })
  it('getOverview normalizes numbers & placeholders', async () => {
    ;(fetch as any).mockResolvedValue({ ok:true, json: async ()=> ({ height:'10', tps:'2.5', blockTime:6, peers:3, validators:2, finality:2, mempool:5, cpu:10, memory:20, diskIO:1 }) })
    const o = await getOverview()
    expect(o.height).toBe(10)
    expect(o.tps).toBe(2.5)
  })
  it('getTimeseries maps points', async () => {
    ;(fetch as any).mockResolvedValue({ ok:true, json: async ()=> ({ metric:'tps', range:'1h', points:[{ ts:1, value:5 }] }) })
    const s = await getTimeseries('tps','1h')
    expect(s.points.length).toBe(1)
  })
  it('fallback overview on network error', async () => {
    ;(fetch as any).mockRejectedValue(new Error('network'))
    const o = await getOverview()
    expect(o._mock).toBe(true)
  })
  it('fallback timeseries on http failure', async () => {
    ;(fetch as any).mockResolvedValue({ ok:false, json: async ()=> ({}) })
    const s = await getTimeseries('tps','1h')
    expect(s._mock).toBe(true)
    expect(s.points.length).toBeGreaterThan(0)
  })
})
