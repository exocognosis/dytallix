/**
 * Transaction Spike Detector
 * Detects anomalous transaction volume using rolling window statistics
 */

import { RollingWindow, EWMA, StatisticalUtils } from './statistical.js';
import { randomUUID } from 'crypto';

class TxSpikeDetector {
  constructor(config = {}) {
    this.config = {
      windowSize: config.windowSize || 300, // 5 minutes of 1-second samples
      zThreshold: config.zThreshold || 4.0,
      ewmaAlpha: config.ewmaAlpha || 0.1,
      ewmaDeltaThreshold: config.ewmaDeltaThreshold || 0.5,
      minRate: config.minRate || 10, // Minimum transaction rate to consider
      cooldownMs: config.cooldownMs || 60000, // 1 minute cooldown between alerts
      ...config
    };

    this.txRateWindow = new RollingWindow(this.config.windowSize);
    this.ewma = new EWMA(this.config.ewmaAlpha);
    this.lastAlert = 0;
    this.stats = {
      totalSamples: 0,
      spikesDetected: 0,
      falsePositives: 0,
      lastSpike: null
    };
  }

  /**
   * Process transaction metrics and detect spikes
   */
  async processMetrics(txMetrics) {
    const anomalies = [];

    for (const metric of txMetrics) {
      if (metric.type !== 'tx') continue;

      const txRate = metric.fields.tx_count || 0;
      const timestamp = metric.timestamp;

      // Update rolling window
      this.txRateWindow.add(txRate);
      this.stats.totalSamples++;

      // Update EWMA
      const ewmaValue = this.ewma.update(txRate);

      // Skip detection if not enough data
      if (this.txRateWindow.length < 30) {
        continue;
      }

      // Check for anomalies using multiple methods
      const anomaly = this.detectAnomaly(txRate, timestamp, ewmaValue, metric);
      
      if (anomaly) {
        // Check cooldown period
        if (timestamp - this.lastAlert >= this.config.cooldownMs) {
          anomalies.push(anomaly);
          this.lastAlert = timestamp;
          this.stats.spikesDetected++;
          this.stats.lastSpike = timestamp;
        }
      }
    }

    return anomalies;
  }

  /**
   * Detect anomaly using statistical methods
   */
  detectAnomaly(txRate, timestamp, ewmaValue, metric) {
    // Skip if rate is too low to be meaningful
    if (txRate < this.config.minRate) {
      return null;
    }

    // Method 1: Z-score detection
    const zScore = StatisticalUtils.zScore(txRate, this.txRateWindow);
    const isAnomalousZ = StatisticalUtils.isAnomalousZScore(zScore, this.config.zThreshold);

    // Method 2: EWMA delta detection
    const ewmaDelta = ewmaValue ? Math.abs(txRate - ewmaValue) / ewmaValue : 0;
    const isAnomalousEWMA = ewmaDelta >= this.config.ewmaDeltaThreshold;

    // Method 3: Rate spike detection
    const recentValues = this.txRateWindow.values.slice(-10);
    const isSpike = StatisticalUtils.detectSpike(this.txRateWindow.values, 2.5);

    if (!isAnomalousZ && !isAnomalousEWMA && !isSpike) {
      return null;
    }

    // Determine severity
    const severity = this.calculateSeverity(zScore, ewmaDelta, txRate);

    // Calculate metrics for explanation
    const mean = this.txRateWindow.mean();
    const stddev = this.txRateWindow.stddev();
    const percentile95 = this.txRateWindow.percentile(95);

    return {
      id: randomUUID(),
      type: 'tx_spike',
      severity,
      entity: {
        kind: 'network',
        id: 'dytallix-main'
      },
      timestamp,
      explanation: this.generateExplanation(txRate, mean, zScore, ewmaDelta, severity),
      metrics: {
        tx_rate: txRate,
        baseline_mean: Math.round(mean * 100) / 100,
        z_score: Math.round(zScore * 100) / 100,
        ewma_delta: Math.round(ewmaDelta * 100) / 100,
        percentile_95: Math.round(percentile95),
        stddev: Math.round(stddev * 100) / 100,
        window_size: this.txRateWindow.length,
        detection_methods: {
          z_score: isAnomalousZ,
          ewma_delta: isAnomalousEWMA,
          spike_detection: isSpike
        }
      }
    };
  }

  /**
   * Calculate anomaly severity based on deviation magnitude
   */
  calculateSeverity(zScore, ewmaDelta, txRate) {
    const absZ = Math.abs(zScore);
    
    if (absZ >= 6 || ewmaDelta >= 1.0 || txRate >= 500) {
      return 'critical';
    } else if (absZ >= 5 || ewmaDelta >= 0.8 || txRate >= 300) {
      return 'high';
    } else if (absZ >= 4 || ewmaDelta >= 0.6 || txRate >= 200) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(txRate, mean, zScore, ewmaDelta, severity) {
    const deviationPercent = Math.round(((txRate - mean) / mean) * 100);
    const direction = txRate > mean ? 'above' : 'below';
    
    let explanation = `Transaction spike detected: ${txRate} tx/sec is ${Math.abs(deviationPercent)}% ${direction} baseline (${Math.round(mean)} tx/sec).`;
    
    if (Math.abs(zScore) >= this.config.zThreshold) {
      explanation += ` Z-score: ${Math.round(zScore * 100) / 100} (threshold: ${this.config.zThreshold}).`;
    }
    
    if (ewmaDelta >= this.config.ewmaDeltaThreshold) {
      explanation += ` EWMA deviation: ${Math.round(ewmaDelta * 100)}%.`;
    }

    explanation += ` Severity: ${severity}.`;
    
    return explanation;
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      ...this.stats,
      config: this.config,
      windowStats: {
        size: this.txRateWindow.length,
        mean: this.txRateWindow.mean(),
        stddev: this.txRateWindow.stddev(),
        min: this.txRateWindow.min(),
        max: this.txRateWindow.max()
      },
      ewmaValue: this.ewma.get()
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.txRateWindow.clear();
    this.ewma.reset();
    this.lastAlert = 0;
    this.stats = {
      totalSamples: 0,
      spikesDetected: 0,
      falsePositives: 0,
      lastSpike: null
    };
  }
}

export { TxSpikeDetector };