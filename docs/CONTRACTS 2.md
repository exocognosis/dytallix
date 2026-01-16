# Smart Contract Runtime Documentation

## Overview

The Dytallix blockchain includes a deterministic WASM (WebAssembly) smart contract runtime that provides secure, sandboxed execution of smart contracts with deterministic gas metering and isolated storage.

## Architecture

### Core Components

1. **WASM Runtime Engine**: Based on `wasmi` for deterministic execution
2. **Gas Metering System**: Tracks and limits computational resources
3. **Contract Storage**: Isolated key-value storage per contract instance
4. **Event System**: Emit and collect contract events
5. **AI Integration**: Optional AI-powered security analysis

### Key Features

- **Deterministic Execution**: All contract executions produce identical results across nodes
- **Gas Metering**: Configurable gas costs prevent infinite loops and DoS attacks
- **Storage Isolation**: Each contract instance has its own storage namespace
- **Memory Limits**: Maximum 16MB memory per contract instance
- **Size Limits**: Contract code and storage values have configurable size limits
- **Event Emission**: Contracts can emit events for external monitoring

## Contract Lifecycle

### 1. Contract Deployment

Deploy WASM bytecode to the blockchain and generate a unique code hash.

**CLI Example:**
```bash
# Deploy a contract from WASM file
dcli contract deploy --code contract.wasm --from dyt1deployer123 --gas 1000000

# Response:
{
  "success": true,
  "address": "contract_a1b2c3d4e5f6",
  "code_hash": "0x123abc...",
  "gas_used": 50000
}
```

**RPC Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_deploy",
  "params": [{
    "code": "0x0061736d01000000...", // hex-encoded WASM
    "from": "dyt1deployer123",
    "gas_limit": 1000000,
    "initial_state": {}
  }],
  "id": 1
}
```

**Requirements:**
- Valid WASM bytecode with correct magic number (`0x0061736d`)
- Code size must be ≤ 1MB
- Sufficient gas for deployment
- Valid deployer address

### 2. Contract Instantiation

Create an instance of deployed contract code with its own storage namespace.

**CLI Example:**
```bash
# Instantiate a deployed contract
dcli contract instantiate --code-hash 0x123abc... --from dyt1user456 --gas 500000 --args '{"param1": "value1"}'

# Response:
{
  "success": true,
  "instance_address": "instance_f1e2d3c4b5a6",
  "gas_used": 30000
}
```

**RPC Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_instantiate",
  "params": [{
    "code_hash": "0x123abc...",
    "from": "dyt1user456",
    "gas_limit": 500000,
    "constructor_args": {"param1": "value1"}
  }],
  "id": 2
}
```

### 3. Contract Execution

Call functions on instantiated contracts.

**CLI Example:**
```bash
# Execute a contract function
dcli contract execute --contract instance_f1e2d3c4b5a6 --function transfer --from dyt1caller789 --gas 300000 --args '{"to": "dyt1recipient", "amount": 100}'

# Response:
{
  "success": true,
  "return_value": "0x01",
  "gas_used": 25000,
  "events": [
    {
      "type": "Transfer",
      "data": {"from": "dyt1caller789", "to": "dyt1recipient", "amount": 100}
    }
  ]
}
```

**RPC Example:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_execute",
  "params": [{
    "contract_address": "instance_f1e2d3c4b5a6",
    "function": "transfer",
    "args": {"to": "dyt1recipient", "amount": 100},
    "from": "dyt1caller789",
    "gas_limit": 300000
  }],
  "id": 3
}
```

## Contract Queries

### Get Contract Code

**CLI:**
```bash
dcli contract query code 0x123abc...
```

**RPC:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_get_code",
  "params": [{"hash": "0x123abc..."}],
  "id": 4
}
```

### Get Contract Instance Info

**CLI:**
```bash
dcli contract query instance instance_f1e2d3c4b5a6
```

**RPC:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_get_instance",
  "params": [{"address": "instance_f1e2d3c4b5a6"}],
  "id": 5
}
```

### Get Contract Storage

**CLI:**
```bash
dcli contract query storage --contract instance_f1e2d3c4b5a6 --key "0x1234"
```

**RPC:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_get_storage",
  "params": [{
    "contract_address": "instance_f1e2d3c4b5a6",
    "key": "0x1234"
  }],
  "id": 6
}
```

### List All Contracts

**CLI:**
```bash
dcli contract query list
```

**RPC:**
```json
{
  "jsonrpc": "2.0",
  "method": "contract_list",
  "params": [],
  "id": 7
}
```

## Gas Metering

The runtime uses deterministic gas metering to ensure consistent resource consumption:

### Gas Costs

| Operation | Gas Cost |
|-----------|----------|
| Base instruction | 1 |
| Memory access (per byte) | 1 |
| Storage read | 200 |
| Storage write | 5,000 |
| Event emission | 375 |
| External call | 700 |

### Gas Limits

- **Maximum per call**: 10,000,000 gas
- **Memory expansion**: Additional cost for memory growth
- **Operation count limit**: 1,000,000 operations per call

## Storage System

### Storage Isolation

Each contract instance has its own isolated storage namespace identified by the instance address.

### Storage Limits

- **Key size**: Maximum 128 bytes
- **Value size**: Maximum 16KB (16,384 bytes)
- **Total storage**: Maximum 1MB per contract instance

### Host Functions

Contracts access storage through host functions:

```rust
// Storage operations available to contracts
extern "C" {
    fn storage_get(key_ptr: *const u8, key_len: u32, value_ptr: *mut u8, value_len: u32) -> i32;
    fn storage_set(key_ptr: *const u8, key_len: u32, value_ptr: *const u8, value_len: u32) -> i32;
    fn emit_event(topic_ptr: *const u8, topic_len: u32, data_ptr: *const u8, data_len: u32) -> i32;
}
```

## Events

Contracts can emit events for external monitoring and indexing.

### Event Structure

```json
{
  "contract_address": "instance_f1e2d3c4b5a6",
  "topic": "Transfer",
  "data": {"from": "addr1", "to": "addr2", "amount": 100},
  "timestamp": 1640995200,
  "block_number": 12345,
  "transaction_hash": "0xabc123..."
}
```

### Event Limits

- **Topic size**: Maximum 64 bytes
- **Data size**: Maximum 1KB (1,024 bytes)
- **Events per call**: Maximum 100 events

## Security Features

### AI Integration

Optional AI-powered security analysis:

- **Deployment Analysis**: Scan for known vulnerabilities
- **Execution Monitoring**: Detect suspicious behavior patterns
- **State Change Validation**: Verify state transitions are valid

### Sandboxing

- **Memory isolation**: Contracts cannot access external memory
- **Resource limits**: Gas and memory limits prevent DoS
- **Deterministic execution**: Identical results across all nodes

### Post-Quantum Cryptography

Integration with Dytallix's PQC system for:

- **Transaction signatures**: Quantum-safe signature verification
- **Contract authentication**: PQC-based access controls

## Error Handling

### Common Error Codes

| Code | Error | Description |
|------|-------|-------------|
| `OutOfGas` | Gas exhausted | Call exceeded gas limit |
| `InvalidContract` | Invalid WASM | Malformed or invalid contract code |
| `ExecutionFailed` | Runtime error | Contract execution failed |
| `InvalidInput` | Bad parameters | Invalid function arguments |
| `StateError` | Storage error | Failed to read/write storage |
| `PermissionDenied` | Access denied | Caller lacks required permissions |
| `AIValidationFailed` | AI rejection | AI security analysis failed |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "OutOfGas",
    "message": "Contract execution exceeded gas limit",
    "gas_used": 1000000
  }
}
```

## Development Guidelines

### Contract Development

1. **Use deterministic operations**: Avoid random numbers, system time
2. **Manage gas efficiently**: Optimize loops and storage access
3. **Handle errors gracefully**: Check return values from host functions
4. **Emit meaningful events**: Provide good observability
5. **Validate inputs**: Check all parameters before processing

### Testing

```bash
# Run contract unit tests
cargo test --package dytallix-contracts

# Run integration tests
cargo test --test integration_tests

# Test specific contract functionality
cargo test contract_lifecycle
```

### Best Practices

- **Code size optimization**: Keep contracts under 1MB
- **Storage efficiency**: Use compact data structures
- **Gas optimization**: Minimize storage writes
- **Security**: Validate all external inputs
- **Events**: Emit events for all important state changes

## Examples

### Simple Token Contract

A basic ERC-20 style token contract:

```rust
// Token contract example (pseudo-code)
#[contract]
impl Token {
    fn transfer(&mut self, to: Address, amount: u64) -> Result<(), Error> {
        let from = self.caller();
        let from_balance = self.get_balance(&from)?;

        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        self.set_balance(&from, from_balance - amount)?;
        let to_balance = self.get_balance(&to)?;
        self.set_balance(&to, to_balance + amount)?;

        self.emit_event("Transfer", TransferEvent { from, to, amount })?;
        Ok(())
    }
}
```

### Escrow Contract

An escrow contract with AI-powered fraud detection:

```rust
#[contract]
impl Escrow {
    fn release(&mut self, escrow_id: u64) -> Result<(), Error> {
        let escrow = self.get_escrow(escrow_id)?;

        // AI fraud detection
        if let Some(ai_score) = self.analyze_release(&escrow)? {
            if ai_score < 0.7 {
                return Err(Error::FraudDetected);
            }
        }

        self.transfer(escrow.beneficiary, escrow.amount)?;
        self.emit_event("EscrowReleased", ReleaseEvent { escrow_id })?;
        Ok(())
    }
}
```

## Roadmap

### Current Status (MVP)

- ✅ WASM execution engine
- ✅ Gas metering system
- ✅ Contract storage
- ✅ Event emission
- ✅ CLI commands
- ✅ RPC endpoints
- ✅ Basic AI integration

### Planned Features

- **Advanced gas optimization**: Dynamic gas pricing
- **Contract upgrades**: Proxy pattern support
- **Cross-contract calls**: Contract-to-contract communication
- **Storage optimization**: Compression and archival
- **Advanced AI features**: Real-time threat detection
- **Developer tools**: Contract debugger and profiler

## Support

For questions and support:

- **Documentation**: [docs.dytallix.com](https://docs.dytallix.com)
- **Discord**: [discord.gg/dytallix](https://discord.gg/dytallix)
- **GitHub**: [github.com/HisMadRealm/dytallix](https://github.com/HisMadRealm/dytallix)
- **Email**: support@dytallix.com