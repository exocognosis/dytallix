/**
 * Block Collector - Captures block metadata and validator signatures
 * Subscribes to new block events via WebSocket or polling
 */

class BlockCollector {
  constructor(config = {}) {
    this.config = {
      pollInterval: config.pollInterval || 5000, // 5 seconds (block time)
      batchSize: config.batchSize || 50,
      flushInterval: config.flushInterval || 10000, // 10 seconds
      rpcUrl: config.rpcUrl || 'http://localhost:26657',
      ...config
    };
    this.isRunning = false;
    this.eventBuffer = [];
    this.lastFlush = Date.now();
    this.lastBlockHeight = 0;
    this.validatorSet = new Map(); // Track known validators
  }

  /**
   * Start collecting block metrics
   */
  async start(onMetrics) {
    if (this.isRunning) {
      throw new Error('BlockCollector already running');
    }

    this.isRunning = true;
    this.onMetrics = onMetrics || (() => {});

    console.log('[BlockCollector] Starting collection', {
      pollInterval: this.config.pollInterval,
      rpcUrl: this.config.rpcUrl
    });

    // Initialize validator set
    await this.initializeValidatorSet();

    // Start polling loop
    this.pollTimer = setInterval(() => {
      this.collectMetrics().catch(err => {
        console.error('[BlockCollector] Error collecting metrics:', err);
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
    console.log('[BlockCollector] Stopped');
  }

  /**
   * Initialize known validator set
   */
  async initializeValidatorSet() {
    try {
      // Mock validator set - in production this would query actual validators
      const validators = [
        { address: 'dytallix1validator1', pubkey: 'pub1', power: 100 },
        { address: 'dytallix1validator2', pubkey: 'pub2', power: 80 },
        { address: 'dytallix1validator3', pubkey: 'pub3', power: 60 },
        { address: 'dytallix1validator4', pubkey: 'pub4', power: 40 },
        { address: 'dytallix1validator5', pubkey: 'pub5', power: 20 }
      ];

      validators.forEach(val => {
        this.validatorSet.set(val.address, {
          ...val,
          missedBlocks: 0,
          lastSeen: Date.now()
        });
      });

      console.log(`[BlockCollector] Initialized ${validators.length} validators`);
    } catch (error) {
      console.error('[BlockCollector] Failed to initialize validator set:', error);
    }
  }

  /**
   * Collect current block metrics
   */
  async collectMetrics() {
    try {
      const blockData = await this.fetchLatestBlock();
      
      if (blockData.height <= this.lastBlockHeight) {
        // No new block
        return;
      }

      this.lastBlockHeight = blockData.height;

      // Create block event
      const blockEvent = {
        type: 'block',
        timestamp: Date.now(),
        fields: {
          height: blockData.height,
          block_time: blockData.blockTime,
          tx_count: blockData.txCount,
          proposer: blockData.proposer,
          block_size: blockData.blockSize,
          time_since_last: blockData.timeSinceLast
        }
      };

      this.eventBuffer.push(blockEvent);

      // Create vote events for validator signatures
      const voteEvents = this.processValidatorVotes(blockData);
      this.eventBuffer.push(...voteEvents);

      // Check if we need to flush due to batch size
      if (this.eventBuffer.length >= this.config.batchSize) {
        this.flushEvents();
      }

    } catch (error) {
      console.error('[BlockCollector] Failed to collect metrics:', error);
    }
  }

  /**
   * Simulate fetching latest block data
   * In production, this would make actual RPC calls
   */
  async fetchLatestBlock() {
    // Mock block data generation
    const height = this.lastBlockHeight + 1;
    const now = Date.now();
    const blockTime = new Date(now).toISOString();
    const timeSinceLast = 5000 + Math.random() * 2000; // 5-7 second block times
    
    // Randomly select proposer
    const validators = Array.from(this.validatorSet.keys());
    const proposer = validators[Math.floor(Math.random() * validators.length)];

    return {
      height,
      blockTime,
      timestamp: now,
      txCount: Math.floor(Math.random() * 100),
      proposer,
      blockSize: Math.floor(50000 + Math.random() * 100000), // bytes
      timeSinceLast,
      signatures: this.generateValidatorSignatures(height)
    };
  }

  /**
   * Generate mock validator signatures for a block
   */
  generateValidatorSignatures(height) {
    const signatures = [];
    const validators = Array.from(this.validatorSet.keys());
    
    validators.forEach(validator => {
      // 95% chance of validator signing (5% miss rate)
      const signed = Math.random() > 0.05;
      
      signatures.push({
        validator,
        height,
        round: 0,
        signed,
        signature: signed ? `sig_${height}_${validator}` : null,
        timestamp: Date.now()
      });

      // Update validator tracking
      if (this.validatorSet.has(validator)) {
        const val = this.validatorSet.get(validator);
        if (signed) {
          val.lastSeen = Date.now();
          val.missedBlocks = 0;
        } else {
          val.missedBlocks = (val.missedBlocks || 0) + 1;
        }
        this.validatorSet.set(validator, val);
      }
    });

    return signatures;
  }

  /**
   * Process validator votes and create vote events
   */
  processValidatorVotes(blockData) {
    const voteEvents = [];

    blockData.signatures.forEach(sig => {
      const voteEvent = {
        type: 'vote',
        timestamp: Date.now(),
        fields: {
          validator: sig.validator,
          height: sig.height,
          round: sig.round,
          signed: sig.signed,
          block_hash: `block_${sig.height}`,
          signature: sig.signature,
          proposer: blockData.proposer
        }
      };

      voteEvents.push(voteEvent);
    });

    return voteEvents;
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

    console.log(`[BlockCollector] Flushed ${events.length} block/vote events`);
  }

  /**
   * Get current collector status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      bufferSize: this.eventBuffer.length,
      lastFlush: this.lastFlush,
      lastBlockHeight: this.lastBlockHeight,
      validatorCount: this.validatorSet.size,
      config: this.config
    };
  }

  /**
   * Get validator information
   */
  getValidators() {
    return Array.from(this.validatorSet.entries()).map(([address, data]) => ({
      address,
      ...data
    }));
  }
}

export { BlockCollector };