# E2E Staging Tests

Create `.env.staging` in project root (not committed):

```
VITE_LCD_HTTP_URL=https://<staging>:1317
VITE_RPC_HTTP_URL=https://<staging>:26657
VITE_RPC_WS_URL=wss://<staging>:26657/websocket
VITE_CHAIN_ID=dytallix-testnet-vX
VITE_API_URL=https://<api-endpoint>
# VITE_FAUCET_URL=https://<faucet-endpoint>  # Optional override
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
