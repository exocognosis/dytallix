# Smart Contract Security Scanner

## Overview

The Dytallix Smart Contract Security Scanner provides comprehensive security analysis of Solidity smart contracts using static analysis and symbolic execution techniques. It integrates Slither for AST-based static analysis and Mythril for symbolic execution to detect common vulnerabilities.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server     │    │   Scanner       │
│   (React)       │◄──►│   (Express)      │◄──►│   Service       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                               ┌─────────────────┐    ┌─────────────────┐
                               │   Slither       │    │   Mythril       │
                               │   (Static)      │    │   (Symbolic)    │
                               └─────────────────┘    └─────────────────┘
```

## Supported Vulnerability Checks

### Critical Severity
- **Reentrancy**: External calls before state updates allowing reentrancy attacks
- **Unprotected Selfdestruct**: Contract destruction without proper access controls
- **Delegatecall to User Input**: Arbitrary code execution via delegatecall
- **Authorization Bypass**: Access control flaws allowing asset drainage
- **Integer Overflow/Underflow**: Arithmetic issues in pre-0.8 Solidity affecting funds
- **Locked Ether**: Permanent loss of funds due to missing withdrawal mechanisms
- **Oracle Manipulation**: Price manipulation vulnerabilities

### High Severity
- **Unchecked Call Return Values**: External call failures causing stuck states
- **tx.origin Authentication**: Use of tx.origin instead of msg.sender
- **Integer Precision Loss**: Arithmetic precision issues
- **DoS via Gas**: Gas limit attacks through heavy operations
- **Access Control Misconfiguration**: Permission issues not directly draining funds
- **Front-running**: MEV vulnerabilities in sensitive functions

### Medium Severity
- **Unindexed Events**: Missing event indexing for critical actions
- **Block Timestamp Manipulation**: Dependency on block.timestamp for logic
- **Gas Inefficiencies**: Optimization issues causing potential griefing
- **Weak Randomness**: Predictable random number generation

### Low Severity
- **Style Issues**: Code organization and naming conventions
- **Floating Pragma**: Version specification issues
- **Unused Variables**: Dead code that may indicate logic errors

## Severity Classification Rubric

The scanner uses a comprehensive classification system that analyzes:

1. **Impact Assessment**: Potential for fund loss, contract disruption, or data corruption
2. **Exploitability**: Ease of exploitation and attack vectors
3. **Context Analysis**: Function visibility, access controls, and usage patterns
4. **Tool Correlation**: Cross-validation between static and symbolic analysis

## API Endpoint Specification

### POST /api/contract/scan

Analyzes Solidity source code for security vulnerabilities.

**Request:**
```json
{
  "code": "pragma solidity ^0.8.0;\ncontract Example { ... }"
}
```

**Response:**
```json
{
  "meta": {
    "scanId": "uuid",
    "timestamp": "2025-08-26T03:30:00.000Z",
    "durationMs": 3456,
    "toolVersions": {
      "slither": "0.9.0",
      "mythril": "0.23.0"
    }
  },
  "summary": {
    "total": 5,
    "bySeverity": {
      "critical": 1,
      "high": 1,
      "medium": 2,
      "low": 1
    },
    "performance": {
      "loc": 780,
      "seconds": 3.4
    }
  },
  "findings": [
    {
      "id": "SLITHER-REENTRANCY-1",
      "title": "Reentrancy vulnerability in withdraw()",
      "description": "External call before state update allows reentrancy.",
      "severity": "critical",
      "tool": "slither",
      "type": "reentrancy",
      "locations": [
        {
          "file": "contract.sol",
          "line": 120,
          "column": 15,
          "lineContent": "msg.sender.call{value: amount}(\"\");",
          "context": [...],
          "functionContext": {
            "name": "withdraw",
            "line": 115
          }
        }
      ],
      "sourceSnippet": "msg.sender.call{value: amount}(\"\");\nbalanceOf[msg.sender] -= amount;",
      "remediation": "Use checks-effects-interactions pattern or ReentrancyGuard."
    }
  ],
  "errors": []
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "INVALID_CODE | CODE_REQUIRED | CODE_TOO_LARGE | RATE_LIMITED | SCANNER_BUSY"
}
```

## Tool Installation & Requirements

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- Solidity Compiler (solc)

### Installing Analysis Tools

**Slither (Static Analysis):**
```bash
pip install slither-analyzer
```

**Mythril (Symbolic Execution):**
```bash
pip install mythril
```

**Verify Installation:**
```bash
slither --version
myth version
```

### Development Setup
```bash
# Install dependencies
npm install

# Start server with mocks (for development)
USE_MOCKS=true npm start

# Start server with real tools
npm start

# Run tests
node test/scanner.test.js
node test/api.test.js
```

## Performance Expectations

### Benchmarking Methodology
- **Small Contracts** (< 100 LOC): < 5 seconds
- **Medium Contracts** (100-500 LOC): 5-15 seconds  
- **Large Contracts** (500-1000 LOC): 15-30 seconds
- **Very Large Contracts** (> 1000 LOC): 30-60 seconds

### Performance Optimizations
- Parallel execution of static and symbolic analysis
- Timeout limits (30 seconds default)
- Concurrency control (max 3 simultaneous scans)
- Result caching for identical source code

### Resource Usage
- **Memory**: 512MB-2GB per scan (depending on contract complexity)
- **CPU**: High during symbolic execution phase
- **Disk**: Temporary files cleaned automatically

## Security Hardening Measures

### Rate Limiting
- 12 requests per minute per IP address
- Sliding window implementation
- Redis-backed for distributed deployments

### Input Validation
- Source code size limit: 100KB
- Content sanitization and encoding validation
- JSON schema validation for API requests

### Resource Protection
- Scan timeout enforcement (30 seconds)
- Maximum concurrency limits
- Memory usage monitoring
- Safe temporary file handling with automatic cleanup

### Error Handling
- Generic error messages for external users
- Detailed logging for administrators
- Tool failure graceful degradation to mocks

## Testing

### Test Coverage
- Unit tests for all scanner components
- Integration tests for API endpoints
- Security tests for rate limiting and validation
- Performance benchmarks

### Sample Test Results
```bash
🔍 Running Contract Scanner Test Suite...
✅ PASS: Detected reentrancy vulnerability as critical
✅ PASS: Detected arithmetic overflow vulnerability  
✅ PASS: Safe contract has no critical/high issues
✅ PASS: Large payload rejected correctly
✅ PASS: Concurrency control working
✅ PASS: Performance acceptable
✅ PASS: API response has correct schema

Test Results: 7 passed, 0 failed
🎉 All tests passed!
```

## Future Work

### Planned Enhancements
1. **Multi-file Support**: Import resolution for complex projects
2. **Result Caching**: Redis-based caching for identical contracts
3. **On-chain Analysis**: Bytecode retrieval and analysis from blockchain
4. **Additional Languages**: Yul and Huff support
5. **Parallelization**: Multi-core processing for large contracts
6. **Differential Fuzzing**: Integration with Foundry/Echidna
7. **Custom Rules**: User-defined vulnerability patterns
8. **Report Generation**: PDF/HTML vulnerability reports

### Integration Options
- CI/CD pipeline integration
- IDE plugins (VS Code, Vim)
- GitHub Actions for automated scanning
- Webhook notifications for scan completion

## Known Limitations

1. **False Positives**: Static analysis may flag non-exploitable patterns
2. **Tool Dependencies**: Requires external Python tools for full functionality
3. **Performance Variance**: Scan time varies significantly with contract complexity
4. **Limited Context**: Single-file analysis may miss cross-contract vulnerabilities

## Support & Contributing

For issues, feature requests, or contributions:
- GitHub Issues: [Repository Issues](https://github.com/HisMadRealm/dytallix/issues)
- Documentation: See `docs/` directory
- Examples: See `test/contracts/` directory

## License

This scanner is part of the Dytallix project and follows the same licensing terms.