import fs from 'fs'
import path from 'path'
import { ContractScanner } from '../server/src/scanner/index.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Test Suite for Contract Security Scanner
 */

// Test configuration
const TEST_TIMEOUT = 30000
const contractsDir = path.join(__dirname, 'contracts')

// Helper function to load test contract
function loadContract(filename) {
  return fs.readFileSync(path.join(contractsDir, filename), 'utf8')
}

// Test runner
async function runTests() {
  console.log('🔍 Running Contract Scanner Test Suite...\n')
  
  const scanner = new ContractScanner({
    useMocks: true,
    timeout: 10000
  })
  
  let passed = 0
  let failed = 0
  
  // Test 1: Reentrancy vulnerability detection
  try {
    console.log('Test 1: Reentrancy vulnerability detection')
    const reentrancyCode = loadContract('reentrancy.sol')
    const result = await scanner.scanContract(reentrancyCode)
    
    const hasReentrancy = result.findings.some(f => 
      f.type === 'reentrancy' && f.severity === 'critical'
    )
    
    if (hasReentrancy && result.summary.bySeverity.critical >= 1) {
      console.log('✅ PASS: Detected reentrancy vulnerability as critical')
      passed++
    } else {
      console.log('❌ FAIL: Failed to detect reentrancy or classify as critical')
      console.log('Findings:', result.findings.map(f => ({ type: f.type, severity: f.severity })))
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Test threw error:', error.message)
    failed++
  }
  
  // Test 2: Integer overflow detection
  try {
    console.log('\nTest 2: Integer overflow detection')
    const overflowCode = loadContract('overflow.sol')
    const result = await scanner.scanContract(overflowCode)
    
    const hasArithmeticIssue = result.findings.some(f => 
      f.type === 'arithmetic-overflow' || f.title.toLowerCase().includes('overflow')
    )
    
    if (hasArithmeticIssue) {
      console.log('✅ PASS: Detected arithmetic overflow vulnerability')
      passed++
    } else {
      console.log('❌ FAIL: Failed to detect arithmetic overflow')
      console.log('Findings:', result.findings.map(f => ({ type: f.type, title: f.title })))
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Test threw error:', error.message)
    failed++
  }
  
  // Test 3: Safe contract should have minimal issues
  try {
    console.log('\nTest 3: Safe contract analysis')
    const safeCode = loadContract('safe-token.sol')
    const result = await scanner.scanContract(safeCode)
    
    const hasCriticalIssues = result.summary.bySeverity.critical > 0
    const hasHighIssues = result.summary.bySeverity.high > 0
    
    if (!hasCriticalIssues && !hasHighIssues) {
      console.log('✅ PASS: Safe contract has no critical/high issues')
      passed++
    } else {
      console.log('❌ FAIL: Safe contract flagged critical/high issues')
      console.log('Summary:', result.summary.bySeverity)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Test threw error:', error.message)
    failed++
  }
  
  // Test 4: Payload size limits
  try {
    console.log('\nTest 4: Payload size limit enforcement')
    const largeCode = 'a'.repeat(101 * 1024) // 101KB
    
    try {
      await scanner.scanContract(largeCode)
      console.log('❌ FAIL: Large payload was accepted')
      failed++
    } catch (error) {
      if (error.message.includes('100KB') || error.message.includes('too large')) {
        console.log('✅ PASS: Large payload rejected correctly')
        passed++
      } else {
        console.log('❌ FAIL: Wrong error for large payload:', error.message)
        failed++
      }
    }
  } catch (error) {
    console.log('❌ FAIL: Test setup error:', error.message)
    failed++
  }
  
  // Test 5: Rate limiting simulation
  try {
    console.log('\nTest 5: Scanner concurrency limits')
    const testCode = 'contract Test { }'
    
    // Start multiple scans simultaneously to test concurrency
    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(scanner.scanContract(testCode))
    }
    
    const results = await Promise.allSettled(promises)
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed_scans = results.filter(r => r.status === 'rejected').length
    
    if (successful > 0 && successful <= 3) { // Max concurrency is 3
      console.log(`✅ PASS: Concurrency control working (${successful} successful, ${failed_scans} rejected)`)
      passed++
    } else {
      console.log(`❌ FAIL: Concurrency control not working (${successful} successful, ${failed_scans} rejected)`)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Test threw error:', error.message)
    failed++
  }
  
  // Test 6: Performance benchmark
  try {
    console.log('\nTest 6: Performance benchmark')
    const reentrancyCode = loadContract('reentrancy.sol')
    const startTime = Date.now()
    
    const result = await scanner.scanContract(reentrancyCode)
    const duration = Date.now() - startTime
    
    if (duration < 10000 && result.meta.durationMs < 5000) { // Should complete quickly with mocks
      console.log(`✅ PASS: Performance acceptable (${duration}ms total, ${result.meta.durationMs}ms scan)`)
      passed++
    } else {
      console.log(`❌ FAIL: Performance too slow (${duration}ms total, ${result.meta.durationMs}ms scan)`)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Test threw error:', error.message)
    failed++
  }
  
  // Test 7: API response schema validation
  try {
    console.log('\nTest 7: API response schema validation')
    const testCode = 'contract Test { function test() { tx.origin; } }'
    const result = await scanner.scanContract(testCode)
    
    const hasRequiredFields = (
      result.meta && 
      result.meta.scanId && 
      result.meta.timestamp && 
      result.meta.durationMs !== undefined &&
      result.summary && 
      result.summary.total !== undefined &&
      result.summary.bySeverity &&
      Array.isArray(result.findings) &&
      Array.isArray(result.errors)
    )
    
    if (hasRequiredFields) {
      console.log('✅ PASS: API response has correct schema')
      passed++
    } else {
      console.log('❌ FAIL: API response missing required fields')
      console.log('Schema check:', {
        hasMeta: !!result.meta,
        hasSummary: !!result.summary,
        hasFindings: Array.isArray(result.findings),
        hasErrors: Array.isArray(result.errors)
      })
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Test threw error:', error.message)
    failed++
  }
  
  // Test Summary
  console.log('\n' + '='.repeat(50))
  console.log(`Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed!')
    return 0
  } else {
    console.log('💥 Some tests failed!')
    return 1
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('Test runner error:', error)
      process.exit(1)
    })
}

export { runTests }