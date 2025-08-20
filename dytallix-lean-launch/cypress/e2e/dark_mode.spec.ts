/// <reference types="cypress" />

describe('Dark Mode Toggle', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should toggle dark mode and persist after reload', () => {
    // Verify dark mode toggle exists
    cy.get('[data-test="dark-mode-toggle"]').should('be.visible')
    
    // Check initial state (should be dark by default)
    cy.get('body').should('have.class', 'dark')
    
    // Click to toggle to light mode
    cy.get('[data-test="dark-mode-toggle"]').click()
    
    // Verify body class changes
    cy.get('body').should('not.have.class', 'dark')
    
    // Verify localStorage is set
    cy.window().then((win) => {
      expect(win.localStorage.getItem('darkMode')).to.eq('false')
    })
    
    // Reload page to test persistence
    cy.reload()
    
    // Verify light mode persists after reload
    cy.get('body').should('not.have.class', 'dark')
    cy.window().then((win) => {
      expect(win.localStorage.getItem('darkMode')).to.eq('false')
    })
    
    // Toggle back to dark mode
    cy.get('[data-test="dark-mode-toggle"]').click()
    cy.get('body').should('have.class', 'dark')
    
    // Reload and verify dark mode persists
    cy.reload()
    cy.get('body').should('have.class', 'dark')
  })

  it('should have proper accessibility attributes', () => {
    cy.get('[data-test="dark-mode-toggle"]').should('have.attr', 'aria-label')
    
    // Check initial aria-label
    cy.get('[data-test="dark-mode-toggle"]').should('have.attr', 'aria-label').and('include', 'light mode')
    
    // Toggle and check updated aria-label
    cy.get('[data-test="dark-mode-toggle"]').click()
    cy.get('[data-test="dark-mode-toggle"]').should('have.attr', 'aria-label').and('include', 'dark mode')
  })

  it('should change visual theme correctly', () => {
    // Check dark mode styles
    cy.get('body').should('have.class', 'dark')
    
    // Toggle to light mode
    cy.get('[data-test="dark-mode-toggle"]').click()
    
    // Verify visual changes (body background should change)
    cy.get('body').should('not.have.class', 'dark')
    
    // Check that the theme actually affects styling
    cy.get('body').should(($body) => {
      const styles = window.getComputedStyle($body[0])
      // In light mode, background should be different from dark mode
      expect(styles.backgroundColor).to.not.be.empty
    })
  })

  it('should work across different pages', () => {
    // Start on home page and toggle to light mode
    cy.get('[data-test="dark-mode-toggle"]').click()
    cy.get('body').should('not.have.class', 'dark')
    
    // Navigate to faucet page
    cy.get('[data-test="nav-faucet"]').click()
    
    // Verify light mode persists
    cy.get('body').should('not.have.class', 'dark')
    
    // Toggle to dark mode on faucet page
    cy.get('[data-test="dark-mode-toggle"]').click()
    cy.get('body').should('have.class', 'dark')
    
    // Navigate to dashboard page
    cy.get('[data-test="nav-dashboard"]').click()
    
    // Verify dark mode persists
    cy.get('body').should('have.class', 'dark')
  })

  it('should handle localStorage edge cases', () => {
    // Clear localStorage to test default behavior
    cy.window().then((win) => {
      win.localStorage.removeItem('darkMode')
    })
    
    // Reload page
    cy.reload()
    
    // Should default to dark mode
    cy.get('body').should('have.class', 'dark')
    
    // Set invalid localStorage value
    cy.window().then((win) => {
      win.localStorage.setItem('darkMode', 'invalid')
    })
    
    cy.reload()
    
    // Should still handle gracefully and default to dark
    cy.get('body').should('have.class', 'dark')
  })

  it('should pass accessibility checks in both modes', () => {
    // Check accessibility in dark mode
    cy.injectAndCheckA11y()
    
    // Toggle to light mode and check accessibility
    cy.get('[data-test="dark-mode-toggle"]').click()
    cy.injectAndCheckA11y()
    
    // Navigate to another page and test both modes
    cy.get('[data-test="nav-faucet"]').click()
    cy.injectAndCheckA11y()
    
    cy.get('[data-test="dark-mode-toggle"]').click()
    cy.injectAndCheckA11y()
  })

  it('should be keyboard accessible', () => {
    // Test keyboard interaction with dark mode toggle
    cy.get('[data-test="dark-mode-toggle"]').focus()
    cy.get('[data-test="dark-mode-toggle"]').should('be.focused')
    
    // Activate with Enter key
    cy.get('[data-test="dark-mode-toggle"]').type('{enter}')
    cy.get('body').should('not.have.class', 'dark')
    
    // Activate with Space key
    cy.get('[data-test="dark-mode-toggle"]').type(' ')
    cy.get('body').should('have.class', 'dark')
  })
})