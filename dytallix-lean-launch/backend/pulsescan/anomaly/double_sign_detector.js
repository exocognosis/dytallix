/**
 * Double Sign Detector
 * Detects when validators sign multiple conflicting blocks for the same height/round
 */

import { randomUUID } from 'crypto';

class DoubleSignDetector {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false, // Enabled by default
      lookbackBlocks: config.lookbackBlocks || 1000, // How many blocks to keep in memory
      slashingWindow: config.slashingWindow || 100, // Blocks to look back for evidence
      ...config
    };

    // Map of (height, round) -> Map(validator -> signature_info)
    this.signatures = new Map();
    this.detectedEvents = new Map(); // Track detected double-sign events
    
    this.stats = {
      totalSignatures: 0,
      doubleSignEvents: 0,
      validatorsSlashed: new Set(),
      blocksTracked: 0
    };
  }

  /**
   * Process vote metrics to detect double signing
   */
  async processMetrics(metrics) {
    if (!this.config.enabled) {
      return [];
    }

    const anomalies = [];
    const voteEvents = metrics.filter(m => m.type === 'vote');

    for (const voteEvent of voteEvents) {
      const anomaly = this.processVoteEvent(voteEvent);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    // Cleanup old signatures to prevent memory bloat
    this.cleanupOldSignatures();

    return anomalies;
  }

  /**
   * Process a single vote event
   */
  processVoteEvent(voteEvent) {
    if (!voteEvent.fields.signed) {
      // Skip unsigned votes
      return null;
    }

    const validator = voteEvent.fields.validator;
    const height = voteEvent.fields.height;
    const round = voteEvent.fields.round || 0;
    const blockHash = voteEvent.fields.block_hash;
    const signature = voteEvent.fields.signature;
    const timestamp = voteEvent.timestamp;

    if (!blockHash || !signature) {
      // Invalid vote data
      return null;
    }

    // Create unique key for this height/round
    const heightRoundKey = `${height}:${round}`;

    // Initialize height/round map if not exists
    if (!this.signatures.has(heightRoundKey)) {
      this.signatures.set(heightRoundKey, new Map());
    }

    const heightRoundSigs = this.signatures.get(heightRoundKey);

    // Check if this validator already signed for this height/round
    if (heightRoundSigs.has(validator)) {
      const existingSig = heightRoundSigs.get(validator);
      
      // Check if this is a different block hash (double sign!)
      if (existingSig.blockHash !== blockHash) {
        return this.createDoubleSignAnomaly(
          validator,
          height,
          round,
          existingSig,
          { blockHash, signature, timestamp },
          voteEvent.timestamp
        );
      }
      
      // Same block hash - this could be a duplicate submission, ignore
      return null;
    }

    // Record this signature
    heightRoundSigs.set(validator, {
      blockHash,
      signature,
      timestamp,
      height,
      round
    });

    this.stats.totalSignatures++;
    this.stats.blocksTracked = Math.max(this.stats.blocksTracked, height);

    return null;
  }

  /**
   * Create double sign anomaly
   */
  createDoubleSignAnomaly(validator, height, round, firstSig, secondSig, detectionTime) {
    // Create unique event ID to prevent duplicates
    const eventKey = `${validator}:${height}:${round}`;
    
    if (this.detectedEvents.has(eventKey)) {
      // Already detected this event
      return null;
    }

    // Record the detection
    this.detectedEvents.set(eventKey, {
      validator,
      height,
      round,
      detectionTime,
      firstSignature: firstSig,
      secondSignature: secondSig
    });

    this.stats.doubleSignEvents++;
    this.stats.validatorsSlashed.add(validator);

    // Calculate time between signatures
    const timeDiff = Math.abs(secondSig.timestamp - firstSig.timestamp);

    return {
      id: randomUUID(),
      type: 'double_sign',
      severity: 'critical',
      entity: {
        kind: 'validator',
        id: validator
      },
      timestamp: detectionTime,
      explanation: this.generateDoubleSignExplanation(validator, height, round, timeDiff),
      metrics: {
        validator,
        height,
        round,
        first_block_hash: firstSig.blockHash,
        second_block_hash: secondSig.blockHash,
        first_signature: firstSig.signature,
        second_signature: secondSig.signature,
        time_between_signatures_ms: timeDiff,
        first_sig_time: firstSig.timestamp,
        second_sig_time: secondSig.timestamp,
        detection_time: detectionTime,
        slashable: true,
        evidence: {
          height_round: `${height}:${round}`,
          conflicting_hashes: [firstSig.blockHash, secondSig.blockHash]
        }
      }
    };
  }

  /**
   * Generate human-readable explanation for double sign
   */
  generateDoubleSignExplanation(validator, height, round, timeDiff) {
    let explanation = `CRITICAL: Double-sign detected for validator ${validator} at height ${height}, round ${round}.`;
    explanation += ` The validator signed two different blocks for the same consensus round.`;
    
    if (timeDiff < 1000) {
      explanation += ` Signatures were created ${timeDiff}ms apart.`;
    } else {
      explanation += ` Signatures were created ${Math.round(timeDiff / 1000)}s apart.`;
    }
    
    explanation += ` This is slashable behavior and the validator should be penalized.`;
    explanation += ` Severity: critical.`;
    
    return explanation;
  }

  /**
   * Cleanup old signatures to prevent memory bloat
   */
  cleanupOldSignatures() {
    if (this.signatures.size <= this.config.lookbackBlocks) {
      return;
    }

    // Convert keys to numbers for sorting
    const keys = Array.from(this.signatures.keys());
    const sortedKeys = keys.sort((a, b) => {
      const heightA = parseInt(a.split(':')[0]);
      const heightB = parseInt(b.split(':')[0]);
      return heightA - heightB;
    });

    // Remove oldest entries
    const toRemove = this.signatures.size - this.config.lookbackBlocks;
    for (let i = 0; i < toRemove; i++) {
      this.signatures.delete(sortedKeys[i]);
    }

    console.log(`[DoubleSignDetector] Cleaned up ${toRemove} old signature records`);
  }

  /**
   * Get evidence for a specific double sign event
   */
  getEvidence(validator, height, round) {
    const eventKey = `${validator}:${height}:${round}`;
    return this.detectedEvents.get(eventKey);
  }

  /**
   * Get all detected double sign events
   */
  getAllDoubleSignEvents() {
    return Array.from(this.detectedEvents.values());
  }

  /**
   * Get validators that have double signed
   */
  getSlashableValidators() {
    return Array.from(this.stats.validatorsSlashed);
  }

  /**
   * Check if a validator has any double sign history
   */
  hasDoubleSignHistory(validator) {
    return this.stats.validatorsSlashed.has(validator);
  }

  /**
   * Get detector statistics
   */
  getStats() {
    return {
      ...this.stats,
      validatorsSlashed: Array.from(this.stats.validatorsSlashed),
      config: this.config,
      currentSignatureCount: this.signatures.size,
      detectedEventCount: this.detectedEvents.size
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.signatures.clear();
    this.detectedEvents.clear();
    this.stats = {
      totalSignatures: 0,
      doubleSignEvents: 0,
      validatorsSlashed: new Set(),
      blocksTracked: 0
    };
  }

  /**
   * Export evidence for external slashing
   */
  exportSlashingEvidence() {
    return Array.from(this.detectedEvents.values()).map(event => ({
      type: 'double_sign',
      validator: event.validator,
      height: event.height,
      round: event.round,
      evidence: {
        first_vote: {
          block_hash: event.firstSignature.blockHash,
          signature: event.firstSignature.signature,
          timestamp: event.firstSignature.timestamp
        },
        second_vote: {
          block_hash: event.secondSignature.blockHash,
          signature: event.secondSignature.signature,
          timestamp: event.secondSignature.timestamp
        }
      },
      detection_time: event.detectionTime
    }));
  }
}

export { DoubleSignDetector };