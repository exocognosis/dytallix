import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '../pages/Dashboard.jsx'

describe('Dashboard render', () => {
  it('renders header and widgets', async () => {
    render(<Dashboard />)
    expect(await screen.findByText(/Network Dashboard/i)).toBeTruthy()
    expect(await screen.findByText(/PQC Status/i)).toBeTruthy()
    expect(await screen.findByText(/Block Height/i)).toBeTruthy()
  })
})
