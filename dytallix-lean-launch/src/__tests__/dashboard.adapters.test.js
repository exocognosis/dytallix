import { describe, it, expect } from 'vitest'
import { getOverview, getTimeseries, makeMockOverview, makeMockSeries } from '../lib/dashboard.js'

// These intentionally rely on mock fallback, as no API is running in CI

describe('dashboard adapters', () => {
  it('returns overview with required fields', async () => {
    const o = await getOverview()
    expect(o).toHaveProperty('height')
    expect(o).toHaveProperty('tps')
    expect(o).toHaveProperty('blockTime')
    expect(o).toHaveProperty('peers')
    expect(o).toHaveProperty('validators')
    expect(o).toHaveProperty('mempool')
    expect(o).toHaveProperty('finality')
    expect(o).toHaveProperty('updatedAt')
  })

  it('returns timeseries with points', async () => {
    const s = await getTimeseries('tps', '1h')
    expect(s.metric).toBe('tps')
    expect(Array.isArray(s.points)).toBe(true)
  })

  it('mock generators produce plausible output', () => {
    const o = makeMockOverview()
    expect(o._mock).toBe(true)
    const s = makeMockSeries('blockTime', '15m')
    expect(s._mock).toBe(true)
    expect(s.points.length).toBeGreaterThan(0)
  })
})
