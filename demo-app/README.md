# Dytallix Demo App

A simple demonstration application showcasing the Dytallix blockchain SDK capabilities.

## Features

This demo app demonstrates:

- 🔐 **Quantum-Resistant Wallet Generation** - Create ML-DSA (PQC) wallets
- 🚰 **Faucet Integration** - Request testnet tokens automatically
- 💰 **Balance Queries** - Check DGT and DRT token balances
- 📝 **Smart Contract Interaction** - Call methods on deployed contracts
- ✍️ **Message Signing** - Sign and verify messages with PQC signatures

## Quick Start

```bash
# Install dependencies
npm install

# Run the demo
npm start
```

## What It Does

1. **Connects** to the Dytallix testnet
2. **Generates** a new quantum-resistant wallet
3. **Requests** tokens from the faucet
4. **Checks** the wallet balance
5. **Interacts** with a smart contract (counter example)
6. **Signs** and verifies a message

## Output Example

```
═══════════════════════════════════════
  Dytallix Demo App
  Post-Quantum Blockchain Demo
═══════════════════════════════════════

📡 Connecting to Dytallix testnet...
✅ Connected! Chain: dytallix-testnet-1

🔐 Generating quantum-resistant wallet...
✅ Wallet created: dyt1abc123...

🚰 Requesting tokens from faucet...
✅ Tokens received!
   DGT: 1
   DRT: 50

💰 Checking balance...
✅ Balance:
   DGT: 1
   DRT: 50

📝 Interacting with smart contract...
   Contract: 0x2bbeef9c81ba8009df511712ca59cdaef1dbfd58
   
   → Calling increment()...
   ✅ Counter: 1
   ⛽ Gas used: 25000

✍️  Signing a message...
✅ Message signed (3309 bytes)
✅ Signature verified: Valid ✓

═══════════════════════════════════════
  Demo Complete! 🎉
═══════════════════════════════════════
```

## Learn More

- **Website**: [www.dytallix.com](https://www.dytallix.com)
- **Discord**: [discord.gg/N8Q4A2KE](https://discord.gg/N8Q4A2KE)
- **GitHub**: [github.com/DytallixHQ/Dytallix](https://github.com/DytallixHQ/Dytallix)

## SDK Documentation

For full SDK documentation, see:
- [TypeScript SDK](../sdk/typescript/README.md)
- [Rust SDK](../sdk/rust/README.md)

## License

Apache-2.0
