/// <reference types="cypress" />

describe('Faucet Flow', () => {
  beforeEach(() => {
    cy.visit('/faucet')
  })

  it('should visit faucet page and fill wallet address', () => {
    // Verify we're on the faucet page
    cy.contains('Dytallix Testnet Faucet').should('be.visible')
    
    // Fill wallet address using data-test selector
    const testAddress = 'dytallix1test123456789012345678901234567890'
    cy.get('[data-test="wallet-address-input"]').type(testAddress)
    
    // Verify the address was entered
    cy.get('[data-test="wallet-address-input"]').should('have.value', testAddress)
  })

  it('should submit faucet request and check success state', () => {
    const testAddress = 'dytallix1test123456789012345678901234567890'
    
    // Fill address
    cy.get('[data-test="wallet-address-input"]').type(testAddress)
    
    // Submit the form
    cy.get('[data-test="faucet-submit"]').click()
    
    // Wait for and check the status message
    cy.get('[data-test="faucet-status"]', { timeout: 10000 }).should('be.visible')
    
    // Assert success state (status should not contain "Error")
    cy.get('[data-test="faucet-status"]').should('not.contain', 'Error')
    
    // Verify it's showing some kind of success or processing message
    cy.get('[data-test="faucet-status"]').should(($el) => {
      const text = $el.text()
      expect(text).to.not.be.empty
    })
  })

  it('should validate invalid address format', () => {
    // Enter invalid address
    cy.get('[data-test="wallet-address-input"]').type('invalid-address')
    
    // Try to submit
    cy.get('[data-test="faucet-submit"]').click()
    
    // Should show error message
    cy.get('[data-test="faucet-status"]', { timeout: 5000 }).should('be.visible')
    cy.get('[data-test="faucet-status"]').should('contain', 'address')
  })

  it('should pass accessibility check', () => {
    cy.injectAndCheckA11y()
  })
})