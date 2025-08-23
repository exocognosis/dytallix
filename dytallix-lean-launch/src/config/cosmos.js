// Cosmos SDK configuration
import { faucetBaseUrl } from './env.ts'

export const cosmosConfig = {
  // LCD (Light Client Daemon) REST API endpoint
  lcdUrl: import.meta.env.VITE_LCD_HTTP_URL || 'http://localhost:1317',
  
  // RPC endpoint for direct node communication
  rpcUrl: import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:26657',
  
  // WebSocket endpoint for real-time updates
  wsUrl: import.meta.env.VITE_RPC_WS_URL || 'ws://localhost:26657/websocket',
  
  // Chain identifier
  chainId: import.meta.env.VITE_CHAIN_ID || 'dytallix-testnet-1',
  
  // Faucet service endpoint (using centralized configuration)
  faucetUrl: faucetBaseUrl
}

// Validate required environment variables
export const validateConfig = () => {
  const required = ['VITE_LCD_HTTP_URL', 'VITE_RPC_HTTP_URL', 'VITE_CHAIN_ID']
  const missing = required.filter(key => !import.meta.env[key])
  
  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing)
    console.warn('Using fallback values. For production, ensure all required env vars are set.')
  }
  
  return missing.length === 0
}

// Get current configuration with validation
export const getCosmosConfig = () => {
  validateConfig()
  return cosmosConfig
}