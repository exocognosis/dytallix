# Dytallix Developer CLI Example Scripts

## Wallet CLI (Python)
```bash
# Generate a new PQC keypair
python wallet/cli.py keygen --algo dilithium

# Sign a transaction
python wallet/cli.py sign --tx tx.json --key keypair.json

# Verify a signature
python wallet/cli.py verify --tx tx.json --sig signature.hex --pubkey pubkey.hex
```

## AI Service CLI (Python)
```bash
# Analyze a transaction for fraud
curl -X POST http://localhost:8000/analyze/fraud -d @tx.json

# Audit a smart contract
curl -X POST http://localhost:8000/analyze/contract -d @contract.json
```

## Smart Contract Test Harness (Rust)
```bash
# Compile and deploy a WASM contract
cargo run --bin contract-test-harness -- compile-deploy contract.rs

# Call a contract method
cargo run --bin contract-test-harness -- call-method --address 0x123 --method transfer --args '{"to": "0xabc", "amount": 100}'

# Run AI audit
python ai_audit.py contract.wasm
```
