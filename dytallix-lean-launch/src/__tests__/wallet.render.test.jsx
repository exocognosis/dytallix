import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Wallet from '../pages/Wallet.jsx'

vi.mock('../lib/api.js', () => ({
  api: vi.fn(async () => ({ native: '0', DGT: '0', DRT: '0' })),
  requestFaucet: vi.fn(async () => ({ ok: true }))
}))
vi.mock('../lib/ws.js', () => ({ connectWS: () => null }))
vi.mock('../lib/crypto/pqc.js', () => ({ _util: { enc: new TextEncoder() } }))

describe('Wallet page render', () => {
  beforeEach(() => {
    // clean localStorage & prompts
    localStorage.clear()
    global.prompt = vi.fn(() => '')
  })

  it('renders sections and actions', async () => {
    render(<Wallet />)
    expect(await screen.findByText(/Wallet & Key Management/i)).toBeTruthy()
    expect(screen.getByText(/Create New Wallet/i)).toBeTruthy()
    expect(screen.getByText(/Connect \/ Import/i)).toBeTruthy()
    expect(screen.getByText(/Settings/i)).toBeTruthy()
  })
})
