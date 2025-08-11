import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as dashboard from '../lib/dashboard.js'
import Dashboard from '../pages/Dashboard.jsx'

// Simulate error from adapters

describe('Dashboard error handling', () => {
  it('shows banner and allows retry', async () => {
    const spyOverview = vi.spyOn(dashboard, 'getOverview').mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(dashboard.makeMockOverview())
    const spySeries = vi.spyOn(dashboard, 'getTimeseries').mockResolvedValue(dashboard.makeMockSeries())

    render(<Dashboard />)

    const banner = await screen.findByText(/Failed to load dashboard data/i)
    expect(banner).toBeTruthy()
    const retry = screen.getByText(/Retry/i)
    fireEvent.click(retry)

    // After retry we should see the header again and banner should be gone
    expect(await screen.findByText(/Network Dashboard/i)).toBeTruthy()

    spyOverview.mockRestore(); spySeries.mockRestore()
  })
})
