/**
 * Webhook Notifier
 * Sends anomaly alerts via HTTP webhook
 */

import { Notifier } from './notifier.js';

class WebhookNotifier extends Notifier {
  constructor(config = {}) {
    super(config);
    
    this.config = {
      url: config.url,
      timeout: config.timeout || 5000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    if (!this.config.url) {
      throw new Error('WebhookNotifier requires URL configuration');
    }
  }

  /**
   * Send webhook notification
   */
  async send(anomaly) {
    if (!this.config.url) {
      console.warn('[WebhookNotifier] No URL configured, skipping');
      return false;
    }

    const payload = this.buildPayload(anomaly);
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.makeRequest(payload);
        
        if (response.ok) {
          console.log(`[WebhookNotifier] Successfully sent anomaly ${anomaly.id}`);
          return true;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        console.error(`[WebhookNotifier] Attempt ${attempt}/${this.config.retries} failed:`, error.message);
        
        if (attempt < this.config.retries) {
          await this.sleep(this.config.retryDelay * attempt);
        }
      }
    }

    console.error(`[WebhookNotifier] Failed to send anomaly ${anomaly.id} after ${this.config.retries} attempts`);
    return false;
  }

  /**
   * Build webhook payload
   */
  buildPayload(anomaly) {
    const formatted = this.formatAnomaly(anomaly);
    
    return {
      event: 'anomaly_detected',
      timestamp: new Date().toISOString(),
      source: 'dytallix-pulsescan',
      data: {
        anomaly: formatted,
        priority: this.mapSeverityToPriority(anomaly.severity),
        alert_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pulseguard`,
        summary: `${anomaly.type.replace('_', ' ')} anomaly detected: ${anomaly.explanation.split('.')[0]}`
      }
    };
  }

  /**
   * Map severity to priority level
   */
  mapSeverityToPriority(severity) {
    const mapping = {
      'low': 'info',
      'medium': 'warning', 
      'high': 'high',
      'critical': 'critical'
    };
    return mapping[severity] || 'info';
  }

  /**
   * Make HTTP request with timeout
   */
  async makeRequest(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: this.config.headers,
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
   * Test webhook configuration
   */
  async test() {
    const testPayload = {
      event: 'test_notification',
      timestamp: new Date().toISOString(),
      source: 'dytallix-pulsescan',
      data: {
        message: 'This is a test notification from PulseScan anomaly detection system',
        test: true
      }
    };

    try {
      const response = await this.makeRequest(testPayload);
      if (response.ok) {
        console.log('[WebhookNotifier] Test notification sent successfully');
        return true;
      } else {
        console.error(`[WebhookNotifier] Test failed: HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('[WebhookNotifier] Test failed:', error.message);
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

export { WebhookNotifier };