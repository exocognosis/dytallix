/**
 * Monitoring & Analytics Service for QuantumVault
 * 
 * Real-time monitoring and performance tracking:
 * - Service health metrics
 * - Performance analytics
 * - Error tracking
 * - Usage statistics
 * - Alert management
 */

import { promises as fs } from 'fs';
import { join } from 'path';

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        failed: 0,
        byEndpoint: {}
      },
      proofs: {
        generated: 0,
        verified: 0,
        anchored: 0,
        failed: 0
      },
      performance: {
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        responseTimes: []
      },
      blockchain: {
        anchorSuccess: 0,
        anchorFailed: 0,
        avgAnchorTime: 0
      },
      storage: {
        proofsSaved: 0,
        storageUsed: 0
      },
      errors: [],
      alerts: []
    };

    this.startTime = Date.now();
    this.metricsHistory = [];
    this.maxHistorySize = 1000;
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 5000, // 5 seconds
      anchorFailureRate: 0.10 // 10% failure rate
    };
  }

  /**
   * Record API request
   */
  recordRequest(endpoint, duration, success = true, error = null) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failed++;
      
      // Record error
      if (error) {
        this.recordError(endpoint, error);
      }
    }

    // Track by endpoint
    if (!this.metrics.requests.byEndpoint[endpoint]) {
      this.metrics.requests.byEndpoint[endpoint] = {
        total: 0,
        success: 0,
        failed: 0,
        avgDuration: 0
      };
    }

    const endpointMetrics = this.metrics.requests.byEndpoint[endpoint];
    endpointMetrics.total++;
    
    if (success) {
      endpointMetrics.success++;
    } else {
      endpointMetrics.failed++;
    }

    // Update avg duration
    endpointMetrics.avgDuration = 
      (endpointMetrics.avgDuration * (endpointMetrics.total - 1) + duration) / endpointMetrics.total;

    // Record response time
    this.recordResponseTime(duration);

    // Check for alerts
    this.checkAlerts();
  }

  /**
   * Record response time
   */
  recordResponseTime(duration) {
    this.metrics.performance.responseTimes.push({
      time: Date.now(),
      duration
    });

    // Keep only recent response times (last 1000)
    if (this.metrics.performance.responseTimes.length > this.maxHistorySize) {
      this.metrics.performance.responseTimes.shift();
    }

    // Calculate percentiles
    const sorted = this.metrics.performance.responseTimes
      .map(r => r.duration)
      .sort((a, b) => a - b);

    if (sorted.length > 0) {
      this.metrics.performance.avgResponseTime = 
        sorted.reduce((a, b) => a + b, 0) / sorted.length;
      
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      
      this.metrics.performance.p95ResponseTime = sorted[p95Index] || 0;
      this.metrics.performance.p99ResponseTime = sorted[p99Index] || 0;
    }
  }

  /**
   * Record proof generation
   */
  recordProofGeneration(success = true, duration = 0) {
    if (success) {
      this.metrics.proofs.generated++;
    } else {
      this.metrics.proofs.failed++;
    }

    this.metrics.storage.proofsSaved++;
  }

  /**
   * Record proof verification
   */
  recordProofVerification(success = true) {
    if (success) {
      this.metrics.proofs.verified++;
    }
  }

  /**
   * Record blockchain anchoring
   */
  recordAnchor(success = true, duration = 0) {
    if (success) {
      this.metrics.proofs.anchored++;
      this.metrics.blockchain.anchorSuccess++;
      
      // Update avg anchor time
      const total = this.metrics.blockchain.anchorSuccess;
      this.metrics.blockchain.avgAnchorTime = 
        (this.metrics.blockchain.avgAnchorTime * (total - 1) + duration) / total;
    } else {
      this.metrics.blockchain.anchorFailed++;
    }

    // Check anchor failure rate
    const totalAnchors = this.metrics.blockchain.anchorSuccess + this.metrics.blockchain.anchorFailed;
    const failureRate = this.metrics.blockchain.anchorFailed / totalAnchors;
    
    if (failureRate > this.alertThresholds.anchorFailureRate) {
      this.createAlert('HIGH_ANCHOR_FAILURE_RATE', {
        rate: failureRate,
        threshold: this.alertThresholds.anchorFailureRate
      });
    }
  }

  /**
   * Record error
   */
  recordError(endpoint, error) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      endpoint,
      message: error.message || error,
      stack: error.stack
    };

    this.metrics.errors.push(errorRecord);

    // Keep only recent errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }

    // Check error rate
    const errorRate = this.metrics.requests.failed / this.metrics.requests.total;
    if (errorRate > this.alertThresholds.errorRate) {
      this.createAlert('HIGH_ERROR_RATE', {
        rate: errorRate,
        threshold: this.alertThresholds.errorRate
      });
    }
  }

  /**
   * Create alert
   */
  createAlert(type, data) {
    const alert = {
      id: `alert-${Date.now()}`,
      type,
      severity: this.getAlertSeverity(type),
      data,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    // Don't duplicate recent alerts
    const recentAlert = this.metrics.alerts.find(
      a => a.type === type && Date.now() - new Date(a.timestamp).getTime() < 60000 // 1 minute
    );

    if (!recentAlert) {
      this.metrics.alerts.push(alert);
      console.warn(`[Monitoring] ALERT: ${type}`, data);
    }

    // Keep only recent alerts
    if (this.metrics.alerts.length > 50) {
      this.metrics.alerts.shift();
    }
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(type) {
    const severityMap = {
      'HIGH_ERROR_RATE': 'critical',
      'HIGH_ANCHOR_FAILURE_RATE': 'warning',
      'SLOW_RESPONSE_TIME': 'warning',
      'BLOCKCHAIN_DISCONNECTED': 'critical'
    };

    return severityMap[type] || 'info';
  }

  /**
   * Check for alerts
   */
  checkAlerts() {
    // Check response time
    if (this.metrics.performance.p95ResponseTime > this.alertThresholds.responseTime) {
      this.createAlert('SLOW_RESPONSE_TIME', {
        p95: this.metrics.performance.p95ResponseTime,
        threshold: this.alertThresholds.responseTime
      });
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  /**
   * Get service health
   */
  getHealth() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.metrics.requests.total > 0 
      ? this.metrics.requests.failed / this.metrics.requests.total 
      : 0;

    const health = {
      status: 'healthy',
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      errorRate: errorRate,
      activeAlerts: this.metrics.alerts.filter(a => !a.acknowledged).length
    };

    // Determine health status
    if (errorRate > 0.10) {
      health.status = 'degraded';
    } else if (errorRate > 0.20) {
      health.status = 'unhealthy';
    }

    if (this.metrics.alerts.some(a => !a.acknowledged && a.severity === 'critical')) {
      health.status = 'critical';
    }

    return health;
  }

  /**
   * Get full metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      health: this.getHealth(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      responseTime: {
        avg: Math.round(this.metrics.performance.avgResponseTime),
        p95: Math.round(this.metrics.performance.p95ResponseTime),
        p99: Math.round(this.metrics.performance.p99ResponseTime)
      },
      requests: {
        total: this.metrics.requests.total,
        successRate: this.metrics.requests.total > 0
          ? (this.metrics.requests.success / this.metrics.requests.total * 100).toFixed(2) + '%'
          : '0%'
      },
      blockchain: {
        avgAnchorTime: Math.round(this.metrics.blockchain.avgAnchorTime),
        successRate: (this.metrics.blockchain.anchorSuccess + this.metrics.blockchain.anchorFailed) > 0
          ? (this.metrics.blockchain.anchorSuccess / (this.metrics.blockchain.anchorSuccess + this.metrics.blockchain.anchorFailed) * 100).toFixed(2) + '%'
          : '0%'
      },
      proofs: {
        total: this.metrics.proofs.generated,
        verified: this.metrics.proofs.verified,
        anchored: this.metrics.proofs.anchored
      }
    };
  }

  /**
   * Get endpoint statistics
   */
  getEndpointStats() {
    return Object.entries(this.metrics.requests.byEndpoint).map(([endpoint, stats]) => ({
      endpoint,
      total: stats.total,
      successRate: (stats.success / stats.total * 100).toFixed(2) + '%',
      avgDuration: Math.round(stats.avgDuration) + 'ms'
    }));
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10) {
    return this.metrics.errors.slice(-limit).reverse();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.metrics.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Format uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Export metrics to file
   */
  async exportMetrics(filePath) {
    const metrics = this.getMetrics();
    await fs.writeFile(filePath, JSON.stringify(metrics, null, 2));
    console.log(`[Monitoring] Metrics exported to ${filePath}`);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, failed: 0, byEndpoint: {} },
      proofs: { generated: 0, verified: 0, anchored: 0, failed: 0 },
      performance: { avgResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0, responseTimes: [] },
      blockchain: { anchorSuccess: 0, anchorFailed: 0, avgAnchorTime: 0 },
      storage: { proofsSaved: 0, storageUsed: 0 },
      errors: [],
      alerts: []
    };
    this.startTime = Date.now();
    console.log('[Monitoring] Metrics reset');
  }
}

// Singleton instance
let monitoringInstance = null;

/**
 * Get monitoring service instance
 */
export function getMonitoring() {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService();
  }
  return monitoringInstance;
}

export { MonitoringService };
