/**
 * Runtime detection for provider selection
 * Determines the best available backend based on environment
 */

const isNode =
  typeof process !== 'undefined' &&
  process.versions != null &&
  process.versions.node != null;

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Check if running in Node.js environment
 */
export function isNodeEnvironment(): boolean {
  return isNode;
}

/**
 * Check if running in browser environment
 */
export function isBrowserEnvironment(): boolean {
  return isBrowser;
}

/**
 * Check if native addon is available
 * Attempts to load @dyt/pqc-native if present
 */
export async function isNativeAvailable(): Promise<boolean> {
  if (!isNode) return false;
  
  try {
    // Try to import native addon
    await import('@dyt/pqc-native');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get backend preference from environment
 */
export function getBackendPreference(): 'auto' | 'wasm' | 'native' {
  const env = typeof process !== 'undefined' ? process.env : {};
  const backend = env.DYT_PQC_BACKEND || env.PQC_BACKEND || 'auto';
  
  if (backend === 'native' || backend === 'wasm') {
    return backend;
  }
  
  return 'auto';
}

/**
 * Select the best backend based on environment and availability
 */
export async function selectBackend(
  preference?: 'auto' | 'wasm' | 'native'
): Promise<'wasm' | 'native'> {
  const pref = preference || getBackendPreference();
  
  // Explicit native request
  if (pref === 'native') {
    if (await isNativeAvailable()) {
      return 'native';
    }
    // Fall back to WASM if native not available
    console.warn('Native backend requested but not available, falling back to WASM');
    return 'wasm';
  }
  
  // Explicit WASM request
  if (pref === 'wasm') {
    return 'wasm';
  }
  
  // Auto: prefer native if available in Node, otherwise WASM
  if (isNode && (await isNativeAvailable())) {
    return 'native';
  }
  
  return 'wasm';
}
