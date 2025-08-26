import { SlitherAnalyzer } from './slither.js'
import { MythrilAnalyzer } from './mythril.js'
import { MockSlitherAnalyzer, MockMythrilAnalyzer } from './mock.js'
import { classifyVulnerability } from './classify.js'
import { annotateSource } from './annotate.js'
// Simple UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Smart Contract Security Scanner Service
 * 
 * Integrates static analysis (Slither) and symbolic execution (Mythril)
 * to provide comprehensive security analysis of Solidity contracts.
 */
export class ContractScanner {
  constructor(options = {}) {
    // Initialize analyzers with fallback to mocks
    this.options = {
      timeout: options.timeout || 30000, // 30 seconds default
      maxConcurrency: options.maxConcurrency || 3,
      useMocks: options.useMocks || false,
      ...options
    }
    
    if (this.options.useMocks) {
      this.slither = new MockSlitherAnalyzer()
      this.mythril = new MockMythrilAnalyzer()
    } else {
      this.slither = new SlitherAnalyzer(options.slither || {})
      this.mythril = new MythrilAnalyzer(options.mythril || {})
    }
    
    this.activeScanCount = 0
  }

  /**
   * Main scan function - analyzes Solidity source code
   * @param {string} sourceCode - Solidity source code
   * @param {Object} options - Scan options
   * @returns {Promise<Object>} Scan results
   */
  async scanContract(sourceCode, options = {}) {
    // Check concurrency limit
    if (this.activeScanCount >= this.options.maxConcurrency) {
      throw new Error('SCANNER_BUSY')
    }

    this.activeScanCount++
    const scanId = uuidv4()
    const startTime = Date.now()

    try {
      // Validate input
      this._validateInput(sourceCode)

      // Run static analysis and symbolic execution in parallel
      const [slitherResults, mythrilResults] = await Promise.allSettled([
        this.slither.analyze(sourceCode, { timeout: this.options.timeout }),
        this.mythril.analyze(sourceCode, { timeout: this.options.timeout })
      ])

      // Process results
      const findings = []
      const errors = []

      // Process Slither results
      if (slitherResults.status === 'fulfilled') {
        findings.push(...this._normalizeFindings(slitherResults.value, 'slither'))
      } else {
        errors.push({
          tool: 'slither',
          error: slitherResults.reason.message || 'Static analysis failed'
        })
      }

      // Process Mythril results  
      if (mythrilResults.status === 'fulfilled') {
        findings.push(...this._normalizeFindings(mythrilResults.value, 'mythril'))
      } else {
        errors.push({
          tool: 'mythril', 
          error: mythrilResults.reason.message || 'Symbolic execution failed'
        })
      }

      // Classify vulnerabilities and add annotations
      const classifiedFindings = findings.map(f => classifyVulnerability(f))
      const annotatedFindings = annotateSource(sourceCode, classifiedFindings)

      // Generate summary
      const summary = this._generateSummary(annotatedFindings)
      const durationMs = Date.now() - startTime
      
      // Get tool versions
      const toolVersions = await this._getToolVersions()

      return {
        meta: {
          scanId,
          timestamp: new Date().toISOString(),
          durationMs,
          toolVersions
        },
        summary,
        findings: annotatedFindings,
        errors
      }

    } finally {
      this.activeScanCount--
    }
  }

  /**
   * Validate input source code
   * @private
   */
  _validateInput(sourceCode) {
    if (typeof sourceCode !== 'string') {
      throw new Error('Source code must be a string')
    }
    
    if (sourceCode.trim().length === 0) {
      throw new Error('Source code cannot be empty')
    }

    // Check size limit (100KB)
    const sizeBytes = new TextEncoder().encode(sourceCode).length
    if (sizeBytes > 100 * 1024) {
      throw new Error('Source code exceeds 100KB limit')
    }
  }

  /**
   * Normalize findings from different tools to common format
   * @private
   */
  _normalizeFindings(results, tool) {
    if (!results || !results.issues) {
      return []
    }

    return results.issues.map((issue, index) => ({
      id: `${tool.toUpperCase()}-${index + 1}`,
      title: issue.title || issue.check || 'Security Issue',
      description: issue.description || issue.message || '',
      severity: this._mapSeverity(issue.severity, tool),
      tool,
      type: this._mapType(issue),
      locations: this._extractLocations(issue),
      sourceSnippet: issue.sourceSnippet || '',
      remediation: issue.remediation || this._getDefaultRemediation(issue)
    }))
  }

  /**
   * Map tool-specific severity to our standard levels
   * @private
   */
  _mapSeverity(severity, tool) {
    const severityMap = {
      slither: {
        'High': 'high',
        'Medium': 'medium', 
        'Low': 'low',
        'Informational': 'low'
      },
      mythril: {
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low'
      }
    }

    return severityMap[tool]?.[severity] || 'medium'
  }

  /**
   * Map issue to vulnerability type
   * @private
   */
  _mapType(issue) {
    const check = issue.check || issue.title || ''
    if (check.includes('reentrancy')) return 'reentrancy'
    if (check.includes('overflow') || check.includes('underflow')) return 'arithmetic-overflow'
    if (check.includes('unchecked')) return 'unchecked-call'
    if (check.includes('tx.origin')) return 'tx-origin'
    if (check.includes('delegatecall')) return 'delegatecall'
    if (check.includes('selfdestruct')) return 'selfdestruct'
    return 'other'
  }

  /**
   * Extract file locations from issue
   * @private
   */
  _extractLocations(issue) {
    const locations = []
    
    if (issue.elements) {
      for (const element of issue.elements) {
        if (element.source_mapping && element.source_mapping.lines) {
          locations.push({
            file: element.source_mapping.filename || 'contract.sol',
            line: element.source_mapping.lines[0]
          })
        }
      }
    }

    // Fallback for simple line number
    if (locations.length === 0 && issue.line) {
      locations.push({
        file: 'contract.sol',
        line: issue.line
      })
    }

    return locations
  }

  /**
   * Get default remediation for issue type
   * @private
   */
  _getDefaultRemediation(issue) {
    const type = this._mapType(issue)
    const remediations = {
      'reentrancy': 'Use checks-effects-interactions pattern or ReentrancyGuard.',
      'arithmetic-overflow': 'Use SafeMath library or Solidity >=0.8 with built-in checks.',
      'unchecked-call': 'Check return values of external calls.',
      'tx-origin': 'Use msg.sender instead of tx.origin for authentication.',
      'delegatecall': 'Avoid delegatecall or use vetted libraries only.',
      'selfdestruct': 'Avoid selfdestruct or implement proper access controls.'
    }
    return remediations[type] || 'Review code for security implications.'
  }

  /**
   * Generate summary statistics
   * @private
   */
  _generateSummary(findings) {
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
    
    for (const finding of findings) {
      if (bySeverity[finding.severity] !== undefined) {
        bySeverity[finding.severity]++
      }
    }

    return {
      total: findings.length,
      bySeverity,
      performance: {
        loc: 0, // Will be calculated by annotateSource
        seconds: 0 // Will be set by caller
      }
    }
  }

  /**
   * Get tool versions
   * @private
   */
  async _getToolVersions() {
    const versions = {}
    
    try {
      versions.slither = await this.slither.getVersion()
    } catch (e) {
      versions.slither = 'unknown'
    }

    try {
      versions.mythril = await this.mythril.getVersion()
    } catch (e) {
      versions.mythril = 'unknown'
    }

    return versions
  }

  /**
   * Check if scanner tools are available
   */
  async checkAvailability() {
    const status = {
      slither: false,
      mythril: false
    }

    try {
      await this.slither.checkAvailable()
      status.slither = true
    } catch (e) {
      // Tool not available
    }

    try {
      await this.mythril.checkAvailable()
      status.mythril = true
    } catch (e) {
      // Tool not available
    }

    return status
  }
}