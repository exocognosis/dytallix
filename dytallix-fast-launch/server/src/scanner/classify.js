/**
 * Vulnerability Classification System
 * 
 * Classifies security findings based on severity criteria and vulnerability types
 */

/**
 * Classify vulnerability based on type and context
 * @param {Object} finding - Vulnerability finding
 * @returns {Object} Classified finding with updated severity
 */
export function classifyVulnerability(finding) {
  const classified = { ...finding }
  
  // Apply classification rules
  const newSeverity = classifySeverity(finding)
  if (newSeverity) {
    classified.severity = newSeverity
  }

  return classified
}

/**
 * Classify severity based on vulnerability type and characteristics
 * @param {Object} finding - Vulnerability finding
 * @returns {string|null} New severity level or null to keep original
 */
function classifySeverity(finding) {
  const type = finding.type || ''
  const title = (finding.title || '').toLowerCase()
  const description = (finding.description || '').toLowerCase()
  
  // Critical severity vulnerabilities
  if (isCriticalVulnerability(type, title, description)) {
    return 'critical'
  }

  // High severity vulnerabilities
  if (isHighVulnerability(type, title, description)) {
    return 'high'
  }

  // Medium severity vulnerabilities
  if (isMediumVulnerability(type, title, description)) {
    return 'medium'
  }

  // Low severity vulnerabilities
  if (isLowVulnerability(type, title, description)) {
    return 'low'
  }

  // Keep original severity if no classification match
  return null
}

/**
 * Check if vulnerability is critical severity
 * @private
 */
function isCriticalVulnerability(type, title, description) {
  const criticalPatterns = [
    // Reentrancy vulnerabilities
    'reentrancy',
    
    // Unprotected self-destruct
    'selfdestruct',
    'suicide',
    
    // Delegatecall to user input
    'delegatecall',
    
    // Authorization bypass patterns
    'authorization bypass',
    'access control bypass',
    
    // Integer overflow/underflow leading to fund miscalculation (pre-0.8)
    'arithmetic overflow',
    'integer overflow',
    'integer underflow',
    
    // Arbitrary write vulnerabilities
    'arbitrary write',
    'arbitrary storage',
    
    // Locked ether (permanent DoS of funds)
    'locked ether',
    'locked funds',
    
    // Price oracle manipulation
    'oracle manipulation',
    'price manipulation'
  ]

  // Check for critical patterns in type, title, or description
  for (const pattern of criticalPatterns) {
    if (type.includes(pattern) || title.includes(pattern) || description.includes(pattern)) {
      // Additional context checks for accurate classification
      if (pattern === 'reentrancy' && isReentrancyCritical(title, description)) {
        return true
      }
      if ((pattern === 'selfdestruct' || pattern === 'suicide') && isUnprotectedDestruct(title, description)) {
        return true
      }
      if (pattern === 'delegatecall' && isDelegatecallCritical(title, description)) {
        return true
      }
      if (pattern.includes('overflow') || pattern.includes('underflow')) {
        return isArithmeticCritical(title, description)
      }
      if (pattern.includes('locked') && isLockedFundsCritical(title, description)) {
        return true
      }
      
      return true
    }
  }

  return false
}

/**
 * Check if vulnerability is high severity
 * @private
 */
function isHighVulnerability(type, title, description) {
  const highPatterns = [
    // Unchecked call return values
    'unchecked call',
    'unchecked return',
    'unchecked low-level',
    
    // tx.origin authentication
    'tx.origin',
    
    // Integer precision loss
    'precision loss',
    
    // DoS via gas-heavy loops
    'gas limit',
    'dos',
    'denial of service',
    
    // Access control misconfiguration
    'access control',
    'missing modifier',
    
    // Front-running vulnerabilities
    'front-running',
    'mev',
    
    // State consistency issues
    'state inconsistency',
    
    // Unhandled exceptions
    'unhandled exception'
  ]

  for (const pattern of highPatterns) {
    if (type.includes(pattern) || title.includes(pattern) || description.includes(pattern)) {
      // Additional context checks
      if (pattern.includes('unchecked') && isUncheckedCallHigh(title, description)) {
        return true
      }
      if (pattern === 'tx.origin' && isTxOriginHigh(title, description)) {
        return true
      }
      
      return true
    }
  }

  return false
}

/**
 * Check if vulnerability is medium severity
 * @private
 */
function isMediumVulnerability(type, title, description) {
  const mediumPatterns = [
    // Unindexed events for critical actions
    'unindexed event',
    'missing event',
    
    // Block timestamp manipulation
    'block.timestamp',
    'timestamp manipulation',
    
    // Gas inefficiencies causing griefing
    'gas inefficiency',
    'gas optimization',
    
    // Minor state issues
    'state variable',
    
    // Weak randomness
    'weak randomness',
    'predictable random',
    
    // Assembly usage without clear necessity
    'inline assembly',
    
    // Floating pragma
    'floating pragma',
    
    // Unused variables/functions (security relevance)
    'unused variable',
    'dead code'
  ]

  for (const pattern of mediumPatterns) {
    if (type.includes(pattern) || title.includes(pattern) || description.includes(pattern)) {
      return true
    }
  }

  return false
}

/**
 * Check if vulnerability is low severity
 * @private
 */
function isLowVulnerability(type, title, description) {
  const lowPatterns = [
    // Style and informational issues
    'style',
    'informational',
    'optimization',
    
    // Minor pragma issues
    'pragma',
    
    // Naming conventions
    'naming convention',
    
    // Code organization
    'code organization',
    
    // Minor gas optimizations
    'gas saving',
    
    // Documentation issues
    'missing natspec',
    'documentation'
  ]

  for (const pattern of lowPatterns) {
    if (type.includes(pattern) || title.includes(pattern) || description.includes(pattern)) {
      return true
    }
  }

  return false
}

// Helper functions for more precise classification

function isReentrancyCritical(title, description) {
  // Check if it's actually a reentrancy that can drain funds
  const criticalIndicators = [
    'withdraw',
    'transfer',
    'send',
    'call',
    'external call',
    'before state update',
    'drain'
  ]
  
  return criticalIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

function isUnprotectedDestruct(title, description) {
  // Check if selfdestruct lacks proper access controls
  const unprotectedIndicators = [
    'unprotected',
    'public',
    'anyone can',
    'no access control',
    'missing modifier'
  ]
  
  return unprotectedIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

function isDelegatecallCritical(title, description) {
  // Check if delegatecall uses user-controlled data
  const criticalIndicators = [
    'user input',
    'user controlled',
    'arbitrary',
    'external input',
    'parameter'
  ]
  
  return criticalIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

function isArithmeticCritical(title, description) {
  // Check if arithmetic issue affects funds or critical calculations
  const criticalIndicators = [
    'balance',
    'token',
    'fund',
    'amount',
    'price',
    'value',
    'calculation'
  ]
  
  return criticalIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

function isLockedFundsCritical(title, description) {
  // Check if it's actually about permanently locked funds
  const criticalIndicators = [
    'permanent',
    'no withdrawal',
    'cannot withdraw',
    'stuck',
    'trapped'
  ]
  
  return criticalIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

function isUncheckedCallHigh(title, description) {
  // Check if unchecked call can cause stuck state
  const highIndicators = [
    'stuck state',
    'state corruption',
    'critical function',
    'payment',
    'transfer'
  ]
  
  return highIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

function isTxOriginHigh(title, description) {
  // Check if tx.origin is used for authentication
  const authIndicators = [
    'authentication',
    'authorization',
    'access control',
    'owner',
    'admin',
    'modifier'
  ]
  
  return authIndicators.some(indicator => 
    title.includes(indicator) || description.includes(indicator)
  )
}

/**
 * Get severity color for frontend display
 * @param {string} severity - Severity level
 * @returns {string} CSS color value
 */
export function getSeverityColor(severity) {
  const colors = {
    critical: '#d32f2f',  // Red
    high: '#f57c00',      // Orange  
    medium: '#fbc02d',    // Yellow
    low: '#1976d2'        // Blue
  }
  
  return colors[severity] || colors.medium
}

/**
 * Get severity weight for sorting
 * @param {string} severity - Severity level
 * @returns {number} Weight value (higher = more severe)
 */
export function getSeverityWeight(severity) {
  const weights = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  }
  
  return weights[severity] || 0
}