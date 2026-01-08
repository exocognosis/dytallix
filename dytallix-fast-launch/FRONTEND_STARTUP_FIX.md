# Frontend Blockchain Startup Fix

## Problem

When the wallet page initially loads, users see this error in the browser console:
```
[Error] Failed to load resource: Could not connect to the server. (stats, line 0)
```

## Root Cause

The frontend JavaScript (`app.js`) immediately tries to fetch blockchain statistics from `/api/stats` when the page loads. However, the Rust blockchain node takes several seconds to fully start up and begin listening on port 3003. During this startup window, the fetch request fails because the server isn't ready yet.

**Service Startup Timeline:**
1. `start-all-services.sh` launches the blockchain node
2. Script waits 3 seconds and checks if the process is alive
3. Script considers blockchain "started" and continues to other services
4. Frontend loads and immediately calls `BlockchainData.init()` → `fetchStats()`
5. **Problem:** Blockchain node may still be initializing its HTTP server
6. Fetch fails with connection error

## Solution Implemented

### 1. Initial Delay (3 seconds)

**The Key Fix:** Instead of fetching immediately when the page loads, we now wait 3 seconds before the first fetch attempt. This gives the blockchain node time to initialize its HTTP server.

```javascript
init: function(endpoint) {
  if (endpoint) {
    this.apiEndpoint = endpoint;
  }
  // Delay initial fetch to give blockchain time to start (3 seconds)
  // This prevents console errors during service startup
  setTimeout(() => {
    this.updateWalletStatsWithRetry();
  }, 3000);
  // ...
}
```

**Why this works:**
- Browser network errors only appear for actual failed requests
- By waiting 3 seconds, the blockchain node is usually ready
- No failed requests = no red console errors
- Combined with retry logic below for cases where node takes longer

### 2. Correct Port Configuration

Fixed the default blockchain endpoint from `8545` to `3003`:
```javascript
apiEndpoint: 'http://localhost:3003', // Dytallix blockchain node port
```

### 3. Retry Logic with Exponential Backoff (`app.js`)

**Changes to `BlockchainData` object:**

- Added state tracking:
  - `retryCount`: Tracks how many retry attempts have been made
  - `maxRetries`: Maximum of 5 retry attempts
  - `retryDelay`: Initial delay of 2 seconds
  - `isBlockchainReady`: Flag to track when blockchain is accessible

- **Silent retries during startup:**
  - `fetchStats()` now accepts a `silent` parameter
  - During initial retries, errors are suppressed to avoid console spam
  - Only logs warnings after blockchain is confirmed ready

- **Exponential backoff:**
  - Retry delays: 2s → 3s → 4.5s → 6.75s → 10.125s
  - Formula: `delay = retryDelay * Math.pow(1.5, retryCount - 1)`
  - Gives blockchain plenty of time to start up

- **User-friendly feedback:**
  ```javascript
  console.log(`Blockchain node not ready yet, retrying in ${delay}s... (attempt ${retryCount}/${maxRetries})`);
  ```

- **Graceful degradation:**
  - If blockchain never comes online, falls back to mock stats
  - Shows informational message instead of error
  - Page remains functional with fallback data

### 2. Request Timeout (`app.js`)

Added 5-second timeout to prevent hanging requests:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

const response = await fetch(`${this.apiEndpoint}/api/stats`, {
  signal: controller.signal
});
clearTimeout(timeoutId);
```

### 3. Smart Polling (`app.js`)

The 30-second polling interval now only runs after blockchain is confirmed ready:
```javascript
setInterval(() => {
  if (this.isBlockchainReady) {
    this.updateWalletStats(); // Normal mode with error logging
  }
}, 30000);
```

### 4. Wallet Balance Refresh with Retry (`pqc-wallet.js`)

**Similar improvements to wallet-specific functionality:**

- Added `blockchainReady` flag and retry counter
- `refreshBalancesWithRetry()` method for initial wallet load
- Silent retries during startup
- Exponential backoff matching `app.js` behavior
- Only shows errors after blockchain is confirmed ready

**Changes to `startBalanceRefresh()`:**
```javascript
startBalanceRefresh: function() {
  if (balanceRefreshInterval) {
    clearInterval(balanceRefreshInterval);
  }
  
  // Initial refresh with retry logic
  this.refreshBalancesWithRetry();
  
  // Subsequent refreshes every 5 seconds (only after blockchain is ready)
  balanceRefreshInterval = setInterval(() => {
    if (blockchainReady) {
      this.refreshBalances();
    }
  }, 5000);
}
```

## Explorer Integration Fix

### Problem

The blockchain explorer (`build/explorer.html`) was showing only static mock data. Transactions sent from the wallet were not appearing on the explorer because:

1. Explorer HTML had hardcoded sample blocks and transactions
2. No JavaScript was fetching real blockchain data
3. Explorer was completely disconnected from the blockchain node

### Solution

Created `shared-assets/explorer.js` that:

1. **Fetches real blockchain data:**
   - Blocks from `/blocks?limit=10`
   - Transactions from `/transactions?limit=10`
   - Auto-refreshes every 5 seconds

2. **Displays live data:**
   - Recent blocks table with transaction count, size, validator
   - Recent transactions list with hash, from/to addresses, amounts
   - Time-ago formatting for timestamps
   - Status badges (confirmed/pending)

3. **Graceful startup:**
   - 3-second initial delay (same as wallet/app.js)
   - Silent retries until blockchain is ready
   - Shows "No transactions found" message when blockchain is empty
   - Updates hero metrics with latest block info

4. **Data formatting:**
   - Truncates addresses: `dyt1abc...`
   - Truncates tx hashes: `0x1234...abcd`
   - Converts amounts from micro-units (udgt) to DGT
   - Human-readable timestamps ("2 minutes ago")

### Files Modified

1. **`shared-assets/explorer.js`** (NEW)
   - Complete explorer data fetcher and display logic
   - ~250 lines of production-ready code

2. **`build/explorer.html`**
   - Added `<script src="../shared-assets/explorer.js"></script>`
   - Removed mock data update script

### Testing

```bash
# Open explorer
open http://localhost:3000/build/explorer.html

# Send transaction from wallet
# Transaction should appear in explorer within 5 seconds

# Check transaction endpoint directly
curl 'http://localhost:3003/transactions?limit=5'
```

### API Format

**Blocks response:**
```json
{
  "blocks": [
    {
      "height": 48626,
      "hash": "0x224f9...",
      "timestamp": 1763078090,
      "txs": [],
      "asset_hashes": []
    }
  ]
}
```

**Transactions response:**
```json
{
  "total": 4,
  "transactions": [
    {
      "hash": "0xf8894e...",
      "from": "dyte0oppa...",
      "to": "dytduo3p9...",
      "amount": "5000000",
      "denom": "udgt",
      "fee": "1000",
      "nonce": 2,
      "status": "confirmed",
      "timestamp": 1763077836,
      "block_height": 48609
    }
  ]
}
```

---

## User Experience Before & After

### Before Fix ❌
- Browser console shows scary red error on page load
- Error persists even though page works fine
- No indication that this is temporary/expected
- Looks like a broken application

### After Fix ✅
- No error on initial page load (silent retries)
- Friendly informational messages in console:
  ```
  Blockchain node not ready yet, retrying in 2s... (attempt 1/5)
  Blockchain node not ready yet, retrying in 3s... (attempt 2/5)
  ✅ Blockchain connected on attempt 3
  ```
- Graceful fallback if blockchain never starts
- Professional, production-ready UX

## Testing the Fix

1. **Start services:**
   ```bash
   ./start-all-services.sh
   ```

2. **Open wallet immediately:**
   ```bash
   open http://localhost:3000/wallet.html
   ```

3. **Expected behavior:**
   - No red errors in console
   - Informational retry messages appear
   - Once blockchain is ready: "Blockchain connected" message
   - Stats populate automatically once available
   - Page is fully functional throughout

4. **Test fallback (optional):**
   - Kill blockchain node while page is open
   - Should see fallback stats appear
   - Page remains usable

## Configuration

**Retry settings (can be adjusted if needed):**
```javascript
// In app.js and pqc-wallet.js
maxRetries: 5           // Total retry attempts
retryDelay: 2000       // Initial delay in ms
backoffFactor: 1.5     // Exponential multiplier
requestTimeout: 5000   // Max time per request
```

**Current total wait time:** ~27 seconds maximum before giving up

## Production Considerations

- **Health check endpoint:** Consider adding `/health` endpoint to blockchain that responds immediately
- **Service orchestration:** Could use proper health checks in Docker/Kubernetes
- **Error monitoring:** Track how often retries are needed in production
- **User feedback:** Could show loading spinner during initial connection

## Related Documentation

- `WALLET_BLOCKCHAIN_INTEGRATION.md` - Overall wallet/blockchain integration
- `start-all-services.sh` - Service orchestration script
- `node/src/rpc/mod.rs` - Blockchain RPC endpoints including `/api/stats`

---

**Status:** ✅ Implemented and tested
**Date:** November 13, 2025
**Impact:** Eliminates console errors on wallet page load, provides professional UX during blockchain startup
