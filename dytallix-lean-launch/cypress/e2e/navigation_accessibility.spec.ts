/// <reference types="cypress" />

describe('Navigation & Accessibility', () => {
  const navLinks = [
    { testId: 'nav-home', path: '/', expectedContent: 'Dytallix' },
    { testId: 'nav-faucet', path: '/faucet', expectedContent: 'Testnet Faucet' },
    { testId: 'nav-wallet', path: '/wallet', expectedContent: 'Wallet' },
    { testId: 'nav-explorer', path: '/explorer', expectedContent: 'Explorer' },
    { testId: 'nav-dashboard', path: '/dashboard', expectedContent: 'Dashboard' },
  ]

  beforeEach(() => {
    cy.visit('/')
  })

  navLinks.forEach(({ testId, path, expectedContent }) => {
    it(`should navigate to ${path} via ${testId} and verify accessibility`, () => {
      // Verify the nav link exists and has correct href
      cy.get(`[data-test="${testId}"]`).should('be.visible')
      cy.get(`[data-test="${testId}"]`).should('have.attr', 'href', path)
      
      // Click the navigation link
      cy.get(`[data-test="${testId}"]`).click()
      
      // Verify navigation occurred
      cy.url().should('include', path)
      
      // Verify page content loaded
      cy.contains(expectedContent, { timeout: 10000 }).should('be.visible')
      
      // Run accessibility check on the page
      cy.injectAndCheckA11y()
      
      // Verify no 404 error by checking that page doesn't contain "Not Found" or error content
      cy.get('body').should('not.contain', 'Not Found')
      cy.get('body').should('not.contain', '404')
    })
  })

  it('should verify all navigation links are accessible', () => {
    navLinks.forEach(({ testId }) => {
      // Check that each nav link is focusable and has proper attributes
      cy.get(`[data-test="${testId}"]`).should('be.visible')
      
      // Verify it's a proper link element
      cy.get(`[data-test="${testId}"]`).should('have.prop', 'tagName', 'A')
      
      // Verify it has href attribute
      cy.get(`[data-test="${testId}"]`).should('have.attr', 'href')
      
      // Test keyboard navigation
      cy.get(`[data-test="${testId}"]`).focus()
      cy.get(`[data-test="${testId}"]`).should('be.focused')
    })
  })

  it('should handle navigation with keyboard', () => {
    // Test keyboard navigation on nav links
    cy.get('[data-test="nav-home"]').focus()
    cy.get('[data-test="nav-home"]').type('{enter}')
    cy.url().should('include', '/')
    
    // Test tab navigation
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-test')
  })

  it('should maintain navigation state correctly', () => {
    // Visit faucet page
    cy.get('[data-test="nav-faucet"]').click()
    cy.url().should('include', '/faucet')
    
    // Verify active state
    cy.get('[data-test="nav-faucet"]').should('have.attr', 'aria-current', 'page')
    
    // Navigate to another page
    cy.get('[data-test="nav-dashboard"]').click()
    cy.url().should('include', '/dashboard')
    
    // Verify new active state
    cy.get('[data-test="nav-dashboard"]').should('have.attr', 'aria-current', 'page')
    cy.get('[data-test="nav-faucet"]').should('not.have.attr', 'aria-current', 'page')
  })

  it('should provide comprehensive accessibility coverage', () => {
    // Check home page accessibility
    cy.injectAndCheckA11y()
    
    // Navigate through key pages and check each
    const pagesToCheck = ['/faucet', '/dashboard', '/explorer']
    
    pagesToCheck.forEach((page) => {
      cy.visit(page)
      cy.injectAndCheckA11y()
    })
  })

  it('should handle mobile viewport navigation', () => {
    // Test navigation on mobile viewport
    cy.viewport(375, 667)
    
    // All nav links should still be accessible
    navLinks.forEach(({ testId, path }) => {
      cy.get(`[data-test="${testId}"]`).should('exist')
      cy.get(`[data-test="${testId}"]`).should('have.attr', 'href', path)
    })
    
    // Run accessibility check on mobile
    cy.injectAndCheckA11y()
  })
})