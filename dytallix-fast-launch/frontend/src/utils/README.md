# Utility Functions

This directory contains reusable utility functions for the Dytallix frontend.

## clipboard.js

Provides clipboard functionality with fallback support for older browsers.

### `copyToClipboard(text: string): Promise<boolean>`

Copies text to the clipboard using the modern Clipboard API with automatic fallback.

**Parameters:**
- `text` - The text to copy to the clipboard

**Returns:**
- `Promise<boolean>` - True if successful, false otherwise

**Example:**
```javascript
import { copyToClipboard } from './utils/clipboard.js';

async function handleCopy() {
  const success = await copyToClipboard('pqc1ml...');
  if (success) {
    console.log('Copied!');
  }
}
```

**Browser Support:**
- Modern browsers: Uses `navigator.clipboard.writeText()`
- Legacy browsers: Falls back to `document.execCommand('copy')`

---

## format.js

Provides formatting utilities for addresses, numbers, and tokens.

### `truncateAddress(addr: string, prefix?: number, suffix?: number): string`

Truncates a long address for display purposes while preserving the beginning and end.

**Parameters:**
- `addr` - The full address to truncate
- `prefix` - Number of characters to show at start (default: 10)
- `suffix` - Number of characters to show at end (default: 4)

**Returns:**
- `string` - Truncated address with ellipsis (e.g., `pqc1mlupwu...tpfj`)

**Example:**
```javascript
import { truncateAddress } from './utils/format.js';

const full = 'pqc1mlupwumd33r08hqxtgtt4aaz4h3qtpfj';
const short = truncateAddress(full); // "pqc1mlupwu...tpfj"
```

### `formatNumber(num: number): string`

Formats a number with thousand separators.

**Parameters:**
- `num` - The number to format

**Returns:**
- `string` - Formatted number (e.g., `1,234,567`)

**Example:**
```javascript
formatNumber(1234567); // "1,234,567"
```

### `formatTokenAmount(amount: number, decimals?: number): string`

Formats a token amount with specified decimal places.

**Parameters:**
- `amount` - The token amount
- `decimals` - Number of decimal places (default: 2)

**Returns:**
- `string` - Formatted amount (e.g., `1,234.56`)

**Example:**
```javascript
formatTokenAmount(1234.5678, 2); // "1,234.57"
```

---

## Usage in Components

### Copy-to-Clipboard Pattern

```jsx
import { useState } from 'react';
import { copyToClipboard } from './utils/clipboard.js';
import { truncateAddress } from './utils/format.js';

function AddressDisplay({ fullAddress }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const success = await copyToClipboard(fullAddress);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono">{truncateAddress(fullAddress)}</span>
      <button onClick={handleCopy} aria-label="Copy address">
        {copied ? '✓ Copied!' : '📋 Copy'}
      </button>
    </div>
  );
}
```

---

## Testing

Both utilities include error handling and fallbacks:

- **clipboard.js**: Gracefully degrades to `execCommand` if Clipboard API is unavailable
- **format.js**: Returns safe defaults for invalid inputs (empty strings, "0", etc.)

Always test clipboard functionality across browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers
