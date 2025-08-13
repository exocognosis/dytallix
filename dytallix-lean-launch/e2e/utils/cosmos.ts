import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient, StargateClient, calculateFee, coins } from '@cosmjs/stargate';
import { GasPrice } from '@cosmjs/stargate';

// Polyfill WebSocket for Node CI environments (Playwright test runner) if not provided natively.
// Node 20 may not yet expose a stable global WebSocket in all builds; ensure availability.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (typeof (globalThis as any).WebSocket === 'undefined') {
  // Dynamically import to avoid impacting browser bundle tree-shaking.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WS = require('ws');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.WebSocket = WS;
  } catch (e) {
    // If ws not installed, tests depending on websocket will fail explicitly later.
    console.warn('WebSocket polyfill not installed (ws). Install dev dependency "ws" for E2E WS tests.');
  }
}

const lcd = process.env.VITE_LCD_HTTP_URL!; // REST (LCD)
const rpc = process.env.VITE_RPC_HTTP_URL!; // HTTP RPC
const rpcWs = process.env.VITE_RPC_WS_URL!; // WS endpoint
const chainId = process.env.VITE_CHAIN_ID!;

export interface TestAccount {
  mnemonic: string;
  address: string;
}

export async function buildWallet(mnemonic: string) {
  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'dyt' });
}

export async function getBalances(address: string) {
  const c = await StargateClient.connect(rpc);
  return c.getAllBalances(address);
}

export async function getChainId() {
  const c = await StargateClient.connect(rpc);
  return c.getChainId();
}

export async function getLatestHeight() {
  const lcdEnv = process.env.VITE_LCD_HTTP_URL || process.env.LCD_HTTP_URL;
  const statusBase = process.env.STATUS_BASE || 'http://localhost:8787/api/status';
  const rpcEnv = process.env.VITE_RPC_HTTP_URL || process.env.RPC_HTTP_URL;

  if (lcdEnv) {
    try {
      const res = await fetch(`${lcdEnv}/cosmos/base/tendermint/v1beta1/blocks/latest`);
      if (res.ok) {
        const data = await res.json();
        const h = Number(data?.block?.header?.height);
        if (Number.isFinite(h) && h > 0) return h;
      }
    } catch {}
  }

  try {
    const res = await fetch(`${statusBase}/height`);
    if (res.ok) {
      const data = await res.json();
      const h = Number(data?.height);
      if (Number.isFinite(h) && h > 0) return h;
    }
  } catch {}

  if (rpcEnv) {
    try {
      const res = await fetch(`${rpcEnv}/status`);
      if (res.ok) {
        const data = await res.json();
        const h = Number(data?.result?.sync_info?.latest_block_height);
        if (Number.isFinite(h) && h > 0) return h;
      }
    } catch {}
  }

  throw new Error('Failed to determine latest height from LCD, backend, or RPC');
}

export async function waitForHeight(target: number, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const h = await getLatestHeight();
    if (h >= target) return h;
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(`Timeout waiting for height ${target}`);
}

export async function sendTokens(mnemonic: string, recipient: string, amount: string) {
  const wallet = await buildWallet(mnemonic);
  const [account] = await wallet.getAccounts();
  const client = await SigningStargateClient.connectWithSigner(rpc, wallet, { gasPrice: GasPrice.fromString('0.025udrt') });
  const fee = calculateFee(80_000, GasPrice.fromString('0.025udrt'));
  const r = await client.sendTokens(account.address, recipient, coins(amount, 'udrt'), fee, 'e2e transfer');
  return r;
}

export async function waitForTx(hash: string, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  const norm = hash.startsWith('0x') ? hash : `0x${hash}`;
  while (Date.now() < end) {
    const res = await fetch(`${rpc}/tx?hash=${norm}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.tx_result) return data;
    }
    await new Promise(r => setTimeout(r, 2_000));
  }
  throw new Error('Timeout waiting for tx');
}

function backoff(attempt: number) {
  return Math.min(5000, 300 * Math.pow(2, attempt)) + Math.floor(Math.random() * 200);
}

export async function subscribeTxAndBlocks(txHash: string): Promise<{ sawTx: boolean; sawBlock: boolean; }> {
  const upper = txHash.replace(/^0x/, '').toUpperCase();
  let attempt = 0;
  let sawTx = false; let sawBlock = false;
  return new Promise((resolve, reject) => {
    const open = () => {
      // Defensive: if WebSocket still missing, short-circuit.
      if (typeof (globalThis as any).WebSocket === 'undefined') {
        console.error('WebSocket unavailable: cannot subscribe');
        return resolve({ sawTx, sawBlock });
      }
      const ws = new (globalThis as any).WebSocket(rpcWs);
      let keepAlive: any = null;
      ws.onopen = () => {
        attempt = 0;
        // ping every 20s if supported
        try { if (typeof ws.send === 'function') { keepAlive = setInterval(() => { try { ws.send('ping') } catch {} }, 20000) } } catch {}
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'subscribe', params: { query: `tm.event='Tx' AND tx.hash='${upper}'` } }));
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: '2', method: 'subscribe', params: { query: `tm.event='NewBlock'` } }));
      };
      ws.onmessage = (ev: any) => {
        try {
          const msg = JSON.parse(ev.data.toString());
          if (msg.result && msg.result.query?.includes('Tx')) sawTx = true;
          if (msg.result && msg.result.query?.includes('NewBlock')) sawBlock = true;
          if (sawTx && sawBlock) { clearInterval(keepAlive); ws.close(); resolve({ sawTx, sawBlock }); }
        } catch { /* ignore parse */ }
      };
      ws.onerror = () => { /* swallow and let close handle */ };
      ws.onclose = () => {
        clearInterval(keepAlive);
        if (sawTx && sawBlock) return;
        if (attempt >= 5) return resolve({ sawTx, sawBlock });
        const delay = backoff(attempt++);
        setTimeout(open, delay);
      };
    };
    open();
  });
}
