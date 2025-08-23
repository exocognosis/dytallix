/// <reference types="cypress" />

/**
 * Comprehensive E2E test for faucet flow including wallet balance verification
 * Tests the complete backend → frontend → wallet balance update flow
 */

describe('Faucet E2E Flow with Balance Verification', () => {
  const testAddress = 'dytallix1test123456789012345678901234567890'
  
  beforeEach(() => {
    cy.visit('/faucet')
    
    // Intercept API calls for monitoring
    cy.intercept('POST', '/api/faucet').as('faucetRequest')
    cy.intercept('GET', '/api/balance*').as('balanceRequest')
  })

  describe('Page Load and UI Elements', () => {
    it('should load faucet page with all required elements', () => {
      // Verify page title and main elements
      cy.contains('Dytallix Testnet Faucet').should('be.visible')
      
      // Check for required form elements with data-cy selectors
      cy.get('[data-cy="faucet-address-input"]').should('be.visible')
      cy.get('[data-cy="faucet-request"]').should('be.visible')
      
      // Wallet balance element should be present
      cy.get('[data-cy="wallet-balance"]').should('exist')
    })

    it('should have proper accessibility structure', () => {
      // Test accessibility compliance
      cy.injectAxe()
      cy.checkA11y('[data-cy="faucet-form"]', {
        tags: ['wcag2a', 'wcag2aa']
      })
    })
  })

  describe('Input Validation', () => {
    it('should validate address input format', () => {
      // Test invalid address format
      cy.get('[data-cy="faucet-address-input"]').type('invalid-address')
      cy.get('[data-cy="faucet-request"]').click()
      
      // Should show validation error
      cy.get('[data-cy="toast-error"]').should('be.visible')
        .and('contain', 'valid')
    })

    it('should accept valid dytallix address', () => {
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="faucet-address-input"]').should('have.value', testAddress)
      
      // Should not show validation errors immediately
      cy.get('[data-cy="toast-error"]').should('not.exist')
    })
  })

  describe('Single Token Request Flow', () => {
    it('should complete DGT token request and verify balance update', () => {
      // Fill address
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      
      // Select DGT token (if there's a token selector)
      cy.get('[data-cy="token-selector-dgt"]').click()
      
      // Submit request
      cy.get('[data-cy="faucet-request"]').click()
      
      // Wait for API call and verify request payload
      cy.wait('@faucetRequest').then((interception) => {
        expect(interception.request.body).to.include({
          address: testAddress
        })
        expect(interception.request.body.token || interception.request.body.tokens).to.exist
        
        // Verify successful response structure
        expect(interception.response?.statusCode).to.equal(200)
        const responseBody = interception.response?.body
        expect(responseBody).to.have.property('success', true)
        expect(responseBody).to.have.property('dispensed')
        expect(responseBody.dispensed).to.be.an('array')
        expect(responseBody.dispensed[0]).to.have.property('symbol', 'DGT')
        expect(responseBody.dispensed[0]).to.have.property('amount')
        expect(responseBody.dispensed[0]).to.have.property('txHash')
        expect(responseBody.dispensed[0].txHash).to.match(/^0x[a-fA-F0-9]{64}$/)
      })
      
      // Verify success message appears
      cy.get('[data-cy="toast-success"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', 'DGT')
      
      // Verify wallet balance is updated
      cy.get('[data-cy="wallet-balance"]').within(() => {
        cy.get('[data-cy="balance-dgt"]').should('be.visible')
          .and('not.contain', '0')  // Should show non-zero balance
      })
    })

    it('should complete DRT token request and verify balance update', () => {
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="token-selector-drt"]').click()
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@faucetRequest').then((interception) => {
        expect(interception.response?.statusCode).to.equal(200)
        const responseBody = interception.response?.body
        expect(responseBody.dispensed[0]).to.have.property('symbol', 'DRT')
      })
      
      cy.get('[data-cy="toast-success"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', 'DRT')
      
      cy.get('[data-cy="wallet-balance"]').within(() => {
        cy.get('[data-cy="balance-drt"]').should('be.visible')
          .and('not.contain', '0')
      })
    })
  })

  describe('Dual Token Request Flow', () => {
    it('should complete dual token request and verify both balances update', () => {
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      
      // Select both tokens
      cy.get('[data-cy="token-selector-both"]').click()
      
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@faucetRequest').then((interception) => {
        expect(interception.response?.statusCode).to.equal(200)
        const responseBody = interception.response?.body
        expect(responseBody).to.have.property('success', true)
        expect(responseBody.dispensed).to.have.lengthOf(2)
        
        // Verify both tokens were dispensed
        const symbols = responseBody.dispensed.map((d: any) => d.symbol)
        expect(symbols).to.include.members(['DGT', 'DRT'])
      })
      
      cy.get('[data-cy="toast-success"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', 'DGT + DRT')
      
      // Verify both balances are updated
      cy.get('[data-cy="wallet-balance"]').within(() => {
        cy.get('[data-cy="balance-dgt"]').should('be.visible')
          .and('not.contain', '0')
        cy.get('[data-cy="balance-drt"]').should('be.visible')
          .and('not.contain', '0')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limiting gracefully', () => {
      // Make multiple rapid requests to trigger rate limiting
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      
      // First request
      cy.get('[data-cy="faucet-request"]').click()
      cy.wait('@faucetRequest')
      
      // Immediate second request (should be rate limited)
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@faucetRequest').then((interception) => {
        if (interception.response?.statusCode === 429) {
          // Rate limited response
          cy.get('[data-cy="toast-error"]')
            .should('be.visible')
            .and('contain', 'rate limit')
        }
      })
    })

    it('should handle server errors gracefully', () => {
      // Intercept with error response
      cy.intercept('POST', '/api/faucet', {
        statusCode: 500,
        body: {
          success: false,
          error: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      }).as('faucetError')
      
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@faucetError')
      
      cy.get('[data-cy="toast-error"]')
        .should('be.visible')
        .and('contain', 'server error')
    })

    it('should handle network errors gracefully', () => {
      // Intercept with network error
      cy.intercept('POST', '/api/faucet', { forceNetworkError: true }).as('networkError')
      
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@networkError')
      
      cy.get('[data-cy="toast-error"]')
        .should('be.visible')
        .and('contain', 'network')
    })
  })

  describe('Balance Verification Flow', () => {
    it('should verify balance API call structure', () => {
      // Enter address to trigger balance lookup
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="check-balance"]').click()
      
      cy.wait('@balanceRequest').then((interception) => {
        expect(interception.request.url).to.include('/api/balance')
        expect(interception.request.url).to.include(testAddress)
        
        // Verify balance response structure
        const responseBody = interception.response?.body
        expect(responseBody).to.have.property('address', testAddress)
        expect(responseBody).to.have.property('balances')
        expect(responseBody.balances).to.be.an('array')
        
        responseBody.balances.forEach((balance: any) => {
          expect(balance).to.have.property('symbol')
          expect(balance).to.have.property('amount')
          expect(balance).to.have.property('denom')
          expect(['DGT', 'DRT']).to.include(balance.symbol)
        })
      })
    })

    it('should update balance display after successful faucet request', () => {
      // Record initial balance
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="check-balance"]').click()
      cy.wait('@balanceRequest')
      
      // Store initial DGT balance
      cy.get('[data-cy="balance-dgt"]').invoke('text').as('initialDgtBalance')
      
      // Make faucet request
      cy.get('[data-cy="token-selector-dgt"]').click()
      cy.get('[data-cy="faucet-request"]').click()
      cy.wait('@faucetRequest')
      
      // Verify balance increased
      cy.get('@initialDgtBalance').then((initialBalance) => {
        cy.get('[data-cy="balance-dgt"]').should((balanceElement) => {
          const currentBalance = balanceElement.text()
          // Balance should have increased (this is a simplified check)
          expect(currentBalance).to.not.equal(initialBalance)
        })
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work properly on mobile viewport', () => {
      cy.viewport('iphone-6')
      
      // All elements should still be visible and functional
      cy.get('[data-cy="faucet-address-input"]').should('be.visible')
      cy.get('[data-cy="faucet-request"]').should('be.visible')
      
      // Complete a mobile faucet request
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@faucetRequest').then((interception) => {
        expect(interception.response?.statusCode).to.equal(200)
      })
    })
  })

  describe('Performance', () => {
    it('should complete faucet request within reasonable time', () => {
      const startTime = Date.now()
      
      cy.get('[data-cy="faucet-address-input"]').type(testAddress)
      cy.get('[data-cy="faucet-request"]').click()
      
      cy.wait('@faucetRequest').then(() => {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Request should complete within 5 seconds
        expect(duration).to.be.lessThan(5000)
      })
    })
  })
})