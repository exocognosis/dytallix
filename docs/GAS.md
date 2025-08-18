# Gas Accounting System Documentation

## Overview

Dytallix implements a deterministic, versioned gas accounting system across all transaction types with enforced limits at mempool admission and execution time. This document outlines the gas schedule, versioning policy, enforcement model, and operational semantics.

## Gas Table Version

Current version: `GAS_TABLE_VERSION = 1`

The gas table version is used to ensure consensus across all nodes. Nodes with different gas table versions cannot participate in the same network to maintain deterministic execution.

## Fee Unit: datt

All gas prices are specified in `datt`, the smallest native integer unit of the Dytallix network:

- 1 DGT = 1,000,000,000 datt
- Gas prices are specified per gas unit in datt
- Transaction fee = `gas_limit * gas_price` (in datt)

## Gas Schedule

### Intrinsic Base Costs

These are the minimum gas costs required for each transaction type:

| Transaction Type           | Base Gas Cost |
|----------------------------|---------------|
| Transfer                   | 500           |
| Governance Proposal Create | 5,000         |
| Governance Vote           | 1,200         |
| Staking Delegate          | 3,000         |
| Staking Undelegate        | 3,200         |
| Oracle Publish            | 2,500         |
| Contract Instantiate      | 15,000        |
| Contract Call             | 8,000         |
| Contract Migrate          | 12,000        |

### Variable Component Costs

| Component                    | Gas Cost |
|------------------------------|----------|
| Per byte of serialized tx    | 2        |
| Per additional signature     | 700      |
| Per KV read operation        | 40       |
| Per KV write operation       | 120      |
| Per emitted event/log        | 80       |
| Per WASM instruction         | 0*       |

*WASM instruction metering is deferred until WASM engine instrumentation is complete.

## Gas Calculation

The total intrinsic gas for a transaction is calculated as:

```
intrinsic_gas = base_cost(tx_type) + 
                (tx_size_bytes * per_byte_cost) + 
                (additional_signatures * per_signature_cost)
```

Additional dynamic costs are charged during execution:
- KV operations
- Event emissions  
- Future: WASM instruction execution

## Mempool Admission

Transactions are validated for gas requirements before admission to the mempool:

1. Calculate intrinsic gas requirement
2. Verify `gas_limit >= intrinsic_gas`
3. Verify `gas_price > 0`
4. Accept transaction if validation passes

## Execution Semantics

### Gas Metering

During execution, a `GasMeter` tracks gas consumption:

1. Initialize with `gas_limit` from transaction
2. Charge intrinsic gas first
3. Charge for each dynamic operation (KV reads/writes, events)
4. If gas is exhausted, halt execution immediately

### Out-of-Gas Behavior

When a transaction runs out of gas:

1. **Full revert**: All state changes are reverted
2. **Fee charged**: Full `gas_limit * gas_price` is charged
3. **Receipt created**: Transaction receipt shows failure with actual `gas_used`
4. **Deterministic**: All nodes produce identical results

### Fee Charging

- **Success**: Fee = `gas_limit * gas_price`
- **Failure**: Fee = `gas_limit * gas_price` (full amount)
- **Refunds**: `gas_refund` is always 0 (stub for future implementation)

## Transaction & Receipt Formats

### SignedTx Structure

```rust
pub struct SignedTx {
    pub tx: Tx,
    pub public_key: String,
    pub signature: String,
    pub algorithm: String,
    pub version: u32,
    pub gas_limit: u64,    // Maximum gas allowed
    pub gas_price: u64,    // Price per gas unit in datt
}
```

### TxReceipt Structure

```rust
pub struct TxReceipt {
    pub receipt_version: u32,  // RECEIPT_FORMAT_VERSION = 1
    pub tx_hash: String,
    pub status: TxStatus,
    // ... other fields
    pub gas_used: u64,         // Actual gas consumed
    pub gas_limit: u64,        // Gas limit from transaction
    pub gas_price: u64,        // Gas price from transaction
    pub gas_refund: u64,       // Always 0 (future refund model)
    pub success: bool,         // Transaction success status
}
```

## CLI Usage

### Transfer with Gas

```bash
dcli transfer \
  --from alice \
  --to bob \
  --denom DGT \
  --amount 1000 \
  --fee 10 \
  --gas 25000 \
  --gas-price 1500
```

### Automatic Gas Estimation

```bash
dcli transfer \
  --from alice \
  --to bob \
  --denom DGT \
  --amount 1000 \
  --fee 10 \
  --gas-price 1500
# Gas limit automatically estimated with 2x safety factor
```

## Error Handling

### Gas Validation Errors

- `GasLimitTooLow`: Provided gas limit below intrinsic requirement
- `OutOfGas`: Gas exhausted during execution
- `InvalidGasPrice`: Gas price is zero or invalid

### Error Recovery

- Mempool rejects transactions with insufficient gas limits
- Failed transactions are included in blocks with failure status
- Fees are charged for failed transactions to prevent spam

## Versioning and Upgrades

### Gas Table Updates

To update gas costs:

1. Increment `GAS_TABLE_VERSION`
2. Update `GasSchedule` constants
3. Coordinate network upgrade
4. Reject connections from nodes with different versions

### Backward Compatibility

- Receipt format includes `receipt_version` for future compatibility
- Transaction format extends existing structure with default values
- Old receipts can be read with version gating

## Future Enhancements

### WASM Instruction Metering

When WASM engine instrumentation is complete:

1. Replace `PER_VM_INSTRUCTION = 0` with actual cost
2. Implement instruction-level gas charging
3. Update gas schedule version

### Refund Model

Future refund implementation will:

1. Calculate gas refunds for early termination
2. Update `gas_refund` field in receipts
3. Implement refund distribution logic

### Dynamic Gas Pricing

Future market-based gas pricing:

1. Base fee mechanism
2. Priority fee for transaction ordering
3. Dynamic adjustment based on network utilization

## Security Considerations

- Gas limits prevent infinite loops and DoS attacks
- Deterministic gas charging ensures consensus
- Full fee charging on failure prevents spam
- Version checking prevents consensus splits

## Testing and Validation

All gas calculations must be:

1. **Deterministic**: Same inputs produce same gas costs across all nodes
2. **Bounded**: Operations have maximum gas costs to prevent DoS
3. **Consistent**: Gas costs remain stable across minor software updates
4. **Verifiable**: Gas usage can be independently verified

## References

- Gas implementation: `node/src/gas.rs`
- Transaction types: `cli/src/types/tx.rs`
- Receipt types: `node/src/storage/receipts.rs`
- Mempool validation: `node/src/mempool/mod.rs`