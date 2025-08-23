// Cypress integration test for faucet functionality
describe('Faucet Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage()
    
    // Visit the faucet page
    cy.visit('/')
    
    // Wait for the page to load
    cy.get('[data-test="faucet-submit"]').should('be.visible')
  })

  it('should successfully request dual tokens and then show cooldown on second request', () => {
    // First request - should succeed
    cy.get('[data-test="wallet-address-input"]')
      .type('dytallix1example123456789abcdef123456789')
    
    // Intercept the first request to return success
    cy.intercept('POST', '/api/faucet', {
      statusCode: 200,
      body: {
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', txHash: '0xabc123' },
          { symbol: 'DRT', amount: '50', txHash: '0xdef456' }
        ],
        message: 'Successfully dispensed DGT + DRT tokens'
      }
    }).as('firstRequest')
    
    // Submit the form
    cy.get('[data-test="faucet-submit"]').click()
    
    // Wait for the first request
    cy.wait('@firstRequest')
    
    // Should show success message
    cy.get('[data-test="faucet-status"]')
      .should('be.visible')
      .and('contain', '✅ 2 DGT + 50 DRT sent successfully!')
    
    // Wait for success message to auto-clear
    cy.wait(5500)
    
    // Clear the address input and re-enter to trigger a new request
    cy.get('[data-test="wallet-address-input"]')
      .clear()
      .type('dytallix1example123456789abcdef123456789')
    
    // Intercept the second request to return rate limit
    cy.intercept('POST', '/api/faucet', {
      statusCode: 429,
      headers: {
        'retry-after': '1800'
      },
      body: {
        success: false,
        error: 'RATE_LIMIT',
        message: 'Rate limit exceeded. Please wait 30 minutes.',
        cooldowns: {
          tokens: {
            DGT: { nextAllowedAt: Date.now() + 30 * 60 * 1000 },
            DRT: { nextAllowedAt: Date.now() + 30 * 60 * 1000 }
          }
        },
        retryAfterSeconds: 1800
      }
    }).as('secondRequest')
    
    // Submit the form again
    cy.get('[data-test="faucet-submit"]').click()
    
    // Wait for the second request
    cy.wait('@secondRequest')
    
    // Should show rate limit error message
    cy.get('[data-test="faucet-status"]')
      .should('be.visible')
      .and('contain', 'Rate limit exceeded. Please wait 30 minutes before trying again.')
    
    // Should also show cooldown notice
    cy.get('[data-test="cooldown-notice"]')
      .should('be.visible')
      .and('contain', 'Cooldown active for DGT, DRT')
    
    // Submit button should be disabled
    cy.get('[data-test="faucet-submit"]')
      .should('be.disabled')
      .and('contain', 'Wait')
  })

  it('should persist cooldowns across page refresh', () => {
    // Set up cooldowns in localStorage to simulate previous request
    const cooldowns = {
      DGT: Date.now() + 30 * 60 * 1000, // 30 minutes from now
      DRT: Date.now() + 15 * 60 * 1000  // 15 minutes from now
    }
    
    cy.window().then((win) => {
      win.localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(cooldowns))
    })
    
    // Refresh the page
    cy.reload()
    
    // Should show cooldown notice immediately after page load
    cy.get('[data-test="cooldown-notice"]')
      .should('be.visible')
      .and('contain', 'Cooldown active for DGT, DRT')
    
    // Submit button should be disabled
    cy.get('[data-test="faucet-submit"]')
      .should('be.disabled')
      .and('contain', 'Wait')
  })

  it('should handle network errors gracefully', () => {
    // Fill in valid address
    cy.get('[data-test="wallet-address-input"]')
      .type('dytallix1example123456789abcdef123456789')
    
    // Intercept request to simulate network error
    cy.intercept('POST', '/api/faucet', {
      forceNetworkError: true
    }).as('networkError')
    
    // Submit the form
    cy.get('[data-test="faucet-submit"]').click()
    
    // Wait for the request
    cy.wait('@networkError')
    
    // Should show network error message
    cy.get('[data-test="faucet-status"]')
      .should('be.visible')
      .and('contain', 'Network error occurred')
  })

  it('should validate address format', () => {
    // Enter invalid address
    cy.get('[data-test="wallet-address-input"]')
      .type('invalid-address')
    
    // Submit the form
    cy.get('[data-test="faucet-submit"]').click()
    
    // Should show validation error
    cy.get('[data-test="faucet-status"]')
      .should('be.visible')
      .and('contain', 'Please enter a valid Dytallix bech32 address')
  })

  it('should remember token selection preference', () => {
    // Select DGT only option
    cy.contains('DGT Only (Governance)').click()
    
    // Submit button should update
    cy.get('[data-test="faucet-submit"]')
      .should('contain', 'Request DGT Only (Governance)')
    
    // Refresh the page
    cy.reload()
    
    // Should remember the selection
    cy.get('[data-test="faucet-submit"]')
      .should('contain', 'Request DGT Only (Governance)')
    
    // The DGT option should be selected
    cy.contains('DGT Only (Governance)')
      .closest('[role="radio"]')
      .should('have.attr', 'aria-checked', 'true')
  })

  it('should handle server errors properly', () => {
    // Fill in valid address
    cy.get('[data-test="wallet-address-input"]')
      .type('dytallix1example123456789abcdef123456789')
    
    // Intercept request to return server error
    cy.intercept('POST', '/api/faucet', {
      statusCode: 500,
      body: {
        success: false,
        error: 'SERVER_ERROR',
        message: 'Internal server error'
      }
    }).as('serverError')
    
    // Submit the form
    cy.get('[data-test="faucet-submit"]').click()
    
    // Wait for the request
    cy.wait('@serverError')
    
    // Should show server error message
    cy.get('[data-test="faucet-status"]')
      .should('be.visible')
      .and('contain', 'Internal server error')
  })

  it('should show loading state during request', () => {
    // Fill in valid address
    cy.get('[data-test="wallet-address-input"]')
      .type('dytallix1example123456789abcdef123456789')
    
    // Intercept request with delay
    cy.intercept('POST', '/api/faucet', {
      delay: 1000,
      statusCode: 200,
      body: {
        success: true,
        dispensed: [
          { symbol: 'DGT', amount: '2', txHash: '0xabc123' }
        ]
      }
    }).as('slowRequest')
    
    // Submit the form
    cy.get('[data-test="faucet-submit"]').click()
    
    // Should show loading state immediately
    cy.get('[data-test="faucet-submit"]')
      .should('be.disabled')
      .and('contain', 'Sending')
    
    // Wait for the request to complete
    cy.wait('@slowRequest')
    
    // Loading state should be cleared
    cy.get('[data-test="faucet-submit"]')
      .should('not.be.disabled')
      .and('not.contain', 'Sending')
  })
})