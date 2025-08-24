import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'pulsescan',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'pulsescan:',
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour
  },

  // Blockchain configuration
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:26657',
    contractAddress: process.env.CONTRACT_ADDRESS || '',
    networkId: process.env.NETWORK_ID || 'dytallix-testnet',
  },

  // Security configuration
  security: {
    apiKey: process.env.API_KEY || 'dev-api-key-change-in-production',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
  },

  // CORS configuration
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  },

  // Pagination defaults
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '50', 10),
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT || '1000', 10),
  },

  // Cache settings
  cache: {
    statsCache: parseInt(process.env.STATS_CACHE_TTL || '300', 10), // 5 minutes
    findingsCache: parseInt(process.env.FINDINGS_CACHE_TTL || '60', 10), // 1 minute
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    filename: process.env.LOG_FILENAME || 'pulsescan-api.log',
  },

  // Feature flags
  features: {
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    enableRealTimeUpdates: process.env.ENABLE_REAL_TIME_UPDATES === 'true',
  },
};

// Validation
if (!config.blockchain.contractAddress && config.environment === 'production') {
  throw new Error('CONTRACT_ADDRESS is required in production environment');
}

if (config.security.apiKey === 'dev-api-key-change-in-production' && config.environment === 'production') {
  throw new Error('API_KEY must be changed in production environment');
}