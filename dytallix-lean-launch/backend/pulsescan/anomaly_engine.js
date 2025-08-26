/**
 * Anomaly Detection Engine
 * Coordinates telemetry collection, storage, and anomaly detection
 */

import { MempoolCollector } from './ingest/mempool_collector.js';
import { BlockCollector } from './ingest/block_collector.js';
import { MemoryTimeSeriesWriter } from './storage/memory_storage.js';
import { TxSpikeDetector } from './anomaly/tx_spike_detector.js';
import { ValidatorDowntimeDetector } from './anomaly/validator_downtime_detector.js';
import { DoubleSignDetector } from './anomaly/double_sign_detector.js';

class AnomalyDetectionEngine {
  constructor(config = {}) {
    this.config = {
      // Storage configuration
      storage: {
        type: 'memory',
        maxPoints: 10000,
        retentionMs: 24 * 60 * 60 * 1000, // 24 hours
        ...config.storage
      },
      // Detector configurations
      detectors: {
        tx_spike: {
          enabled: true,
          windowSize: 300,
          zThreshold: 4.0,
          ewmaDeltaThreshold: 0.5,
          minRate: 10,
          ...config.detectors?.tx_spike
        },
        validator_downtime: {
          enabled: true,
          missThreshold: 3,
          criticalMissThreshold: 10,
          blockWindow: 100,
          ...config.detectors?.validator_downtime
        },
        double_sign: {
          enabled: true,
          lookbackBlocks: 1000,
          slashingWindow: 100,
          ...config.detectors?.double_sign
        }
      },
      // Collector configurations
      collectors: {
        mempool: {
          enabled: true,
          pollInterval: 1000,
          batchSize: 100,
          flushInterval: 5000,
          ...config.collectors?.mempool
        },
        block: {
          enabled: true,
          pollInterval: 5000,
          batchSize: 50,
          flushInterval: 10000,
          ...config.collectors?.block
        }
      },
      // Anomaly persistence
      anomalies: {
        maxRecent: 1000,
        retentionMs: 24 * 60 * 60 * 1000, // 24 hours
        ...config.anomalies
      },
      ...config
    };

    this.isRunning = false;
    this.recentAnomalies = []; // Store recent anomalies in memory
    this.stats = {
      startTime: null,
      totalAnomalies: 0,
      anomaliesByType: {},
      anomaliesBySeverity: {}
    };

    // Initialize components
    this.storage = new MemoryTimeSeriesWriter(this.config.storage);
    this.collectors = this.initializeCollectors();
    this.detectors = this.initializeDetectors();
  }

  /**
   * Initialize data collectors
   */
  initializeCollectors() {
    const collectors = {};

    if (this.config.collectors.mempool.enabled) {
      collectors.mempool = new MempoolCollector(this.config.collectors.mempool);
    }

    if (this.config.collectors.block.enabled) {
      collectors.block = new BlockCollector(this.config.collectors.block);
    }

    return collectors;
  }

  /**
   * Initialize anomaly detectors
   */
  initializeDetectors() {
    const detectors = {};

    if (this.config.detectors.tx_spike.enabled) {
      detectors.tx_spike = new TxSpikeDetector(this.config.detectors.tx_spike);
    }

    if (this.config.detectors.validator_downtime.enabled) {
      detectors.validator_downtime = new ValidatorDowntimeDetector(this.config.detectors.validator_downtime);
    }

    if (this.config.detectors.double_sign.enabled) {
      detectors.double_sign = new DoubleSignDetector(this.config.detectors.double_sign);
    }

    return detectors;
  }

  /**
   * Start the anomaly detection engine
   */
  async start() {
    if (this.isRunning) {
      throw new Error('AnomalyDetectionEngine already running');
    }

    console.log('[AnomalyDetectionEngine] Starting...');
    this.isRunning = true;
    this.stats.startTime = Date.now();

    // Start collectors
    for (const [name, collector] of Object.entries(this.collectors)) {
      console.log(`[AnomalyDetectionEngine] Starting ${name} collector`);
      await collector.start((metrics) => this.processMetrics(metrics));
    }

    console.log('[AnomalyDetectionEngine] Started successfully');
  }

  /**
   * Stop the anomaly detection engine
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('[AnomalyDetectionEngine] Stopping...');
    this.isRunning = false;

    // Stop collectors
    for (const [name, collector] of Object.entries(this.collectors)) {
      console.log(`[AnomalyDetectionEngine] Stopping ${name} collector`);
      collector.stop();
    }

    // Close storage
    await this.storage.close();

    console.log('[AnomalyDetectionEngine] Stopped');
  }

  /**
   * Process metrics from collectors
   */
  async processMetrics(metrics) {
    try {
      // Store metrics in time-series storage
      await this.storeMetrics(metrics);

      // Run anomaly detection
      const anomalies = await this.detectAnomalies(metrics);

      // Store anomalies
      if (anomalies.length > 0) {
        await this.storeAnomalies(anomalies);
      }

    } catch (error) {
      console.error('[AnomalyDetectionEngine] Error processing metrics:', error);
    }
  }

  /**
   * Store metrics in time-series storage
   */
  async storeMetrics(metrics) {
    const txMetrics = metrics.filter(m => m.type === 'tx');
    const blockMetrics = metrics.filter(m => m.type === 'block');
    const voteMetrics = metrics.filter(m => m.type === 'vote');

    const promises = [];

    if (txMetrics.length > 0) {
      promises.push(this.storage.writeTxMetrics(txMetrics));
    }

    if (blockMetrics.length > 0) {
      promises.push(this.storage.writeBlockMetrics(blockMetrics));
    }

    if (voteMetrics.length > 0) {
      promises.push(this.storage.writeValidatorMetrics(voteMetrics));
    }

    await Promise.all(promises);
  }

  /**
   * Run anomaly detection on metrics
   */
  async detectAnomalies(metrics) {
    const allAnomalies = [];

    // Run each detector
    for (const [name, detector] of Object.entries(this.detectors)) {
      try {
        const anomalies = await detector.processMetrics(metrics);
        allAnomalies.push(...anomalies);
      } catch (error) {
        console.error(`[AnomalyDetectionEngine] Error in ${name} detector:`, error);
      }
    }

    return allAnomalies;
  }

  /**
   * Store detected anomalies
   */
  async storeAnomalies(anomalies) {
    for (const anomaly of anomalies) {
      // Add to recent anomalies
      this.recentAnomalies.push(anomaly);

      // Update statistics
      this.stats.totalAnomalies++;
      this.stats.anomaliesByType[anomaly.type] = (this.stats.anomaliesByType[anomaly.type] || 0) + 1;
      this.stats.anomaliesBySeverity[anomaly.severity] = (this.stats.anomaliesBySeverity[anomaly.severity] || 0) + 1;

      console.log(`[AnomalyDetectionEngine] Anomaly detected: ${anomaly.type} (${anomaly.severity}) - ${anomaly.explanation}`);
    }

    // Maintain anomaly storage limits
    this.cleanupAnomalies();
  }

  /**
   * Clean up old anomalies
   */
  cleanupAnomalies() {
    const cutoffTime = Date.now() - this.config.anomalies.retentionMs;
    
    // Remove old anomalies
    this.recentAnomalies = this.recentAnomalies.filter(
      anomaly => anomaly.timestamp > cutoffTime
    );

    // Maintain max count
    if (this.recentAnomalies.length > this.config.anomalies.maxRecent) {
      // Sort by timestamp and keep most recent
      this.recentAnomalies.sort((a, b) => b.timestamp - a.timestamp);
      this.recentAnomalies = this.recentAnomalies.slice(0, this.config.anomalies.maxRecent);
    }
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(options = {}) {
    let anomalies = [...this.recentAnomalies];

    // Apply filters
    if (options.since) {
      anomalies = anomalies.filter(a => a.timestamp >= options.since);
    }

    if (options.type) {
      anomalies = anomalies.filter(a => a.type === options.type);
    }

    if (options.severity) {
      anomalies = anomalies.filter(a => a.severity === options.severity);
    }

    if (options.entity) {
      anomalies = anomalies.filter(a => 
        a.entity.kind === options.entity || a.entity.id === options.entity
      );
    }

    // Sort by timestamp (newest first)
    anomalies.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    const limit = options.limit || 100;
    return anomalies.slice(0, limit);
  }

  /**
   * Get engine statistics
   */
  getStats() {
    const collectorStats = {};
    for (const [name, collector] of Object.entries(this.collectors)) {
      collectorStats[name] = collector.getStatus();
    }

    const detectorStats = {};
    for (const [name, detector] of Object.entries(this.detectors)) {
      detectorStats[name] = detector.getStats();
    }

    return {
      isRunning: this.isRunning,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0,
      ...this.stats,
      storage: this.storage.getStats(),
      collectors: collectorStats,
      detectors: detectorStats,
      recentAnomaliesCount: this.recentAnomalies.length,
      config: this.config
    };
  }

  /**
   * Force anomaly detection run
   */
  async forceDetection() {
    console.log('[AnomalyDetectionEngine] Force detection requested');
    
    // Get recent metrics from storage
    const promises = [
      this.storage.getRecent('tx', 50),
      this.storage.getRecent('block', 20),
      this.storage.getRecent('vote', 100)
    ];

    const [txMetrics, blockMetrics, voteMetrics] = await Promise.all(promises);
    const allMetrics = [...txMetrics, ...blockMetrics, ...voteMetrics];

    if (allMetrics.length === 0) {
      console.log('[AnomalyDetectionEngine] No recent metrics available for detection');
      return [];
    }

    const anomalies = await this.detectAnomalies(allMetrics);
    
    if (anomalies.length > 0) {
      await this.storeAnomalies(anomalies);
    }

    console.log(`[AnomalyDetectionEngine] Force detection completed: ${anomalies.length} anomalies found`);
    return anomalies;
  }
}

export { AnomalyDetectionEngine };