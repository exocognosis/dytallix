# Dytallix Testnet Integration Guide

This guide helps developers integrate with the Dytallix testnet for building quantum-resistant applications.

## Prerequisites

- Node.js 18+ or Python 3.8+ or Go 1.19+
- Basic understanding of blockchain concepts
- Familiarity with post-quantum cryptography (helpful but not required)

## Quick Start

### 1. Get Test Tokens

First, you'll need test DGT tokens:

1. Visit [faucet.dytallix.com](http://faucet.dytallix.com)
2. Enter your Dytallix address
3. Receive 1000 DGT tokens (limit: once per 24 hours)

### 2. Set Up Your Development Environment

#### JavaScript/TypeScript

```bash
# Create new project
mkdir my-dytallix-app
cd my-dytallix-app
npm init -y

# Install Dytallix SDK
npm install @dytallix/sdk

# Install additional dependencies
npm install @cosmjs/proto-signing @cosmjs/stargate
```

#### Python

```bash
# Create virtual environment
python -m venv dytallix-env
source dytallix-env/bin/activate  # Linux/Mac
# dytallix-env\Scripts\activate  # Windows

# Install Dytallix SDK
pip install dytallix-python
```

#### Go

```bash
# Initialize Go module
go mod init my-dytallix-app

# Get Dytallix SDK
go get github.com/HisMadRealm/dytallix/sdk/go
```

### 3. Connect to Testnet

#### JavaScript Example

```javascript
import { DytallixClient, Wallet } from '@dytallix/sdk';

// Create client
const client = new DytallixClient({
  rpcUrl: 'http://rpc.dytallix.com:26657',
  apiUrl: 'http://api.dytallix.com:1317',
  chainId: 'dytallix-testnet-1'
});

// Create or restore wallet
const wallet = await Wallet.create({
  algorithm: 'dilithium5' // Post-quantum signature algorithm
});

// Or restore from mnemonic
const restoredWallet = await Wallet.fromMnemonic(
  'abandon abandon abandon...', // Your mnemonic
  { algorithm: 'dilithium5' }
);

// Get address
const address = wallet.getAddress();
console.log('Address:', address);

// Check balance
const balance = await client.getBalance(address);
console.log('Balance:', balance);
```

#### Python Example

```python
from dytallix import DytallixClient, Wallet

# Create client
client = DytallixClient(
    rpc_url="http://rpc.dytallix.com:26657",
    api_url="http://api.dytallix.com:1317",
    chain_id="dytallix-testnet-1"
)

# Create wallet
wallet = Wallet.create(algorithm="dilithium5")

# Or restore from mnemonic
# wallet = Wallet.from_mnemonic("abandon abandon abandon...", algorithm="dilithium5")

# Get address
address = wallet.get_address()
print(f"Address: {address}")

# Check balance
balance = client.get_balance(address)
print(f"Balance: {balance}")
```

## Core Operations

### Sending Transactions

#### Simple Transfer

```javascript
const transferTx = await client.sendTokens({
  from: wallet.getAddress(),
  to: 'dytallix1recipient...',
  amount: '1000000', // 1 DGT (in micro-DGT)
  denom: 'udgt',
  fee: {
    amount: [{ denom: 'udgt', amount: '1250' }],
    gas: '50000'
  },
  memo: 'Test transfer'
});

console.log('Transaction hash:', transferTx.transactionHash);
```

#### Multi-Send Transaction

```javascript
const multiSendTx = await client.multiSend({
  from: wallet.getAddress(),
  outputs: [
    { address: 'dytallix1addr1...', amount: '500000', denom: 'udgt' },
    { address: 'dytallix1addr2...', amount: '300000', denom: 'udgt' },
    { address: 'dytallix1addr3...', amount: '200000', denom: 'udgt' }
  ],
  fee: {
    amount: [{ denom: 'udgt', amount: '2500' }],
    gas: '100000'
  }
});
```

### Staking Operations

#### Delegate to Validator

```javascript
const delegateTx = await client.delegate({
  delegator: wallet.getAddress(),
  validator: 'dystallixvaloper1...',
  amount: '10000000', // 10 DGT
  denom: 'udgt',
  fee: {
    amount: [{ denom: 'udgt', amount: '2500' }],
    gas: '75000'
  }
});
```

#### Undelegate

```javascript
const undelegateTx = await client.undelegate({
  delegator: wallet.getAddress(),
  validator: 'dystallixvaloper1...',
  amount: '5000000', // 5 DGT
  denom: 'udgt',
  fee: {
    amount: [{ denom: 'udgt', amount: '2500' }],
    gas: '75000'
  }
});
```

#### Redelegate

```javascript
const redelegateTx = await client.redelegate({
  delegator: wallet.getAddress(),
  validatorSrc: 'dystallixvaloper1...',
  validatorDst: 'dystallixvaloper2...',
  amount: '3000000', // 3 DGT
  denom: 'udgt',
  fee: {
    amount: [{ denom: 'udgt', amount: '2500' }],
    gas: '75000'
  }
});
```

## Smart Contract Development

### Deploy WASM Contract

```javascript
import fs from 'fs';

// Read compiled WASM contract
const wasmCode = fs.readFileSync('./contract.wasm');

// Deploy contract
const deployTx = await client.instantiateContract({
  sender: wallet.getAddress(),
  codeId: 1, // After uploading code
  msg: {
    name: "My Quantum Safe Contract",
    symbol: "QSC",
    decimals: 6,
    initial_balances: [
      { address: wallet.getAddress(), amount: "1000000000" }
    ]
  },
  label: "quantum-safe-token",
  funds: [],
  fee: {
    amount: [{ denom: 'udgt', amount: '15000' }],
    gas: '300000'
  }
});

const contractAddress = deployTx.contractAddress;
console.log('Contract deployed at:', contractAddress);
```

### Execute Contract

```javascript
const executeTx = await client.executeContract({
  sender: wallet.getAddress(),
  contract: contractAddress,
  msg: {
    transfer: {
      recipient: 'dytallix1recipient...',
      amount: '1000000'
    }
  },
  funds: [],
  fee: {
    amount: [{ denom: 'udgt', amount: '5000' }],
    gas: '100000'
  }
});
```

### Query Contract

```javascript
const queryResult = await client.queryContract({
  contract: contractAddress,
  msg: {
    balance: {
      address: wallet.getAddress()
    }
  }
});

console.log('Token balance:', queryResult.balance);
```

## Post-Quantum Cryptography Integration

### Signature Algorithms

Dytallix supports multiple PQC algorithms:

```javascript
// Dilithium5 (recommended for most use cases)
const dilithiumWallet = await Wallet.create({ algorithm: 'dilithium5' });

// Falcon512 (smaller signatures, faster verification)
const falconWallet = await Wallet.create({ algorithm: 'falcon512' });

// SPHINCS+ (hash-based, highest security)
const sphincsWallet = await Wallet.create({ algorithm: 'sphincs' });
```

### Custom Message Signing

```javascript
// Sign arbitrary message
const message = "Hello, Quantum-Safe World!";
const signature = await wallet.signMessage(message);

// Verify signature
const isValid = await client.verifySignature({
  message,
  signature,
  publicKey: wallet.getPublicKey()
});

console.log('Signature valid:', isValid);
```

## Cross-Chain Operations

### IBC Transfer

```javascript
const ibcTransfer = await client.ibcTransfer({
  sender: wallet.getAddress(),
  receiver: 'cosmos1recipient...',
  token: {
    denom: 'udgt',
    amount: '1000000'
  },
  sourcePort: 'transfer',
  sourceChannel: 'channel-0',
  timeoutHeight: {
    revisionNumber: 1,
    revisionHeight: 1000000
  },
  fee: {
    amount: [{ denom: 'udgt', amount: '3750' }],
    gas: '150000'
  }
});
```

## Error Handling

### Common Error Patterns

```javascript
try {
  const tx = await client.sendTokens({...});
  console.log('Success:', tx.transactionHash);
} catch (error) {
  if (error.code === 4) {
    console.error('Insufficient funds');
  } else if (error.code === 5) {
    console.error('Invalid signature');
  } else if (error.code === 11) {
    console.error('Out of gas');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

### Retry Logic

```javascript
async function sendWithRetry(txParams, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.sendTokens(txParams);
    } catch (error) {
      if (error.code === 19 && i < maxRetries - 1) {
        // Transaction already in mempool, wait and retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
}
```

## Real-Time Updates

### WebSocket Subscriptions

```javascript
const ws = new WebSocket('ws://rpc.dytallix.com:26657/websocket');

// Subscribe to new blocks
ws.onopen = () => {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'subscribe',
    id: 1,
    params: {
      query: "tm.event='NewBlock'"
    }
  }));
};

// Handle messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.result?.events) {
    console.log('New block:', data.result.data.value.block.header.height);
  }
};

// Subscribe to transactions for specific address
ws.send(JSON.stringify({
  jsonrpc: '2.0',
  method: 'subscribe',
  id: 2,
  params: {
    query: `tm.event='Tx' AND transfer.recipient='${wallet.getAddress()}'`
  }
}));
```

## Testing Patterns

### Unit Testing

```javascript
import { describe, it, expect } from 'vitest';

describe('Dytallix Integration', () => {
  let client, wallet;

  beforeEach(async () => {
    client = new DytallixClient({
      rpcUrl: 'http://rpc.dytallix.com:26657',
      apiUrl: 'http://api.dytallix.com:1317',
      chainId: 'dytallix-testnet-1'
    });
    
    wallet = await Wallet.create({ algorithm: 'dilithium5' });
  });

  it('should create wallet with PQC algorithm', () => {
    expect(wallet.getAlgorithm()).toBe('dilithium5');
    expect(wallet.getAddress()).toMatch(/^dytallix1[a-z0-9]{38}$/);
  });

  it('should send transaction successfully', async () => {
    // Ensure wallet has funds first
    const balance = await client.getBalance(wallet.getAddress());
    expect(parseInt(balance.amount)).toBeGreaterThan(1000000);

    const tx = await client.sendTokens({
      from: wallet.getAddress(),
      to: 'dytallix1test...',
      amount: '1000',
      denom: 'udgt',
      fee: { amount: [{ denom: 'udgt', amount: '1250' }], gas: '50000' }
    });

    expect(tx.transactionHash).toBeDefined();
    expect(tx.code).toBe(0); // Success
  });
});
```

### Integration Testing

```javascript
describe('End-to-End Workflow', () => {
  it('should complete full DeFi workflow', async () => {
    // 1. Get test tokens from faucet
    const faucetResponse = await fetch('http://faucet.dytallix.com/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: wallet.getAddress() })
    });
    expect(faucetResponse.status).toBe(200);

    // 2. Wait for tokens to arrive
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 3. Delegate to validator
    const delegateTx = await client.delegate({
      delegator: wallet.getAddress(),
      validator: 'dystallixvaloper1...',
      amount: '100000000',
      denom: 'udgt'
    });
    expect(delegateTx.code).toBe(0);

    // 4. Deploy smart contract
    const contractTx = await client.instantiateContract({
      sender: wallet.getAddress(),
      codeId: 1,
      msg: { name: "Test Token", symbol: "TEST" },
      label: "test-contract"
    });
    expect(contractTx.code).toBe(0);

    // 5. Interact with contract
    const executeTx = await client.executeContract({
      sender: wallet.getAddress(),
      contract: contractTx.contractAddress,
      msg: { mint: { recipient: wallet.getAddress(), amount: "1000000" } }
    });
    expect(executeTx.code).toBe(0);
  });
});
```

## Performance Optimization

### Transaction Batching

```javascript
// Batch multiple operations
const batchTx = await client.createTransaction({
  msgs: [
    client.createSendMsg({
      from: wallet.getAddress(),
      to: 'dytallix1addr1...',
      amount: '1000000',
      denom: 'udgt'
    }),
    client.createDelegateMsg({
      delegator: wallet.getAddress(),
      validator: 'dystallixvaloper1...',
      amount: '5000000',
      denom: 'udgt'
    }),
    client.createExecuteContractMsg({
      sender: wallet.getAddress(),
      contract: 'dytallix1contract...',
      msg: { transfer: { recipient: 'dytallix1addr2...', amount: '500000' } }
    })
  ],
  fee: {
    amount: [{ denom: 'udgt', amount: '10000' }],
    gas: '300000'
  }
});

const result = await client.broadcast(batchTx);
```

### Gas Estimation

```javascript
// Estimate gas before sending
const gasEstimate = await client.estimateGas({
  msgs: [sendMsg],
  feePayer: wallet.getAddress()
});

// Add 20% buffer
const gasLimit = Math.ceil(gasEstimate * 1.2);

const tx = await client.sendTokens({
  ...txParams,
  fee: {
    amount: [{ denom: 'udgt', amount: '1250' }],
    gas: gasLimit.toString()
  }
});
```

## Best Practices

### Security

1. **Never hardcode private keys** in your application
2. **Use environment variables** for sensitive configuration
3. **Validate all inputs** before creating transactions
4. **Implement proper error handling** for network failures
5. **Use HTTPS/WSS** in production environments

### Performance

1. **Cache query results** when appropriate
2. **Use WebSockets** for real-time updates
3. **Batch transactions** when possible
4. **Implement retry logic** with exponential backoff
5. **Monitor gas usage** and optimize accordingly

### Development

1. **Test on testnet first** before mainnet deployment
2. **Use version control** for your contracts and applications
3. **Document your integration** thoroughly
4. **Monitor testnet announcements** for breaking changes
5. **Join the Discord community** for support and updates

## Migration from Other Chains

### From Ethereum

```javascript
// Ethereum-style contract interaction
const ethereum = {
  contract: new ethers.Contract(address, abi, signer),
  transfer: async (to, amount) => {
    return await contract.transfer(to, amount);
  }
};

// Dytallix equivalent
const dytallix = {
  contract: contractAddress,
  transfer: async (to, amount) => {
    return await client.executeContract({
      sender: wallet.getAddress(),
      contract: contractAddress,
      msg: {
        transfer: { recipient: to, amount: amount.toString() }
      }
    });
  }
};
```

### From Cosmos Hub

```javascript
// Most Cosmos SDK transactions work similarly
// Main difference: PQC signatures instead of secp256k1

// Cosmos Hub
const cosmosWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);

// Dytallix
const dytallixWallet = await Wallet.fromMnemonic(mnemonic, { 
  algorithm: 'dilithium5' 
});
```

## Troubleshooting

### Common Issues

1. **"Invalid signature" errors**: Ensure you're using PQC algorithms
2. **"Insufficient funds"**: Check balance and account for fees
3. **"Transaction timeout"**: Increase timeout or check network status
4. **"Invalid chain ID"**: Verify chain-id is "dytallix-testnet-1"
5. **"Node not responding"**: Check RPC endpoint availability

### Debug Mode

```javascript
const client = new DytallixClient({
  rpcUrl: 'http://rpc.dytallix.com:26657',
  apiUrl: 'http://api.dytallix.com:1317',
  chainId: 'dytallix-testnet-1',
  debug: true // Enable debug logging
});
```

## Support Resources

- **Documentation**: [github.com/HisMadRealm/dytallix/tree/main/docs](https://github.com/HisMadRealm/dytallix/tree/main/docs)
- **Discord**: [discord.gg/fw34A8bK](https://discord.gg/fw34A8bK)
- **Email**: [hello@dytallix.com](mailto:hello@dytallix.com)
- **GitHub Issues**: [github.com/HisMadRealm/dytallix/issues](https://github.com/HisMadRealm/dytallix/issues)

---

*Happy building with Dytallix! 🚀*
