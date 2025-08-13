# E2E Staging Tests

Create `.env.staging` in project root (not committed):

```
VITE_LCD_HTTP_URL=https://<staging>:1317
VITE_RPC_HTTP_URL=https://<staging>:26657
VITE_RPC_WS_URL=wss://<staging>:26657/websocket
VITE_CHAIN_ID=dytallix-testnet-vX
FAUCET_URL=https://<faucet-endpoint>
TEST_MNEMONIC="<12 or 24 word test mnemonic>"
```

Run:

```
npm install
npm run e2e:staging
```

Test flow:
1. Query initial balances
2. Request faucet funds
3. Wait for balance increase
4. Broadcast self-transfer
5. Subscribe WS for Tx + NewBlock
6. Assert tx success & final balances

---

## Env Setup for Wallet Test
The wallet test now only skips if `TEST_MNEMONIC` is entirely missing. Export the required variables (adjust values to your environment):

```bash
export TEST_MNEMONIC="<24 words here>"
export BECH32_PREFIX=docker
export APP_URL=http://localhost:5173
export VITE_LCD_HTTP_URL=http://178.156.187.81:1317
export VITE_RPC_HTTP_URL=http://178.156.187.81:26657
export VITE_RPC_WS_URL=ws://178.156.187.81:26657/websocket
export FAUCET_URL=http://localhost:8787/api/faucet
export VITE_CHAIN_ID=dockerchain
export STATUS_BASE=http://localhost:8787/api/status
```

Run just the wallet spec:

```bash
npx playwright test --config=e2e/playwright.config.ts e2e/specs/wallet.e2e.spec.ts
```
