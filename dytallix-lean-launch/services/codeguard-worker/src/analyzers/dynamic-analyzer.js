class DynamicAnalyzer {
  constructor() {
    this.vulnerabilityChecks = [
      'reentrancy_detection',
      'state_change_analysis',
      'gas_consumption_analysis',
      'edge_case_detection',
      'access_pattern_analysis'
    ];
  }

  async analyze(bytecode) {
    try {
      const vulnerabilities = [];
      let score = 100;

      // Bytecode structure analysis
      const structureAnalysis = this.analyzeBytecodeStructure(bytecode);
      if (structureAnalysis.issues.length > 0) {
        vulnerabilities.push(...structureAnalysis.issues);
        score -= structureAnalysis.issues.length * 10;
      }

      // Opcode analysis for common vulnerability patterns
      const opcodeAnalysis = this.analyzeOpcodes(bytecode);
      vulnerabilities.push(...opcodeAnalysis.vulnerabilities);
      score -= opcodeAnalysis.vulnerabilities.length * 15;

      // State change pattern analysis
      const stateAnalysis = this.analyzeStateChanges(bytecode);
      vulnerabilities.push(...stateAnalysis.vulnerabilities);
      score -= stateAnalysis.vulnerabilities.length * 12;

      // Gas usage pattern analysis
      const gasAnalysis = this.analyzeGasPatterns(bytecode);
      vulnerabilities.push(...gasAnalysis.vulnerabilities);
      score -= gasAnalysis.vulnerabilities.length * 8;

      return {
        vulnerabilities: vulnerabilities.slice(0, 15), // Limit to top 15
        totalVulnerabilities: vulnerabilities.length,
        score: Math.max(0, score),
        analysisMetadata: {
          bytecodeSize: bytecode.length,
          opcodeCount: this.countOpcodes(bytecode),
          functionSelectors: this.extractFunctionSelectors(bytecode),
        },
        executionPaths: this.analyzeExecutionPaths(bytecode),
      };
    } catch (error) {
      console.error('Dynamic analysis error:', error);
      return {
        error: error.message,
        vulnerabilities: [],
        score: 0,
      };
    }
  }

  analyzeBytecodeStructure(bytecode) {
    const issues = [];

    // Check bytecode length
    if (bytecode.length < 100) {
      issues.push({
        type: 'minimal_bytecode',
        severity: 'medium',
        description: 'Bytecode is unusually small, may indicate incomplete contract',
      });
    }

    // Check for constructor pattern
    if (!bytecode.includes('608060405234801561001057600080fd5b50')) {
      issues.push({
        type: 'non_standard_constructor',
        severity: 'low',
        description: 'Non-standard constructor pattern detected',
      });
    }

    // Check for common library patterns
    if (bytecode.includes('73000000000000000000000000000000000000000030')) {
      issues.push({
        type: 'library_usage',
        severity: 'info',
        description: 'External library usage detected',
      });
    }

    return { issues };
  }

  analyzeOpcodes(bytecode) {
    const vulnerabilities = [];
    
    // Convert hex to opcodes (simplified)
    const opcodePatterns = {
      'CALL': 'f1',           // External calls
      'DELEGATECALL': 'f4',   // Delegate calls
      'SELFDESTRUCT': 'ff',   // Self destruct
      'CREATE': 'f0',         // Contract creation
      'CREATE2': 'f5',        // CREATE2 opcode
    };

    for (const [opname, opcode] of Object.entries(opcodePatterns)) {
      const pattern = new RegExp(opcode, 'gi');
      const matches = bytecode.match(pattern);
      
      if (matches) {
        vulnerabilities.push({
          type: `${opname.toLowerCase()}_usage`,
          severity: this.getOpcodeRiskLevel(opname),
          description: `${opname} opcode usage detected (${matches.length} occurrences)`,
          count: matches.length,
        });
      }
    }

    // Check for inline assembly patterns
    if (bytecode.includes('3d602d80600a3d3981f3363d3d373d3d3d363d73')) {
      vulnerabilities.push({
        type: 'proxy_pattern',
        severity: 'medium',
        description: 'Proxy contract pattern detected',
      });
    }

    return { vulnerabilities };
  }

  analyzeStateChanges(bytecode) {
    const vulnerabilities = [];

    // SSTORE pattern analysis (simplified)
    const sstorePattern = /55/g;
    const sstoreMatches = bytecode.match(sstorePattern);
    
    if (sstoreMatches && sstoreMatches.length > 20) {
      vulnerabilities.push({
        type: 'excessive_state_changes',
        severity: 'medium',
        description: `High number of state changes detected (${sstoreMatches.length})`,
        count: sstoreMatches.length,
      });
    }

    // SLOAD pattern analysis
    const sloadPattern = /54/g;
    const sloadMatches = bytecode.match(sloadPattern);
    
    if (sloadMatches && sloadMatches.length > 50) {
      vulnerabilities.push({
        type: 'excessive_state_reads',
        severity: 'low',
        description: `High number of state reads detected (${sloadMatches.length})`,
        count: sloadMatches.length,
      });
    }

    return { vulnerabilities };
  }

  analyzeGasPatterns(bytecode) {
    const vulnerabilities = [];

    // Loop detection (simplified)
    const jumpPattern = /56|57/g; // JUMP, JUMPI
    const jumpMatches = bytecode.match(jumpPattern);
    
    if (jumpMatches && jumpMatches.length > 30) {
      vulnerabilities.push({
        type: 'complex_control_flow',
        severity: 'medium',
        description: 'Complex control flow may lead to gas issues',
        jumpCount: jumpMatches.length,
      });
    }

    // Gas opcode usage
    const gasPattern = /5a/g; // GAS opcode
    const gasMatches = bytecode.match(gasPattern);
    
    if (gasMatches && gasMatches.length > 10) {
      vulnerabilities.push({
        type: 'gas_introspection',
        severity: 'low',
        description: 'Frequent gas introspection detected',
        count: gasMatches.length,
      });
    }

    return { vulnerabilities };
  }

  analyzeExecutionPaths(bytecode) {
    // Simplified execution path analysis
    const jumpPattern = /56|57/g;
    const jumpMatches = bytecode.match(jumpPattern);
    const pathComplexity = jumpMatches ? jumpMatches.length : 0;

    return {
      estimatedPaths: Math.min(pathComplexity * 2, 100),
      complexity: pathComplexity > 20 ? 'high' : pathComplexity > 10 ? 'medium' : 'low',
      cyclomaticComplexity: Math.ceil(pathComplexity / 4),
    };
  }

  countOpcodes(bytecode) {
    // Simplified opcode counting (each byte pair)
    return Math.floor(bytecode.length / 2);
  }

  extractFunctionSelectors(bytecode) {
    const selectors = [];
    
    // Look for function selector patterns (4-byte signatures)
    const selectorPattern = /63([0-9a-f]{8})/gi;
    let match;
    
    while ((match = selectorPattern.exec(bytecode)) !== null) {
      const selector = match[1];
      if (!selectors.includes(selector)) {
        selectors.push(selector);
      }
    }

    return selectors.slice(0, 10); // Limit to first 10 found
  }

  getOpcodeRiskLevel(opcode) {
    const riskLevels = {
      'CALL': 'high',
      'DELEGATECALL': 'high',
      'SELFDESTRUCT': 'high',
      'CREATE': 'medium',
      'CREATE2': 'medium',
    };
    
    return riskLevels[opcode] || 'low';
  }
}

module.exports = { DynamicAnalyzer };