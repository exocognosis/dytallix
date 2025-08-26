/**
 * Mempool Collector - Captures transaction metrics from mempool
 * Polls node RPC/WebSocket for pending transaction events
 */

class MempoolCollector {
  constructor(config = {}) {
    this.config = {
      pollInterval: config.pollInterval || 1000, // 1 second
      batchSize: config.batchSize || 100,
      flushInterval: config.flushInterval || 5000, // 5 seconds
      rpcUrl: config.rpcUrl || 'http://localhost:26657',
      ...config
    };
    this.metrics = new Map();
    this.isRunning = false;
    this.eventBuffer = [];
    this.lastFlush = Date.now();
  }

  /**
   * Start collecting mempool metrics
   */
  async start(onMetrics) {
    if (this.isRunning) {
      throw new Error('MempoolCollector already running');
    }

    this.isRunning = true;
    this.onMetrics = onMetrics || (() => {});

    console.log('[MempoolCollector] Starting collection', {
      pollInterval: this.config.pollInterval,
      rpcUrl: this.config.rpcUrl
    });

    // Start polling loop
    this.pollTimer = setInterval(() => {
      this.collectMetrics().catch(err => {
        console.error('[MempoolCollector] Error collecting metrics:', err);
      });
    }, this.config.pollInterval);

    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  /**
   * Stop collecting metrics
   */
  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushEvents(); // Final flush
    console.log('[MempoolCollector] Stopped');
  }

  /**
   * Collect current mempool metrics
   */
  async collectMetrics() {
    try {
      // Simulate mempool data collection
      // In production, this would query actual node RPC
      const metrics = await this.fetchMempoolStats();
      
      const event = {
        type: 'tx',
        timestamp: Date.now(),
        fields: {
          tx_count: metrics.txCount,
          avg_size: metrics.avgSize,
          total_size: metrics.totalSize,
          min_gas_price: metrics.minGasPrice,
          max_gas_price: metrics.maxGasPrice,
          pending_latency_avg: metrics.avgLatency
        }
      };

      this.eventBuffer.push(event);
      
      // Check if we need to flush due to batch size
      if (this.eventBuffer.length >= this.config.batchSize) {
        this.flushEvents();
      }

    } catch (error) {
      console.error('[MempoolCollector] Failed to collect metrics:', error);
    }
  }

  /**
   * Simulate fetching mempool statistics
   * In production, this would make actual RPC calls
   */
  async fetchMempoolStats() {
    // Mock data generation with realistic patterns
    const baseCount = 50;
    const variance = 40;
    const spike = Math.random() < 0.05 ? Math.random() * 200 : 0; // 5% chance of spike
    
    const txCount = Math.max(0, Math.floor(baseCount + (Math.random() - 0.5) * variance + spike));
    const avgSize = Math.floor(200 + Math.random() * 100); // bytes
    const avgLatency = Math.floor(1000 + Math.random() * 2000); // ms

    return {
      txCount,
      avgSize,
      totalSize: txCount * avgSize,
      minGasPrice: Math.floor(0.001 * 1e6), // micro-units
      maxGasPrice: Math.floor(0.01 * 1e6),
      avgLatency
    };
  }

  /**
   * Flush accumulated events to metrics handler
   */
  flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.lastFlush = Date.now();

    // Notify metrics handler
    if (this.onMetrics) {
      this.onMetrics(events);
    }

    console.log(`[MempoolCollector] Flushed ${events.length} transaction events`);
  }

  /**
   * Get current collector status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      bufferSize: this.eventBuffer.length,
      lastFlush: this.lastFlush,
      config: this.config
    };
  }
}

export { MempoolCollector };