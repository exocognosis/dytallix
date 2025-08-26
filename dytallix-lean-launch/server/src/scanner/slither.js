import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { tmpdir } from 'os'

/**
 * Slither Static Analysis Wrapper
 * 
 * Provides programmatic interface to Slither for Solidity static analysis
 */
export class SlitherAnalyzer {
  constructor(options = {}) {
    this.options = {
      slitherBin: options.slitherBin || 'slither',
      tempDir: options.tempDir || tmpdir(),
      timeout: options.timeout || 30000,
      ...options
    }
  }

  /**
   * Analyze Solidity source code with Slither
   * @param {string} sourceCode - Solidity source code
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(sourceCode, options = {}) {
    const timeout = options.timeout || this.options.timeout
    let tempDir = null

    try {
      // Create temporary directory and file
      tempDir = await fs.mkdtemp(path.join(this.options.tempDir, 'slither-'))
      const inputFile = path.join(tempDir, 'contract.sol')
      const outputFile = path.join(tempDir, 'slither.json')

      // Write source code to file
      await fs.writeFile(inputFile, sourceCode, 'utf8')

      // Run Slither analysis
      const result = await this._runSlither(inputFile, outputFile, timeout)
      
      // Parse results
      return this._parseResults(result, outputFile)

    } finally {
      // Cleanup temporary files
      if (tempDir) {
        try {
          await fs.rm(tempDir, { recursive: true, force: true })
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Run Slither command
   * @private
   */
  async _runSlither(inputFile, outputFile, timeout) {
    return new Promise((resolve, reject) => {
      const args = [
        inputFile,
        '--json',
        outputFile,
        '--disable-color',
        '--no-fail-pedantic'
      ]

      const process = spawn(this.options.slitherBin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout
      })

      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          outputFile
        })
      })

      process.on('error', (err) => {
        if (err.code === 'ENOENT') {
          reject(new Error('Slither not found. Please install: pip install slither-analyzer'))
        } else {
          reject(err)
        }
      })

      // Handle timeout
      if (timeout) {
        setTimeout(() => {
          process.kill('SIGTERM')
          reject(new Error('Slither analysis timed out'))
        }, timeout)
      }
    })
  }

  /**
   * Parse Slither output
   * @private
   */
  async _parseResults(result, outputFile) {
    try {
      // Try to read JSON output
      const jsonContent = await fs.readFile(outputFile, 'utf8')
      const slitherOutput = JSON.parse(jsonContent)

      const issues = []

      // Process detectors (main vulnerability findings)
      if (slitherOutput.results && slitherOutput.results.detectors) {
        for (const detector of slitherOutput.results.detectors) {
          issues.push({
            check: detector.check,
            title: detector.description,
            description: detector.markdown || detector.description,
            severity: this._mapSlitherSeverity(detector.impact),
            confidence: detector.confidence,
            elements: detector.elements || [],
            sourceSnippet: this._extractSourceSnippet(detector),
            remediation: this._getRemediationForCheck(detector.check)
          })
        }
      }

      // Process printers if needed (for additional information)
      if (slitherOutput.results && slitherOutput.results.printers) {
        // Can add more detailed analysis here if needed
      }

      return {
        success: true,
        issues,
        stats: {
          detectors: issues.length,
          stdout: result.stdout,
          stderr: result.stderr
        }
      }

    } catch (parseError) {
      // If JSON parsing fails, try to extract information from stderr/stdout
      return this._parseFallback(result)
    }
  }

  /**
   * Map Slither severity levels to our standard
   * @private
   */
  _mapSlitherSeverity(impact) {
    const severityMap = {
      'High': 'High',
      'Medium': 'Medium', 
      'Low': 'Low',
      'Informational': 'Low',
      'Optimization': 'Low'
    }
    return severityMap[impact] || 'Medium'
  }

  /**
   * Extract source snippet from detector elements
   * @private
   */
  _extractSourceSnippet(detector) {
    if (!detector.elements || detector.elements.length === 0) {
      return ''
    }

    const element = detector.elements[0]
    if (element.source_mapping && element.source_mapping.content) {
      return element.source_mapping.content.substring(0, 200) + '...'
    }

    return ''
  }

  /**
   * Get remediation advice for specific check
   * @private
   */
  _getRemediationForCheck(check) {
    const remediations = {
      'reentrancy-eth': 'Use checks-effects-interactions pattern or ReentrancyGuard.',
      'reentrancy-no-eth': 'Use checks-effects-interactions pattern.',
      'reentrancy-benign': 'Consider using checks-effects-interactions pattern.',
      'unchecked-lowlevel': 'Check return values of low-level calls.',
      'unchecked-send': 'Check return value of send() calls.',
      'tx-origin': 'Use msg.sender instead of tx.origin for authentication.',
      'suicidal': 'Implement proper access controls for selfdestruct.',
      'arbitrary-send': 'Validate recipient addresses and amounts.',
      'controlled-delegatecall': 'Avoid delegatecall with user-controlled data.',
      'erc20-interface': 'Implement proper ERC20 interface.',
      'incorrect-equality': 'Use >= or <= instead of == for Ether comparisons.',
      'locked-ether': 'Provide withdrawal mechanism for contract balance.',
      'dangerous-strict-equalities': 'Avoid strict equality with block variables.',
      'block-timestamp': 'Avoid using block.timestamp for critical logic.',
      'assembly': 'Review inline assembly for security implications.'
    }

    return remediations[check] || 'Review code for security implications.'
  }

  /**
   * Fallback parsing when JSON output is not available
   * @private
   */
  _parseFallback(result) {
    const issues = []
    
    // Try to extract some basic information from stderr/stdout
    const output = result.stderr + result.stdout
    
    if (output.includes('reentrancy')) {
      issues.push({
        check: 'reentrancy-detected',
        title: 'Potential Reentrancy',
        description: 'Reentrancy pattern detected in analysis output',
        severity: 'High',
        elements: [],
        sourceSnippet: '',
        remediation: 'Use checks-effects-interactions pattern or ReentrancyGuard.'
      })
    }

    return {
      success: false,
      issues,
      stats: {
        detectors: issues.length,
        stdout: result.stdout,
        stderr: result.stderr,
        fallback: true
      }
    }
  }

  /**
   * Check if Slither is available
   */
  async checkAvailable() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.options.slitherBin, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let output = ''
      process.stdout.on('data', (data) => {
        output += data.toString()
      })

      process.stderr.on('data', (data) => {
        output += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0 || output.includes('slither')) {
          resolve(true)
        } else {
          reject(new Error('Slither not available'))
        }
      })

      process.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Get Slither version
   */
  async getVersion() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.options.slitherBin, ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let output = ''
      process.stdout.on('data', (data) => {
        output += data.toString()
      })

      process.stderr.on('data', (data) => {
        output += data.toString()
      })

      process.on('close', (code) => {
        const match = output.match(/slither\s+([0-9.]+)/i)
        if (match) {
          resolve(match[1])
        } else {
          resolve('unknown')
        }
      })

      process.on('error', (err) => {
        reject(err)
      })
    })
  }
}