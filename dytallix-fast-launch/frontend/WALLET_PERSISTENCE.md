# Wallet Persistence Implementation

## Overview

The Dytallix PQC Wallet now includes localStorage-based persistence to maintain wallet state across page navigation and browser sessions. This ensures a smooth user experience when navigating between the Wallet, Faucet, and Dashboard pages.

## Features

### 1. **Automatic Wallet Persistence**
- Wallet data is automatically saved to browser localStorage when created
- Wallet is automatically restored when returning to the Wallet page
- No manual save/load actions required from users

### 2. **Persistent Data**
The following wallet data is persisted:
- Full wallet address (`fullAddr`)
- Truncated display address (`addr`)
- Selected algorithm (`ML-DSA` or `SLH-DSA`)
- List of guardians
- Creation timestamp

### 3. **Balance Tracking**
- Balances are fetched from the mock faucet system (`getAddressBalances`)
- Auto-refresh every 5 seconds when wallet is active
- Manual refresh button available
- Balances persist across page navigation

### 4. **Guardian Management**
- Guardians are saved to localStorage when added/removed
- Guardian list persists across sessions
- Up to 5 guardians can be added per wallet

## Implementation Details

### localStorage Key
```javascript
'dytallix_wallet'
```

### Wallet Data Structure
```json
{
  "fullAddr": "pqc1ml4mhq8owskjc6",
  "addr": "pqc1ml4mhq...skjc6",
  "algorithm": "ML-DSA",
  "guardians": ["pqc1...", "pqc1..."],
  "createdAt": "2025-10-08T16:00:00.000Z"
}
```

### Key Functions

#### `useEffect` - Load Wallet on Mount
```javascript
useEffect(() => {
  const savedWallet = localStorage.getItem('dytallix_wallet');
  if (savedWallet) {
    const wallet = JSON.parse(savedWallet);
    setFullAddr(wallet.fullAddr);
    setAddr(wallet.addr);
    setAlgorithm(wallet.algorithm);
    setGuardians(wallet.guardians || []);
    setCreated(true);
    setBalances(getAddressBalances(wallet.fullAddr));
  }
}, []);
```

#### `create` - Save Wallet on Creation
```javascript
const create = () => {
  const walletData = {
    fullAddr: full,
    addr: truncated,
    algorithm: algorithm,
    guardians: [],
    createdAt: new Date().toISOString()
  };
  localStorage.setItem('dytallix_wallet', JSON.stringify(walletData));
  // ... set state
};
```

#### `deleteWallet` - Clear Wallet Data
```javascript
const deleteWallet = () => {
  if (confirm('Are you sure...?')) {
    localStorage.removeItem('dytallix_wallet');
    // ... reset all state
  }
};
```

## User Experience Flow

### 1. **Create Wallet**
```
User → Wallet Page → Generate PQC Wallet → Wallet Saved to localStorage
```

### 2. **Request Tokens**
```
User → Copy Address → Faucet Page → Request Tokens → Success
```

### 3. **View Balances**
```
User → Click "Open Wallet" → Wallet Page → Wallet Auto-loaded → Balances Displayed
```

### 4. **Navigate Freely**
```
User can now navigate between pages without losing wallet state:
- Wallet Page: View address, balances, export keystore
- Faucet Page: Request more tokens
- Dashboard Page: View network stats
```

## Balance Auto-Refresh

Balances are automatically refreshed:
1. When wallet is loaded from localStorage
2. Every 5 seconds while on the Wallet page
3. When user clicks the "Refresh" button

```javascript
useEffect(() => {
  if (fullAddr) {
    const newBalances = getAddressBalances(fullAddr);
    setBalances(newBalances);
    
    const interval = setInterval(() => {
      const updatedBalances = getAddressBalances(fullAddr);
      setBalances(updatedBalances);
    }, 5000);
    
    return () => clearInterval(interval);
  }
}, [fullAddr]);
```

## Security Considerations

### Current Implementation (Testnet Demo)
- ✅ Client-side only - no keys transmitted
- ✅ localStorage is domain-specific
- ⚠️ Private keys are NOT stored (placeholder wallet only)
- ⚠️ localStorage is not encrypted

### Production Recommendations
For mainnet/production deployment:
1. **Never store private keys in localStorage**
2. Use encrypted keystore files only
3. Consider IndexedDB for larger data
4. Implement session-based wallet unlocking
5. Add password/PIN protection
6. Use hardware wallet integration
7. Implement proper key derivation (BIP39/44)

## Delete Wallet Feature

Users can delete their wallet with a confirmation dialog:
- Warns user to export keystore first
- Clears all wallet data from localStorage
- Resets all wallet-related state
- Returns to wallet creation screen

```javascript
const deleteWallet = () => {
  if (confirm('Are you sure you want to delete this wallet?')) {
    localStorage.removeItem('dytallix_wallet');
    // Reset all state...
  }
};
```

## Testing the Flow

### Test Scenario 1: Create & Persist
1. Navigate to Wallet page
2. Generate wallet
3. Note the address
4. Refresh the page
5. ✅ Wallet should be restored with same address

### Test Scenario 2: Faucet Integration
1. Create wallet on Wallet page
2. Copy address
3. Navigate to Faucet page
4. Request tokens using copied address
5. Click "Open Wallet" link
6. ✅ Wallet should be loaded with updated balances

### Test Scenario 3: Balance Updates
1. Create wallet
2. Request tokens from faucet
3. Return to wallet page
4. ✅ Balances should show requested tokens
5. Wait 5-10 seconds
6. ✅ Balances should auto-refresh

### Test Scenario 4: Guardian Persistence
1. Create wallet
2. Add guardians
3. Navigate to another page
4. Return to Wallet page
5. ✅ Guardians should be preserved

### Test Scenario 5: Delete Wallet
1. Create wallet
2. Click "Delete Wallet"
3. Confirm deletion
4. ✅ Wallet should be cleared
5. ✅ Creation form should appear

## Browser Compatibility

localStorage is supported by:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Storage Limits:**
- Most browsers: 5-10 MB
- Wallet data: < 1 KB (plenty of space)

## Future Enhancements

### Phase 1 (Current)
- ✅ localStorage persistence
- ✅ Auto-load on page mount
- ✅ Balance auto-refresh
- ✅ Guardian persistence

### Phase 2 (Planned)
- Multiple wallet support
- Import from keystore file
- Encrypted localStorage (Web Crypto API)
- Session timeout/auto-lock

### Phase 3 (Production)
- Hardware wallet integration
- Multi-device sync (opt-in)
- Backup/restore via encrypted cloud
- Social recovery implementation

## Troubleshooting

### Wallet Not Persisting
1. Check browser localStorage is enabled
2. Check console for errors
3. Clear localStorage and try again:
   ```javascript
   localStorage.removeItem('dytallix_wallet');
   ```

### Balances Not Updating
1. Check `getAddressBalances()` is working
2. Verify faucet mock data includes your address
3. Click manual "Refresh" button
4. Check console for errors

### Wallet Lost After Browser Refresh
1. Check if localStorage is disabled (private/incognito mode)
2. Check if localStorage was manually cleared
3. Verify wallet was created (not just previewed)

## API Reference

### Global Functions Used
- `getAddressBalances(address: string): { DGT: number, DRT: number }`
  - Returns balance object for given address
  - Used by both Wallet and Faucet pages

### localStorage Keys
- `dytallix_wallet` - Main wallet data storage

### React Hooks Used
- `useState` - Component state management
- `useEffect` - Lifecycle management (load, save, auto-refresh)

---

**Note:** This is a testnet demo implementation. For production, implement proper key management, encryption, and security best practices as outlined in the Security Considerations section.
