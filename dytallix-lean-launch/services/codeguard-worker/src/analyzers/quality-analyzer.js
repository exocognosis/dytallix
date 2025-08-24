class CodeQualityAnalyzer {
  constructor() {
    this.qualityMetrics = [
      'code_complexity',
      'documentation_coverage',
      'naming_conventions',
      'code_structure',
      'best_practices'
    ];
  }

  async analyze(sourceCode) {
    try {
      let score = 100;
      const metrics = {};
      const issues = [];

      // Complexity analysis
      const complexityResult = this.analyzeComplexity(sourceCode);
      metrics.complexity = complexityResult.metrics;
      issues.push(...complexityResult.issues);
      score -= complexityResult.penalty;

      // Documentation analysis
      const docResult = this.analyzeDocumentation(sourceCode);
      metrics.documentation = docResult.metrics;
      issues.push(...docResult.issues);
      score -= docResult.penalty;

      // Naming conventions
      const namingResult = this.analyzeNaming(sourceCode);
      metrics.naming = namingResult.metrics;
      issues.push(...namingResult.issues);
      score -= namingResult.penalty;

      // Code structure
      const structureResult = this.analyzeStructure(sourceCode);
      metrics.structure = structureResult.metrics;
      issues.push(...structureResult.issues);
      score -= structureResult.penalty;

      // Best practices
      const practicesResult = this.analyzeBestPractices(sourceCode);
      metrics.bestPractices = practicesResult.metrics;
      issues.push(...practicesResult.issues);
      score -= practicesResult.penalty;

      return {
        score: Math.max(0, score),
        metrics,
        issues: issues.slice(0, 15),
        totalIssues: issues.length,
        recommendations: this.generateRecommendations(metrics),
      };
    } catch (error) {
      console.error('Code quality analysis error:', error);
      return {
        error: error.message,
        score: 0,
        metrics: {},
      };
    }
  }

  analyzeComplexity(sourceCode) {
    const lines = sourceCode.split('\n');
    const issues = [];
    let penalty = 0;

    // Cyclomatic complexity (simplified)
    const complexityKeywords = ['if', 'else', 'while', 'for', 'switch', 'case', '?', '&&', '||'];
    let totalComplexity = 0;
    
    lines.forEach((line, index) => {
      let lineComplexity = 1; // Base complexity
      complexityKeywords.forEach(keyword => {
        const matches = line.match(new RegExp(`\\b${keyword}\\b`, 'g'));
        if (matches) {
          lineComplexity += matches.length;
        }
      });
      
      if (lineComplexity > 5) {
        issues.push({
          type: 'high_line_complexity',
          severity: 'medium',
          description: `Line has high complexity (${lineComplexity})`,
          line: index + 1,
          complexity: lineComplexity,
        });
        penalty += 5;
      }
      
      totalComplexity += lineComplexity;
    });

    // Function length analysis
    const functionPattern = /function\s+\w+[^{]*\{/g;
    const functions = sourceCode.match(functionPattern);
    const avgComplexity = functions ? totalComplexity / functions.length : 0;

    if (avgComplexity > 10) {
      issues.push({
        type: 'high_function_complexity',
        severity: 'high',
        description: `Average function complexity is high (${avgComplexity.toFixed(1)})`,
      });
      penalty += 15;
    }

    return {
      metrics: {
        totalComplexity,
        averageComplexity: avgComplexity,
        functionCount: functions ? functions.length : 0,
        linesOfCode: lines.length,
      },
      issues,
      penalty,
    };
  }

  analyzeDocumentation(sourceCode) {
    const lines = sourceCode.split('\n');
    const issues = [];
    let penalty = 0;

    // Count comment lines
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('/*') || 
      line.trim().startsWith('*') ||
      line.trim().startsWith('*/')
    ).length;

    const codeLines = lines.filter(line => 
      line.trim().length > 0 && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      !line.trim().startsWith('*')
    ).length;

    const commentRatio = codeLines > 0 ? (commentLines / codeLines) * 100 : 0;

    if (commentRatio < 10) {
      issues.push({
        type: 'insufficient_comments',
        severity: 'medium',
        description: `Low comment ratio (${commentRatio.toFixed(1)}%)`,
      });
      penalty += 10;
    }

    // Check for NatSpec documentation
    const natspecPattern = /@dev|@notice|@param|@return/g;
    const natspecMatches = sourceCode.match(natspecPattern);
    const natspecCount = natspecMatches ? natspecMatches.length : 0;

    const functionCount = (sourceCode.match(/function\s+\w+/g) || []).length;
    const natspecCoverage = functionCount > 0 ? (natspecCount / functionCount) * 100 : 0;

    if (natspecCoverage < 50 && functionCount > 0) {
      issues.push({
        type: 'missing_natspec',
        severity: 'low',
        description: `Low NatSpec documentation coverage (${natspecCoverage.toFixed(1)}%)`,
      });
      penalty += 5;
    }

    return {
      metrics: {
        commentRatio,
        natspecCoverage,
        totalComments: commentLines,
        totalCodeLines: codeLines,
      },
      issues,
      penalty,
    };
  }

  analyzeNaming(sourceCode) {
    const issues = [];
    let penalty = 0;

    // Function naming conventions
    const functionPattern = /function\s+(\w+)/g;
    let match;
    while ((match = functionPattern.exec(sourceCode)) !== null) {
      const funcName = match[1];
      
      // Check camelCase
      if (!/^[a-z][a-zA-Z0-9]*$/.test(funcName) && funcName !== 'constructor') {
        issues.push({
          type: 'function_naming',
          severity: 'low',
          description: `Function '${funcName}' should use camelCase`,
        });
        penalty += 2;
      }
    }

    // Variable naming
    const varPattern = /(?:uint256|uint|int|bool|address|string|bytes)\s+(\w+)/g;
    while ((match = varPattern.exec(sourceCode)) !== null) {
      const varName = match[1];
      
      if (!/^[a-z][a-zA-Z0-9]*$/.test(varName)) {
        issues.push({
          type: 'variable_naming',
          severity: 'low',
          description: `Variable '${varName}' should use camelCase`,
        });
        penalty += 1;
      }
    }

    // Contract naming
    const contractPattern = /contract\s+(\w+)/g;
    while ((match = contractPattern.exec(sourceCode)) !== null) {
      const contractName = match[1];
      
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(contractName)) {
        issues.push({
          type: 'contract_naming',
          severity: 'medium',
          description: `Contract '${contractName}' should use PascalCase`,
        });
        penalty += 3;
      }
    }

    return {
      metrics: {
        conventionViolations: issues.length,
      },
      issues,
      penalty,
    };
  }

  analyzeStructure(sourceCode) {
    const issues = [];
    let penalty = 0;

    // File length
    const lines = sourceCode.split('\n').length;
    if (lines > 500) {
      issues.push({
        type: 'file_too_long',
        severity: 'medium',
        description: `File is very long (${lines} lines)`,
      });
      penalty += 10;
    }

    // Function length
    const functions = sourceCode.split(/function\s+\w+/);
    functions.forEach((func, index) => {
      if (index === 0) return; // Skip before first function
      
      const funcLines = func.split('\n').length;
      if (funcLines > 50) {
        issues.push({
          type: 'function_too_long',
          severity: 'medium',
          description: `Function is very long (${funcLines} lines)`,
        });
        penalty += 5;
      }
    });

    // Nested depth analysis
    const maxNesting = this.calculateMaxNesting(sourceCode);
    if (maxNesting > 4) {
      issues.push({
        type: 'deep_nesting',
        severity: 'medium',
        description: `Deep nesting detected (${maxNesting} levels)`,
      });
      penalty += 8;
    }

    return {
      metrics: {
        fileLength: lines,
        maxNesting,
        functionCount: functions.length - 1,
      },
      issues,
      penalty,
    };
  }

  analyzeBestPractices(sourceCode) {
    const issues = [];
    let penalty = 0;

    // Check for pragma version
    if (!sourceCode.includes('pragma solidity')) {
      issues.push({
        type: 'missing_pragma',
        severity: 'high',
        description: 'Missing pragma solidity version',
      });
      penalty += 15;
    }

    // Check for SPDX license identifier
    if (!sourceCode.includes('SPDX-License-Identifier')) {
      issues.push({
        type: 'missing_license',
        severity: 'low',
        description: 'Missing SPDX license identifier',
      });
      penalty += 2;
    }

    // Check for use of assert vs require
    const assertUsage = (sourceCode.match(/assert\(/g) || []).length;
    const requireUsage = (sourceCode.match(/require\(/g) || []).length;
    
    if (assertUsage > requireUsage) {
      issues.push({
        type: 'prefer_require',
        severity: 'medium',
        description: 'Prefer require() over assert() for input validation',
      });
      penalty += 5;
    }

    // Check for unused variables (simplified)
    const varDeclarations = sourceCode.match(/\b(uint|int|bool|address|string|bytes\d*)\s+(\w+)/g) || [];
    varDeclarations.forEach(decl => {
      const varName = decl.split(/\s+/).pop();
      const usageCount = (sourceCode.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
      
      if (usageCount <= 1) { // Only declaration, no usage
        issues.push({
          type: 'unused_variable',
          severity: 'low',
          description: `Variable '${varName}' appears to be unused`,
        });
        penalty += 1;
      }
    });

    return {
      metrics: {
        assertUsage,
        requireUsage,
        hasPragma: sourceCode.includes('pragma solidity'),
        hasLicense: sourceCode.includes('SPDX-License-Identifier'),
      },
      issues,
      penalty,
    };
  }

  calculateMaxNesting(sourceCode) {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (const char of sourceCode) {
      if (char === '{') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (char === '}') {
        currentNesting--;
      }
    }
    
    return maxNesting;
  }

  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.complexity?.averageComplexity > 10) {
      recommendations.push('Consider breaking down complex functions into smaller, more manageable pieces');
    }

    if (metrics.documentation?.commentRatio < 15) {
      recommendations.push('Add more comments to improve code readability and maintainability');
    }

    if (metrics.structure?.maxNesting > 3) {
      recommendations.push('Reduce nesting depth to improve code readability');
    }

    if (metrics.naming?.conventionViolations > 5) {
      recommendations.push('Follow consistent naming conventions (camelCase for functions/variables, PascalCase for contracts)');
    }

    if (!metrics.bestPractices?.hasPragma) {
      recommendations.push('Add pragma solidity version declaration');
    }

    return recommendations;
  }
}

module.exports = { CodeQualityAnalyzer };