# Simple WASM Smart Contract Example

This directory contains a simple WASM smart contract that can be used to test the Dytallix smart contract runtime.

## Contract: Simple Counter

The counter contract maintains a simple integer counter that can be incremented.

### Functions:
- `get_count()` - Returns the current counter value
- `increment()` - Increments the counter by 1
- `set_count(value)` - Sets the counter to a specific value

### WASM Binary

The compiled WASM binary is provided as `counter.wasm` and contains a minimal valid WASM module for testing purposes.

### Testing the Contract

You can test this contract using the CLI tools:

```bash
# Deploy the contract
dcli contract deploy --code examples/simple_counter/counter.wasm --from dyt1deployer123 --gas 100000

# Instantiate the contract (if separate from deployment)
dcli contract instantiate --code-hash <hash_from_deployment> --from dyt1user456 --gas 50000

# Execute contract functions
dcli contract execute --contract <instance_address> --function increment --from dyt1caller789 --gas 30000

# Query contract state
dcli contract query storage --contract <instance_address> --key "636f756e746572" # "counter" in hex
```

### Development

To build your own WASM contracts for Dytallix:

1. Use `wasm32-unknown-unknown` target
2. Ensure deterministic execution (no random numbers, system calls)
3. Export your contract functions
4. Use provided host functions for storage and events
5. Keep contracts under the size limit (1MB)

### Host Functions Available

```rust
extern "C" {
    fn storage_get(key_ptr: *const u8, key_len: u32, value_ptr: *mut u8, value_len: u32) -> i32;
    fn storage_set(key_ptr: *const u8, key_len: u32, value_ptr: *const u8, value_len: u32) -> i32;
    fn emit_event(topic_ptr: *const u8, topic_len: u32, data_ptr: *const u8, data_len: u32) -> i32;
}
```