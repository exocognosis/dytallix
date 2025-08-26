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
import { ConfigLoader } from './config_loader.js';
import { AlertingManager } from './alerting/alerting_manager.js';

class AnomalyDetectionEngine {
  constructor(config = {}) {
    // Load configuration using ConfigLoader only if configPath is provided
    if (config.configPath) {
      const configLoader = new ConfigLoader();
      this.config = configLoader.load(config.configPath);
      
      // Override with any provided config
      if (Object.keys(config).length > 1) { // More than just configPath
        this.config = this.deepMerge(this.config, config);
      }
    } else {
      // Use provided config directly
      const configLoader = new ConfigLoader();
      this.config = this.deepMerge(configLoader.defaults, config);
    }

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
    this.alertingManager = new AlertingManager(this.config.alerts);
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

      // Send alert if configured
      try {
        await this.alertingManager.sendAlert(anomaly);
      } catch (error) {
        console.error('[AnomalyDetectionEngine] Error sending alert:', error);
      }
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
      alerting: this.alertingManager.getStats(),
      recentAnomaliesCount: this.recentAnomalies.length,
      config: this.config
    };
  }

  /**
   * Test alerting system
   */
  async testAlerting() {
    return this.alertingManager.testNotifiers();
  }

  /**
   * Send test alert
   */
  async sendTestAlert() {
    return this.alertingManager.sendTestAlert();
  }

  /**
   * Deep merge utility
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
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