# Gas System Usage Examples

## CLI Usage Examples

### Basic Transfer with Gas Estimation

```bash
# Transfer with automatic gas estimation (2x safety factor)
dcli transfer \
  --from alice \
  --to bob \
  --denom DGT \
  --amount 1000 \
  --fee 10 \
  --gas-price 1500

# Output:
# Intrinsic gas: 1204
# Gas limit: 2408
# Gas price: 1500 datt
# Estimated fee: 3612000 datt (0.003612 DGT)
```

### Transfer with Explicit Gas Limit

```bash
# Transfer with explicit gas limit
dcli transfer \
  --from alice \
  --to bob \
  --denom DGT \
  --amount 1000 \
  --fee 10 \
  --gas 25000 \
  --gas-price 1000

# Output:
# Intrinsic gas: 1204
# Gas limit: 25000
# Gas price: 1000 datt
# Estimated fee: 25000000 datt (0.025 DGT)
```

### Batch Transaction with Gas

```bash
# Batch transaction with gas estimation
dcli batch \
  --file batch.json \
  --gas 50000 \
  --gas-price 1200

# Output:
# Batch intrinsic gas: 2840
# Gas limit: 50000
# Gas price: 1200 datt
# Estimated fee: 60000000 datt (0.06 DGT)
```

### JSON Output for Integration

```bash
# Get gas estimation in JSON format
dcli transfer \
  --from alice \
  --to bob \
  --denom DGT \
  --amount 1000 \
  --fee 10 \
  --gas-price 1500 \
  --output json

# Output:
# {"intrinsic_gas": 1204, "gas_limit": 2408, "gas_price": 1500, "estimated_fee_datt": 3612000}
```

## Programming Examples

### Rust: Creating a Transaction with Gas

```rust
use dytallix_cli::types::{Msg, Tx, SignedTx};
use dytallix_cli::crypto::ActivePQC;

// Create transaction
let msg = Msg::Send {
    from: "alice".to_string(),
    to: "bob".to_string(),
    denom: "DGT".to_string(),
    amount: 1000,
};

let tx = Tx::new("dytallix-1", 1, vec![msg], 10, "memo")?;

// Generate keys and sign with gas parameters
let (sk, pk) = ActivePQC::keypair();
let signed_tx = SignedTx::sign(tx, &sk, &pk, 25000, 1500)?;

// Calculate total fee
let total_fee_datt = signed_tx.total_fee_datt(); // 25000 * 1500 = 37,500,000 datt
let total_fee_dgt = total_fee_datt as f64 / 1_000_000_000.0; // 0.0375 DGT
```

### Rust: Gas Validation

```rust
use dytallix_node::gas::{TxKind, GasSchedule, validate_gas_limit, intrinsic_gas};

let schedule = GasSchedule::default();
let tx_size = 250; // bytes
let additional_sigs = 0;

// Calculate intrinsic gas
let intrinsic = intrinsic_gas(&TxKind::Transfer, tx_size, additional_sigs, &schedule)?;
println!("Intrinsic gas required: {}", intrinsic);

// Validate gas limit
let gas_limit = 25000;
validate_gas_limit(&TxKind::Transfer, tx_size, additional_sigs, gas_limit, &schedule)?;
println!("Gas limit {} is sufficient", gas_limit);
```

### Rust: Gas Metering During Execution

```rust
use dytallix_node::gas::{GasMeter, GasError};

// Initialize gas meter
let mut meter = GasMeter::new(50000);

// Charge for operations
meter.consume(1200, "intrinsic")?;
meter.consume(200, "storage_read")?;
meter.consume(600, "storage_write")?;
meter.consume(160, "event_emit")?;

println!("Gas used: {}", meter.gas_used());
println!("Remaining: {}", meter.remaining_gas());

// Handle out-of-gas
if let Err(GasError::OutOfGas { required, available }) = meter.consume(50000, "expensive_op") {
    println!("Out of gas: need {}, have {}", required, available);
}
```

### Rust: Receipt Handling

```rust
use dytallix_node::storage::receipts::{TxReceipt, TxStatus};

// Create success receipt
let receipt = TxReceipt::success(
    &transaction,
    gas_used: 18500,
    gas_limit: 25000,
    gas_price: 1500,
    block_height: 12345,
    index: 2
);

// Calculate fee charged
let fee_charged = receipt.fee_charged_datt(); // Always gas_limit * gas_price

// Create failure receipt
let failed_receipt = TxReceipt::failed(
    &transaction,
    gas_used: 20000, // Gas used before failure
    gas_limit: 25000,
    gas_price: 1500,
    error: "OutOfGas".to_string(),
    block_height: 12345,
    index: 3
);

// Even failed transactions charge the full fee
assert_eq!(failed_receipt.fee_charged_datt(), 25000 * 1500);
```

## Gas Cost Reference

### Transaction Base Costs

| Operation Type             | Base Gas Cost |
|----------------------------|---------------|
| Transfer                   | 500           |
| Governance Proposal        | 5,000         |
| Governance Vote           | 1,200         |
| Staking Delegate          | 3,000         |
| Staking Undelegate        | 3,200         |
| Oracle Publish            | 2,500         |
| Contract Instantiate      | 15,000        |
| Contract Call             | 8,000         |
| Contract Migrate          | 12,000        |

### Variable Costs

| Component                  | Gas Cost |
|----------------------------|----------|
| Per byte of transaction    | 2        |
| Per additional signature   | 700      |
| Per KV read               | 40       |
| Per KV write              | 120      |
| Per event emission        | 80       |

### Example Calculations

```
Simple Transfer (200 bytes):
  Base cost: 500
  Size cost: 200 * 2 = 400
  Total intrinsic: 900 gas

Contract Call (500 bytes, 1 extra signature):
  Base cost: 8,000
  Size cost: 500 * 2 = 1,000
  Signature cost: 1 * 700 = 700
  Total intrinsic: 9,700 gas

With execution costs:
  + 3 KV reads: 3 * 40 = 120
  + 2 KV writes: 2 * 120 = 240
  + 1 event: 1 * 80 = 80
  Total execution: 10,140 gas
```

## Fee Conversion

```
Gas to Fee Calculation:
  fee_datt = gas_limit * gas_price
  fee_dgt = fee_datt / 1_000_000_000

Example:
  Gas limit: 25,000
  Gas price: 1,500 datt
  Fee: 25,000 * 1,500 = 37,500,000 datt = 0.0375 DGT
```

## Best Practices

1. **Use gas estimation**: Let the CLI estimate gas limits with safety factors
2. **Monitor gas usage**: Track actual gas consumption vs estimates
3. **Set reasonable gas prices**: Higher prices for faster inclusion
4. **Handle out-of-gas**: Always check transaction receipts for success/failure
5. **Test gas limits**: Verify transactions work with estimated gas limits
6. **Account for complexity**: More complex operations need higher gas limits