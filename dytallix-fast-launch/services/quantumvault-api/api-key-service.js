/**
 * API Key Management Service for QuantumVault
 * 
 * Enterprise API key management:
 * - Generate and revoke API keys
 * - Rate limiting per key
 * - Usage tracking
 * - Organization/user management
 */

import { randomBytes, createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

class ApiKeyService {
  constructor(dataDir = './api-keys') {
    this.dataDir = dataDir;
    this.apiKeys = new Map(); // Map<apiKey, keyData>
    this.usageStats = new Map(); // Map<apiKey, usageData>
    this.rateLimits = new Map(); // Map<apiKey, rateLimit>
    this.initialized = false;
  }

  /**
   * Initialize API key service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      // Load existing API keys
      const keysFile = join(this.dataDir, 'keys.json');
      try {
        const data = await fs.readFile(keysFile, 'utf-8');
        const keys = JSON.parse(data);
        keys.forEach(key => this.apiKeys.set(key.apiKey, key));
        console.log(`[ApiKeyService] Loaded ${this.apiKeys.size} API keys`);
      } catch (err) {
        console.log('[ApiKeyService] No existing API keys');
      }

      // Load usage stats
      const statsFile = join(this.dataDir, 'usage.json');
      try {
        const data = await fs.readFile(statsFile, 'utf-8');
        const stats = JSON.parse(data);
        stats.forEach(stat => this.usageStats.set(stat.apiKey, stat));
      } catch (err) {
        console.log('[ApiKeyService] No existing usage stats');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[ApiKeyService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate a new API key
   */
  async generateApiKey(options = {}) {
    const {
      userId,
      organization,
      name,
      tier = 'standard',
      rateLimit = { requests: 1000, window: 3600000 }, // 1000 req/hour
      expiresAt
    } = options;

    const apiKey = 'qv_' + randomBytes(32).toString('hex');
    const secretHash = this.hashApiKey(apiKey);

    const keyData = {
      apiKey,
      secretHash,
      userId,
      organization,
      name: name || 'Unnamed Key',
      tier,
      rateLimit,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      lastUsed: null,
      active: true,
      permissions: this.getDefaultPermissions(tier)
    };

    this.apiKeys.set(apiKey, keyData);
    this.initializeUsageStats(apiKey);
    await this.saveApiKeys();

    console.log(`[ApiKeyService] Generated API key for ${userId || organization}`);

    return {
      apiKey,
      ...keyData,
      secretHash: undefined // Don't return hash
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey) {
    if (!apiKey) {
      return { valid: false, reason: 'No API key provided' };
    }

    const keyData = this.apiKeys.get(apiKey);

    if (!keyData) {
      return { valid: false, reason: 'Invalid API key' };
    }

    if (!keyData.active) {
      return { valid: false, reason: 'API key is inactive' };
    }

    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return { valid: false, reason: 'API key has expired' };
    }

    // Check rate limit
    const rateLimitCheck = await this.checkRateLimit(apiKey);
    if (!rateLimitCheck.allowed) {
      return { 
        valid: false, 
        reason: 'Rate limit exceeded',
        rateLimit: rateLimitCheck
      };
    }

    // Update last used
    keyData.lastUsed = new Date().toISOString();
    await this.saveApiKeys();

    return { 
      valid: true, 
      keyData,
      rateLimit: rateLimitCheck
    };
  }

  /**
   * Check rate limit for API key
   */
  async checkRateLimit(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { allowed: false, reason: 'Invalid API key' };
    }

    const usage = this.usageStats.get(apiKey);
    if (!usage) {
      this.initializeUsageStats(apiKey);
      return { allowed: true, remaining: keyData.rateLimit.requests };
    }

    const now = Date.now();
    const windowStart = usage.windowStart;
    const windowSize = keyData.rateLimit.window;

    // Reset window if expired
    if (now - windowStart > windowSize) {
      usage.requestCount = 0;
      usage.windowStart = now;
    }

    const remaining = keyData.rateLimit.requests - usage.requestCount;

    if (usage.requestCount >= keyData.rateLimit.requests) {
      const resetAt = new Date(windowStart + windowSize);
      return { 
        allowed: false, 
        reason: 'Rate limit exceeded',
        limit: keyData.rateLimit.requests,
        remaining: 0,
        resetAt
      };
    }

    return { 
      allowed: true, 
      remaining,
      limit: keyData.rateLimit.requests,
      resetAt: new Date(windowStart + windowSize)
    };
  }

  /**
   * Record API usage
   */
  async recordUsage(apiKey, endpoint, method, statusCode) {
    const usage = this.usageStats.get(apiKey);
    if (!usage) return;

    usage.requestCount++;
    usage.totalRequests++;
    usage.lastRequest = {
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      statusCode
    };

    // Track endpoint usage
    if (!usage.endpointUsage[endpoint]) {
      usage.endpointUsage[endpoint] = 0;
    }
    usage.endpointUsage[endpoint]++;

    await this.saveUsageStats();
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKey) {
    const usage = this.usageStats.get(apiKey);
    const keyData = this.apiKeys.get(apiKey);

    if (!usage || !keyData) {
      return null;
    }

    return {
      apiKey: this.maskApiKey(apiKey),
      tier: keyData.tier,
      rateLimit: keyData.rateLimit,
      currentWindow: {
        requests: usage.requestCount,
        limit: keyData.rateLimit.requests,
        resetAt: new Date(usage.windowStart + keyData.rateLimit.window)
      },
      total: {
        requests: usage.totalRequests,
        since: usage.createdAt
      },
      lastRequest: usage.lastRequest,
      endpointUsage: usage.endpointUsage
    };
  }

  /**
   * List API keys for a user or organization
   */
  async listApiKeys(options = {}) {
    const { userId, organization, active } = options;

    let keys = Array.from(this.apiKeys.values());

    if (userId) {
      keys = keys.filter(k => k.userId === userId);
    }

    if (organization) {
      keys = keys.filter(k => k.organization === organization);
    }

    if (active !== undefined) {
      keys = keys.filter(k => k.active === active);
    }

    return keys.map(k => ({
      ...k,
      apiKey: this.maskApiKey(k.apiKey),
      secretHash: undefined
    }));
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { success: false, reason: 'API key not found' };
    }

    keyData.active = false;
    keyData.revokedAt = new Date().toISOString();
    await this.saveApiKeys();

    console.log(`[ApiKeyService] Revoked API key for ${keyData.userId || keyData.organization}`);

    return { success: true, apiKey: this.maskApiKey(apiKey) };
  }

  /**
   * Update API key settings
   */
  async updateApiKey(apiKey, updates = {}) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { success: false, reason: 'API key not found' };
    }

    if (updates.name) keyData.name = updates.name;
    if (updates.rateLimit) keyData.rateLimit = updates.rateLimit;
    if (updates.permissions) keyData.permissions = updates.permissions;
    if (updates.tier) {
      keyData.tier = updates.tier;
      keyData.permissions = this.getDefaultPermissions(updates.tier);
    }

    await this.saveApiKeys();

    return { success: true, keyData };
  }

  /**
   * Get default permissions for tier
   * @private
   */
  getDefaultPermissions(tier) {
    const permissions = {
      free: {
        proofGeneration: true,
        proofVerification: true,
        blockchainAnchor: false,
        batchProcessing: false,
        webhooks: false,
        compliance: false
      },
      standard: {
        proofGeneration: true,
        proofVerification: true,
        blockchainAnchor: true,
        batchProcessing: false,
        webhooks: false,
        compliance: false
      },
      professional: {
        proofGeneration: true,
        proofVerification: true,
        blockchainAnchor: true,
        batchProcessing: true,
        webhooks: true,
        compliance: true
      },
      enterprise: {
        proofGeneration: true,
        proofVerification: true,
        blockchainAnchor: true,
        batchProcessing: true,
        webhooks: true,
        compliance: true,
        customIntegrations: true,
        prioritySupport: true
      }
    };

    return permissions[tier] || permissions.free;
  }

  /**
   * Initialize usage stats for new API key
   * @private
   */
  initializeUsageStats(apiKey) {
    this.usageStats.set(apiKey, {
      apiKey,
      requestCount: 0,
      totalRequests: 0,
      windowStart: Date.now(),
      createdAt: new Date().toISOString(),
      lastRequest: null,
      endpointUsage: {}
    });
  }

  /**
   * Save API keys to disk
   * @private
   */
  async saveApiKeys() {
    const keysFile = join(this.dataDir, 'keys.json');
    const keys = Array.from(this.apiKeys.values());
    await fs.writeFile(keysFile, JSON.stringify(keys, null, 2));
  }

  /**
   * Save usage stats to disk
   * @private
   */
  async saveUsageStats() {
    const statsFile = join(this.dataDir, 'usage.json');
    const stats = Array.from(this.usageStats.values());
    await fs.writeFile(statsFile, JSON.stringify(stats, null, 2));
  }

  /**
   * Hash API key for storage
   * @private
   */
  hashApiKey(apiKey) {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Mask API key for display
   * @private
   */
  maskApiKey(apiKey) {
    if (!apiKey) return null;
    return apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
  }
}

// Singleton instance
let apiKeyServiceInstance = null;

export function getApiKeyService() {
  if (!apiKeyServiceInstance) {
    apiKeyServiceInstance = new ApiKeyService();
  }
  return apiKeyServiceInstance;
}

export { ApiKeyService };
