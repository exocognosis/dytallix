# Dytallix Test Suite

This directory contains comprehensive test scripts for the Dytallix blockchain project, focusing on performance testing, stress testing, and benchmarking of Post-Quantum Cryptography (PQC) algorithms.

## Test Categories

### 1. Gas Price Benchmarking (`gas_price_benchmarks.rs`)
- Benchmarks gas costs for different PQC signature algorithms (Dilithium, Falcon, SPHINCS+)
- Measures computational overhead of quantum-resistant operations
- Compares performance across different transaction types and sizes

### 2. Performance Testing (`crypto_performance_tests.rs`)
- Tests performance of cryptographic operations under various conditions
- Measures signing, verification, and key generation times
- Evaluates memory usage and computational efficiency

### 3. Stress Testing (`stress_tests.py`)
- Simulates high transaction load scenarios
- Tests system behavior under extreme conditions
- Validates consensus mechanism performance at scale

## Running the Tests

### Rust Tests
```bash
# Run all Rust tests
cargo test --manifest-path tests/Cargo.toml

# Run specific benchmark
cargo test --manifest-path tests/Cargo.toml gas_price_benchmarks

# Run with release optimizations for accurate performance metrics
cargo test --manifest-path tests/Cargo.toml --release
```

### Python Tests
```bash
# Install dependencies
pip install -r tests/requirements.txt

# Run stress tests
python tests/stress_tests.py

# Run with specific parameters
python tests/stress_tests.py --transactions 10000 --duration 300
```

## Test Configuration

Each test script includes configuration options to customize:
- Transaction volumes
- Test duration
- Algorithm parameters
- Network simulation settings

## Extending the Tests

These test scripts serve as a foundation for more comprehensive testing. Each script includes:
- Detailed comments explaining the test methodology
- Configurable parameters for different test scenarios
- Placeholder sections for additional test cases
- Performance metrics collection and reporting

## Integration with CI/CD

The tests are designed to be integrated into the project's build pipeline:
- Automated performance regression detection
- Benchmark result tracking over time
- Stress test validation for release candidates