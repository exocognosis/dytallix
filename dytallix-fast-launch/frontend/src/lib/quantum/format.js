/**
 * Formatting and utility functions for quantum components
 */

/**
 * Truncate a hash for display
 * @param {string} hash - Full hash string
 * @param {number} start - Number of characters to show at start
 * @param {number} end - Number of characters to show at end
 * @returns {string} - Truncated hash
 */
export function truncateHash(hash, start = 8, end = 6) {
  if (!hash || typeof hash !== 'string') {
    return '';
  }
  
  if (hash.length <= start + end) {
    return hash;
  }
  
  return `${hash.substring(0, start)}...${hash.substring(hash.length - end)}`;
}

/**
 * Format a timestamp for display
 * @param {string|number|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted timestamp
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) {
    return 'N/A';
  }
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (error) {
    console.error('[Format] Error formatting timestamp:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a relative time (time ago)
 * @param {string|number|Date} timestamp - Timestamp to format
 * @returns {string} - Relative time string
 */
export function formatTimeAgo(timestamp) {
  if (!timestamp) {
    return '';
  }
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}m ago`;
    } else if (diffSeconds < 86400) {
      return `${Math.floor(diffSeconds / 3600)}h ago`;
    } else {
      return `${Math.floor(diffSeconds / 86400)}d ago`;
    }
  } catch (error) {
    console.error('[Format] Error formatting time ago:', error);
    return '';
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Whether the copy was successful
 */
export async function copyToClipboard(text) {
  if (!text) {
    return false;
  }
  
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('[Format] Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Download data as a file
 * @param {string} data - Data to download
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
export function downloadFile(data, filename, mimeType = 'application/json') {
  try {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('[Format] Error downloading file:', error);
  }
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) {
    return '0 B';
  }
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

/**
 * Format file size for display (alias for formatFileSize)
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size string
 */
export function formatBytes(bytes) {
  return formatFileSize(bytes);
}

/**
 * Validate a hex string
 * @param {string} hex - Hex string to validate
 * @returns {boolean} - Whether the string is valid hex
 */
export function isValidHex(hex) {
  if (!hex || typeof hex !== 'string') {
    return false;
  }
  
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Check if all characters are valid hex
  return /^[0-9a-fA-F]+$/.test(cleanHex) && cleanHex.length > 0;
}

/**
 * Format a hash with proper styling
 * @param {string} hash - Hash to format
 * @param {boolean} truncate - Whether to truncate the hash
 * @returns {string} - Formatted hash
 */
export function formatHash(hash, truncate = true) {
  if (!hash) {
    return '';
  }
  
  const cleanHash = hash.startsWith('0x') ? hash.slice(2) : hash;
  
  if (truncate) {
    return truncateHash(cleanHash);
  }
  
  return cleanHash;
}

/**
 * Parse JSON safely
 * @param {string} jsonString - JSON string to parse
 * @returns {object|null} - Parsed object or null if invalid
 */
export function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('[Format] Error parsing JSON:', error);
    return null;
  }
}

/**
 * Stringify JSON safely with proper formatting
 * @param {object} obj - Object to stringify
 * @param {number} indent - Indentation level
 * @returns {string} - Formatted JSON string
 */
export function safeJsonStringify(obj, indent = 2) {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    console.error('[Format] Error stringifying JSON:', error);
    return 'Error: Could not serialize object';
  }
}
