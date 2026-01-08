# Wallet UI Layout Fix

## Problem

When the "Send Tokens" modal opens on the wallet page, the "Create Your Wallet" card on the left develops a large blank space at the top, pushing all content down. This creates a poor user experience where the card content appears vertically centered rather than top-aligned.

**Visual Issue:**
- Before: Cards are the same height, content starts at top
- After modal opens: Right card grows taller, left card content shifts down to center
- Result: Large blank space at top of left card

## Root Cause

The CSS Grid layout for the two-column wallet section (`.grid .grid-2`) did not specify vertical alignment for grid items. When grid items have different heights:

1. **Default behavior**: Grid items stretch to fill the grid cell
2. **The issue**: When the right card (Send/Request) grows taller due to the modal, the left card's content was being vertically centered within its grid cell
3. **CSS Grid alignment**: Without explicit `align-items` property, browsers can align content differently

## Solution

Added `align-items: start` to the `.grid` class to ensure all grid items (cards) align to the top of their grid cells, regardless of height differences.

### Code Change

**File**: `shared-assets/styles.css`

```css
.grid {
  display: grid;
  gap: clamp(1.5rem, 4vw, 2rem);
  align-items: start; /* Keep cards aligned to top when heights differ */
}
```

### Why This Works

- `align-items: start` forces all grid items to align to the top (start) of their grid row
- Cards now maintain top alignment even when one card grows taller
- Content in each card flows naturally from top to bottom
- No more vertical centering or blank space issues

## Testing

1. Open wallet page: `http://localhost:3000/build/pqc-wallet.html`
2. Create a wallet (if not already created)
3. Click "💸 Send" button to open the send modal
4. **Expected**: Left card content stays at the top, blank space appears at bottom
5. **Before fix**: Left card content shifts down, blank space at top

## Related Files

- `build/pqc-wallet.html` - Wallet page HTML structure
- `shared-assets/styles.css` - Global styles including `.grid` class
- All pages using `.grid` class benefit from this fix

## Impact

This fix improves the layout behavior for ALL pages using the `.grid` class, not just the wallet. Any page with cards or grid items of varying heights will now maintain proper top alignment.
