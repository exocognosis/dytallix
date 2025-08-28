# Cryptography and Economics Documentation

## Fee Unit: datt

Dytallix uses `datt` as the smallest native integer unit for all fee calculations and gas pricing.

### Unit Relationship

- **1 DGT = 1,000,000,000 datt**
- DGT is the primary governance token
- datt provides precision for micro-transactions and gas pricing

### Fee Calculation Formula

All transaction fees are calculated using the gas model:

```
fee (in datt) = gas_limit * gas_price
```

Where:
- `gas_limit`: Maximum gas units the transaction can consume
- `gas_price`: Price per gas unit in datt

### Example Fee Calculations

#### Basic Transfer
- Gas limit: 21,000
- Gas price: 1,000 datt
- Fee: 21,000,000 datt = 0.021 DGT

#### Contract Call
- Gas limit: 100,000
- Gas price: 1,500 datt
- Fee: 150,000,000 datt = 0.15 DGT

#### Governance Proposal
- Gas limit: 50,000
- Gas price: 2,000 datt
- Fee: 100,000,000 datt = 0.1 DGT

## Gas Model Economics

### Why Charge Full Gas Limit on Failure

The network charges `gas_limit * gas_price` even when transactions fail (out-of-gas). This design:

1. **Prevents spam**: Users can't submit high-gas transactions knowing they'll fail early
2. **Maintains incentives**: Miners/validators are compensated for processing attempt
3. **Encourages efficiency**: Users optimize gas limits to avoid overpaying
4. **Ensures predictability**: Fee calculation is deterministic regardless of execution outcome

### Rationale for Gas-Based Pricing

Traditional fixed-fee models don't scale with transaction complexity. Gas-based pricing:

1. **Fair resource allocation**: Complex operations pay proportionally more
2. **DoS protection**: Expensive operations require expensive fees
3. **Network sustainability**: Fee revenue scales with network usage
4. **Economic efficiency**: Market-based gas pricing optimizes resource usage

## Post-Quantum Cryptography Impact

### Signature Size Overhead

Post-quantum signatures are significantly larger than classical signatures:

- **Classical ECDSA**: ~64 bytes
- **Dilithium5**: ~4,595 bytes
- **Falcon-1024**: ~1,330 bytes

### Gas Cost Implications

Larger signatures affect gas costs through:

1. **Transaction size**: More bytes → higher `per_byte` gas cost
2. **Verification cost**: More expensive signature verification
3. **Storage cost**: Larger on-chain storage requirements

### Gas Schedule Adjustments

The gas schedule accounts for PQC overhead:

- `per_byte` cost: 2 gas per byte (affects large signatures)
- `per_additional_signature`: 700 gas (reflects verification cost)
- Future: Signature algorithm-specific pricing

## Future Economic Model Evolution

### Refund Mechanism (Planned)

Currently, `gas_refund` is always 0. Future implementation will:

1. **Calculate unused gas**: `gas_limit - gas_used`
2. **Apply refund policy**: Partial refund based on network policy
3. **Distribute refunds**: Return datt to transaction originator
4. **Maintain anti-spam**: Limit refund percentage to prevent abuse

### WASM Instruction Pricing (Planned)

When WASM metering is implemented:

1. **Instruction-level charging**: Each WASM operation has gas cost
2. **Complexity-based pricing**: Complex operations cost more gas
3. **Memory accounting**: Memory allocation and access costs
4. **I/O operation pricing**: File system and network operations

### Dynamic Gas Pricing (Future)

Market-based gas pricing mechanisms:

1. **Base fee mechanism**: Network-wide base fee that adjusts with demand
2. **Priority fees**: Optional tip for faster inclusion
3. **Congestion pricing**: Higher fees during network congestion
4. **Fee market evolution**: Algorithmic fee adjustment based on utilization

## Security Economics

### Economic Attack Prevention

The gas model prevents several attack vectors:

1. **Computational DoS**: Expensive operations require expensive fees
2. **State bloat**: Storage operations have high gas costs
3. **Signature spam**: PQC-aware gas costs limit signature-based attacks
4. **Resource exhaustion**: Gas limits bound computation and memory usage

### Fee Market Dynamics

Gas pricing creates healthy market dynamics:

1. **Supply/demand balance**: Higher demand → higher gas prices
2. **Quality of service**: Users can pay more for faster processing
3. **Network sustainability**: Fee revenue funds network operation
4. **Economic security**: High-value transactions pay proportionally more

## Migration and Compatibility

### Backward Compatibility

The gas system maintains compatibility:

1. **Legacy transactions**: Default gas values for old transaction formats
2. **Receipt versioning**: `receipt_version` field enables format evolution
3. **Gas table versioning**: `GAS_TABLE_VERSION` ensures consensus compatibility
4. **Gradual rollout**: New gas features can be introduced incrementally

### Cross-Chain Considerations

For interoperability with other networks:

1. **Gas conversion**: Convert between different gas models
2. **Fee estimation**: Provide gas estimates for foreign transactions
3. **Economic bridging**: Maintain economic consistency across chains
4. **Standards compliance**: Follow emerging cross-chain fee standards

## Governance and Gas Schedule Changes

### Gas Schedule Updates

Changes to gas costs require network governance:

1. **Proposal submission**: Gas schedule changes via governance proposal
2. **Community review**: Technical and economic analysis period
3. **Voting period**: Token holder voting on proposed changes
4. **Coordinated upgrade**: Network-wide activation at specified block height

### Change Procedure

1. **Technical analysis**: Benchmark new gas costs
2. **Economic impact**: Model fee changes on users
3. **Backward compatibility**: Ensure smooth transition
4. **Testing**: Comprehensive testing on test networks
5. **Documentation**: Update all relevant documentation
6. **Communication**: Notify ecosystem participants

This economic model ensures Dytallix can scale sustainably while maintaining security and decentralization through aligned economic incentives.