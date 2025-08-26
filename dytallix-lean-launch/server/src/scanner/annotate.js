/**
 * Source Code Annotation System
 * 
 * Maps vulnerability findings to exact line numbers and source locations
 */

/**
 * Annotate source code with vulnerability findings
 * @param {string} sourceCode - Original source code
 * @param {Array} findings - Array of vulnerability findings
 * @returns {Array} Findings with enhanced location information
 */
export function annotateSource(sourceCode, findings) {
  const lines = sourceCode.split('\n')
  const annotatedFindings = []

  for (const finding of findings) {
    const annotated = { ...finding }
    
    // Enhance location information
    annotated.locations = enhanceLocations(finding.locations, lines, sourceCode)
    
    // Add source snippets for better context
    annotated.sourceSnippet = extractSnippet(annotated.locations, lines)
    
    // Calculate line of code metrics
    if (!annotated.performance) {
      annotated.performance = {}
    }
    
    annotatedFindings.push(annotated)
  }

  // Add overall metrics
  const totalLoc = countLinesOfCode(sourceCode)
  for (const finding of annotatedFindings) {
    if (finding.performance) {
      finding.performance.totalLoc = totalLoc
    }
  }

  return annotatedFindings
}

/**
 * Enhance location information with additional context
 * @private
 */
function enhanceLocations(locations, lines, sourceCode) {
  if (!locations || locations.length === 0) {
    return []
  }

  return locations.map(location => {
    const enhanced = { ...location }
    
    // Ensure line number is valid
    if (location.line && location.line > 0 && location.line <= lines.length) {
      enhanced.lineContent = lines[location.line - 1] || ''
      enhanced.lineNumber = location.line
      
      // Add column information if available
      if (location.column) {
        enhanced.column = location.column
      } else {
        // Try to infer column from content
        enhanced.column = inferColumn(enhanced.lineContent, location)
      }
      
      // Add surrounding context (±2 lines)
      enhanced.context = extractContext(lines, location.line, 2)
      
      // Add function context if possible
      enhanced.functionContext = findFunctionContext(lines, location.line)
      
    } else {
      // Try to find the location based on content matching
      const inferredLocation = inferLocationFromContent(lines, location, sourceCode)
      if (inferredLocation) {
        Object.assign(enhanced, inferredLocation)
      }
    }

    return enhanced
  })
}

/**
 * Infer column position from line content and location context
 * @private
 */
function inferColumn(lineContent, location) {
  // Simple heuristics to find column position
  if (!lineContent) return 1
  
  // Look for common vulnerability patterns
  const patterns = [
    'call(',
    'delegatecall(',
    'selfdestruct(',
    'tx.origin',
    'block.timestamp',
    'send(',
    'transfer('
  ]
  
  for (const pattern of patterns) {
    const index = lineContent.indexOf(pattern)
    if (index !== -1) {
      return index + 1
    }
  }
  
  // Default to first non-whitespace character
  const match = lineContent.match(/\S/)
  return match ? match.index + 1 : 1
}

/**
 * Extract surrounding context lines
 * @private
 */
function extractContext(lines, lineNumber, contextSize = 2) {
  const start = Math.max(0, lineNumber - contextSize - 1)
  const end = Math.min(lines.length, lineNumber + contextSize)
  
  const context = []
  for (let i = start; i < end; i++) {
    context.push({
      lineNumber: i + 1,
      content: lines[i] || '',
      isTarget: i + 1 === lineNumber
    })
  }
  
  return context
}

/**
 * Find function context for a given line
 * @private
 */
function findFunctionContext(lines, lineNumber) {
  // Search backwards for function declaration
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = lines[i] || ''
    const functionMatch = line.match(/^\s*function\s+(\w+)\s*\(/i)
    if (functionMatch) {
      return {
        name: functionMatch[1],
        line: i + 1,
        declaration: line.trim()
      }
    }
    
    // Stop if we hit contract boundary
    if (line.includes('contract ') || line.includes('{')) {
      break
    }
  }
  
  return null
}

/**
 * Infer location from content when line number is not available
 * @private
 */
function inferLocationFromContent(lines, location, sourceCode) {
  // Try to match based on file name or pattern
  if (location.file && location.file !== 'contract.sol') {
    // Multi-file contract - would need more sophisticated parsing
    return null
  }
  
  // Look for specific patterns in the source code
  const patterns = [
    'reentrancy',
    'delegatecall',
    'selfdestruct',
    'tx.origin',
    'unchecked'
  ]
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const pattern of patterns) {
      if (line.toLowerCase().includes(pattern)) {
        return {
          lineNumber: i + 1,
          lineContent: line,
          column: line.toLowerCase().indexOf(pattern) + 1,
          inferred: true
        }
      }
    }
  }
  
  return null
}

/**
 * Extract source snippet around the vulnerability
 * @private
 */
function extractSnippet(locations, lines) {
  if (!locations || locations.length === 0) {
    return ''
  }
  
  const location = locations[0] // Use first location
  if (!location.lineNumber) {
    return ''
  }
  
  const lineNum = location.lineNumber
  const start = Math.max(0, lineNum - 3)
  const end = Math.min(lines.length, lineNum + 2)
  
  const snippet = []
  for (let i = start; i < end; i++) {
    const prefix = i + 1 === lineNum ? '→ ' : '  '
    snippet.push(`${prefix}${i + 1}: ${lines[i] || ''}`)
  }
  
  return snippet.join('\n')
}

/**
 * Count lines of code (excluding comments and empty lines)
 * @private
 */
function countLinesOfCode(sourceCode) {
  const lines = sourceCode.split('\n')
  let loc = 0
  
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines and single-line comments
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
      loc++
    }
  }
  
  return loc
}

/**
 * Map findings to line-based markers for frontend highlighting
 * @param {Array} findings - Annotated findings
 * @returns {Object} Line number to findings mapping
 */
export function createLineMarkers(findings) {
  const markers = {}
  
  for (const finding of findings) {
    if (finding.locations) {
      for (const location of finding.locations) {
        if (location.lineNumber) {
          const line = location.lineNumber
          if (!markers[line]) {
            markers[line] = []
          }
          markers[line].push({
            id: finding.id,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            remediation: finding.remediation,
            tool: finding.tool,
            type: finding.type
          })
        }
      }
    }
  }
  
  return markers
}

/**
 * Generate gutter markers for syntax highlighting
 * @param {Object} lineMarkers - Line markers from createLineMarkers
 * @returns {Array} Gutter marker configuration
 */
export function generateGutterMarkers(lineMarkers) {
  const gutterMarkers = []
  
  for (const [lineNum, markers] of Object.entries(lineMarkers)) {
    const line = parseInt(lineNum)
    const severities = markers.map(m => m.severity)
    const maxSeverity = getMaxSeverity(severities)
    
    gutterMarkers.push({
      line,
      severity: maxSeverity,
      count: markers.length,
      findings: markers,
      color: getSeverityColor(maxSeverity)
    })
  }
  
  return gutterMarkers.sort((a, b) => a.line - b.line)
}

/**
 * Get the most severe level from an array of severities
 * @private
 */
function getMaxSeverity(severities) {
  const weights = { critical: 4, high: 3, medium: 2, low: 1 }
  let maxWeight = 0
  let maxSeverity = 'low'
  
  for (const severity of severities) {
    const weight = weights[severity] || 0
    if (weight > maxWeight) {
      maxWeight = weight
      maxSeverity = severity
    }
  }
  
  return maxSeverity
}

/**
 * Get severity color (same as classify.js for consistency)
 * @private
 */
function getSeverityColor(severity) {
  const colors = {
    critical: '#d32f2f',
    high: '#f57c00',
    medium: '#fbc02d',
    low: '#1976d2'
  }
  
  return colors[severity] || colors.medium
}