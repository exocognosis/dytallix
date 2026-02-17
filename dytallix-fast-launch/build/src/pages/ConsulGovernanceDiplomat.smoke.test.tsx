import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { renderToString } from 'react-dom/server'
import ConsulGovernanceDiplomat from './ConsulGovernanceDiplomat'

describe('ConsulGovernanceDiplomat page', () => {
  it('renders core governance decision surfaces', () => {
    const html = renderToString(
      <MemoryRouter>
        <ConsulGovernanceDiplomat />
      </MemoryRouter>,
    )

    expect(html).toContain('Consul')
    expect(html).toContain('Governance Diplomat')
    expect(html).toContain('Proposal Risk Surface')
    expect(html).toContain('Dispute Center')
  })
})
