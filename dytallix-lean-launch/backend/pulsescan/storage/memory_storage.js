/**
 * In-Memory Time Series Storage
 * Ring buffer implementation for storing recent metrics in memory
 */

import { TimeSeriesWriter } from './time_series_writer.js';

class MemoryTimeSeriesWriter extends TimeSeriesWriter {
  constructor(config = {}) {
    super();
    this.config = {
      maxPoints: config.maxPoints || 10000, // Maximum points per metric type
      retentionMs: config.retentionMs || 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };
    
    // Separate storage for different metric types
    this.storage = {
      tx: new Map(), // timestamp -> metrics
      block: new Map(),
      vote: new Map()
    };
    
    this.stats = {
      totalWrites: 0,
      totalReads: 0,
      lastCleanup: Date.now()
    };

    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  /**
   * Write transaction metrics
   */
  async writeTxMetrics(metrics) {
    const storage = this.storage.tx;
    
    for (const metric of metrics) {
      const key = metric.timestamp;
      
      // Aggregate metrics for the same timestamp
      if (storage.has(key)) {
        const existing = storage.get(key);
        storage.set(key, this.aggregateTxMetrics(existing, metric));
      } else {
        storage.set(key, { ...metric });
      }
    }

    this.maintainSize('tx');
    this.stats.totalWrites += metrics.length;
  }

  /**
   * Write block metrics
   */
  async writeBlockMetrics(metrics) {
    const storage = this.storage.block;
    
    for (const metric of metrics) {
      const key = metric.timestamp;
      storage.set(key, { ...metric });
    }

    this.maintainSize('block');
    this.stats.totalWrites += metrics.length;
  }

  /**
   * Write validator metrics
   */
  async writeValidatorMetrics(metrics) {
    const storage = this.storage.vote;
    
    for (const metric of metrics) {
      const key = `${metric.timestamp}_${metric.fields.validator}_${metric.fields.height}`;
      storage.set(key, { ...metric });
    }

    this.maintainSize('vote');
    this.stats.totalWrites += metrics.length;
  }

  /**
   * Query metrics within time range
   */
  async queryRange(metricType, startTime, endTime, options = {}) {
    const storage = this.storage[metricType];
    if (!storage) {
      throw new Error(`Unknown metric type: ${metricType}`);
    }

    const results = [];
    const limit = options.limit || 1000;

    for (const [key, metric] of storage.entries()) {
      const timestamp = metricType === 'vote' ? metric.timestamp : parseInt(key);
      
      if (timestamp >= startTime && timestamp <= endTime) {
        results.push(metric);
        
        if (results.length >= limit) {
          break;
        }
      }
    }

    // Sort by timestamp
    results.sort((a, b) => a.timestamp - b.timestamp);
    
    this.stats.totalReads++;
    return results;
  }

  /**
   * Get recent metrics for a specific metric type
   */
  async getRecent(metricType, count = 100) {
    const storage = this.storage[metricType];
    if (!storage) {
      return [];
    }

    const results = Array.from(storage.values())
      .sort((a, b) => b.timestamp - a.timestamp) // Newest first
      .slice(0, count);

    this.stats.totalReads++;
    return results;
  }

  /**
   * Aggregate transaction metrics for same timestamp
   */
  aggregateTxMetrics(existing, newMetric) {
    return {
      ...existing,
      fields: {
        tx_count: existing.fields.tx_count + newMetric.fields.tx_count,
        total_size: existing.fields.total_size + newMetric.fields.total_size,
        avg_size: Math.round((existing.fields.avg_size + newMetric.fields.avg_size) / 2),
        min_gas_price: Math.min(existing.fields.min_gas_price, newMetric.fields.min_gas_price),
        max_gas_price: Math.max(existing.fields.max_gas_price, newMetric.fields.max_gas_price),
        pending_latency_avg: Math.round((existing.fields.pending_latency_avg + newMetric.fields.pending_latency_avg) / 2)
      }
    };
  }

  /**
   * Maintain storage size limits
   */
  maintainSize(metricType) {
    const storage = this.storage[metricType];
    
    if (storage.size > this.config.maxPoints) {
      // Remove oldest entries
      const entries = Array.from(storage.entries());
      entries.sort((a, b) => {
        const aTime = metricType === 'vote' ? a[1].timestamp : parseInt(a[0]);
        const bTime = metricType === 'vote' ? b[1].timestamp : parseInt(b[0]);
        return aTime - bTime;
      });
      
      // Remove oldest 20% to avoid frequent cleanup
      const toRemove = Math.floor(storage.size * 0.2);
      for (let i = 0; i < toRemove; i++) {
        storage.delete(entries[i][0]);
      }
    }
  }

  /**
   * Cleanup old entries based on retention policy
   */
  cleanup() {
    const cutoffTime = Date.now() - this.config.retentionMs;
    let totalRemoved = 0;

    for (const [metricType, storage] of Object.entries(this.storage)) {
      const entries = Array.from(storage.entries());
      let removed = 0;

      for (const [key, metric] of entries) {
        const timestamp = metricType === 'vote' ? metric.timestamp : parseInt(key);
        
        if (timestamp < cutoffTime) {
          storage.delete(key);
          removed++;
        }
      }

      totalRemoved += removed;
    }

    this.stats.lastCleanup = Date.now();
    
    if (totalRemoved > 0) {
      console.log(`[MemoryTimeSeriesWriter] Cleaned up ${totalRemoved} old entries`);
    }
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      ...this.stats,
      storageSize: {
        tx: this.storage.tx.size,
        block: this.storage.block.size,
        vote: this.storage.vote.size,
        total: this.storage.tx.size + this.storage.block.size + this.storage.vote.size
      },
      config: this.config
    };
  }

  /**
   * Close storage and cleanup resources
   */
  async close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Clear all storage
    this.storage.tx.clear();
    this.storage.block.clear();
    this.storage.vote.clear();
    
    console.log('[MemoryTimeSeriesWriter] Closed');
  }
}

export { MemoryTimeSeriesWriter };