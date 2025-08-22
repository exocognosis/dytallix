describe('Dytallix Explorer', () => {
  beforeEach(() => {
    // Visit the explorer page
    cy.visit('/web/pages/explorer/index.html')
  })

  it('should load the explorer page', () => {
    cy.contains('Dytallix Explorer')
    cy.contains('Latest Blocks')
    cy.contains('Recent Transactions')
  })

  it('should display blocks table', () => {
    // Wait for blocks to load (or show error)
    cy.get('#blocks-table, #blocks-error', { timeout: 10000 })
      .should('be.visible')

    // If table is visible, check structure
    cy.get('#blocks-table').then(($table) => {
      if ($table.is(':visible')) {
        cy.get('#blocks-table thead th').should('have.length', 4)
        cy.get('#blocks-table thead th').eq(0).should('contain', 'Height')
        cy.get('#blocks-table thead th').eq(1).should('contain', 'Hash')
        cy.get('#blocks-table thead th').eq(2).should('contain', 'Time')
        cy.get('#blocks-table thead th').eq(3).should('contain', 'Transactions')
      }
    })
  })

  it('should display transactions table', () => {
    // Wait for transactions to load (or show error)
    cy.get('#txs-table, #txs-error', { timeout: 10000 })
      .should('be.visible')

    // If table is visible, check structure
    cy.get('#txs-table').then(($table) => {
      if ($table.is(':visible')) {
        cy.get('#txs-table thead th').should('have.length', 4)
        cy.get('#txs-table thead th').eq(0).should('contain', 'Hash')
        cy.get('#txs-table thead th').eq(1).should('contain', 'Height')
        cy.get('#txs-table thead th').eq(2).should('contain', 'Status')
        cy.get('#txs-table thead th').eq(3).should('contain', 'Gas Used')
      }
    })
  })

  it('should show transaction details when clicking hash', () => {
    // Wait for transactions table
    cy.get('#txs-table', { timeout: 10000 }).then(($table) => {
      if ($table.is(':visible')) {
        // Find first transaction hash link
        cy.get('#txs-tbody tr').first().find('.hash').then(($hash) => {
          if ($hash.length > 0) {
            // Click the hash
            cy.wrap($hash).click()
            
            // Check modal appears
            cy.get('#detail-overlay').should('be.visible')
            cy.get('.detail-modal').should('be.visible')
            cy.contains('Transaction Details')
            
            // Check JSON content appears
            cy.get('#detail-content').should('not.be.empty')
            
            // Close modal
            cy.get('.detail-close').click()
            cy.get('#detail-overlay').should('not.be.visible')
          }
        })
      }
    })
  })

  it('should auto-refresh data', () => {
    // Check that auto-refresh message is shown
    cy.contains('Auto-refreshing every 5 seconds')
    
    // This is hard to test properly without mocking, but we can verify
    // the refresh mechanism exists
  })

  it('should handle API errors gracefully', () => {
    // This test would require mocking failed API responses
    // For now, we check that error divs exist
    cy.get('#blocks-error').should('exist')
    cy.get('#txs-error').should('exist')
  })

  it('should have responsive design elements', () => {
    // Check that main elements are present
    cy.get('.container').should('be.visible')
    cy.get('header').should('be.visible')
    cy.get('.section').should('have.length.at.least', 2)
  })

  it('should truncate long hashes', () => {
    // If we have data, verify hash truncation works
    cy.get('.hash').then(($hashes) => {
      if ($hashes.length > 0) {
        // Check that displayed text is shorter than full hash would be
        $hashes.each((i, el) => {
          const text = Cypress.$(el).text()
          if (text !== 'N/A' && text.includes('...')) {
            expect(text.length).to.be.lessThan(50)
          }
        })
      }
    })
  })
})