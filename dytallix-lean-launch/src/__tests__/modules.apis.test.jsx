import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Modules from '../pages/Modules.jsx'

// Mock fetch for the two API endpoints
beforeEach(() => {
  global.fetch = vi.fn(async (url, opts) => {
    const body = opts && opts.body ? JSON.parse(opts.body) : {}
    if (url === '/api/anomaly/run') {
      if (!/^0x[0-9a-fA-F]{64}$/.test(body.txHash)) {
        return new Response(JSON.stringify({ code: 'INVALID_TX_HASH' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ riskScore: 75, anomalies: [], meta: { ranAt: new Date().toISOString(), model: 'test' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (url === '/api/contract/scan') {
      if (typeof body.code !== 'string') {
        return new Response(JSON.stringify({ code: 'INVALID_CODE' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ summary: { total: 0, bySeverity: { high: 0, medium: 0, low: 0 } }, issues: [], meta: { ranAt: new Date().toISOString(), model: 'test' } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('{}', { status: 404 })
  })
})

describe('Modules page API flows', () => {
  it('runs anomaly detection successfully', async () => {
    render(<Modules />)
    const txInput = await screen.findByPlaceholderText(/Transaction hash/i)
    fireEvent.change(txInput, { target: { value: '0x' + 'a'.repeat(64) } })
    const runBtn = screen.getByRole('button', { name: /Run Anomaly Detection/i })
    fireEvent.click(runBtn)
    await waitFor(() => {
      expect(screen.getByText(/Risk score/i)).toBeTruthy()
    })
  })

  it('shows error on invalid tx hash', async () => {
    render(<Modules />)
    const txInput = await screen.findByPlaceholderText(/Transaction hash/i)
    fireEvent.change(txInput, { target: { value: '0x1234' } })
    const runBtn = screen.getByRole('button', { name: /Run Anomaly Detection/i })
    expect(runBtn).toBeDisabled()
  })

  it('runs contract scan', async () => {
    render(<Modules />)
    const scanBtn = await screen.findByRole('button', { name: /Scan Contract/i })
    fireEvent.click(scanBtn)
    await waitFor(() => {
      expect(screen.getByText(/Findings:/i)).toBeTruthy()
    })
  })
})
