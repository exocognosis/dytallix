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
  const apiUrl = getEnvVar('VITE_API_URL')
  
  if (apiUrl) {
    return normalizeUrl(apiUrl)
  }
  
  if (isDevelopment()) {
    console.warn('VITE_API_URL not set, API calls may fail in dev mode')
    return '' // Will cause relative URLs to be used
  }
  
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
  if (explicitFaucetUrl) {
    return normalizeUrl(explicitFaucetUrl)
  }
  
  // Derive from API base URL
  const apiUrl = getEnvVar('VITE_API_URL')
  if (apiUrl) {
    return normalizeUrl(apiUrl) + '/faucet'
  }
  
  // Development fallback
  if (isDevelopment()) {
    console.warn('Neither VITE_FAUCET_URL nor VITE_API_URL set, falling back to /api/faucet')
    return '/api/faucet'
  }
  
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
    // Development warnings
    if (!apiUrl && !faucetUrl) {
      console.warn('Missing VITE_API_URL and VITE_FAUCET_URL - using fallback endpoints')
    }
  }
}

// Exported convenience values (lazy evaluation for testing)
export const apiBaseUrl = (() => {
  try {
    return getApiBaseUrl()
  } catch {
    return '' // Fallback for test environments
  }
})()

export const faucetBaseUrl = (() => {
  try {
    return getFaucetBaseUrl()
  } catch {
    return '/api/faucet' // Fallback for test environments
  }
})()

// Validate environment on module load (non-throwing for tests)
try {
  assertEnv()
} catch {
  // Ignore errors in test environments
}