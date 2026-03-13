import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { tmpdir } from 'os'

/**
 * Mythril Symbolic Execution Wrapper
 * 
 * Provides programmatic interface to Mythril for Solidity symbolic execution
 */
export class MythrilAnalyzer {
  constructor(options = {}) {
    this.options = {
      mythrilBin: options.mythrilBin || 'myth',
      tempDir: options.tempDir || tmpdir(),
      timeout: options.timeout || 30000,
      maxDepth: options.maxDepth || 32,
      ...options
    }
  }

  /**
   * Analyze Solidity source code with Mythril
   * @param {string} sourceCode - Solidity source code
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyze(sourceCode, options = {}) {
    const timeout = options.timeout || this.options.timeout
    let tempDir = null

    try {
      // Create temporary directory and file
      tempDir = await fs.mkdtemp(path.join(this.options.tempDir, 'mythril-'))
      const inputFile = path.join(tempDir, 'contract.sol')
      const outputFile = path.join(tempDir, 'mythril.json')

      // Write source code to file
      await fs.writeFile(inputFile, sourceCode, 'utf8')

      // Run Mythril analysis
      const result = await this._runMythril(inputFile, outputFile, timeout)
      
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
   * Run Mythril command
   * @private
   */
  async _runMythril(inputFile, outputFile, timeout) {
    return new Promise((resolve, reject) => {
      const args = [
        'analyze',
        inputFile,
        '--execution-timeout',
        Math.floor(timeout / 1000).toString(),
        '--max-depth',
        this.options.maxDepth.toString(),
        '--json',
        '--output',
        outputFile
      ]

      const process = spawn(this.options.mythrilBin, args, {
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
          reject(new Error('Mythril not found. Please install: pip install mythril'))
        } else {
          reject(err)
        }
      })

      // Handle timeout
      if (timeout) {
        setTimeout(() => {
          process.kill('SIGTERM')
          reject(new Error('Mythril analysis timed out'))
        }, timeout)
      }
    })
  }

  /**
   * Parse Mythril output
   * @private
   */
  async _parseResults(result, outputFile) {
    try {
      // Try to read JSON output
      let jsonContent
      try {
        jsonContent = await fs.readFile(outputFile, 'utf8')
      } catch (e) {
        // If no output file, try parsing from stdout
        jsonContent = result.stdout
      }

      if (!jsonContent.trim()) {
        return {
          success: true,
          issues: [],
          stats: {
            stdout: result.stdout,
            stderr: result.stderr
          }
        }
      }

      const mythrilOutput = JSON.parse(jsonContent)
      const issues = []

      // Process issues from Mythril output
      if (mythrilOutput.issues) {
        for (const issue of mythrilOutput.issues) {
          issues.push({
            title: issue.title || issue.swc_id || 'Security Issue',
            description: issue.description || issue.description_head || '',
            severity: this._mapMythrilSeverity(issue.severity),
            swc_id: issue.swc_id,
            line: this._extractLineNumber(issue),
            function: issue.function || '',
            sourceSnippet: this._extractSourceSnippet(issue),
            remediation: this._getRemediationForSWC(issue.swc_id)
          })
        }
      }

      return {
        success: true,
        issues,
        stats: {
          vulnerabilities: issues.length,
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
   * Map Mythril severity levels to our standard
   * @private
   */
  _mapMythrilSeverity(severity) {
    const severityMap = {
      'High': 'High',
      'Medium': 'Medium',
      'Low': 'Low'
    }
    return severityMap[severity] || 'Medium'
  }

  /**
   * Extract line number from Mythril issue
   * @private
   */
  _extractLineNumber(issue) {
    if (issue.lineno) {
      return issue.lineno
    }
    
    if (issue.source_map && issue.source_map.offset) {
      // Could implement source map to line number conversion
      return null
    }

    return null
  }

  /**
   * Extract source snippet from issue
   * @private
   */
  _extractSourceSnippet(issue) {
    if (issue.code) {
      return issue.code.substring(0, 200) + (issue.code.length > 200 ? '...' : '')
    }
    return ''
  }

  /**
   * Get remediation advice for SWC ID
   * @private
   */
  _getRemediationForSWC(swcId) {
    const remediations = {
      'SWC-107': 'Use checks-effects-interactions pattern to prevent reentrancy.',
      'SWC-101': 'Use SafeMath library or Solidity >=0.8 for arithmetic operations.',
      'SWC-104': 'Check return values of external calls.',
      'SWC-115': 'Use msg.sender instead of tx.origin for authorization.',
      'SWC-112': 'Avoid delegatecall with user-controlled data.',
      'SWC-106': 'Implement proper access controls for selfdestruct.',
      'SWC-114': 'Avoid using block.timestamp for critical logic.',
      'SWC-120': 'Validate external function parameters.',
      'SWC-113': 'Implement proper access control mechanisms.',
      'SWC-103': 'Handle floating pragma versions carefully.',
      'SWC-108': 'Prevent DoS with failed call by checking gas limits.',
      'SWC-109': 'Implement proper initialization patterns.',
      'SWC-110': 'Validate that assertions are not reachable.',
      'SWC-111': 'Use pull over push pattern for external calls.',
      'SWC-116': 'Validate block timestamp dependencies.',
      'SWC-118': 'Validate mappings are properly initialized.',
      'SWC-119': 'Implement proper signature verification.',
      'SWC-121': 'Validate side effects of view functions.',
      'SWC-122': 'Validate state variable visibility.',
      'SWC-123': 'Implement proper requirement validation.',
      'SWC-124': 'Write to arbitrary storage locations safely.',
      'SWC-125': 'Validate return values are properly handled.',
      'SWC-126': 'Check insufficient gas griefing protections.',
      'SWC-127': 'Implement proper arbitrary jump protections.',
      'SWC-128': 'Validate proper DoS with revert protections.'
    }

    return remediations[swcId] || 'Review code for security implications based on Mythril findings.'
  }

  /**
   * Fallback parsing when JSON output is not available
   * @private
   */
  _parseFallback(result) {
    const issues = []
    
    // Try to extract some basic information from stderr/stdout
    const output = result.stderr + result.stdout
    
    // Look for common vulnerability patterns in output
    if (output.includes('reentrancy') || output.includes('SWC-107')) {
      issues.push({
        title: 'Potential Reentrancy',
        description: 'Reentrancy vulnerability detected by symbolic execution',
        severity: 'High',
        swc_id: 'SWC-107',
        line: null,
        function: '',
        sourceSnippet: '',
        remediation: 'Use checks-effects-interactions pattern to prevent reentrancy.'
      })
    }

    if (output.includes('integer overflow') || output.includes('SWC-101')) {
      issues.push({
        title: 'Integer Overflow',
        description: 'Potential integer overflow detected',
        severity: 'High',
        swc_id: 'SWC-101',
        line: null,
        function: '',
        sourceSnippet: '',
        remediation: 'Use SafeMath library or Solidity >=0.8 for arithmetic operations.'
      })
    }

    return {
      success: false,
      issues,
      stats: {
        vulnerabilities: issues.length,
        stdout: result.stdout,
        stderr: result.stderr,
        fallback: true
      }
    }
  }

  /**
   * Check if Mythril is available
   */
  async checkAvailable() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.options.mythrilBin, ['version'], {
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
        if (code === 0 || output.includes('mythril')) {
          resolve(true)
        } else {
          reject(new Error('Mythril not available'))
        }
      })

      process.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Get Mythril version
   */
  async getVersion() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.options.mythrilBin, ['version'], {
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
        const match = output.match(/mythril\s+([0-9.]+)/i) || output.match(/v([0-9.]+)/i)
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