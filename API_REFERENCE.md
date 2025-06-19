# Dytallix API Reference

## Blockchain Core (Rust)
- `DytallixNode` trait: start, stop, submit_transaction, get_block, get_status
- `ConsensusEngine` trait: propose_block, validate_block, sign_block, verify_signature
- `PQCKeyManager` trait: generate_keypair, sign, verify
- PQC algorithm traits: Dilithium, Falcon, SphincsPlus
- `CryptoAgilityManager` trait: set/get active algorithm, migrate_keys

## AI Services (Python/FastAPI)
- `POST /analyze/fraud` — Analyze transaction for fraud
- `POST /analyze/contract` — Audit smart contract
- `POST /analyze/risk` — Score address/transaction for risk
- Message format: see INTERFACES.md for JSON schema

## Wallet (Rust/Python)
- `Wallet` trait: generate_keypair, sign_transaction, verify_signature, get_address
- CLI commands: keygen, sign, verify

## Smart Contract Test Harness (Rust/Python)
- `ContractTestRunner` trait: deploy_contract, call_method, get_state, audit_with_ai
- WASM compilation/deployment traits
- AI audit hook: `ai_audit_contract`

## Developer Tools
- CLI examples for wallet, AI services, and contract harness (see developer-tools/CLI_EXAMPLES.md)

---

For detailed method signatures and usage, see INTERFACES.md in each module.
