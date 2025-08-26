/**
 * Alerting Manager
 * Coordinates multiple notification channels and manages alert routing
 */

import { WebhookNotifier } from './webhook_notifier.js';
import { SlackNotifier } from './slack_notifier.js';

class AlertingManager {
  constructor(config = {}) {
    this.config = {
      minSeverity: config.minSeverity || 'medium',
      webhook: config.webhook || {},
      slack: config.slack || {},
      ...config
    };

    this.notifiers = [];
    this.stats = {
      totalAlerts: 0,
      alertsByChannel: {},
      alertsBySeverity: {},
      errors: 0,
      lastAlert: null
    };

    this.initializeNotifiers();
  }

  /**
   * Initialize configured notifiers
   */
  initializeNotifiers() {
    // Initialize webhook notifier
    if (this.config.webhook.enabled && this.config.webhook.url) {
      try {
        const webhookNotifier = new WebhookNotifier(this.config.webhook);
        this.notifiers.push({
          name: 'webhook',
          instance: webhookNotifier,
          enabled: true
        });
        console.log('[AlertingManager] Webhook notifier initialized');
      } catch (error) {
        console.error('[AlertingManager] Failed to initialize webhook notifier:', error.message);
      }
    }

    // Initialize Slack notifier
    if (this.config.slack.enabled && this.config.slack.webhookUrl) {
      try {
        const slackNotifier = new SlackNotifier(this.config.slack);
        this.notifiers.push({
          name: 'slack',
          instance: slackNotifier,
          enabled: true
        });
        console.log('[AlertingManager] Slack notifier initialized');
      } catch (error) {
        console.error('[AlertingManager] Failed to initialize Slack notifier:', error.message);
      }
    }

    if (this.notifiers.length === 0) {
      console.log('[AlertingManager] No notifiers configured');
    } else {
      console.log(`[AlertingManager] Initialized ${this.notifiers.length} notifiers`);
    }
  }

  /**
   * Send alert to all configured notifiers
   */
  async sendAlert(anomaly) {
    // Check if we should send this alert
    if (!this.shouldSendAlert(anomaly)) {
      return;
    }

    console.log(`[AlertingManager] Sending alert for anomaly ${anomaly.id} (${anomaly.severity})`);

    const results = [];
    
    // Send to all enabled notifiers
    for (const notifier of this.notifiers) {
      if (!notifier.enabled) {
        continue;
      }

      try {
        const success = await notifier.instance.send(anomaly);
        results.push({
          notifier: notifier.name,
          success
        });

        // Update stats
        this.stats.alertsByChannel[notifier.name] = (this.stats.alertsByChannel[notifier.name] || 0) + 1;

      } catch (error) {
        console.error(`[AlertingManager] Error sending to ${notifier.name}:`, error);
        this.stats.errors++;
        results.push({
          notifier: notifier.name,
          success: false,
          error: error.message
        });
      }
    }

    // Update overall stats
    this.stats.totalAlerts++;
    this.stats.alertsBySeverity[anomaly.severity] = (this.stats.alertsBySeverity[anomaly.severity] || 0) + 1;
    this.stats.lastAlert = Date.now();

    const successCount = results.filter(r => r.success).length;
    console.log(`[AlertingManager] Alert sent: ${successCount}/${results.length} notifiers succeeded`);

    return results;
  }

  /**
   * Check if alert should be sent based on severity
   */
  shouldSendAlert(anomaly) {
    const severityLevels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };

    const minLevel = severityLevels[this.config.minSeverity] || 2;
    const anomalyLevel = severityLevels[anomaly.severity] || 1;

    return anomalyLevel >= minLevel;
  }

  /**
   * Test all configured notifiers
   */
  async testNotifiers() {
    console.log('[AlertingManager] Testing all notifiers...');
    
    const results = [];
    
    for (const notifier of this.notifiers) {
      console.log(`[AlertingManager] Testing ${notifier.name} notifier...`);
      
      try {
        const success = await notifier.instance.test();
        results.push({
          notifier: notifier.name,
          success,
          enabled: notifier.enabled
        });
        
        if (success) {
          console.log(`[AlertingManager] ✅ ${notifier.name} test passed`);
        } else {
          console.log(`[AlertingManager] ❌ ${notifier.name} test failed`);
        }
        
      } catch (error) {
        console.error(`[AlertingManager] ❌ ${notifier.name} test error:`, error.message);
        results.push({
          notifier: notifier.name,
          success: false,
          enabled: notifier.enabled,
          error: error.message
        });
      }
    }

    const passedCount = results.filter(r => r.success).length;
    console.log(`[AlertingManager] Testing complete: ${passedCount}/${results.length} notifiers passed`);
    
    return results;
  }

  /**
   * Enable/disable a specific notifier
   */
  setNotifierEnabled(name, enabled) {
    const notifier = this.notifiers.find(n => n.name === name);
    if (notifier) {
      notifier.enabled = enabled;
      console.log(`[AlertingManager] ${name} notifier ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Get alerting statistics
   */
  getStats() {
    return {
      ...this.stats,
      notifiers: this.notifiers.map(n => ({
        name: n.name,
        enabled: n.enabled
      })),
      config: {
        minSeverity: this.config.minSeverity,
        webhookEnabled: this.config.webhook.enabled,
        slackEnabled: this.config.slack.enabled
      }
    };
  }

  /**
   * Send a test alert with mock anomaly data
   */
  async sendTestAlert() {
    const testAnomaly = {
      id: 'test-' + Date.now(),
      type: 'test_alert',
      severity: 'medium',
      entity: {
        kind: 'system',
        id: 'alerting-test'
      },
      timestamp: Date.now(),
      explanation: 'This is a test alert to verify the alerting system is working correctly.',
      metrics: {
        test: true,
        timestamp: new Date().toISOString()
      }
    };

    return this.sendAlert(testAnomaly);
  }

  /**
   * Update configuration and reinitialize notifiers
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.notifiers = [];
    this.initializeNotifiers();
    console.log('[AlertingManager] Configuration updated and notifiers reinitialized');
  }
}

export { AlertingManager };