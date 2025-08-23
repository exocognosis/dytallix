// Component UI tests for FaucetForm
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FaucetForm from '../components/FaucetForm.jsx'

// Mock the API
vi.mock('../lib/api.js', () => ({
  requestFaucet: vi.fn()
}))

// Mock wallet functions
vi.mock('../wallet/Keystore', () => ({
  loadMeta: vi.fn(() => null)
}))

import { requestFaucet } from '../lib/api.js'

describe('FaucetForm UI', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock successful API response by default
    requestFaucet.mockResolvedValue({
      success: true,
      dispensed: [
        { symbol: 'DGT', amount: '2', txHash: '0xabc123' },
        { symbol: 'DRT', amount: '50', txHash: '0xdef456' }
      ],
      message: 'Successfully dispensed DGT + DRT tokens'
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Basic rendering', () => {
    it('should render all token selection options', () => {
      render(<FaucetForm />)
      
      expect(screen.getByText('Both DGT + DRT (Recommended)')).toBeInTheDocument()
      expect(screen.getByText('DGT Only (Governance)')).toBeInTheDocument()
      expect(screen.getByText('DRT Only (Rewards)')).toBeInTheDocument()
    })

    it('should render address input field', () => {
      render(<FaucetForm />)
      
      const addressInput = screen.getByPlaceholderText('dytallix1...')
      expect(addressInput).toBeInTheDocument()
      expect(addressInput).toHaveAttribute('type', 'text')
    })

    it('should render submit button', () => {
      render(<FaucetForm />)
      
      const submitButton = screen.getByRole('button', { name: /request/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveTextContent('Request Both DGT + DRT (Recommended)')
    })
  })

  describe('Success flow', () => {
    it('should display success message after successful request', async () => {
      render(<FaucetForm />)
      
      // Fill in valid address
      const addressInput = screen.getByPlaceholderText('dytallix1...')
      fireEvent.change(addressInput, { 
        target: { value: 'dytallix1example123456789abcdef123456789' } 
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /request/i })
      fireEvent.click(submitButton)
      
      // Wait for success message
      await waitFor(() => {
        const statusMessage = screen.getByText(/sent successfully/i)
        expect(statusMessage).toBeInTheDocument()
        expect(statusMessage).toHaveTextContent('✅ 2 DGT + 50 DRT sent successfully!')
      })
      
      // Verify API was called correctly
      expect(requestFaucet).toHaveBeenCalledWith({
        address: 'dytallix1example123456789abcdef123456789',
        tokens: ['DGT', 'DRT']
      })
    })
  })

  describe('Rate limit / cooldown flow', () => {
    beforeEach(() => {
      // Mock rate limit response
      requestFaucet.mockResolvedValue({
        success: false,
        error: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please wait 30 minutes.',
        dispensed: [],
        cooldowns: {
          tokens: {
            DGT: { nextAllowedAt: Date.now() + 30 * 60 * 1000 },
            DRT: { nextAllowedAt: Date.now() + 30 * 60 * 1000 }
          }
        },
        retryAfterSeconds: 1800
      })
    })

    it('should display rate limit error message', async () => {
      render(<FaucetForm />)
      
      // Fill in valid address
      const addressInput = screen.getByPlaceholderText('dytallix1...')
      fireEvent.change(addressInput, { 
        target: { value: 'dytallix1example123456789abcdef123456789' } 
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /request/i })
      fireEvent.click(submitButton)
      
      // Wait for error message
      await waitFor(() => {
        const statusMessage = screen.getByText(/rate limit exceeded/i)
        expect(statusMessage).toBeInTheDocument()
        expect(statusMessage).toHaveTextContent('Rate limit exceeded. Please wait 30 minutes before trying again.')
      })
    })

    it('should show cooldown notice when tokens are on cooldown', () => {
      // Set up cooldowns in localStorage
      const cooldowns = {
        DGT: Date.now() + 30 * 60 * 1000,
        DRT: Date.now() + 15 * 60 * 1000
      }
      localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(cooldowns))
      
      render(<FaucetForm />)
      
      // Should show cooldown notice
      const cooldownNotice = screen.getByText(/cooldown active/i)
      expect(cooldownNotice).toBeInTheDocument()
      expect(cooldownNotice).toHaveTextContent('Cooldown active for DGT, DRT')
      
      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: /wait/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Input validation', () => {
    it('should show error for invalid address', async () => {
      render(<FaucetForm />)
      
      // Fill in invalid address
      const addressInput = screen.getByPlaceholderText('dytallix1...')
      fireEvent.change(addressInput, { target: { value: 'invalid-address' } })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /request/i })
      fireEvent.click(submitButton)
      
      // Should show validation error
      await waitFor(() => {
        const statusMessage = screen.getByText(/please enter a valid dytallix bech32 address/i)
        expect(statusMessage).toBeInTheDocument()
      })
      
      // API should not be called
      expect(requestFaucet).not.toHaveBeenCalled()
    })
  })

  describe('Token selection', () => {
    it('should remember selected token option in localStorage', () => {
      render(<FaucetForm />)
      
      // Select DGT only
      const dgtOption = screen.getByText('DGT Only (Governance)').closest('[role="radio"]')
      fireEvent.click(dgtOption)
      
      // Should save to localStorage
      expect(localStorage.getItem('dytallix-faucet-selected-option')).toBe('DGT')
      
      // Re-render and verify it's restored
      render(<FaucetForm />)
      expect(dgtOption).toHaveAttribute('aria-checked', 'true')
    })

    it('should update submit button text based on selection', () => {
      render(<FaucetForm />)
      
      // Select DRT only
      const drtOption = screen.getByText('DRT Only (Rewards)').closest('[role="radio"]')
      fireEvent.click(drtOption)
      
      // Submit button should update
      const submitButton = screen.getByRole('button', { name: /request drt only/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Network error handling', () => {
    beforeEach(() => {
      // Mock network error
      requestFaucet.mockResolvedValue({
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Network error occurred. Please check your connection.',
        dispensed: [],
        cooldowns: null,
        retryAfterSeconds: null
      })
    })

    it('should display network error message', async () => {
      render(<FaucetForm />)
      
      // Fill in valid address
      const addressInput = screen.getByPlaceholderText('dytallix1...')
      fireEvent.change(addressInput, { 
        target: { value: 'dytallix1example123456789abcdef123456789' } 
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /request/i })
      fireEvent.click(submitButton)
      
      // Wait for error message
      await waitFor(() => {
        const statusMessage = screen.getByText(/network error occurred/i)
        expect(statusMessage).toBeInTheDocument()
        expect(statusMessage).toHaveTextContent('Network error occurred. Please check your connection.')
      })
    })
  })
})