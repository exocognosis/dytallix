const Parser = require('solidity-parser-antlr');

class StaticAnalyzer {
  constructor() {
    this.vulnerabilityPatterns = [
      {
        type: 'reentrancy',
        pattern: /\.call\s*\{[^}]*\}\s*\(/,
        severity: 'high',
        description: 'Potential reentrancy vulnerability with low-level call'
      },
      {
        type: 'unchecked_call',
        pattern: /\.call\([^)]*\)\s*;/,
        severity: 'medium',
        description: 'Unchecked return value from external call'
      },
      {
        type: 'tx_origin',
        pattern: /tx\.origin/,
        severity: 'high',
        description: 'Use of tx.origin for authorization (phishing risk)'
      },
      {
        type: 'deprecated_suicide',
        pattern: /suicide\(/,
        severity: 'medium',
        description: 'Use of deprecated suicide function'
      },
      {
        type: 'integer_overflow',
        pattern: /\+\+|\-\-|[\+\-\*\/]\s*=|\s[\+\-\*\/]\s/,
        severity: 'medium',
        description: 'Potential integer overflow/underflow'
      }
    ];
  }

  async analyze(sourceCode) {
    try {
      const issues = [];
      let score = 100;

      // Basic syntax check and AST parsing
      const parseResult = this.parseSolidity(sourceCode);
      if (parseResult.errors.length > 0) {
        issues.push(...parseResult.errors);
        score -= parseResult.errors.length * 10;
      }

      // Pattern-based vulnerability detection
      const patternIssues = this.detectPatternVulnerabilities(sourceCode);
      issues.push(...patternIssues);
      score -= patternIssues.length * 15;

      // Access control analysis
      const accessIssues = this.analyzeAccessControl(sourceCode);
      issues.push(...accessIssues);
      score -= accessIssues.length * 10;

      // State variable analysis
      const stateIssues = this.analyzeStateVariables(sourceCode);
      issues.push(...stateIssues);
      score -= stateIssues.length * 5;

      return {
        issues: issues.slice(0, 20), // Limit to top 20 issues
        totalIssues: issues.length,
        score: Math.max(0, score),
        categories: this.categorizeIssues(issues),
        analysisMetadata: {
          linesOfCode: sourceCode.split('\n').length,
          contractsFound: this.countContracts(sourceCode),
          functionsFound: this.countFunctions(sourceCode),
        }
      };
    } catch (error) {
      console.error('Static analysis error:', error);
      return {
        error: error.message,
        issues: [],
        score: 0,
      };
    }
  }

  parseSolidity(sourceCode) {
    const errors = [];
    
    try {
      // Basic syntax validation
      Parser.parse(sourceCode, { loc: true, range: true });
    } catch (error) {
      errors.push({
        type: 'syntax_error',
        severity: 'high',
        description: `Syntax error: ${error.message}`,
        line: error.location?.start?.line || 0,
      });
    }

    return { errors };
  }

  detectPatternVulnerabilities(sourceCode) {
    const issues = [];
    const lines = sourceCode.split('\n');

    this.vulnerabilityPatterns.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          issues.push({
            type: pattern.type,
            severity: pattern.severity,
            description: pattern.description,
            line: index + 1,
            code: line.trim(),
          });
        }
      });
    });

    return issues;
  }

  analyzeAccessControl(sourceCode) {
    const issues = [];
    
    // Check for missing access modifiers
    const functionPattern = /function\s+\w+\s*\([^)]*\)\s*(?:public|private|internal|external)?\s*(?:view|pure|payable)?\s*(?:returns\s*\([^)]*\))?\s*\{/g;
    const lines = sourceCode.split('\n');
    
    lines.forEach((line, index) => {
      const match = functionPattern.exec(line);
      if (match && !line.includes('private') && !line.includes('internal') && !line.includes('public') && !line.includes('external')) {
        issues.push({
          type: 'missing_visibility',
          severity: 'medium',
          description: 'Function missing explicit visibility modifier',
          line: index + 1,
          code: line.trim(),
        });
      }
    });

    // Check for onlyOwner pattern
    if (!sourceCode.includes('onlyOwner') && !sourceCode.includes('require(msg.sender')) {
      issues.push({
        type: 'missing_access_control',
        severity: 'high',
        description: 'No access control mechanisms detected',
        line: 0,
      });
    }

    return issues;
  }

  analyzeStateVariables(sourceCode) {
    const issues = [];
    
    // Check for uninitialized state variables
    const stateVarPattern = /^\s*(uint256|uint|int|int256|bool|address|string|bytes)\s+(?:public|private|internal)?\s*(\w+)\s*;/gm;
    let match;
    
    while ((match = stateVarPattern.exec(sourceCode)) !== null) {
      const varName = match[2];
      
      // Check if variable is initialized in constructor
      if (!sourceCode.includes(`${varName} =`) && !sourceCode.includes(`${varName}(`)) {
        issues.push({
          type: 'uninitialized_state_var',
          severity: 'low',
          description: `State variable '${varName}' may be uninitialized`,
          line: 0,
        });
      }
    }

    return issues;
  }

  categorizeIssues(issues) {
    const categories = {
      security: 0,
      access_control: 0,
      code_quality: 0,
      gas_optimization: 0,
    };

    issues.forEach(issue => {
      switch (issue.type) {
        case 'reentrancy':
        case 'tx_origin':
        case 'unchecked_call':
          categories.security++;
          break;
        case 'missing_access_control':
        case 'missing_visibility':
          categories.access_control++;
          break;
        case 'syntax_error':
        case 'uninitialized_state_var':
          categories.code_quality++;
          break;
        default:
          categories.code_quality++;
      }
    });

    return categories;
  }

  countContracts(sourceCode) {
    const matches = sourceCode.match(/contract\s+\w+/g);
    return matches ? matches.length : 0;
  }

  countFunctions(sourceCode) {
    const matches = sourceCode.match(/function\s+\w+/g);
    return matches ? matches.length : 0;
  }
}

module.exports = { StaticAnalyzer };