import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as dashboard from '../lib/dashboard.js'
import Dashboard from '../pages/Dashboard.jsx'

// Simulate error from adapters

describe('Dashboard error handling', () => {
  it('shows banner and allows retry', async () => {
    // Make initial calls fail to ensure the banner is visible even with duplicate effects
    const spyOverview = vi
      .spyOn(dashboard, 'getOverview')
      .mockRejectedValue(new Error('boom'))
    const spySeries = vi.spyOn(dashboard, 'getTimeseries').mockResolvedValue(dashboard.makeMockSeries())

    render(<Dashboard />)

    // Wait for error banner via its Retry button (more robust than matching full text)
    const retry = await screen.findByRole('button', { name: /Retry/i })
    expect(retry).toBeTruthy()

    // Now simulate a successful retry
    spyOverview.mockReset()
    spyOverview.mockResolvedValueOnce(dashboard.makeMockOverview())

    fireEvent.click(retry)

    // After retry we should see the header again and banner should be gone
    expect(await screen.findByText(/Network Dashboard/i)).toBeTruthy()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Retry/i })).toBeNull()
    })

    spyOverview.mockRestore(); spySeries.mockRestore()
  })
})
