/**
 * Mock implementations for testing without external tools
 */

export class MockSlitherAnalyzer {
  async analyze(sourceCode, options = {}) {
    // Mock analysis that finds some common patterns
    const issues = []
    
    if (sourceCode.includes('call(')) {
      issues.push({
        check: 'unchecked-lowlevel',
        title: 'Unchecked Low-Level Call',
        description: 'Low-level call return value not checked',
        severity: 'Medium',
        elements: [],
        sourceSnippet: 'call(...)',
        remediation: 'Check return values of low-level calls.'
      })
    }
    
    if (sourceCode.includes('tx.origin')) {
      issues.push({
        check: 'tx-origin',
        title: 'tx.origin Authentication',
        description: 'Use of tx.origin for authentication',
        severity: 'High',
        elements: [],
        sourceSnippet: 'tx.origin',
        remediation: 'Use msg.sender instead of tx.origin for authentication.'
      })
    }
    
    if (sourceCode.match(/balanceOf\[.*\]\s*-=/)) {
      issues.push({
        check: 'reentrancy-eth',
        title: 'Potential Reentrancy',
        description: 'State change after external call',
        severity: 'High',
        elements: [],
        sourceSnippet: 'balanceOf[msg.sender] -= v',
        remediation: 'Use checks-effects-interactions pattern or ReentrancyGuard.'
      })
    }
    
    return {
      success: true,
      issues,
      stats: {
        detectors: issues.length
      }
    }
  }
  
  async checkAvailable() {
    return true
  }
  
  async getVersion() {
    return 'mock-0.1.0'
  }
}

export class MockMythrilAnalyzer {
  async analyze(sourceCode, options = {}) {
    const issues = []
    
    if (sourceCode.includes('selfdestruct')) {
      issues.push({
        title: 'Unprotected Selfdestruct',
        description: 'Contract can be destructed by anyone',
        severity: 'High',
        swc_id: 'SWC-106',
        line: null,
        function: '',
        sourceSnippet: 'selfdestruct(...)',
        remediation: 'Implement proper access controls for selfdestruct.'
      })
    }
    
    if (sourceCode.includes('overflow') || (sourceCode.includes('+') && sourceCode.includes('uint'))) {
      issues.push({
        title: 'Integer Overflow',
        description: 'Potential integer overflow in arithmetic operation',
        severity: 'Medium',
        swc_id: 'SWC-101',
        line: null,
        function: '',
        sourceSnippet: '',
        remediation: 'Use SafeMath library or Solidity >=0.8 for arithmetic operations.'
      })
    }
    
    return {
      success: true,
      issues,
      stats: {
        vulnerabilities: issues.length
      }
    }
  }
  
  async checkAvailable() {
    return true
  }
  
  async getVersion() {
    return 'mock-0.1.0'
  }
}