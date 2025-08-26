/**
 * Slack Notifier
 * Sends anomaly alerts to Slack channels via webhook
 */

import { Notifier } from './notifier.js';

class SlackNotifier extends Notifier {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      webhookUrl: config.webhookUrl,
      channel: config.channel || '#alerts',
      username: config.username || 'PulseScan',
      timeout: config.timeout || 5000,
      retries: config.retries || 3,
      ...config
    };

    if (!this.config.webhookUrl) {
      throw new Error('SlackNotifier requires webhookUrl configuration');
    }
  }

  /**
   * Send Slack notification
   */
  async send(anomaly) {
    if (!this.config.webhookUrl) {
      console.warn('[SlackNotifier] No webhook URL configured, skipping');
      return false;
    }

    const payload = this.buildSlackPayload(anomaly);
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.makeSlackRequest(payload);
        
        if (response.ok) {
          console.log(`[SlackNotifier] Successfully sent anomaly ${anomaly.id} to Slack`);
          return true;
        } else {
          const responseText = await response.text();
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }
        
      } catch (error) {
        console.error(`[SlackNotifier] Attempt ${attempt}/${this.config.retries} failed:`, error.message);
        
        if (attempt < this.config.retries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    console.error(`[SlackNotifier] Failed to send anomaly ${anomaly.id} after ${this.config.retries} attempts`);
    return false;
  }

  /**
   * Build Slack message payload
   */
  buildSlackPayload(anomaly) {
    const emoji = this.getSeverityEmoji(anomaly.severity);
    const color = this.getSeverityColor(anomaly.severity);
    const formatted = this.formatAnomaly(anomaly);
    
    return {
      channel: this.config.channel,
      username: this.config.username,
      icon_emoji: ':warning:',
      attachments: [
        {
          color: color,
          title: `${emoji} ${anomaly.type.replace('_', ' ').toUpperCase()} Anomaly Detected`,
          title_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pulseguard`,
          text: anomaly.explanation,
          fields: [
            {
              title: 'Severity',
              value: anomaly.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Entity',
              value: `${anomaly.entity.kind}: ${anomaly.entity.id}`,
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date(anomaly.timestamp).toLocaleString(),
              short: true
            },
            {
              title: 'Anomaly ID',
              value: anomaly.id.substring(0, 8),
              short: true
            }
          ],
          footer: 'Dytallix PulseScan',
          footer_icon: 'https://dytallix.com/favicon.ico',
          ts: Math.floor(anomaly.timestamp / 1000)
        }
      ]
    };
  }

  /**
   * Get emoji for severity level
   */
  getSeverityEmoji(severity) {
    const emojis = {
      'low': '🔵',
      'medium': '🟡', 
      'high': '🟠',
      'critical': '🔴'
    };
    return emojis[severity] || '⚪';
  }

  /**
   * Get color for severity level
   */
  getSeverityColor(severity) {
    const colors = {
      'low': '#2563eb',      // blue
      'medium': '#d97706',   // amber
      'high': '#ea580c',     // orange
      'critical': '#dc2626'  // red
    };
    return colors[severity] || '#6b7280';
  }

  /**
   * Make Slack webhook request
   */
  async makeSlackRequest(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Test Slack configuration
   */
  async test() {
    const testPayload = {
      channel: this.config.channel,
      username: this.config.username,
      icon_emoji: ':white_check_mark:',
      text: 'Test notification from PulseScan anomaly detection system',
      attachments: [
        {
          color: '#16a34a',
          title: '✅ Test Notification',
          text: 'If you can see this message, Slack notifications are configured correctly.',
          footer: 'Dytallix PulseScan',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    try {
      const response = await this.makeSlackRequest(testPayload);
      if (response.ok) {
        console.log('[SlackNotifier] Test notification sent successfully');
        return true;
      } else {
        const responseText = await response.text();
        console.error(`[SlackNotifier] Test failed: HTTP ${response.status} - ${responseText}`);
        return false;
      }
    } catch (error) {
      console.error('[SlackNotifier] Test failed:', error.message);
      return false;
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { SlackNotifier };