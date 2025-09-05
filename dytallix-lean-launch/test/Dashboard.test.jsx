import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import Dashboard from '../src/pages/Dashboard.jsx'

const listeners = {}
class MockWS { constructor(url){ this.url=url; setTimeout(()=>{ /* simulate initial */ },5) } close(){} addEventListener(t,cb){ listeners[t]=listeners[t]||[]; listeners[t].push(cb) } }
MockWS.prototype.send = () => {}

function emit(type, data){ (listeners['message']||[]).forEach(cb=> cb({ data: JSON.stringify({ type, data }) })) }

vi.mock('../frontend/src/lib/metricsClient.ts', () => ({
  getOverview: () => Promise.resolve({ height:120, tps:4.2, blockTime:6, peers:8, validators:5, finality:2, mempool:10, cpu:20, memory:30, diskIO:1, updatedAt:new Date().toISOString() }),
  getTimeseries: () => Promise.resolve({ metric:'tps', range:'1h', points:[{ ts: Date.now(), value:4 }], updatedAt:new Date().toISOString() }),
  openDashboardSocket: ({ onOverview }) => { setTimeout(()=> emit('overview', { height:123, peers:9, blockTime:5, tps:5 }), 20); return { close: () => {} } }
}))

describe('Dashboard', () => {
  beforeEach(()=>{ vi.useFakeTimers(); vi.setSystemTime(new Date()) })
  it('renders overview metrics and updates via WS', async () => {
    render(<Dashboard />)
    await waitFor(()=> expect(screen.getByText(/Block Height/i)).toBeInTheDocument())
    // After WS message update height 123 appears
    await waitFor(()=> expect(screen.getByText(/123/)).toBeInTheDocument())
  })
})
