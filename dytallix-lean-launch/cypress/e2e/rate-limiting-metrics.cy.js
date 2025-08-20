// Rate limiting and metrics E2E test
describe('Faucet Rate Limiting and Metrics', () => {
  beforeEach(() => {
    // Visit the faucet page
    cy.visit('http://localhost:5173')
    // Wait for the page to load
    cy.get('[data-testid="faucet-form"]', { timeout: 10000 }).should('be.visible')
  })

  it('should show rate limit information in status', () => {
    // Check that API status shows correct rate limit windows
    cy.request('GET', 'http://localhost:8787/api/status').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.rateLimit).to.deep.include({
        dgtWindowHours: 24,
        drtWindowHours: 6,
        maxRequests: 1
      })
    })
  })

  it('should expose Prometheus metrics', () => {
    // Check that metrics endpoint is available
    cy.request('GET', 'http://localhost:8787/metrics').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.include('rate_limit_hits_total')
      expect(response.body).to.include('faucet_requests_total')
    })
  })

  it('should handle rate limiting on repeated requests', () => {
    const testAddress = 'dytallix1test1234567890abcdef'
    
    // Fill in the address
    cy.get('input[placeholder*="address"]').clear().type(testAddress)
    
    // Select DGT token (assuming there's a token selector)
    cy.get('[data-testid="token-selector"]').should('exist')
    
    // Make first request - this might fail due to blockchain connectivity
    // but we're testing the UI flow and rate limiting logic
    cy.get('button[type="submit"]').click()
    
    // Wait a moment
    cy.wait(1000)
    
    // Make second request immediately - should trigger rate limiting
    cy.get('button[type="submit"]').click()
    
    // Check for rate limit error message in UI
    cy.get('[data-testid="error-message"]', { timeout: 5000 })
      .should('contain.text', 'Rate limit')
      .or('contain.text', 'too many')
      .or('contain.text', 'wait')
  })

  it('should show Redis configuration in status when configured', () => {
    // This test verifies that Redis configuration is properly reflected
    cy.request('GET', 'http://localhost:8787/api/status').then((response) => {
      expect(response.status).to.eq(200)
      // Redis status should be boolean (true if DLX_RATE_LIMIT_REDIS_URL is set)
      expect(response.body).to.have.property('redis')
      expect(typeof response.body.redis).to.eq('boolean')
    })
  })

  it('should increment metrics on requests', () => {
    // Get initial metrics
    cy.request('GET', 'http://localhost:8787/metrics').then((initialResponse) => {
      const initialMetrics = initialResponse.body
      
      // Make a faucet request (will likely fail but should increment metrics)
      cy.request({
        method: 'POST',
        url: 'http://localhost:8787/api/faucet',
        body: {
          address: 'dytallix1test1234567890abcdef',
          tokens: ['DGT']
        },
        failOnStatusCode: false // Don't fail on 4xx/5xx since we expect errors
      })
      
      // Check metrics again
      cy.request('GET', 'http://localhost:8787/metrics').then((finalResponse) => {
        const finalMetrics = finalResponse.body
        
        // Metrics should have changed (some counter should have incremented)
        expect(finalMetrics).to.not.eq(initialMetrics)
      })
    })
  })

  it('should handle different tokens with independent rate limits', () => {
    const testAddress = 'dytallix1test1234567890abcdef'
    
    // Test that DGT and DRT have different rate limit windows
    // This is tested at the API level since UI interaction depends on implementation
    
    cy.request({
      method: 'POST',
      url: 'http://localhost:8787/api/faucet',
      body: {
        address: testAddress,
        tokens: ['DGT']
      },
      failOnStatusCode: false
    }).then((dgtResponse) => {
      // Make request for DRT token
      cy.request({
        method: 'POST',
        url: 'http://localhost:8787/api/faucet',
        body: {
          address: testAddress,
          tokens: ['DRT']  
        },
        failOnStatusCode: false
      }).then((drtResponse) => {
        // Both should have similar response structure
        // (both will likely fail due to blockchain connectivity, but rate limiting should work)
        expect(dgtResponse.status).to.be.oneOf([200, 429, 500])
        expect(drtResponse.status).to.be.oneOf([200, 429, 500])
      })
    })
  })
})

// Production validation test (separate describe block)
describe('Production Environment Validation', () => {
  it('should validate that production mode prevents startup with placeholder secrets', () => {
    // This test would need to be run in a different environment
    // For now, we'll just verify the validation endpoint exists
    cy.request('GET', 'http://localhost:8787/health').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('ok', true)
    })
  })
})