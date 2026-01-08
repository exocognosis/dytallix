# Testing Export Keystore and Add Guardian Buttons

## 🧪 Testing Instructions

### 1. Clear Browser Cache
**Important:** You MUST clear your browser cache to see the new version!

#### On Mobile (Safari):
- Settings → Safari → Clear History and Website Data
- OR: Hold the refresh button → "Reload Without Content Blockers"

#### On Desktop:
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+E (clear cache), then Cmd+R
- Firefox: Ctrl+Shift+Delete, check "Cache", click Clear

### 2. Visit the PQC Wallet
- Go to: http://dytallix.com/pqc-wallet
- Create or load a wallet

### 3. Test the Buttons
When you click the buttons, check the browser console (F12 → Console tab):

#### Export Keystore Button:
- Click "📥 Export Keystore"
- **Expected:** Console should show "Export button clicked" and "Rendering Export Modal"
- **Expected:** Modal should appear asking for password
- **If nothing happens:** Browser cache not cleared properly

#### Add Guardian Button:
- Click "👥 Add Guardian"
- **Expected:** Console should show "Guardian button clicked" and "Rendering Guardian Modal"
- **Expected:** Modal should appear asking for guardian address
- **If nothing happens:** Browser cache not cleared properly

### 4. Debug Info
If buttons still don't work after clearing cache:
1. Open browser console (F12)
2. Check for any errors (red text)
3. Try clicking the buttons
4. Look for the console.log messages
5. Take a screenshot of the console and send it

## 🔍 What Changed

**Build Hash:** `index-Dc9JcBBN.js` (new version)  
**Previous Hash:** `index-DVkmNLTl.js` (old version)

The new build includes:
- Debug logging when buttons are clicked
- Debug logging when modals render
- This will help us identify if it's a caching issue or a code issue

## ✅ Success Criteria

Buttons are working if:
1. Console shows "Export button clicked" when you click Export
2. Console shows "Guardian button clicked" when you click Add Guardian
3. Modals appear on screen
4. You can interact with the modal forms

## 🚨 If Still Not Working

If after clearing cache the buttons still don't work:
1. Send screenshot of browser console
2. Try in a different browser
3. Try in incognito/private mode
4. Let me know what device/browser you're using
