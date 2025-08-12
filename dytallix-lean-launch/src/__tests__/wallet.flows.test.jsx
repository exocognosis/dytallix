import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import Wallet from '../pages/Wallet.jsx'

// In-memory keystore/meta for mocks
let memKs = null
let memMeta = null

vi.mock('../lib/crypto/pqc.js', () => ({
  _util: { enc: new TextEncoder() },
  generateKeypair: vi.fn(async (algo) => ({ algo, publicKey: 'PUB_BASE64_DEMO', secretKey: 'SEC_BASE64_DEMO' })),
  pubkeyFromSecret: vi.fn(async () => 'PUB_BASE64_DEMO'),
  sign: vi.fn(async () => 'SIG_BASE64_DEMO')
}))
vi.mock('../lib/crypto/address.js', () => ({
  deriveAddress: vi.fn(async () => 'dytallix1demoaddress0000000000000000')
}))
vi.mock('../lib/keystore.js', () => ({
  encryptKeystore: vi.fn(async (secretKeyB64, algo, address, publicKey) => ({
    version: 1, algo, address, publicKey,
    cipher: 'AES-GCM', kdf: 'argon2id', kdfParams: { saltB64: 'salt', iterations: 1, memory: 1, parallelism: 1 },
    ivB64: 'iv', ciphertextB64: 'cipher', createdAt: new Date().toISOString()
  })),
  decryptKeystore: vi.fn(async () => 'SEC_BASE64_DEMO'),
  saveKeystore: vi.fn((ks) => { memKs = ks; localStorage.setItem('wallet_keystore_v1', JSON.stringify(ks)) }),
  loadKeystore: vi.fn(() => memKs || JSON.parse(localStorage.getItem('wallet_keystore_v1') || 'null')),
  clearKeystore: vi.fn(() => { memKs = null; localStorage.removeItem('wallet_keystore_v1') }),
  saveMeta: vi.fn((m) => { memMeta = m; localStorage.setItem('wallet_meta_v1', JSON.stringify(m)) }),
  loadMeta: vi.fn(() => memMeta || JSON.parse(localStorage.getItem('wallet_meta_v1') || 'null')),
  clearMeta: vi.fn(() => { memMeta = null; localStorage.removeItem('wallet_meta_v1') })
}))
vi.mock('../lib/api.js', () => ({
  api: vi.fn(async (path) => {
    if (String(path).startsWith('/api/balances/')) {
      return { native: '5000000', DGT: '2500000', DRT: '1250000' }
    }
    if (String(path).startsWith('/api/tx/estimate')) {
      return { fee: '1000', gas: '100000' }
    }
    if (String(path).startsWith('/api/tx/submit')) {
      return { txHash: '0xabc123' }
    }
    if (String(path).startsWith('/api/txs/')) {
      return { items: [], nextCursor: '' }
    }
    if (String(path).startsWith('/api/tx/')) {
      return { status: 'pending' }
    }
    return {}
  }),
  requestFaucet: vi.fn(async () => ({ ok: true }))
}))
vi.mock('../lib/ws.js', () => ({ connectWS: () => null }))

describe('Wallet flows (acceptance)', () => {
  beforeEach(() => {
    memKs = null; memMeta = null
    localStorage.clear()
    // First prompt for create + unlock on send
    let calls = 0
    global.prompt = vi.fn(() => {
      calls += 1
      return calls === 1 ? 'StrongPass9A' : 'StrongPass9A'
    })
    // Blob URL for export
    global.URL.createObjectURL = vi.fn(() => 'blob://demo')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('can create wallet, estimate and send a tx, export and forget', async () => {
    render(<Wallet />)

    // Create wallet
    const createBtn = await screen.findByText('Create Wallet')
    fireEvent.click(createBtn)
    expect(await screen.findByText(/Wallet created:/i)).toBeTruthy()

    // Address displayed (may appear multiple times in the UI)
    const addrEls = await screen.findAllByText(/dytallix1demoaddress/i)
    expect(addrEls.length).toBeGreaterThan(0)

    // Estimate
    const toInput = screen.getByLabelText(/To Address/i)
    fireEvent.change(toInput, { target: { value: 'dytallix1destination000000000000000000' } })
    const amtInput = screen.getByLabelText(/Amount/i)
    fireEvent.change(amtInput, { target: { value: '1.0' } })

    const estimateBtn = screen.getByText('Estimate')
    fireEvent.click(estimateBtn)
    expect(await screen.findByText(/Estimated Fee:/i)).toBeTruthy()

    // Send (will unlock using prompt) - scope within Send form card
    const sendSection = screen.getByRole('heading', { level: 3, name: /^Send$/ })
    const sendCard = sendSection.closest('.card')
    const sendBtn = within(sendCard).getByRole('button', { name: /^Send$/i })
    fireEvent.click(sendBtn)
    expect(await screen.findByText(/Submitted: 0xabc123/i)).toBeTruthy()

    // Export from Settings (scope by Settings heading to disambiguate)
    const settingsHeading = screen.getByRole('heading', { level: 3, name: /^Settings$/ })
    const settingsCard = settingsHeading.closest('.card')
    const exportBtn = within(settingsCard).getByRole('button', { name: /Export keystore/i })
    fireEvent.click(exportBtn)
    expect(global.URL.createObjectURL).toHaveBeenCalled()

    // Forget (open modal via Settings card button)
    const forgetBtn = screen.getByText(/Forget from device/i)
    fireEvent.click(forgetBtn)

    // Confirm delete modal
    const delBtn = await screen.findByText('Delete')
    fireEvent.click(delBtn)

    // After forgetting, address should be gone from the UI
    await waitFor(() => {
      expect(screen.queryAllByText(/dytallix1demoaddress/i).length).toBe(0)
    })
  })
})
