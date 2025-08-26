/**
 * Notifier Interface
 * Base class for all alerting implementations
 */

class Notifier {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Send notification for an anomaly
   * @param {Object} anomaly The anomaly object to send
   * @returns {Promise<boolean>} Success status
   */
  async send(anomaly) {
    throw new Error('send() must be implemented by subclass');
  }

  /**
   * Test the notifier configuration
   * @returns {Promise<boolean>} Test success status
   */
  async test() {
    throw new Error('test() must be implemented by subclass');
  }

  /**
   * Check if notifier should send for this anomaly severity
   * @param {string} severity Anomaly severity
   * @param {string} minSeverity Minimum severity to send
   * @returns {boolean} Whether to send
   */
  shouldSend(severity, minSeverity = 'medium') {
    const severityLevels = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };

    return severityLevels[severity] >= severityLevels[minSeverity];
  }

  /**
   * Format anomaly for notification
   * @param {Object} anomaly The anomaly object
   * @returns {Object} Formatted notification data
   */
  formatAnomaly(anomaly) {
    return {
      id: anomaly.id,
      type: anomaly.type,
      severity: anomaly.severity,
      entity: anomaly.entity,
      timestamp: new Date(anomaly.timestamp).toISOString(),
      explanation: anomaly.explanation,
      metrics: anomaly.metrics
    };
  }
}

export { Notifier };