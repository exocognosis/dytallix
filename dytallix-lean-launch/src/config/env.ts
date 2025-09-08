// Centralized environment variable loader for Dytallix
// Consolidates API and faucet endpoint configuration

// Environment sources (prefer Vite client env in browser, Node.js process.env in scripts)
function getEnvVar(name: string): string | undefined {
  // Browser/Vite environment
  try {
    // @ts-ignore - import.meta is available in Vite modules
    if (import.meta?.env && import.meta.env[name]) {
      // @ts-ignore
      return import.meta.env[name]
    }
  } catch {
    // import.meta not available in Node.js
  }
  
  // Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[name]
    if (value) return value
  }
  
  return undefined
}

// Trim trailing slashes for consistency
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

// Check if we're in development mode
function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV') !== 'production' && 
         (getEnvVar('VITE_DEV_MODE') === 'true' || getEnvVar('NODE_ENV') === 'development')
}

/**
 * Get the base API URL (required in production, optional in dev)
 */
export function getApiBaseUrl(): string {
  // In development, prefer relative URLs and warn regardless of env contamination
  if (isDevelopment()) {
    console.warn('VITE_API_URL not set, API calls may fail in dev mode')
    return ''
  }
  const apiUrl = getEnvVar('VITE_API_URL')
  if (apiUrl) return normalizeUrl(apiUrl)
  throw new Error('VITE_API_URL is required in production builds')
}

/**
 * Get the faucet endpoint URL with fallback logic:
 * 1. Use VITE_FAUCET_URL if explicitly set
 * 2. Derive from VITE_API_URL + '/faucet' if API URL is set  
 * 3. Fall back to '/api/faucet' in development with warning
 * 4. Throw error in production if neither is available
 */
export function getFaucetBaseUrl(): string {
  // Explicit faucet URL takes precedence
  const explicitFaucetUrl = getEnvVar('VITE_FAUCET_URL')
  if (explicitFaucetUrl) return normalizeUrl(explicitFaucetUrl)

  // In development, always use relative fallback to ensure stable tests
  if (isDevelopment()) {
    console.warn('Neither VITE_FAUCET_URL nor VITE_API_URL set, falling back to /api/faucet')
    return '/api/faucet'
  }

  // Derive from API base URL (production only)
  const apiUrl = getEnvVar('VITE_API_URL')
  if (apiUrl) return normalizeUrl(apiUrl) + '/faucet'

  // Production requires explicit configuration
  throw new Error('Either VITE_FAUCET_URL or VITE_API_URL must be set in production')
}

/**
 * Assert that required environment variables are present for production
 * In development, this logs warnings instead of throwing
 */
export function assertEnv(): void {
  const apiUrl = getEnvVar('VITE_API_URL')
  const faucetUrl = getEnvVar('VITE_FAUCET_URL')

  if (!isDevelopment()) {
    // Production requires at least VITE_API_URL
    if (!apiUrl) {
      throw new Error('VITE_API_URL is required in production')
    }
  } else {
    // Development warnings — always warn for missing explicit configuration to keep tests deterministic
    console.warn('Missing VITE_API_URL and VITE_FAUCET_URL - using fallback endpoints')
  }
}

// Exported convenience values (lazy evaluation for testing)
const __IN_TEST__ = (typeof process !== 'undefined') && (process.env.NODE_ENV === 'test' || !!(process as any).env?.VITEST)

export const apiBaseUrl = __IN_TEST__ ? '' : (() => {
  try { return getApiBaseUrl() } catch { return '' }
})()

export const faucetBaseUrl = __IN_TEST__ ? '/api/faucet' : (() => {
  try { return getFaucetBaseUrl() } catch { return '/api/faucet' }
})()

// Validate environment on module load (skip in tests to avoid noisy warnings)
if (!__IN_TEST__) {
  try { assertEnv() } catch { /* ignore */ }
}
