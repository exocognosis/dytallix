import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Server
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  PORT: z.coerce.number().default(8787),
  
  // Blockchain
  RPC_URL: z.string().default('http://localhost:8545'),
  CHAIN_ID: z.coerce.number().default(12345),
  
  // Faucet
  FAUCET_PRIVATE_KEY: z.string().min(1),
  FAUCET_DRIP_AMOUNT: z.coerce.number().positive().default(100),
  FAUCET_DAILY_CAP: z.coerce.number().positive().default(1),
  FAUCET_MIN_BALANCE: z.coerce.number().positive().default(1000),
  
  // Rate Limiting
  RATE_LIMIT_PER_IP_PER_DAY: z.coerce.number().positive().default(10),
  RATE_LIMIT_PER_ADDRESS_PER_DAY: z.coerce.number().positive().default(1),
  
  // Admin
  ADMIN_TOKEN: z.string().min(1),
  ADMIN_ALLOWED_IPS: z.string().default('127.0.0.1,::1'),
  
  // RPC Proxy
  NODE_TIMEOUT_MS: z.coerce.number().positive().default(3000),
  MAX_CONCURRENCY: z.coerce.number().positive().default(20),
  RPC_ALLOWED_METHODS: z.string().default('eth_blockNumber,eth_getBalance,eth_call,eth_estimateGas,eth_getTransactionReceipt,eth_getTransactionByHash,net_version'),
  
  // Database
  DB_PATH: z.string().default('./data/dytallix.db'),
  
  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_METRICS: z.coerce.boolean().default(true),
  
  // Security
  REQUEST_SIZE_LIMIT: z.coerce.number().positive().default(1048576),
  ENABLE_BODY_LIMIT: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;

let config: Config | null = null;

export function loadConfig(): Config {
  if (config) return config;
  
  try {
    config = configSchema.parse(process.env);
    Object.freeze(config);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach(issue => {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      });
    }
    throw new Error('Failed to load configuration');
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}
