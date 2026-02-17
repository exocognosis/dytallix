import React from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import AIOracleNetwork from './AIOracleNetwork'

describe('AIOracleNetwork page', () => {
  it('renders active Consul, Horizon, and Vector module entrypoints', () => {
    const html = renderToString(
      <MemoryRouter>
        <AIOracleNetwork />
      </MemoryRouter>,
    )

    expect(html).toContain('AI Oracle')
    expect(html).toContain('Consul')
    expect(html).toContain('/consul-dashboard')
    expect(html).toContain('Horizon')
    expect(html).toContain('/horizon-dashboard')
    expect(html).toContain('Vector')
    expect(html).toContain('/vector-dashboard')
  })
})
