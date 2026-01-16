#!/bin/bash
# Prepare SDK files for GitHub repository

echo "📦 Preparing Dytallix SDK for GitHub Repository"
echo "================================================"
echo ""

SDK_DIR="/Users/rickglenn/dytallix/dytallix-fast-launch/sdk"
OUTPUT_DIR="/Users/rickglenn/dytallix/sdk-for-github"

# Create output directory
echo "Creating output directory..."
mkdir -p "$OUTPUT_DIR"

# Copy essential SDK files
echo "Copying SDK files..."
cp -r "$SDK_DIR/src" "$OUTPUT_DIR/"
cp "$SDK_DIR/package.json" "$OUTPUT_DIR/"
cp "$SDK_DIR/tsconfig.json" "$OUTPUT_DIR/"
cp "$SDK_DIR/README.md" "$OUTPUT_DIR/"

# Copy new documentation files
cp "$SDK_DIR/CHANGELOG.md" "$OUTPUT_DIR/"
cp "$SDK_DIR/CONTRIBUTING.md" "$OUTPUT_DIR/"
cp "$SDK_DIR/LICENSE" "$OUTPUT_DIR/"
cp "$SDK_DIR/.gitignore" "$OUTPUT_DIR/"

# Create examples directory
echo "Creating examples directory..."
mkdir -p "$OUTPUT_DIR/examples"

cat > "$OUTPUT_DIR/examples/basic-usage.js" << 'EOF'
// Basic usage example for Dytallix SDK
import { DytallixClient } from '@dytallix/sdk';

async function main() {
  // Connect to Dytallix testnet
  const client = new DytallixClient({
    rpcUrl: 'https://rpc.testnet.dytallix.network',
    chainId: 'dyt-testnet-1'
  });

  // Get node status
  const status = await client.getStatus();
  console.log('Connected to Dytallix');
  console.log('Block height:', status.block_height);
  console.log('Chain ID:', status.chain_id);

  // Query an account balance
  const address = 'dyt1...'; // Your address
  const balance = await client.getBalance(address);
  console.log('Balance:', balance);
}

main().catch(console.error);
EOF

cat > "$OUTPUT_DIR/examples/create-wallet.js" << 'EOF'
// Create a PQC wallet
import { PQCWallet } from '@dytallix/sdk';

async function main() {
  // Generate ML-DSA (Dilithium) wallet
  const wallet = await PQCWallet.generate('ML-DSA');
  
  console.log('Wallet created!');
  console.log('Address:', wallet.address);
  console.log('Algorithm:', wallet.algorithm);
  
  // Export keys for backup
  const publicKey = await wallet.getPublicKey();
  const privateKey = await wallet.exportPrivateKeyRaw();
  
  console.log('Public key length:', publicKey.length, 'bytes');
  console.log('Private key length:', privateKey.length, 'bytes');
  
  // IMPORTANT: Store private key securely!
  console.log('\n⚠️  Keep your private key safe and never share it!');
}

main().catch(console.error);
EOF

cat > "$OUTPUT_DIR/examples/send-transaction.js" << 'EOF'
// Send a transaction
import { DytallixClient, PQCWallet } from '@dytallix/sdk';

async function main() {
  // Connect to testnet
  const client = new DytallixClient({
    rpcUrl: 'https://rpc.testnet.dytallix.network',
    chainId: 'dyt-testnet-1'
  });

  // Load your wallet (in production, load securely from storage)
  const wallet = await PQCWallet.generate('ML-DSA');
  const senderAddress = await wallet.getAddress();

  // Transaction details
  const recipient = 'dyt1...recipient_address';
  const amount = 1000000n; // 1 DGT (assuming 6 decimals)
  
  // Send tokens
  const txHash = await client.sendTokens({
    from: senderAddress,
    to: recipient,
    amount: amount,
    tokenType: 'DGT',
    wallet: wallet
  });

  console.log('Transaction sent!');
  console.log('TX Hash:', txHash);
  console.log('View on explorer: https://explorer.dytallix.network/tx/' + txHash);
}

main().catch(console.error);
EOF

cat > "$OUTPUT_DIR/examples/typescript-usage.ts" << 'EOF'
// TypeScript usage example
import { DytallixClient, PQCWallet, type TransactionResponse } from '@dytallix/sdk';

async function demonstrateTypescript(): Promise<void> {
  // Client with full type safety
  const client = new DytallixClient({
    rpcUrl: 'https://rpc.testnet.dytallix.network',
    chainId: 'dyt-testnet-1'
  });

  // Type-safe wallet creation
  const wallet: PQCWallet = await PQCWallet.generate('ML-DSA');
  const address: string = await wallet.getAddress();

  // Type-safe API calls
  const balance = await client.getBalance(address);
  console.log(`Balance: ${balance.dgt} DGT, ${balance.drt} DRT`);

  // Strongly typed transaction response
  const tx: TransactionResponse = await client.sendTokens({
    from: address,
    to: 'dyt1...recipient',
    amount: 1000000n,
    tokenType: 'DGT',
    wallet: wallet
  });

  console.log('Transaction hash:', tx.hash);
  console.log('Block height:', tx.height);
}

demonstrateTypescript().catch(console.error);
EOF

echo "Creating README badge section..."
cat > "$OUTPUT_DIR/README-ADDITIONS.md" << 'EOF'
# Add these badges to the top of your README.md:

[![npm version](https://img.shields.io/npm/v/@dytallix/sdk.svg)](https://www.npmjs.com/package/@dytallix/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@dytallix/sdk.svg)](https://www.npmjs.com/package/@dytallix/sdk)
[![License](https://img.shields.io/npm/l/@dytallix/sdk.svg)](https://github.com/DytallixHQ/dytallix-sdk/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

# Add this to the bottom of README.md:

## 📄 License

Apache-2.0 - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## 💬 Support

- 🐛 [Report bugs](https://github.com/DytallixHQ/dytallix-sdk/issues)
- 💡 [Request features](https://github.com/DytallixHQ/dytallix-sdk/issues)
- 📖 [Documentation](https://github.com/DytallixHQ/dytallix-sdk)
- 💬 [Community Discord](#) (if available)
EOF

echo ""
echo "✅ SDK files prepared!"
echo ""
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Files created:"
echo "  ✅ src/ (source code)"
echo "  ✅ examples/ (usage examples)"
echo "  ✅ package.json"
echo "  ✅ tsconfig.json"
echo "  ✅ README.md"
echo "  ✅ CHANGELOG.md"
echo "  ✅ CONTRIBUTING.md"
echo "  ✅ LICENSE"
echo "  ✅ .gitignore"
echo ""
echo "Next steps:"
echo "1. Create your new GitHub repository"
echo "2. Clone it locally"
echo "3. Copy files from: $OUTPUT_DIR"
echo "4. Update package.json repository URL"
echo "5. Commit and push"
echo "6. Create v0.1.0 release on GitHub"
echo ""
echo "See SDK_REPO_SETUP.md for detailed instructions!"
