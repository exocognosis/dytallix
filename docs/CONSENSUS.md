# Consensus Execution Documentation

## Overview

Dytallix implements deterministic consensus execution with upfront fee charging, full-revert semantics, and precise gas accounting to ensure all nodes reach identical post-state and receipts.

## Execution Model

### Deterministic Processing

All transaction execution follows a strict deterministic model:

1. **Transaction Order**: Execution follows mempool snapshot order or explicit block transaction order
2. **No Randomness**: No random number generation or system time dependencies in execution paths
3. **Identical Inputs → Identical Outputs**: Same transaction on same pre-state always produces same post-state and receipt

### Upfront Fee Mechanism

Before any transaction execution begins:

1. **Fee Calculation**: Calculate upfront fee as `gas_limit * gas_price` using overflow-safe u128 arithmetic
2. **Balance Check**: Verify sender has sufficient balance for `transfer_amount + upfront_fee`
3. **Immediate Deduction**: Deduct upfront fee from sender before any execution starts
4. **Early Failure**: If insufficient funds, fail immediately with no state changes

```rust
let upfront_fee = gas_limit as u128 * gas_price as u128;
let total_required = transfer_amount + upfront_fee;
if sender_balance < total_required {
    return InsufficientFunds;
}
// Deduct upfront fee immediately
sender_balance -= upfront_fee;
```

### Full Revert Semantics

On execution failure (e.g., OutOfGas):

1. **State Revert**: All state changes during execution are fully reverted
2. **Fee Retention**: Upfront fee is NOT refunded - node keeps full gas payment
3. **Failure Receipt**: Create receipt with `success = false` and actual `gas_used`
4. **Deterministic**: All nodes produce identical revert behavior

```rust
// On OutOfGas or execution failure:
execution_context.revert_state_changes(state);  // Revert all writes
// BUT: upfront fee is already deducted and stays deducted
receipt.success = false;
receipt.gas_used = actual_gas_consumed;
```

## Gas Accounting

### Gas Metering

Gas consumption is tracked through a `GasMeter` with the following components:

1. **Intrinsic Gas**: Minimum gas required based on transaction type and size
2. **KV Operations**: Gas charged for each storage read/write operation
3. **Events**: Gas charged for event emissions
4. **WASM Instructions**: Reserved for future WASM execution (currently 0)

### Gas Schedule (Version 1)

Current gas costs:

| Operation | Gas Cost |
|-----------|----------|
| Transfer Base | 500 |
| Per Byte | 2 |
| Per Signature | 700 |
| KV Read | 40 |
| KV Write | 120 |
| Event Emission | 80 |
| WASM Instruction | 0* |

*WASM instruction metering deferred until WASM engine instrumentation

### Fee Charging Rules

- **Success Case**: Full fee charged (`gas_limit * gas_price`)
- **Failure Case**: Full fee charged (`gas_limit * gas_price`)
- **No Refunds**: `gas_refund` is always 0 (stub for future implementation)
- **Integer Math**: All calculations use integer arithmetic, no floating point

## Execution Pipeline

### Transaction Validation

1. **Nonce Check**: Verify transaction nonce matches account nonce
2. **Balance Check**: Verify sufficient balance for amount + gas fee
3. **Gas Limit**: Verify gas_limit >= intrinsic gas requirement

### Execution Steps

1. **Upfront Deduction**: Charge full gas fee immediately
2. **Intrinsic Gas**: Charge base gas for transaction type and size
3. **Execution**: Execute transaction operations with gas metering
4. **State Commit/Revert**: Commit changes on success, revert on failure
5. **Receipt Creation**: Generate receipt with final gas usage and status

### Error Handling

| Error Type | State Behavior | Fee Behavior | Receipt |
|------------|----------------|--------------|---------|
| InsufficientFunds | No changes | No fee charged | Failed receipt |
| InvalidNonce | No changes | No fee charged | Failed receipt |
| OutOfGas | Full revert | Full fee charged | Failed receipt with gas_used |
| ExecutionError | Full revert | Full fee charged | Failed receipt with error |

## Consensus Guarantees

### Determinism

- **Block Replay**: Applying same block twice on clean state yields identical state root
- **Node Sync**: All nodes produce identical receipts and final state
- **No Time Dependencies**: No system time or randomness affects execution results

### Safety Properties

1. **Fee Payment**: Failed transactions always charge appropriate fees
2. **State Consistency**: No partial state corruption on failures
3. **Gas Bounds**: Execution cannot exceed specified gas limits
4. **Nonce Progression**: Account nonces advance deterministically

### Liveness Properties

1. **Progress**: Valid transactions with sufficient gas eventually execute
2. **Fairness**: Transaction ordering follows deterministic mempool rules
3. **Resource Bounds**: Gas limits prevent infinite execution

## Backward Compatibility

### Legacy Transactions

Transactions without explicit gas fields:
- `gas_limit = fee` (treat fee as gas limit)
- `gas_price = 1` (use unit gas price)
- Same execution semantics apply

### Receipt Versioning

- `receipt_version = 1` for all receipts
- Append-only field additions for future versions
- JSON serialization maintains compatibility

## Implementation Notes

### State Journaling

Execution uses state change journaling for efficient revert:

```rust
struct StateChange {
    address: String,
    denom: String,
    old_balance: u128,
    new_balance: u128,
}
```

### Memory Safety

- All arithmetic uses overflow-safe operations
- Gas calculations use u128 to prevent overflow
- State changes are atomically committed or reverted

### Testing

Comprehensive test coverage includes:
- Deterministic replay tests
- Out-of-gas scenario tests
- Mixed success/failure transaction batches
- Edge cases and overflow conditions