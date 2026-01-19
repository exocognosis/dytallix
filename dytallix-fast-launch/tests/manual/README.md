# Manual Test Scripts

This directory contains manual test scripts that were previously in the project root. These scripts are used for manual testing and debugging during development.

## Test Scripts

### Blockchain Tests
- `test-blockchain-status.sh` - Check blockchain node status
- `test_structure.sh` - Verify project structure

### CLI Tests
- `test_cli_simple.sh` - Simple CLI functionality tests
- `test_cli_transactions.sh` - CLI transaction tests
- `test_complex_transactions.sh` - Complex transaction scenarios
- `test_complex_v2.sh` - Complex transaction scenarios v2
- `test_real_transactions.sh` - Real transaction testing

### Wallet Tests
- `test-wallet-balance.html` - HTML-based wallet balance viewer
- `test_wallet_transactions.sh` - Wallet transaction tests

### Signature & Debug Tests
- `test_signature_minimal.mjs` - Minimal signature testing
- `test_tx_debug.mjs` - Transaction debugging

### Email Tests
- `test-quantum-risk-email.js` - Test quantum risk email generation

## Usage

These scripts are intended for manual testing and debugging. They are not part of the automated test suite.

To run a test script:
```bash
cd tests/manual
./test-blockchain-status.sh
```

## Migration to Automated Tests

As part of the refactoring effort (Phase 3), valuable test cases from these scripts should be converted into automated unit and integration tests using Vitest.
