import React from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import HorizonNetworkMonitor from './HorizonNetworkMonitor'

describe('HorizonNetworkMonitor page', () => {
  it('renders core horizon monitoring surfaces', () => {
    const html = renderToString(
      <MemoryRouter>
        <HorizonNetworkMonitor />
      </MemoryRouter>,
    )

    expect(html).toContain('Horizon')
    expect(html).toContain('Network/DeFi Monitor')
    expect(html).toContain('Incident Feed')
    expect(html).toContain('Circuit Breaker Log')
    expect(html).toContain('On-Chain Attestation Pipeline')
  })
})
