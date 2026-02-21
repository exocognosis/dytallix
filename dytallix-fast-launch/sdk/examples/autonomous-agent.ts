import { createHash, randomBytes } from 'crypto';
import {
  AutonomousAgentKit,
  InMemoryAgentValueStore,
  IPQCProvider,
  KeyPair,
  PQCWallet
} from '../src';

/**
 * Demo-only provider so this example can run without @dytallix/pqc-wasm.
 * Replace with the production provider in real deployments.
 */
class DemoPqcProvider implements IPQCProvider {
  async generateKeypair(algorithm: string): Promise<KeyPair> {
    const seed = randomBytes(32).toString('hex');
    const publicKey = `pub_${seed}`;
    const secretKey = `sec_${seed}`;
    const address = `dyt${createHash('sha256').update(publicKey).digest('hex').slice(0, 38)}`;

    return {
      publicKey,
      secretKey,
      address,
      algorithm: algorithm as KeyPair['algorithm']
    };
  }

  async importKeystore(keystore: any): Promise<KeyPair> {
    return keystore;
  }

  async signTransaction(txObj: any, secretKey: string, publicKey: string): Promise<any> {
    const signature = createHash('sha256')
      .update(JSON.stringify(txObj) + secretKey + publicKey)
      .digest('hex');

    return {
      ...txObj,
      signature
    };
  }

  async exportKeystore(keypair: any): Promise<any> {
    return keypair;
  }
}

async function run() {
  PQCWallet.setProvider(new DemoPqcProvider());

  const agentKit = new AutonomousAgentKit({
    rpcUrl: process.env.DYTALLIX_RPC_URL || 'http://localhost:3001/blockchain',
    faucetUrl: process.env.DYTALLIX_FAUCET_URL || 'http://localhost:3001/faucet',
    chainId: process.env.DYTALLIX_CHAIN_ID || 'dyt-local-1'
  });

  const valueStore = new InMemoryAgentValueStore();

  const treasuryAgent = await agentKit.createAgent('treasury-agent', 'ML-DSA');
  const workerAgent = await agentKit.createAgent('worker-agent', 'SLH-DSA');

  console.log('Treasury:', treasuryAgent.wallet.address);
  console.log('Worker:', workerAgent.wallet.address);

  await agentKit.requestTokens(treasuryAgent, { dgtAmount: 2, drtAmount: 50 });

  const tx = await agentKit.transferValue(
    treasuryAgent,
    workerAgent.wallet.address,
    5,
    'DRT',
    'budget-allocation'
  );

  await agentKit.waitForSettlement(tx.hash, 45000);

  const treasurySnapshot = await agentKit.snapshot(treasuryAgent, valueStore);
  const workerSnapshot = await agentKit.snapshot(workerAgent, valueStore);

  console.log('Treasury snapshot:', treasurySnapshot);
  console.log('Worker snapshot:', workerSnapshot);
  console.log('Stored snapshots:', valueStore.list().length);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
