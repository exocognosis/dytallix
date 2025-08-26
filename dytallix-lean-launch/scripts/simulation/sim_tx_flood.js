#!/usr/bin/env node

/**
 * Transaction Flood Simulator
 * Simulates a transaction spike by temporarily modifying the mempool collector
 * to generate high transaction volumes that should trigger the tx_spike detector
 */

import { MempoolCollector } from '../../backend/pulsescan/ingest/mempool_collector.js';

class TxFloodSimulator {
  constructor(config = {}) {
    this.config = {
      duration: config.duration || 60000, // 1 minute flood
      peakRate: config.peakRate || 500, // Peak transactions per second
      rampUpTime: config.rampUpTime || 10000, // 10 seconds to ramp up
      rampDownTime: config.rampDownTime || 10000, // 10 seconds to ramp down
      baseRate: config.baseRate || 50, // Normal baseline rate
      ...config
    };
    
    this.isRunning = false;
    this.startTime = 0;
    this.metrics = [];
  }

  /**
   * Start the transaction flood simulation
   */
  async start() {
    if (this.isRunning) {
      throw new Error('Simulation already running');
    }

    console.log('[TxFloodSimulator] Starting transaction flood simulation');
    console.log(`[TxFloodSimulator] Duration: ${this.config.duration}ms`);
    console.log(`[TxFloodSimulator] Peak rate: ${this.config.peakRate} tx/sec`);
    console.log(`[TxFloodSimulator] Base rate: ${this.config.baseRate} tx/sec`);

    this.isRunning = true;
    this.startTime = Date.now();
    
    // Create a modified mempool collector that generates flood data
    const floodCollector = new FloodMempoolCollector(this.config);
    
    // Start collecting flood metrics
    await floodCollector.start((metrics) => {
      this.metrics.push(...metrics);
      this.logMetrics(metrics);
    });

    // Run for specified duration
    setTimeout(() => {
      this.stop(floodCollector);
    }, this.config.duration);

    return new Promise((resolve) => {
      this.onComplete = resolve;
    });
  }

  /**
   * Stop the simulation
   */
  stop(collector) {
    if (!this.isRunning) {
      return;
    }

    console.log('[TxFloodSimulator] Stopping simulation');
    this.isRunning = false;
    
    if (collector) {
      collector.stop();
    }

    this.generateReport();
    
    if (this.onComplete) {
      this.onComplete(this.metrics);
    }
  }

  /**
   * Log metrics as they're generated
   */
  logMetrics(metrics) {
    for (const metric of metrics) {
      if (metric.type === 'tx') {
        const elapsed = Date.now() - this.startTime;
        const rate = metric.fields.tx_count;
        console.log(`[TxFloodSimulator] t+${Math.floor(elapsed/1000)}s: ${rate} tx/sec`);
      }
    }
  }

  /**
   * Generate simulation report
   */
  generateReport() {
    const txMetrics = this.metrics.filter(m => m.type === 'tx');
    
    if (txMetrics.length === 0) {
      console.log('[TxFloodSimulator] No metrics collected');
      return;
    }

    const rates = txMetrics.map(m => m.fields.tx_count);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    console.log('\n[TxFloodSimulator] === SIMULATION REPORT ===');
    console.log(`Duration: ${(Date.now() - this.startTime) / 1000}s`);
    console.log(`Samples: ${txMetrics.length}`);
    console.log(`Max rate: ${maxRate} tx/sec`);
    console.log(`Min rate: ${minRate} tx/sec`);
    console.log(`Avg rate: ${Math.round(avgRate)} tx/sec`);
    console.log(`Total transactions: ${rates.reduce((sum, rate) => sum + rate, 0)}`);

    // Check if we should have triggered anomalies
    const spikes = rates.filter(rate => rate > this.config.baseRate * 3);
    console.log(`Potential spikes: ${spikes.length} (rate > ${this.config.baseRate * 3})`);
  }
}

/**
 * Modified mempool collector that generates flood data
 */
class FloodMempoolCollector extends MempoolCollector {
  constructor(floodConfig) {
    super({
      pollInterval: 1000, // 1 second intervals
      batchSize: 1,
      flushInterval: 1000
    });
    this.floodConfig = floodConfig;
    this.floodStartTime = 0;
  }

  async start(onMetrics) {
    this.floodStartTime = Date.now();
    return super.start(onMetrics);
  }

  /**
   * Override to generate flood transaction rates
   */
  async fetchMempoolStats() {
    const elapsed = Date.now() - this.floodStartTime;
    const rate = this.calculateFloodRate(elapsed);
    
    return {
      txCount: rate,
      avgSize: Math.floor(200 + Math.random() * 100),
      totalSize: rate * 250,
      minGasPrice: Math.floor(0.001 * 1e6),
      maxGasPrice: Math.floor(0.01 * 1e6),
      avgLatency: Math.floor(1000 + Math.random() * 2000)
    };
  }

  /**
   * Calculate transaction rate based on flood timeline
   */
  calculateFloodRate(elapsed) {
    const { baseRate, peakRate, rampUpTime, rampDownTime, duration } = this.floodConfig;
    
    if (elapsed < rampUpTime) {
      // Ramp up phase
      const progress = elapsed / rampUpTime;
      return Math.floor(baseRate + (peakRate - baseRate) * progress);
    } else if (elapsed > duration - rampDownTime) {
      // Ramp down phase
      const rampDownStart = duration - rampDownTime;
      const rampDownElapsed = elapsed - rampDownStart;
      const progress = 1 - (rampDownElapsed / rampDownTime);
      return Math.floor(baseRate + (peakRate - baseRate) * progress);
    } else {
      // Peak phase with some variance
      const variance = peakRate * 0.1; // 10% variance
      return Math.floor(peakRate + (Math.random() - 0.5) * variance);
    }
  }
}

// CLI interface
if (process.argv[1].endsWith('sim_tx_flood.js')) {
  const duration = process.argv[2] ? parseInt(process.argv[2]) * 1000 : 60000;
  const peakRate = process.argv[3] ? parseInt(process.argv[3]) : 500;
  
  console.log('=== Transaction Flood Simulator ===');
  console.log(`Usage: node sim_tx_flood.js [duration_seconds] [peak_rate]`);
  console.log(`Running with: duration=${duration/1000}s, peak_rate=${peakRate}\n`);
  
  const simulator = new TxFloodSimulator({
    duration,
    peakRate,
    baseRate: 50
  });
  
  simulator.start()
    .then(() => {
      console.log('\n[TxFloodSimulator] Simulation completed');
      console.log('[TxFloodSimulator] Check /anomaly endpoint for detected anomalies');
      process.exit(0);
    })
    .catch(err => {
      console.error('[TxFloodSimulator] Error:', err);
      process.exit(1);
    });
}

export { TxFloodSimulator };