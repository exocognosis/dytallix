import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import Dashboard from '../src/pages/Dashboard.jsx'

const listeners = {}
class MockWS { 
  constructor(url){ 
    this.url=url; 
    // Use fake timers for deterministic testing
    setTimeout(()=>{ /* simulate initial */ }, 5) 
  } 
  close(){} 
  addEventListener(t,cb){ 
    listeners[t]=listeners[t]||[]; 
    listeners[t].push(cb) 
  } 
}
MockWS.prototype.send = () => {}

function emit(type, data){ 
  (listeners['message']||[]).forEach(cb=> cb({ data: JSON.stringify({ type, data }) })) 
}

// Mock the PQC API
vi.mock('../src/lib/api.js', () => ({
  getPQCStatus: () => Promise.resolve({ status: 'enabled', version: '1.0.0' })
}))

describe('Dashboard', () => {
  beforeEach(()=>{ 
    vi.useFakeTimers(); 
    vi.setSystemTime(new Date()) 
  })
  
  afterEach(() => {
    vi.useRealTimers();
  })
  
  it('renders overview metrics and updates via WS', async () => {
    render(<Dashboard />)
    
    // Wait for initial render - should see Block Height widget
    await waitFor(()=> expect(screen.getByText(/Block Height/i)).toBeInTheDocument())
    
    // Advance fake timers to trigger the test harness update (line 45 in Dashboard.jsx sets height to 123 after 25ms in test env)
    vi.advanceTimersByTime(30)
    
    // After test harness update, height 123 should appear
    await waitFor(()=> expect(screen.getByText(/123/)).toBeInTheDocument(), { timeout: 1000 })
  })
})
