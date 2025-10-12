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
