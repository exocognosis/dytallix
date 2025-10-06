/**
 * Validate Ethereum-style address
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;
  
  // Basic hex address validation (0x + 40 hex chars)
  const hexPattern = /^0x[0-9a-fA-F]{40}$/;
  if (hexPattern.test(address)) return true;
  
  // Also support bech32-style addresses (for Cosmos chains)
  const bech32Pattern = /^[a-z]+1[a-z0-9]{38,}$/;
  return bech32Pattern.test(address);
}

/**
 * Normalize address to lowercase
 */
export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Validate transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/**
 * Get client IP from request, handling proxies
 */
export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  // Check common proxy headers
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  
  const realIp = headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback to connection IP
  return headers['x-client-ip'] as string || '127.0.0.1';
}
