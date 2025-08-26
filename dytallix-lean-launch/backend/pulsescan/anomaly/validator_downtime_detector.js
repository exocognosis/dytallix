/**
 * Validator Downtime Detector
 * Detects when validators miss consecutive blocks or votes
 */

import { randomUUID } from 'crypto';

class ValidatorDowntimeDetector {
  constructor(config = {}) {
    this.config = {
      missThreshold: config.missThreshold || 3, // Consecutive misses for medium alert
      criticalMissThreshold: config.criticalMissThreshold || 10, // Critical threshold
      blockWindow: config.blockWindow || 100, // Number of recent blocks to track
      cooldownMs: config.cooldownMs || 300000, // 5 minute cooldown per validator
      ...config
    };

    // Track validator states
    this.validatorStates = new Map();
    this.recentBlocks = []; // Store recent block info
    this.lastAlerts = new Map(); // Track last alert time per validator
    
    this.stats = {
      totalValidators: 0,
      downtimeEvents: 0,
      activeValidators: 0,
      jailedValidators: 0
    };
  }

  /**
   * Process block and vote metrics to detect validator downtime
   */
  async processMetrics(metrics) {
    const anomalies = [];

    // Separate block and vote events
    const blockEvents = metrics.filter(m => m.type === 'block');
    const voteEvents = metrics.filter(m => m.type === 'vote');

    // Process block events first to establish context
    for (const blockEvent of blockEvents) {
      this.processBlockEvent(blockEvent);
    }

    // Process vote events to track validator participation
    for (const voteEvent of voteEvents) {
      const anomaly = this.processVoteEvent(voteEvent);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    // Update statistics
    this.updateStats();

    return anomalies;
  }

  /**
   * Process a block event
   */
  processBlockEvent(blockEvent) {
    const blockInfo = {
      height: blockEvent.fields.height,
      timestamp: blockEvent.timestamp,
      proposer: blockEvent.fields.proposer,
      txCount: blockEvent.fields.tx_count || 0
    };

    // Add to recent blocks
    this.recentBlocks.push(blockInfo);
    
    // Maintain window size
    if (this.recentBlocks.length > this.config.blockWindow) {
      this.recentBlocks.shift();
    }
  }

  /**
   * Process a vote event and detect downtime
   */
  processVoteEvent(voteEvent) {
    const validator = voteEvent.fields.validator;
    const height = voteEvent.fields.height;
    const signed = voteEvent.fields.signed;
    const timestamp = voteEvent.timestamp;

    // Initialize validator state if not exists
    if (!this.validatorStates.has(validator)) {
      this.validatorStates.set(validator, {
        validator,
        consecutiveMisses: 0,
        totalMisses: 0,
        totalBlocks: 0,
        lastSeen: timestamp,
        status: 'active',
        recentMisses: [] // Track recent misses with timestamps
      });
    }

    const state = this.validatorStates.get(validator);
    state.totalBlocks++;
    state.lastSeen = timestamp;

    if (signed) {
      // Validator signed - reset consecutive misses
      state.consecutiveMisses = 0;
      state.status = 'active';
    } else {
      // Validator missed this block
      state.consecutiveMisses++;
      state.totalMisses++;
      state.recentMisses.push({ height, timestamp });
      
      // Keep only recent misses (last hour)
      const oneHourAgo = timestamp - (60 * 60 * 1000);
      state.recentMisses = state.recentMisses.filter(miss => miss.timestamp > oneHourAgo);

      // Check if we should trigger an alert
      return this.checkForDowntimeAnomaly(state, height, timestamp);
    }

    // Update validator state
    this.validatorStates.set(validator, state);
    return null;
  }

  /**
   * Check if validator downtime constitutes an anomaly
   */
  checkForDowntimeAnomaly(validatorState, height, timestamp) {
    const validator = validatorState.validator;
    const consecutiveMisses = validatorState.consecutiveMisses;

    // Check cooldown period
    const lastAlert = this.lastAlerts.get(validator) || 0;
    if (timestamp - lastAlert < this.config.cooldownMs) {
      return null;
    }

    // Determine if this triggers an alert
    let severity = null;
    
    if (consecutiveMisses >= this.config.criticalMissThreshold) {
      severity = 'critical';
      validatorState.status = 'jailed';
    } else if (consecutiveMisses >= this.config.missThreshold) {
      severity = 'medium';
      validatorState.status = 'degraded';
    }

    if (!severity) {
      return null;
    }

    // Update last alert time
    this.lastAlerts.set(validator, timestamp);

    // Calculate additional metrics
    const uptimePercent = validatorState.totalBlocks > 0 
      ? ((validatorState.totalBlocks - validatorState.totalMisses) / validatorState.totalBlocks) * 100
      : 100;

    const recentMissCount = validatorState.recentMisses.length;

    return {
      id: randomUUID(),
      type: 'validator_downtime',
      severity,
      entity: {
        kind: 'validator',
        id: validator
      },
      timestamp,
      explanation: this.generateDowntimeExplanation(validator, consecutiveMisses, severity, uptimePercent),
      metrics: {
        validator,
        consecutive_misses: consecutiveMisses,
        total_misses: validatorState.totalMisses,
        total_blocks: validatorState.totalBlocks,
        uptime_percent: Math.round(uptimePercent * 100) / 100,
        recent_misses_1h: recentMissCount,
        last_seen: validatorState.lastSeen,
        current_height: height,
        status: validatorState.status,
        miss_threshold: this.config.missThreshold,
        critical_threshold: this.config.criticalMissThreshold
      }
    };
  }

  /**
   * Generate human-readable explanation for downtime
   */
  generateDowntimeExplanation(validator, consecutiveMisses, severity, uptimePercent) {
    let explanation = `Validator ${validator} missed ${consecutiveMisses} consecutive blocks.`;
    
    if (severity === 'critical') {
      explanation += ` This exceeds the critical threshold of ${this.config.criticalMissThreshold} misses.`;
      explanation += ` Validator should be considered for jailing.`;
    } else if (severity === 'medium') {
      explanation += ` This exceeds the warning threshold of ${this.config.missThreshold} misses.`;
    }

    explanation += ` Overall uptime: ${Math.round(uptimePercent * 100) / 100}%.`;
    explanation += ` Severity: ${severity}.`;
    
    return explanation;
  }

  /**
   * Update detector statistics
   */
  updateStats() {
    let activeCount = 0;
    let jailedCount = 0;

    for (const [validator, state] of this.validatorStates.entries()) {
      if (state.status === 'active') {
        activeCount++;
      } else if (state.status === 'jailed') {
        jailedCount++;
      }
    }

    this.stats = {
      totalValidators: this.validatorStates.size,
      downtimeEvents: this.lastAlerts.size,
      activeValidators: activeCount,
      jailedValidators: jailedCount,
      recentBlocks: this.recentBlocks.length
    };
  }

  /**
   * Get validator information
   */
  getValidatorInfo(validator) {
    return this.validatorStates.get(validator);
  }

  /**
   * Get all validators with their states
   */
  getAllValidators() {
    return Array.from(this.validatorStates.values());
  }

  /**
   * Get validators currently experiencing downtime
   */
  getDownValidators() {
    return Array.from(this.validatorStates.values())
      .filter(state => state.consecutiveMisses >= this.config.missThreshold);
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      ...this.stats,
      config: this.config,
      recentBlocksCount: this.recentBlocks.length
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.validatorStates.clear();
    this.recentBlocks = [];
    this.lastAlerts.clear();
    this.stats = {
      totalValidators: 0,
      downtimeEvents: 0,
      activeValidators: 0,
      jailedValidators: 0
    };
  }
}

export { ValidatorDowntimeDetector };