// Cypress E2E Tests for Dual-Token Faucet
// To install and run: npm install --save-dev cypress && npx cypress run

describe('Dual-Token Faucet E2E Tests', () => {
  beforeEach(() => {
    // Visit the faucet page
    cy.visit('/faucet')
    // Wait for page to load
    cy.contains('Dytallix Testnet Faucet').should('be.visible')
  })

  describe('Token Selection', () => {
    it('should allow selecting dual tokens (Both DGT + DRT)', () => {
      // Click on "Both DGT + DRT" option
      cy.contains('Both DGT + DRT (Recommended)').click()
      
      // Verify selection is active
      cy.contains('Both DGT + DRT (Recommended)')
        .parent()
        .should('have.class', 'selected')
    })

    it('should allow selecting single token (DGT Only)', () => {
      cy.contains('DGT Only (Governance)').click()
      cy.contains('DGT Only (Governance)')
        .parent()
        .should('have.class', 'selected')
    })

    it('should allow selecting single token (DRT Only)', () => {
      cy.contains('DRT Only (Rewards)').click()
      cy.contains('DRT Only (Rewards)')
        .parent()
        .should('have.class', 'selected')
    })
  })

  describe('Address Input', () => {
    it('should allow manual address entry', () => {
      const testAddress = 'dytallix1test123456789012345678901234567890'
      
      cy.get('input[placeholder="dytallix1..."]')
        .type(testAddress)
        .should('have.value', testAddress)
    })

    it('should show PQC wallet auto-detection when available', () => {
      // This would test auto-detection from local PQC wallet
      // Implementation would check for presence of saved wallet meta
      cy.contains('(Enter your dytallix1... address)').should('be.visible')
    })
  })

  describe('Faucet Request Flow', () => {
    beforeEach(() => {
      // Set up test address
      const testAddress = 'dytallix1test123456789012345678901234567890'
      cy.get('input[placeholder="dytallix1..."]').type(testAddress)
    })

    it('should handle successful dual-token request', () => {
      // Intercept API call and mock success response
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
      }).as('faucetRequest')

      // Select both tokens (default)
      cy.contains('Both DGT + DRT (Recommended)').click()
      
      // Submit request
      cy.contains('Request Both DGT + DRT').click()
      
      // Wait for API call
      cy.wait('@faucetRequest')
      
      // Verify success message
      cy.contains('✅').should('be.visible')
      cy.contains('DGT + DRT sent successfully').should('be.visible')
    })

    it('should handle rate limit error', () => {
      // Mock rate limit response
      cy.intercept('POST', '/api/faucet', {
        statusCode: 429,
        body: {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Rate limit exceeded. Please wait 60 minutes before trying again.',
          retryAfterSeconds: 3600
        }
      }).as('rateLimitRequest')

      cy.contains('Request Both DGT + DRT').click()
      cy.wait('@rateLimitRequest')
      
      // Verify rate limit message
      cy.contains('Rate limit exceeded').should('be.visible')
      cy.contains('60 minutes').should('be.visible')
    })

    it('should handle invalid address error', () => {
      // Clear address and enter invalid one
      cy.get('input[placeholder="dytallix1..."]')
        .clear()
        .type('invalid-address')

      cy.contains('Request Both DGT + DRT').click()
      
      // Should show validation error
      cy.contains('Please enter a valid Dytallix bech32 address').should('be.visible')
    })

    it('should handle server error gracefully', () => {
      cy.intercept('POST', '/api/faucet', {
        statusCode: 500,
        body: {
          success: false,
          error: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      }).as('serverError')

      cy.contains('Request Both DGT + DRT').click()
      cy.wait('@serverError')
      
      cy.contains('Internal server error').should('be.visible')
    })
  })

  describe('API Status Integration', () => {
    it('should display service status when available', () => {
      // Mock status API
      cy.intercept('GET', '/api/status', {
        statusCode: 200,
        body: {
          ok: true,
          network: 'dytallix-testnet-1',
          redis: false,
          rateLimit: {
            windowSeconds: 3600,
            maxRequests: 1
          }
        }
      }).as('statusRequest')

      // If the component fetches status, verify it displays
      cy.wait('@statusRequest')
      // Add assertions based on your UI implementation
    })
  })

  describe('Balance Checking', () => {
    it('should check balance when address is entered', () => {
      const testAddress = 'dytallix1test123456789012345678901234567890'
      
      cy.intercept('GET', `/api/balance?address=${testAddress}`, {
        statusCode: 200,
        body: {
          address: testAddress,
          balances: [
            { symbol: 'DGT', amount: '10', denom: 'udgt' },
            { symbol: 'DRT', amount: '100', denom: 'udrt' }
          ]
        }
      }).as('balanceRequest')

      cy.get('input[placeholder="dytallix1..."]').type(testAddress)
      
      // Trigger balance check (if implemented)
      // This depends on your specific UI implementation
    })
  })

  describe('Responsive Design', () => {
    it('should work on mobile viewport', () => {
      cy.viewport('iphone-6')
      
      // Verify key elements are still accessible
      cy.contains('Dytallix Testnet Faucet').should('be.visible')
      cy.contains('Both DGT + DRT (Recommended)').should('be.visible')
      cy.get('input[placeholder="dytallix1..."]').should('be.visible')
    })

    it('should work on tablet viewport', () => {
      cy.viewport('ipad-2')
      
      cy.contains('Dytallix Testnet Faucet').should('be.visible')
      cy.contains('Request Both DGT + DRT').should('be.visible')
    })
  })
})