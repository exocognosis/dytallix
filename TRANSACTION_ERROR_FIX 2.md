# Transaction Error Fix - Insufficient Funds Issue

## Problem
Users were experiencing a **"Transaction failed: 422 - INSUFFICIENT_FUNDS"** error when trying to send tokens, even though the wallet UI displayed a balance (e.g., 100 DGT).

### Root Cause
The application had a **mismatch between display balance and actual blockchain balance**:

1. **LocalStorage Balance (Display)**: The faucet was updating `localStorage` to show token balances in the UI
2. **Blockchain Balance (Reality)**: The actual on-chain balance was 0 because:
   - The faucet's backend API call might have failed silently
   - The blockchain node wasn't properly crediting the account
   - There was no validation that the faucet actually succeeded

3. **Transaction Validation**: When submitting a transaction, the backend validates against the **real blockchain balance** (0), not the localStorage value (100), causing the transaction to fail.

### Error Message
```
Transaction failed: 422
{"available":0,"required":"5001000"}
INSUFFICIENT_FUNDS
Insufficient funds: required 5001000, available 0
```

This means:
- Required: 5,001,000 micro-units = 5.001 tokens (5 + 0.001 fee)
- Available: 0 micro-units = 0 tokens

## Solution Implemented

### 1. **Fetch Real Blockchain Balances**
Added `fetchBlockchainBalance()` function that:
- Queries the backend API (`/account/{address}`) for actual on-chain balances
- Converts micro-units (udgt/udrt) to regular units (DGT/DRT)
- Returns `null` if the blockchain is unreachable

### 2. **Balance Source Tracking**
Added `balanceSource` state to track whether balances are:
- `'blockchain'` - Live on-chain data ✅
- `'local'` - Cached localStorage data ⚠️

### 3. **Auto-Refresh with Fallback**
The balance display now:
- Tries to fetch blockchain balance first
- Falls back to localStorage if node is offline
- Auto-refreshes every 5 seconds
- Shows visual indicators:
  - 🟢 Green pulse dot = Live blockchain data
  - 🟡 Yellow dot = Cached/offline data

### 4. **Client-Side Validation**
Added pre-transaction balance validation:
```javascript
// Validate sufficient balance (including fee)
const fee = 0.001; // 1000 micro-units = 0.001 tokens
const requiredAmount = amountNum + fee;
const currentBalance = balances[txForm.denom] || 0;

if (currentBalance < requiredAmount) {
  throw new Error(
    `Insufficient balance: You need ${requiredAmount.toFixed(3)} ${txForm.denom} ` +
    `(${amountNum} + ${fee} fee), but you only have ${currentBalance} ${txForm.denom}. ` +
    `Please use the faucet to get test tokens first.`
  );
}
```

### 5. **Improved Error Messages**
Enhanced transaction error handling to:
- Parse backend error responses
- Detect "INSUFFICIENT_FUNDS" errors
- Show user-friendly messages with:
  - Required amount
  - Current balance
  - Actionable advice (use faucet)

### 6. **Visual Warning Banner**
Added a warning banner in the wallet UI when:
- Balance source is `'local'` (cached)
- Node is unreachable
- Balances may not be accurate

## User Experience Improvements

### Before Fix
- ❌ User sees balance but can't send
- ❌ Cryptic error message: "Transaction failed: 422"
- ❌ No indication that balance is cached vs real
- ❌ No guidance on how to fix the issue

### After Fix
- ✅ Balance shows live blockchain data with green indicator
- ✅ Warning shown if node is offline (yellow indicator)
- ✅ Clear error messages with exact amounts
- ✅ Pre-flight validation before submitting to blockchain
- ✅ Guidance to use faucet if insufficient funds
- ✅ Manual refresh button to re-check balances

## Testing Checklist

To verify the fix works:

1. **Create a new wallet**
   - Balance should show 0 DGT / 0 DRT
   - Should see green live indicator if node is running

2. **Use the faucet**
   - Request tokens (100 DGT or 1000 DRT)
   - Balance should update within 5 seconds
   - Should remain at 0 if faucet fails (shows real state)

3. **Try to send without funds**
   - Should see immediate validation error
   - Error message should be clear and actionable

4. **Send with sufficient funds**
   - Transaction should succeed
   - Balance should decrease after confirmation

5. **Test with node offline**
   - Should show yellow indicator
   - Should show warning banner
   - Should still display cached balance
   - Should prevent transactions with clear error

## Backend Requirements

For this fix to work properly, the backend must:

1. **Have `/account/{address}` endpoint** that returns:
```json
{
  "address": "dyt1...",
  "nonce": 0,
  "balances": {
    "udgt": 100000000,  // 100 DGT in micro-units
    "udrt": 1000000000  // 1000 DRT in micro-units
  }
}
```

2. **Have working `/dev/faucet` endpoint** that:
   - Credits tokens to on-chain accounts
   - Returns success/failure status
   - Actually updates blockchain state

3. **Validate transactions properly** with:
   - Balance checks
   - Clear error messages
   - HTTP 422 for insufficient funds

## Future Improvements

1. **Transaction History**: Show failed transactions with reasons
2. **Faucet Confirmation**: Wait for blockchain confirmation before showing success
3. **Balance Sync**: Add a "force refresh" that waits for definitive data
4. **Offline Mode**: Better handling when node is completely unreachable
5. **Transaction Simulation**: Preview transaction before signing to catch errors early

## Files Modified

- `/Users/rickglenn/dytallix/dytallix-fast-launch/frontend/src/App.jsx`
  - Added `fetchBlockchainBalance()` function
  - Added `balanceSource` state
  - Updated `refreshBalances()` to fetch from blockchain
  - Updated balance display UI with status indicators
  - Added pre-transaction validation
  - Enhanced error message parsing

## Related Issues

- Insufficient funds error during transactions
- Balance display vs actual balance mismatch
- Faucet not crediting tokens properly
- No indication of blockchain connectivity status
