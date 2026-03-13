# Dytallix Testnet Troubleshooting Guide

## Common Issues and Solutions

### Connection Issues

#### Problem: Cannot connect to RPC endpoint
```
Error: Request failed with status code 500
Error: ECONNREFUSED 127.0.0.1:26657
```

**Solutions:**
1. Verify the RPC endpoint URL:
   ```bash
   curl http://rpc.dytallix.com:26657/status
   ```

2. Check if you're behind a firewall or proxy:
   ```bash
   # Test with a different endpoint
   curl http://api.dytallix.com:1317/cosmos/base/tendermint/v1beta1/node_info
   ```

3. Try alternative endpoints:
   - Primary RPC: `http://rpc.dytallix.com:26657`
   - Backup RPC: `http://rpc2.dytallix.com:26657`
   - API: `http://api.dytallix.com:1317`

#### Problem: WebSocket connection fails
```
WebSocket connection to 'ws://rpc.dytallix.com:26657/websocket' failed
```

**Solutions:**
1. Check WebSocket endpoint:
   ```javascript
   const ws = new WebSocket('ws://rpc.dytallix.com:26657/websocket');
   ws.onopen = () => console.log('Connected');
   ws.onerror = (error) => console.error('WebSocket error:', error);
   ```

2. Use secure WebSocket in browser environments:
   ```javascript
   const ws = new WebSocket('wss://rpc.dytallix.com:26657/websocket');
   ```

### Transaction Issues

#### Problem: "insufficient funds" error
```
Error: insufficient funds: insufficient account funds;
got: 0udgt, required: 1250udgt
```

**Solutions:**
1. Check your account balance:
   ```bash
   curl "http://api.dytallix.com:1317/cosmos/bank/v1beta1/balances/dytallix1your_address"
   ```

2. Get test tokens from the faucet:
   ```bash
   curl -X POST http://faucet.dytallix.com/api/faucet \
     -H "Content-Type: application/json" \
     -d '{"address": "dytallix1your_address"}'
   ```

3. Wait for faucet cooldown (24 hours between requests)

#### Problem: "invalid signature" error
```
Error: unauthorized: signature verification failed;
verify correct account sequence and chain-id
```

**Solutions:**
1. Verify you're using the correct chain ID:
   ```javascript
   const client = new DytallixClient({
     chainId: 'dytallix-testnet-1' // Must match exactly
   });
   ```

2. Check account sequence:
   ```bash
   curl "http://api.dytallix.com:1317/cosmos/auth/v1beta1/accounts/dytallix1your_address"
   ```

3. Ensure you're using PQC signature algorithm:
   ```javascript
   const wallet = await Wallet.create({
     algorithm: 'dilithium5' // Not secp256k1
   });
   ```

#### Problem: "out of gas" error
```
Error: out of gas in location: WriteFlat; gasWanted: 50000, gasUsed: 52341
```

**Solutions:**
1. Increase gas limit:
   ```javascript
   const tx = await client.sendTokens({
     // ... other params
     fee: {
       amount: [{ denom: 'udgt', amount: '1250' }],
       gas: '100000' // Increased from 50000
     }
   });
   ```

2. Estimate gas before sending:
   ```javascript
   const gasEstimate = await client.estimateGas(txParams);
   const gasLimit = Math.ceil(gasEstimate * 1.2); // 20% buffer
   ```

#### Problem: "tx already exists in cache" error
```
Error: tx already exists in cache
```

**Solutions:**
1. Wait for the transaction to be processed (5-10 seconds)
2. Check if the transaction was successful:
   ```bash
   curl "http://api.dytallix.com:1317/cosmos/tx/v1beta1/txs/TRANSACTION_HASH"
   ```
3. Use a different nonce/sequence number for new transactions

### Wallet Issues

#### Problem: Invalid mnemonic phrase
```
Error: Invalid mnemonic phrase
```

**Solutions:**
1. Verify mnemonic has correct word count (12, 15, 18, 21, or 24 words)
2. Check for typos in mnemonic words
3. Ensure words are from the BIP39 wordlist
4. Generate a new wallet if mnemonic is corrupted:
   ```javascript
   const newWallet = await Wallet.create({ algorithm: 'dilithium5' });
   console.log('New mnemonic:', newWallet.getMnemonic());
   ```

#### Problem: Address format not recognized
```
Error: Invalid address format
```

**Solutions:**
1. Verify address starts with "dytallix1":
   ```javascript
   const address = wallet.getAddress();
   console.log('Address:', address); // Should start with dytallix1
   ```

2. Convert from other formats if needed:
   ```javascript
   // If you have a Cosmos address
   const dytallixAddress = convertAddress(cosmosAddress, 'dytallix');
   ```

### Smart Contract Issues

#### Problem: Contract deployment fails
```
Error: failed to execute message; message index: 0:
contract validation failed
```

**Solutions:**
1. Verify WASM code is valid:
   ```bash
   # Check WASM file
   file contract.wasm
   wasm-validate contract.wasm
   ```

2. Ensure contract size is within limits:
   ```bash
   ls -lh contract.wasm
   # Should be < 2MB for testnet
   ```

3. Check instantiation message format:
   ```javascript
   const instantiateMsg = {
     // Ensure this matches the contract's expected format
     name: "My Token",
     symbol: "MTK",
     decimals: 6
   };
   ```

#### Problem: Contract execution fails
```
Error: contract execution failed: Generic error:
unauthorized
```

**Solutions:**
1. Verify you have permission to execute the function
2. Check contract state and permissions:
   ```javascript
   const owner = await client.queryContract({
     contract: contractAddress,
     msg: { owner: {} }
   });
   ```

3. Ensure you're sending the correct funds if required:
   ```javascript
   const executeTx = await client.executeContract({
     sender: wallet.getAddress(),
     contract: contractAddress,
     msg: { buy_tokens: {} },
     funds: [{ denom: 'udgt', amount: '1000000' }] // If required
   });
   ```

### Faucet Issues

#### Problem: Faucet request fails
```
Error: 429 Too Many Requests
```

**Solutions:**
1. Wait 24 hours between faucet requests
2. Check if you've already received tokens:
   ```bash
   curl "http://api.dytallix.com:1317/cosmos/bank/v1beta1/balances/dytallix1your_address"
   ```

3. Try the web interface: [faucet.dytallix.com](http://faucet.dytallix.com)

#### Problem: Faucet tokens not received
```
Faucet returns success but balance unchanged
```

**Solutions:**
1. Wait 1-2 minutes for transaction to be processed
2. Check transaction on explorer:
   - Visit [explorer.dytallix.com](http://explorer.dytallix.com)
   - Search for your address

3. Verify you used the correct address format

### Network Issues

#### Problem: Slow transaction processing
```
Transaction submitted but not confirming
```

**Solutions:**
1. Check network status:
   ```bash
   curl http://rpc.dytallix.com:26657/status
   ```

2. Increase gas price:
   ```javascript
   const tx = await client.sendTokens({
     // ... other params
     fee: {
       amount: [{ denom: 'udgt', amount: '2500' }], // Increased fee
       gas: '50000'
     }
   });
   ```

3. Monitor transaction status:
   ```javascript
   const txResult = await client.waitForTx(txHash, 30000); // 30 second timeout
   ```

#### Problem: Node synchronization issues
```
Error: node is catching up with network
```

**Solutions:**
1. Wait for node to sync (check status endpoint)
2. Use a different RPC endpoint
3. Check latest block height vs your transaction height

### Development Environment Issues

#### Problem: SDK installation fails
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Use specific SDK version:
   ```bash
   npm install @dytallix/sdk@1.0.0-testnet
   ```

3. Try with different Node.js version (18+ recommended)

#### Problem: TypeScript compilation errors
```
Error: Cannot find module '@dytallix/sdk'
```

**Solutions:**
1. Install type definitions:
   ```bash
   npm install --save-dev @types/node
   ```

2. Update tsconfig.json:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true
     }
   }
   ```

### Performance Issues

#### Problem: Slow query responses
```
Queries taking > 10 seconds to respond
```

**Solutions:**
1. Use pagination for large result sets:
   ```javascript
   const validators = await client.getValidators({
     pagination: {
       limit: 50,
       offset: 0
     }
   });
   ```

2. Cache frequently accessed data:
   ```javascript
   const cache = new Map();

   async function getCachedBalance(address) {
     if (cache.has(address)) {
       return cache.get(address);
     }
     const balance = await client.getBalance(address);
     cache.set(address, balance);
     return balance;
   }
   ```

3. Use WebSocket subscriptions for real-time data instead of polling

## Debugging Tools

### Enable Debug Logging

```javascript
// JavaScript/TypeScript
const client = new DytallixClient({
  rpcUrl: 'http://rpc.dytallix.com:26657',
  apiUrl: 'http://api.dytallix.com:1317',
  chainId: 'dytallix-testnet-1',
  debug: true
});

// Python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Network Diagnostics

```bash
# Check node status
curl http://rpc.dytallix.com:26657/status | jq

# Check latest block
curl http://rpc.dytallix.com:26657/block | jq '.result.block.header'

# Check validators
curl http://api.dytallix.com:1317/cosmos/staking/v1beta1/validators | jq

# Check network info
curl http://rpc.dytallix.com:26657/net_info | jq
```

### Transaction Debugging

```javascript
// Get transaction details
const txDetails = await client.getTx(txHash);
console.log('Transaction details:', JSON.stringify(txDetails, null, 2));

// Check account info
const account = await client.getAccount(address);
console.log('Account:', account);

// Simulate transaction before sending
const simulation = await client.simulate({
  msgs: [sendMsg],
  fee: estimatedFee
});
console.log('Gas estimate:', simulation.gasUsed);
```

### Contract Debugging

```javascript
// Query contract state
const contractInfo = await client.getContract(contractAddress);
console.log('Contract info:', contractInfo);

// Check contract history
const contractHistory = await client.getContractHistory(contractAddress);
console.log('Contract history:', contractHistory);

// Dry run contract execution
try {
  const result = await client.queryContract({
    contract: contractAddress,
    msg: executionMsg
  });
  console.log('Query result:', result);
} catch (error) {
  console.error('Query failed:', error.message);
}
```

## Error Codes Reference

| Code | Error Type | Description | Solution |
|------|------------|-------------|----------|
| 2 | Unknown Request | Invalid API endpoint | Check endpoint URL |
| 4 | Insufficient Funds | Account balance too low | Get tokens from faucet |
| 5 | Unauthorized | Invalid signature/permissions | Check signature algorithm |
| 11 | Out of Gas | Transaction exceeded gas limit | Increase gas limit |
| 13 | Insufficient Fee | Fee too low for gas | Increase fee amount |
| 19 | Tx in Mempool | Duplicate transaction | Wait or use new sequence |
| 32 | Wrong Sequence | Account sequence mismatch | Refresh account info |

## Getting Help

### Before Asking for Help

1. **Check this troubleshooting guide** for common solutions
2. **Search existing issues** on GitHub
3. **Enable debug logging** to get detailed error information
4. **Test with a minimal example** to isolate the issue
5. **Gather relevant information**: error messages, transaction hashes, addresses

### How to Report Issues

When reporting issues, include:

1. **Environment details**:
   - Operating system
   - Node.js/Python/Go version
   - SDK version
   - Network (testnet)

2. **Reproducible example**:
   ```javascript
   // Minimal code that reproduces the issue
   const client = new DytallixClient({...});
   const result = await client.someMethod(); // Fails here
   ```

3. **Error messages** (full stack trace if available)

4. **Expected vs actual behavior**

5. **Steps to reproduce**

### Support Channels

- **GitHub Issues**: [github.com/HisMadRealm/dytallix/issues](https://github.com/HisMadRealm/dytallix/issues)
- **Discord**: [discord.gg/fw34A8bK](https://discord.gg/fw34A8bK) (#testnet-support channel)
- **Email**: [hello@dytallix.com](mailto:hello@dytallix.com)

### Community Resources

- **Developer Discord**: Get real-time help from other developers
- **GitHub Discussions**: For questions and feature requests
- **Documentation**: [Complete API reference](./api_reference.md)
- **Integration Guide**: [Step-by-step integration](./integration_guide.md)

---

*Keep this guide handy while developing with Dytallix testnet!*
