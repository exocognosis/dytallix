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
