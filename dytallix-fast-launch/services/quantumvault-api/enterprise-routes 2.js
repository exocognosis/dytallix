/**
 * QuantumVault Enterprise API Routes
 * 
 * Enterprise-grade endpoints:
 * - API key management
 * - Webhook configuration
 * - Compliance reporting
 * - Audit trail access
 * - Batch operations
 */

import express from 'express';
import { getApiKeyService } from './api-key-service.js';
import { getWebhookService } from './webhook-service.js';
import { getAuditService } from './audit-service.js';

const router = express.Router();

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * POST /enterprise/api-keys
 * Generate a new API key
 */
router.post('/api-keys', async (req, res) => {
  try {
    const { userId, organization, name, tier, rateLimit, expiresAt } = req.body;

    if (!userId && !organization) {
      return res.status(400).json({ error: 'userId or organization is required' });
    }

    const apiKeyService = getApiKeyService();
    await apiKeyService.initialize();

    const apiKey = await apiKeyService.generateApiKey({
      userId,
      organization,
      name,
      tier,
      rateLimit,
      expiresAt
    });

    // Log the event
    const auditService = getAuditService();
    await auditService.initialize();
    await auditService.logEvent({
      type: 'API_KEY_MANAGEMENT',
      action: 'CREATE_API_KEY',
      userId,
      organization,
      apiKeyId: apiKey.apiKey
    });

    res.json({
      success: true,
      apiKey: apiKey.apiKey,
      details: {
        ...apiKey,
        apiKey: undefined // Remove full key from response
      },
      message: 'API key generated successfully. Store it securely - it won\'t be shown again.'
    });

  } catch (error) {
    console.error('[Enterprise] API key generation failed:', error);
    res.status(500).json({ error: 'Failed to generate API key', details: error.message });
  }
});

/**
 * GET /enterprise/api-keys
 * List API keys for user/organization
 */
router.get('/api-keys', async (req, res) => {
  try {
    const { userId, organization, active } = req.query;

    const apiKeyService = getApiKeyService();
    await apiKeyService.initialize();

    const keys = await apiKeyService.listApiKeys({
      userId,
      organization,
      active: active !== undefined ? active === 'true' : undefined
    });

    res.json({
      success: true,
      count: keys.length,
      apiKeys: keys
    });

  } catch (error) {
    console.error('[Enterprise] List API keys failed:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * GET /enterprise/api-keys/:apiKey/usage
 * Get usage statistics for an API key
 */
router.get('/api-keys/:apiKey/usage', async (req, res) => {
  try {
    const { apiKey } = req.params;

    const apiKeyService = getApiKeyService();
    await apiKeyService.initialize();

    const stats = await apiKeyService.getUsageStats(apiKey);

    if (!stats) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      success: true,
      usage: stats
    });

  } catch (error) {
    console.error('[Enterprise] Get usage stats failed:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

/**
 * DELETE /enterprise/api-keys/:apiKey
 * Revoke an API key
 */
router.delete('/api-keys/:apiKey', async (req, res) => {
  try {
    const { apiKey } = req.params;

    const apiKeyService = getApiKeyService();
    await apiKeyService.initialize();

    const result = await apiKeyService.revokeApiKey(apiKey);

    if (!result.success) {
      return res.status(404).json({ error: result.reason });
    }

    // Log the event
    const auditService = getAuditService();
    await auditService.initialize();
    await auditService.logEvent({
      type: 'API_KEY_MANAGEMENT',
      action: 'REVOKE_API_KEY',
      apiKey: result.apiKey
    });

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });

  } catch (error) {
    console.error('[Enterprise] Revoke API key failed:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

/**
 * POST /enterprise/webhooks
 * Register a new webhook
 */
router.post('/webhooks', async (req, res) => {
  try {
    const { url, events, secret, userId, apiKey, name, headers } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    if (!events || events.length === 0) {
      return res.status(400).json({ error: 'At least one event type is required' });
    }

    const webhookService = getWebhookService();
    await webhookService.initialize();

    const webhook = await webhookService.registerWebhook({
      url,
      events,
      secret,
      userId,
      apiKey,
      name,
      headers
    });

    res.json({
      success: true,
      webhook
    });

  } catch (error) {
    console.error('[Enterprise] Webhook registration failed:', error);
    res.status(500).json({ error: 'Failed to register webhook', details: error.message });
  }
});

/**
 * GET /enterprise/webhooks
 * List webhooks
 */
router.get('/webhooks', async (req, res) => {
  try {
    const { userId, apiKey, active } = req.query;

    const webhookService = getWebhookService();
    await webhookService.initialize();

    const webhooks = await webhookService.listWebhooks({
      userId,
      apiKey,
      active: active !== undefined ? active === 'true' : undefined
    });

    res.json({
      success: true,
      count: webhooks.length,
      webhooks
    });

  } catch (error) {
    console.error('[Enterprise] List webhooks failed:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

/**
 * POST /enterprise/webhooks/:webhookId/test
 * Test webhook delivery
 */
router.post('/webhooks/:webhookId/test', async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhookService = getWebhookService();
    await webhookService.initialize();

    const result = await webhookService.testWebhook(webhookId);

    res.json({
      success: result.success,
      message: result.message || result.error
    });

  } catch (error) {
    console.error('[Enterprise] Test webhook failed:', error);
    res.status(500).json({ error: 'Failed to test webhook', details: error.message });
  }
});

/**
 * DELETE /enterprise/webhooks/:webhookId
 * Delete a webhook
 */
router.delete('/webhooks/:webhookId', async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhookService = getWebhookService();
    await webhookService.initialize();

    const deleted = await webhookService.deleteWebhook(webhookId);

    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    console.error('[Enterprise] Delete webhook failed:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// ============================================================================
// COMPLIANCE & AUDIT
// ============================================================================

/**
 * GET /enterprise/audit/proof/:proofId
 * Get audit trail for a specific proof
 */
router.get('/audit/proof/:proofId', async (req, res) => {
  try {
    const { proofId } = req.params;

    const auditService = getAuditService();
    await auditService.initialize();

    const trail = await auditService.getProofAuditTrail(proofId);

    res.json({
      success: true,
      proofId,
      auditTrail: trail
    });

  } catch (error) {
    console.error('[Enterprise] Get proof audit trail failed:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

/**
 * GET /enterprise/audit/user/:userId
 * Get audit trail for a user
 */
router.get('/audit/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset, startDate, endDate } = req.query;

    const auditService = getAuditService();
    await auditService.initialize();

    const trail = await auditService.getUserAuditTrail(userId, {
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
      startDate,
      endDate
    });

    res.json({
      success: true,
      userId,
      auditTrail: trail
    });

  } catch (error) {
    console.error('[Enterprise] Get user audit trail failed:', error);
    res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

/**
 * POST /enterprise/compliance/report
 * Generate compliance report
 */
router.post('/compliance/report', async (req, res) => {
  try {
    const { startDate, endDate, userId, type } = req.body;

    const auditService = getAuditService();
    await auditService.initialize();

    const report = await auditService.generateComplianceReport({
      startDate,
      endDate,
      userId,
      type
    });

    res.json({
      success: true,
      report: report.report,
      preview: report.entries.slice(0, 10) // First 10 entries
    });

  } catch (error) {
    console.error('[Enterprise] Generate compliance report failed:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

/**
 * POST /enterprise/compliance/export
 * Export audit trail
 */
router.post('/compliance/export', async (req, res) => {
  try {
    const { startDate, endDate, userId, type } = req.body;

    const auditService = getAuditService();
    await auditService.initialize();

    const result = await auditService.exportAuditTrail({
      startDate,
      endDate,
      userId,
      type
    });

    res.json({
      success: true,
      export: {
        filename: result.filename,
        exportedAt: result.generatedAt,
        totalEntries: result.statistics.totalEvents,
        complianceStatus: result.complianceStatus
      }
    });

  } catch (error) {
    console.error('[Enterprise] Export audit trail failed:', error);
    res.status(500).json({ error: 'Failed to export audit trail' });
  }
});

/**
 * GET /enterprise/audit/verify-integrity
 * Verify audit log integrity
 */
router.get('/audit/verify-integrity', async (req, res) => {
  try {
    const auditService = getAuditService();
    await auditService.initialize();

    const result = await auditService.verifyIntegrity();

    res.json({
      success: true,
      integrity: result
    });

  } catch (error) {
    console.error('[Enterprise] Verify integrity failed:', error);
    res.status(500).json({ error: 'Failed to verify audit log integrity' });
  }
});

/**
 * GET /enterprise/audit/recent
 * Get recent activity
 */
router.get('/audit/recent', async (req, res) => {
  try {
    const { limit } = req.query;

    const auditService = getAuditService();
    await auditService.initialize();

    const activity = await auditService.getRecentActivity(
      limit ? parseInt(limit) : 50
    );

    res.json({
      success: true,
      activity
    });

  } catch (error) {
    console.error('[Enterprise] Get recent activity failed:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * GET /enterprise
 * Enterprise API documentation
 */
router.get('/', (req, res) => {
  res.json({
    service: 'QuantumVault Enterprise API',
    version: '2.0',
    endpoints: {
      'API Key Management': {
        'POST /enterprise/api-keys': 'Generate new API key',
        'GET /enterprise/api-keys': 'List API keys',
        'GET /enterprise/api-keys/:apiKey/usage': 'Get API key usage',
        'DELETE /enterprise/api-keys/:apiKey': 'Revoke API key'
      },
      'Webhook Management': {
        'POST /enterprise/webhooks': 'Register webhook',
        'GET /enterprise/webhooks': 'List webhooks',
        'POST /enterprise/webhooks/:id/test': 'Test webhook',
        'DELETE /enterprise/webhooks/:id': 'Delete webhook'
      },
      'Audit & Compliance': {
        'GET /enterprise/audit/proof/:id': 'Get proof audit trail',
        'GET /enterprise/audit/user/:id': 'Get user audit trail',
        'POST /enterprise/compliance/report': 'Generate compliance report',
        'POST /enterprise/compliance/export': 'Export audit trail',
        'GET /enterprise/audit/verify-integrity': 'Verify audit log integrity',
        'GET /enterprise/audit/recent': 'Get recent activity'
      }
    },
    features: [
      'API key management with rate limiting',
      'Real-time webhook notifications',
      'Comprehensive audit logging',
      'Compliance reporting (SOC2, HIPAA, GDPR)',
      'Batch operations',
      'Usage analytics'
    ],
    supportedWebhookEvents: [
      'proof.generated',
      'proof.verified',
      'proof.anchored',
      'batch.completed'
    ],
    apiKeyTiers: {
      free: '100 requests/hour',
      standard: '1000 requests/hour + blockchain anchoring',
      professional: '10000 requests/hour + webhooks + batch processing',
      enterprise: 'Unlimited + custom integrations + priority support'
    }
  });
});

export default router;
