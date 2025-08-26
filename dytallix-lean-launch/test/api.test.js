import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * API Integration Tests for Contract Scanner Endpoint
 */

const API_BASE = 'http://localhost:8787'
const contractsDir = path.join(__dirname, 'contracts')

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  const data = await response.json()
  return { status: response.status, data }
}

// Helper function to load test contract
function loadContract(filename) {
  return fs.readFileSync(path.join(contractsDir, filename), 'utf8')
}

async function runAPITests() {
  console.log('🌐 Running API Integration Tests...\n')
  
  let passed = 0
  let failed = 0
  
  // Test 1: Health check
  try {
    console.log('Test 1: Health check endpoint')
    const { status, data } = await apiRequest('/health')
    
    if (status === 200 && data.ok) {
      console.log('✅ PASS: Health endpoint working')
      passed++
    } else {
      console.log('❌ FAIL: Health endpoint not working')
      console.log('Response:', { status, data })
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Health check error:', error.message)
    failed++
  }
  
  // Test 2: Contract scan endpoint with valid input
  try {
    console.log('\nTest 2: Contract scan with valid input')
    const code = 'contract Test { function test() { tx.origin; } }'
    
    const { status, data } = await apiRequest('/api/contract/scan', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
    
    if (status === 200 && data.meta && data.summary && Array.isArray(data.findings)) {
      console.log('✅ PASS: Valid scan request successful')
      passed++
    } else {
      console.log('❌ FAIL: Valid scan request failed')
      console.log('Response:', { status, data })
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Valid scan error:', error.message)
    failed++
  }
  
  // Test 3: Invalid input validation
  try {
    console.log('\nTest 3: Invalid input validation')
    const { status } = await apiRequest('/api/contract/scan', {
      method: 'POST',
      body: JSON.stringify({ code: 123 }) // Invalid: number instead of string
    })
    
    if (status === 400) {
      console.log('✅ PASS: Invalid input properly rejected')
      passed++
    } else {
      console.log('❌ FAIL: Invalid input not rejected, status:', status)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Invalid input test error:', error.message)
    failed++
  }
  
  // Test 4: Empty code validation
  try {
    console.log('\nTest 4: Empty code validation')
    const { status } = await apiRequest('/api/contract/scan', {
      method: 'POST',
      body: JSON.stringify({ code: '' })
    })
    
    if (status === 400) {
      console.log('✅ PASS: Empty code properly rejected')
      passed++
    } else {
      console.log('❌ FAIL: Empty code not rejected, status:', status)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Empty code test error:', error.message)
    failed++
  }
  
  // Test 5: Large payload rejection
  try {
    console.log('\nTest 5: Large payload rejection')
    const largeCode = 'a'.repeat(101 * 1024) // 101KB
    
    const { status } = await apiRequest('/api/contract/scan', {
      method: 'POST',
      body: JSON.stringify({ code: largeCode })
    })
    
    if (status === 413) {
      console.log('✅ PASS: Large payload properly rejected')
      passed++
    } else {
      console.log('❌ FAIL: Large payload not rejected, status:', status)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Large payload test error:', error.message)
    failed++
  }
  
  // Test 6: Rate limiting (simulate multiple rapid requests)
  try {
    console.log('\nTest 6: Rate limiting test')
    const code = 'contract Test {}'
    const promises = []
    
    // Send 15 rapid requests (limit is 12 per minute)
    for (let i = 0; i < 15; i++) {
      promises.push(
        apiRequest('/api/contract/scan', {
          method: 'POST',
          body: JSON.stringify({ code })
        })
      )
    }
    
    const results = await Promise.all(promises)
    const rateLimited = results.filter(r => r.status === 429)
    
    if (rateLimited.length > 0) {
      console.log(`✅ PASS: Rate limiting working (${rateLimited.length} requests blocked)`)
      passed++
    } else {
      console.log('❌ FAIL: Rate limiting not working')
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Rate limiting test error:', error.message)
    failed++
  }
  
  // Test 7: Reentrancy contract analysis
  try {
    console.log('\nTest 7: Reentrancy contract analysis')
    // Use a simplified reentrancy pattern that will definitely trigger the mock
    const reentrancyCode = `
contract ReentrancyTest {
  mapping(address => uint256) public balanceOf;
  function withdraw(uint256 v) external {
    msg.sender.call{value: v}("");
    balanceOf[msg.sender] -= v;
  }
}`
    
    const { status, data } = await apiRequest('/api/contract/scan', {
      method: 'POST',
      body: JSON.stringify({ code: reentrancyCode })
    })
    
    if (status === 200 && data.summary && data.summary.bySeverity.critical >= 1) {
      console.log('✅ PASS: Reentrancy pattern flagged critical issues')
      passed++
    } else {
      console.log('❌ FAIL: Reentrancy pattern not properly analyzed')
      console.log('Summary:', data?.summary?.bySeverity)
      console.log('Total findings:', data?.summary?.total)
      failed++
    }
  } catch (error) {
    console.log('❌ FAIL: Reentrancy test error:', error.message)
    failed++
  }
  
  // Test Summary
  console.log('\n' + '='.repeat(50))
  console.log(`API Test Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All API tests passed!')
    return 0
  } else {
    console.log('💥 Some API tests failed!')
    return 1
  }
}

// Check if server is running before tests
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch (error) {
    return false
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkServer()
    .then(serverRunning => {
      if (!serverRunning) {
        console.log('❌ Server is not running at http://localhost:8787')
        console.log('Please start the server with: npm start')
        process.exit(1)
      }
      return runAPITests()
    })
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('API test runner error:', error)
      process.exit(1)
    })
}

export { runAPITests }