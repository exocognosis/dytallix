/// <reference types="cypress" />

describe('Status Polling', () => {
  beforeEach(() => {
    cy.visit('/status')
  })

  it('should visit status page and wait for chain height', () => {
    // Verify we're on the status/dashboard page
    cy.contains('Dashboard').should('be.visible')
    
    // Wait for chain height element to appear with numeric value > 0
    cy.get('[data-test="chain-height"]', { timeout: 15000 }).should('be.visible')
    
    // Check that chain height contains a numeric value
    cy.get('[data-test="chain-height"]').should(($el) => {
      const text = $el.text().trim()
      
      // Should not be "Loading..." and should be a number > 0
      expect(text).to.not.equal('Loading...')
      
      // Extract numeric value and verify it's > 0
      const height = parseInt(text, 10)
      expect(height).to.be.a('number')
      expect(height).to.be.greaterThan(0)
    })
  })

  it('should update chain height over time', () => {
    // Wait for initial height
    cy.get('[data-test="chain-height"]', { timeout: 15000 }).should('be.visible')
    
    // Get initial height value
    cy.get('[data-test="chain-height"]').then(($el) => {
      const initialHeight = parseInt($el.text().trim(), 10)
      
      if (initialHeight > 0) {
        // Wait for a potential update (polling interval is 10 seconds)
        cy.wait(12000)
        
        // Check if height has updated or at least still shows a valid number
        cy.get('[data-test="chain-height"]').should(($newEl) => {
          const newHeight = parseInt($newEl.text().trim(), 10)
          expect(newHeight).to.be.greaterThan(0)
          // Height should be >= initial height (blockchain only moves forward)
          expect(newHeight).to.be.at.least(initialHeight)
        })
      }
    })
  })

  it('should handle network errors gracefully', () => {
    // Intercept API calls and simulate network error
    cy.intercept('GET', '**/api/status/height', { forceNetworkError: true }).as('heightError')
    
    // Visit the page
    cy.visit('/status')
    
    // Should handle the error gracefully (not crash the page)
    cy.get('[data-test="chain-height"]', { timeout: 15000 }).should('be.visible')
    
    // Should show some fallback content (Loading... or error state)
    cy.get('[data-test="chain-height"]').should(($el) => {
      const text = $el.text().trim()
      expect(text).to.not.be.empty
    })
  })

  it('should pass accessibility check', () => {
    cy.injectAndCheckA11y()
  })
})