import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import AIOracleNetwork from './AIOracleNetwork'

describe('AIOracleNetwork page', () => {
  it('renders active Horizon module entrypoint', () => {
    const html = renderToString(
      <MemoryRouter>
        <AIOracleNetwork />
      </MemoryRouter>,
    )

    expect(html).toContain('AI Oracle')
    expect(html).toContain('Horizon')
    expect(html).toContain('Launch Horizon')
  })
})
