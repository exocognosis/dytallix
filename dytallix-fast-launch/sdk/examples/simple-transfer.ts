/**
 * Simple Token Transfer Example
 * 
 * This example shows how to:
 * 1. Connect to Dytallix testnet
 * 2. Generate a PQC wallet
 * 3. Check balance
 * 4. Send tokens
 */

import { DytallixClient, PQCWallet } from '@dytallix/sdk';

async function main() {
  // 1. Connect to Dytallix testnet
  const client = new DytallixClient({
    rpcUrl: 'https://rpc.testnet.dytallix.network',
    chainId: 'dyt-testnet-1'
  });

  console.log('Connected to Dytallix testnet');

  // 2. Generate a new PQC wallet (or import existing)
  const wallet = await PQCWallet.generate('ML-DSA');
  console.log('Wallet address:', wallet.address);
  console.log('Algorithm:', wallet.algorithm);

  // 3. Check wallet balance
  const account = await client.getAccount(wallet.address);
  console.log('DGT Balance:', account.balances.DGT);
  console.log('DRT Balance:', account.balances.DRT);
  console.log('Nonce:', account.nonce);

  // 4. Send tokens (requires balance)
  if (account.balances.DRT >= 10) {
    const tx = await client.sendTokens({
      from: wallet,
      to: 'pqc1ml...',  // Replace with recipient address
      amount: 10,
      denom: 'DRT',
      memo: 'Test payment'
    });

    console.log('Transaction submitted:', tx.hash);

    // Wait for confirmation
    const receipt = await client.waitForTransaction(tx.hash);
    console.log('Transaction confirmed in block:', receipt.block);
    console.log('Status:', receipt.status);
  } else {
    console.log('Insufficient DRT balance. Visit the faucet to get test tokens.');
  }
}

main().catch(console.error);
