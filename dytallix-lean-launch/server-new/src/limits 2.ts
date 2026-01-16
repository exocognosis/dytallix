import { getDb } from './db.js';
import { getConfig } from './config.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if an IP address has exceeded rate limits
 */
export function checkIpLimit(ip: string): RateLimitResult {
  const config = getConfig();
  const db = getDb();
  
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const count = db.prepare(`
    SELECT COUNT(*) as count 
    FROM faucet_grants 
    WHERE ip = ? AND created_at > ?
  `).get(ip, dayAgo) as { count: number };
  
  const remaining = Math.max(0, config.RATE_LIMIT_PER_IP_PER_DAY - count.count);
  const allowed = remaining > 0;
  
  // Reset time is 24 hours from oldest grant in window
  const oldestGrant = db.prepare(`
    SELECT created_at 
    FROM faucet_grants 
    WHERE ip = ? AND created_at > ? 
    ORDER BY created_at ASC 
    LIMIT 1
  `).get(ip, dayAgo) as { created_at: string } | undefined;
  
  const resetAt = oldestGrant 
    ? new Date(new Date(oldestGrant.created_at).getTime() + 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return { allowed, remaining, resetAt };
}

/**
 * Check if an address has exceeded rate limits
 */
export function checkAddressLimit(address: string): RateLimitResult {
  const config = getConfig();
  const db = getDb();
  
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const count = db.prepare(`
    SELECT COUNT(*) as count 
    FROM faucet_grants 
    WHERE address = ? AND created_at > ?
  `).get(address, dayAgo) as { count: number };
  
  const remaining = Math.max(0, config.RATE_LIMIT_PER_ADDRESS_PER_DAY - count.count);
  const allowed = remaining > 0;
  
  const oldestGrant = db.prepare(`
    SELECT created_at 
    FROM faucet_grants 
    WHERE address = ? AND created_at > ? 
    ORDER BY created_at ASC 
    LIMIT 1
  `).get(address, dayAgo) as { created_at: string } | undefined;
  
  const resetAt = oldestGrant 
    ? new Date(new Date(oldestGrant.created_at).getTime() + 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  return { allowed, remaining, resetAt };
}

/**
 * Record a request fingerprint for abuse detection
 */
export function recordFingerprint(
  ip: string, 
  address: string, 
  userAgent: string | null
): void {
  const db = getDb();
  
  db.prepare(`
    INSERT INTO request_fingerprints (ip, address, user_agent)
    VALUES (?, ?, ?)
  `).run(ip, address, userAgent);
}

/**
 * Check for suspicious patterns (e.g., same IP with many addresses)
 */
export function detectSuspiciousActivity(ip: string): boolean {
  const db = getDb();
  
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  // Check if IP has used many different addresses recently
  const uniqueAddresses = db.prepare(`
    SELECT COUNT(DISTINCT address) as count 
    FROM request_fingerprints 
    WHERE ip = ? AND created_at > ?
  `).get(ip, hourAgo) as { count: number };
  
  // Flag as suspicious if more than 5 different addresses from same IP in 1 hour
  return uniqueAddresses.count > 5;
}
