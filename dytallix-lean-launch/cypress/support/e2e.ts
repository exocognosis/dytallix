/// <reference types="cypress" />
import 'cypress-axe'

// Register custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      injectAndCheckA11y(): Chainable<void>
    }
  }
}

// Custom command to inject axe-core and check accessibility
// Configured to only report serious and critical violations
Cypress.Commands.add('injectAndCheckA11y', () => {
  cy.injectAxe()
  cy.checkA11y(null, {
    includedImpacts: ['serious', 'critical'],
    rules: {
      // Disable color-contrast checks here if needed for specific tests
      // 'color-contrast': { enabled: false }
    }
  })
})

// Handle uncaught exceptions safely for E2E tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore certain non-critical errors during E2E testing
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  // Return true to let other errors fail the test
  return true
})