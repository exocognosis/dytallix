/**
 * Oracle service layer
 * Handles Oracle risk score submissions and runtime FFI integration
 */

export interface OracleRiskSubmission {
  txHash: string;
  score: string;        // Preserve as string for determinism
  modelId: string;
  source?: string;
  signature?: string;   // For future cryptographic verification
}

export interface OracleRiskBatch {
  submissions: OracleRiskSubmission[];
}

export interface OracleSubmissionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export interface RuntimeBinding {
  applyOracleRisk(
    txHash: string,
    scoreStr: string,
    modelId: string,
    ingestedAt: number,
    source: string
  ): Promise<void>;
  
  getOracleRisk(txHash: string): Promise<any | null>;
}

/**
 * Mock runtime binding for testing
 * TODO: Replace with actual FFI/RPC binding to Rust runtime
 */
class MockRuntimeBinding implements RuntimeBinding {
  private storage = new Map<string, any>();
  
  async applyOracleRisk(
    txHash: string,
    scoreStr: string,
    modelId: string,
    ingestedAt: number,
    source: string
  ): Promise<void> {
    // Simulate runtime validation
    if (!txHash.startsWith('0x') || txHash.length < 10) {
      throw new Error('Invalid transaction hash format');
    }
    
    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0 || score > 1) {
      throw new Error('Score must be between 0.0 and 1.0');
    }
    
    if (!modelId.trim()) {
      throw new Error('Model ID cannot be empty');
    }
    
    if (!source.trim()) {
      throw new Error('Source cannot be empty');
    }
    
    // Store the record
    this.storage.set(txHash, {
      txHash,
      scoreStr,
      modelId,
      ingestedAt,
      source,
      riskScore: score
    });
  }
  
  async getOracleRisk(txHash: string): Promise<any | null> {
    return this.storage.get(txHash) || null;
  }
}

export class OracleService {
  private runtime: RuntimeBinding;
  
  constructor(runtime?: RuntimeBinding) {
    // Use provided runtime or mock for testing
    this.runtime = runtime || new MockRuntimeBinding();
  }
  
  /**
   * Submit single Oracle risk assessment
   */
  async submitRisk(submission: OracleRiskSubmission): Promise<OracleSubmissionResult> {
    const startTime = Date.now();
    
    try {
      await this.validateSubmission(submission);
      
      const ingestedAt = Math.floor(Date.now() / 1000);
      const source = submission.source || process.env.DLX_ORACLE_MODEL_ID || 'risk-v1';
      
      await this.runtime.applyOracleRisk(
        submission.txHash,
        submission.score,
        submission.modelId,
        ingestedAt,
        source
      );
      
      // Emit WebSocket event for real-time updates
      this.emitOracleUpdate(submission.txHash, submission.score, submission.modelId);
      
      // Record metrics
      this.recordMetrics('ok', Date.now() - startTime);
      
      return {
        success: true,
        processed: 1,
        failed: 0,
        errors: []
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Record error metrics
      this.recordMetrics('error', Date.now() - startTime);
      
      return {
        success: false,
        processed: 0,
        failed: 1,
        errors: [errorMessage]
      };
    }
  }
  
  /**
   * Submit batch of Oracle risk assessments
   */
  async submitBatch(batch: OracleRiskBatch): Promise<OracleSubmissionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < batch.submissions.length; i++) {
      const submission = batch.submissions[i];
      
      try {
        await this.validateSubmission(submission);
        
        const ingestedAt = Math.floor(Date.now() / 1000);
        const source = submission.source || process.env.DLX_ORACLE_MODEL_ID || 'risk-v1';
        
        await this.runtime.applyOracleRisk(
          submission.txHash,
          submission.score,
          submission.modelId,
          ingestedAt,
          source
        );
        
        // Emit WebSocket event for each successful submission
        this.emitOracleUpdate(submission.txHash, submission.score, submission.modelId);
        
        processed++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Submission ${i}: ${errorMessage}`);
        failed++;
      }
    }
    
    // Record metrics
    const status = failed === 0 ? 'ok' : 'error';
    this.recordMetrics(status, Date.now() - startTime);
    
    return {
      success: failed === 0,
      processed,
      failed,
      errors
    };
  }
  
  /**
   * Get Oracle risk assessment for transaction
   */
  async getRisk(txHash: string): Promise<any | null> {
    if (!txHash.startsWith('0x') || txHash.length < 10) {
      throw new Error('Invalid transaction hash format');
    }
    
    return await this.runtime.getOracleRisk(txHash);
  }
  
  /**
   * Validate Oracle submission
   */
  private async validateSubmission(submission: OracleRiskSubmission): Promise<void> {
    if (!submission.txHash || !submission.txHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash format');
    }
    
    if (!submission.score || submission.score.trim() === '') {
      throw new Error('Score cannot be empty');
    }
    
    // Validate score is a valid number
    const score = parseFloat(submission.score);
    if (isNaN(score)) {
      throw new Error('Score must be a valid number');
    }
    
    if (score < 0 || score > 1) {
      throw new Error('Score must be between 0.0 and 1.0');
    }
    
    if (!submission.modelId || submission.modelId.trim() === '') {
      throw new Error('Model ID cannot be empty');
    }
    
    // Validate model ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(submission.modelId)) {
      throw new Error('Model ID contains invalid characters');
    }
  }
  
  /**
   * Emit WebSocket event for Oracle update
   * TODO: Integrate with actual WebSocket system
   */
  private emitOracleUpdate(txHash: string, score: string, modelId: string): void {
    // Placeholder for WebSocket integration
    console.log('Oracle update event:', {
      type: 'oracle_risk_updated',
      txHash,
      score,
      modelId,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Record metrics for Oracle operations
   * TODO: Integrate with actual metrics system
   */
  private recordMetrics(status: string, latencyMs: number): void {
    // Placeholder for metrics integration
    console.log('Oracle metrics:', {
      oracle_submit_total: { status },
      oracle_latency_seconds: latencyMs / 1000,
      timestamp: new Date().toISOString()
    });
  }
}