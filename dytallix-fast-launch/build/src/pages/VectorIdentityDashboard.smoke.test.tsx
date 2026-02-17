import React from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import VectorIdentityDashboard from './VectorIdentityDashboard'

describe('VectorIdentityDashboard page', () => {
  it('renders vector page shell', () => {
    const html = renderToString(
      <MemoryRouter>
        <VectorIdentityDashboard />
      </MemoryRouter>,
    )

    expect(html).toContain('Vector')
    expect(html).toContain('Identity Risk Feed')
  })
})
