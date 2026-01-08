/**
 * Webhook Service for QuantumVault
 * 
 * Real-time notifications for proof events:
 * - Proof generation notifications
 * - Verification result webhooks
 * - Blockchain anchor confirmations
 * - Batch processing completion
 */

import { createHash, createHmac } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

const fetch = globalThis.fetch || (await import('node-fetch')).default;

class WebhookService {
  constructor(dataDir = './webhooks') {
    this.dataDir = dataDir;
    this.webhooks = new Map(); // Map<webhookId, webhookData>
    this.webhookQueue = []; // Queue for retry logic
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds
    this.initialized = false;
  }

  /**
   * Initialize webhook service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.dataDir, { recursive: true });

      // Load existing webhooks
      const webhooksFile = join(this.dataDir, 'webhooks.json');
      try {
        const data = await fs.readFile(webhooksFile, 'utf-8');
        const webhooks = JSON.parse(data);
        webhooks.forEach(wh => this.webhooks.set(wh.id, wh));
        console.log(`[WebhookService] Loaded ${this.webhooks.size} webhooks`);
      } catch (err) {
        console.log('[WebhookService] No existing webhooks');
      }

      this.initialized = true;

      // Start processing queued webhooks
      this.processQueue();
    } catch (error) {
      console.error('[WebhookService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register a new webhook
   */
  async registerWebhook(options) {
    const {
      url,
      events = [],
      secret,
      userId,
      apiKey,
      name,
      headers = {}
    } = options;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    if (!events || events.length === 0) {
      throw new Error('At least one event type is required');
    }

    const webhookId = this.generateWebhookId();
    const webhookSecret = secret || this.generateSecret();

    const webhook = {
      id: webhookId,
      url,
      events,
      secret: webhookSecret,
      userId,
      apiKey,
      name: name || 'Unnamed Webhook',
      headers,
      active: true,
      createdAt: new Date().toISOString(),
      lastTriggered: null,
      deliveryStats: {
        total: 0,
        successful: 0,
        failed: 0
      }
    };

    this.webhooks.set(webhookId, webhook);
    await this.saveWebhooks();

    console.log(`[WebhookService] Registered webhook ${webhookId} for events:`, events);

    return {
      ...webhook,
      secret: this.maskSecret(webhookSecret)
    };
  }

  /**
   * Trigger webhook for an event
   */
  async triggerWebhook(eventType, data) {
    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(wh => wh.active && wh.events.includes(eventType));

    if (matchingWebhooks.length === 0) {
      return;
    }

    console.log(`[WebhookService] Triggering ${matchingWebhooks.length} webhooks for event: ${eventType}`);

    const payload = {
      id: this.generateEventId(),
      event: eventType,
      timestamp: new Date().toISOString(),
      data
    };

    const results = await Promise.allSettled(
      matchingWebhooks.map(webhook => this.deliverWebhook(webhook, payload))
    );

    return {
      triggered: matchingWebhooks.length,
      delivered: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }

  /**
   * Deliver webhook with retry logic
   * @private
   */
  async deliverWebhook(webhook, payload, attempt = 1) {
    try {
      const signature = this.signPayload(webhook.secret, payload);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-QuantumVault-Signature': signature,
          'X-QuantumVault-Webhook-Id': webhook.id,
          'X-QuantumVault-Event': payload.event,
          'User-Agent': 'QuantumVault-Webhook/2.0',
          ...webhook.headers
        },
        body: JSON.stringify(payload),
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook returned status ${response.status}`);
      }

      // Update stats
      webhook.deliveryStats.total++;
      webhook.deliveryStats.successful++;
      webhook.lastTriggered = new Date().toISOString();
      await this.saveWebhooks();

      console.log(`[WebhookService] Delivered webhook ${webhook.id} for ${payload.event}`);

      return {
        success: true,
        webhookId: webhook.id,
        eventId: payload.id
      };

    } catch (error) {
      console.error(`[WebhookService] Webhook delivery failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);

      // Retry logic
      if (attempt < this.retryAttempts) {
        await this.sleep(this.retryDelay * attempt);
        return this.deliverWebhook(webhook, payload, attempt + 1);
      }

      // Update stats
      webhook.deliveryStats.total++;
      webhook.deliveryStats.failed++;
      await this.saveWebhooks();

      // Add to queue for later retry
      this.webhookQueue.push({
        webhook,
        payload,
        failedAt: new Date().toISOString(),
        attempts: attempt
      });

      throw error;
    }
  }

  /**
   * Convenience methods for common events
   */

  async notifyProofGenerated(data) {
    return await this.triggerWebhook('proof.generated', {
      proofId: data.proofId,
      fileHash: data.fileHash,
      filename: data.filename,
      storageLocation: data.storageLocation,
      timestamp: data.timestamp
    });
  }

  async notifyProofVerified(data) {
    return await this.triggerWebhook('proof.verified', {
      proofId: data.proofId,
      fileHash: data.fileHash,
      result: data.result,
      timestamp: data.timestamp
    });
  }

  async notifyBlockchainAnchored(data) {
    return await this.triggerWebhook('proof.anchored', {
      proofId: data.proofId,
      txHash: data.txHash,
      blockHeight: data.blockHeight,
      timestamp: data.timestamp
    });
  }

  async notifyBatchCompleted(data) {
    return await this.triggerWebhook('batch.completed', {
      batchId: data.batchId,
      totalProofs: data.total,
      successful: data.successful,
      failed: data.failed,
      timestamp: data.timestamp
    });
  }

  /**
   * List webhooks for a user
   */
  async listWebhooks(options = {}) {
    const { userId, apiKey, active } = options;

    let webhooks = Array.from(this.webhooks.values());

    if (userId) {
      webhooks = webhooks.filter(wh => wh.userId === userId);
    }

    if (apiKey) {
      webhooks = webhooks.filter(wh => wh.apiKey === apiKey);
    }

    if (active !== undefined) {
      webhooks = webhooks.filter(wh => wh.active === active);
    }

    return webhooks.map(wh => ({
      ...wh,
      secret: this.maskSecret(wh.secret)
    }));
  }

  /**
   * Get webhook details
   */
  async getWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    return {
      ...webhook,
      secret: this.maskSecret(webhook.secret)
    };
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, updates) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (updates.url) webhook.url = updates.url;
    if (updates.events) webhook.events = updates.events;
    if (updates.active !== undefined) webhook.active = updates.active;
    if (updates.headers) webhook.headers = updates.headers;
    if (updates.name) webhook.name = updates.name;

    await this.saveWebhooks();

    return {
      ...webhook,
      secret: this.maskSecret(webhook.secret)
    };
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    const deleted = this.webhooks.delete(webhookId);
    if (deleted) {
      await this.saveWebhooks();
      console.log(`[WebhookService] Deleted webhook ${webhookId}`);
    }
    return deleted;
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload = {
      id: this.generateEventId(),
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from QuantumVault'
      }
    };

    try {
      await this.deliverWebhook(webhook, testPayload);
      return { success: true, message: 'Test webhook delivered successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process queued webhooks (retry failed deliveries)
   * @private
   */
  async processQueue() {
    setInterval(async () => {
      if (this.webhookQueue.length === 0) return;

      console.log(`[WebhookService] Processing ${this.webhookQueue.length} queued webhooks`);

      const batch = this.webhookQueue.splice(0, 10); // Process 10 at a time

      for (const item of batch) {
        try {
          await this.deliverWebhook(item.webhook, item.payload);
        } catch (error) {
          // If still failing, put back in queue unless too old
          const age = Date.now() - new Date(item.failedAt).getTime();
          if (age < 86400000) { // Keep for 24 hours
            this.webhookQueue.push(item);
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Sign payload with webhook secret
   * @private
   */
  signPayload(secret, payload) {
    const data = JSON.stringify(payload);
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(secret, payload, signature) {
    const expectedSignature = this.signPayload(secret, payload);
    return expectedSignature === signature;
  }

  /**
   * Generate webhook ID
   * @private
   */
  generateWebhookId() {
    return 'wh_' + createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex').substring(0, 32);
  }

  /**
   * Generate event ID
   * @private
   */
  generateEventId() {
    return 'evt_' + createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex').substring(0, 32);
  }

  /**
   * Generate webhook secret
   * @private
   */
  generateSecret() {
    return 'whsec_' + createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex');
  }

  /**
   * Mask secret for display
   * @private
   */
  maskSecret(secret) {
    if (!secret) return null;
    return secret.substring(0, 12) + '...' + secret.substring(secret.length - 4);
  }

  /**
   * Sleep helper
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save webhooks to disk
   * @private
   */
  async saveWebhooks() {
    const webhooksFile = join(this.dataDir, 'webhooks.json');
    const webhooks = Array.from(this.webhooks.values());
    await fs.writeFile(webhooksFile, JSON.stringify(webhooks, null, 2));
  }
}

// Singleton instance
let webhookServiceInstance = null;

export function getWebhookService() {
  if (!webhookServiceInstance) {
    webhookServiceInstance = new WebhookService();
  }
  return webhookServiceInstance;
}

export { WebhookService };
