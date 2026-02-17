import React from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import C2QAssetMigration from './C2QAssetMigration'

describe('C2QAssetMigration page', () => {
  it('renders core decision surfaces in default view', () => {
    const html = renderToString(
      <MemoryRouter>
        <C2QAssetMigration />
      </MemoryRouter>,
    )

    expect(html).toContain('Executive Risk Summary')
    expect(html).toContain('3-Path Comparison')
    expect(html).toContain('Run Full Simulation')
  })
})
