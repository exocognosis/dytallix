/**
 * Truncate a long address for display purposes
 * @param {string} addr - The full address
 * @param {number} prefix - Number of characters to show at start (default: 10)
 * @param {number} suffix - Number of characters to show at end (default: 4)
 * @returns {string} - Truncated address with ellipsis
 */
export function truncateAddress(addr, prefix = 10, suffix = 4) {
  if (!addr) return '';
  if (addr.length <= prefix + suffix) return addr;
  return `${addr.slice(0, prefix)}...${addr.slice(-suffix)}`;
}

/**
 * Format a number with thousand separators
 * @param {number} num - The number to format
 * @returns {string} - Formatted number string
 */
export function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString();
}

/**
 * Format a token amount with decimals
 * @param {number} amount - The token amount
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted amount
 */
export function formatTokenAmount(amount, decimals = 2) {
  if (typeof amount !== 'number') return '0';
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
