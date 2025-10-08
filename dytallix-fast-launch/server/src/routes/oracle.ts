/**
 * Oracle API routes
 * Provides REST endpoints for Oracle risk score submission
 */

import { Router, Request, Response } from 'express';
import { OracleAuthRequest } from '../middleware/oracleAuth';
import { OracleService, OracleRiskSubmission, OracleRiskBatch } from '../services/oracleService';
import { metricsService } from '../services/metrics';
import { webSocketBus } from '../ws/bus';

const router = Router();

// Initialize Oracle service
const oracleService = new OracleService();

/**
 * POST /api/oracle/submit
 * Submit single Oracle risk assessment
 */
router.post('/submit', async (req: OracleAuthRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Validate authentication
    if (!req.oracleAuth?.verified && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        error: 'Oracle authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Validate request body
    const submission: OracleRiskSubmission = {
      txHash: req.body.tx_hash || req.body.txHash,
      score: req.body.score || req.body.risk_score,
      modelId: req.body.model_id || req.body.modelId,
      source: req.oracleAuth?.source,
      signature: req.body.signature
    };
    
    if (!submission.txHash || !submission.score || !submission.modelId) {
      return res.status(400).json({
        error: 'Missing required fields: tx_hash, score, model_id',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Submit to Oracle service
    const result = await oracleService.submitRisk(submission);
    
    // Record metrics
    const latencySeconds = (Date.now() - startTime) / 1000;
    metricsService.recordOracleLatency(latencySeconds);
    metricsService.recordOracleSubmission(result.success ? 'ok' : 'error');
    
    if (result.success) {
      // Emit WebSocket event
      webSocketBus.broadcastOracleUpdate(
        submission.txHash,
        submission.score,
        submission.modelId
      );
      
      return res.status(200).json({
        success: true,
        message: 'Oracle risk submitted successfully',
        data: {
          tx_hash: submission.txHash,
          processed: result.processed
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Submission failed',
        code: 'SUBMISSION_FAILED',
        details: result.errors
      });
    }
    
  } catch (error) {
    console.error('Oracle submission error:', error);
    
    // Record error metrics
    const latencySeconds = (Date.now() - startTime) / 1000;
    metricsService.recordOracleLatency(latencySeconds);
    metricsService.recordOracleSubmission('error');
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/oracle/submit_batch
 * Submit batch of Oracle risk assessments
 */
router.post('/submit_batch', async (req: OracleAuthRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Validate authentication
    if (!req.oracleAuth?.verified && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        error: 'Oracle authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Validate batch structure
    const rawSubmissions = req.body.submissions || req.body.records || [];
    
    if (!Array.isArray(rawSubmissions) || rawSubmissions.length === 0) {
      return res.status(400).json({
        error: 'Invalid batch format - expected array of submissions',
        code: 'INVALID_BATCH'
      });
    }
    
    if (rawSubmissions.length > 100) {
      return res.status(400).json({
        error: 'Batch size too large - maximum 100 submissions',
        code: 'BATCH_TOO_LARGE'
      });
    }
    
    // Convert to standardized format
    const submissions: OracleRiskSubmission[] = rawSubmissions.map((item: any) => ({
      txHash: item.tx_hash || item.txHash,
      score: item.score || item.risk_score,
      modelId: item.model_id || item.modelId,
      source: req.oracleAuth?.source,
      signature: item.signature
    }));
    
    const batch: OracleRiskBatch = { submissions };
    
    // Submit batch to Oracle service
    const result = await oracleService.submitBatch(batch);
    
    // Record metrics
    const latencySeconds = (Date.now() - startTime) / 1000;
    metricsService.recordOracleLatency(latencySeconds);
    metricsService.recordOracleSubmission(result.success ? 'ok' : 'error');
    
    // Emit WebSocket events for successful submissions
    submissions.forEach((submission, index) => {
      if (index < result.processed) {
        webSocketBus.broadcastOracleUpdate(
          submission.txHash,
          submission.score,
          submission.modelId
        );
      }
    });
    
    return res.status(200).json({
      success: result.success,
      message: `Batch processed: ${result.processed} succeeded, ${result.failed} failed`,
      data: {
        processed: result.processed,
        failed: result.failed,
        total: submissions.length,
        errors: result.errors
      }
    });
    
  } catch (error) {
    console.error('Oracle batch submission error:', error);
    
    // Record error metrics
    const latencySeconds = (Date.now() - startTime) / 1000;
    metricsService.recordOracleLatency(latencySeconds);
    metricsService.recordOracleSubmission('error');
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/oracle/risk/:txHash
 * Get Oracle risk assessment for transaction
 */
router.get('/risk/:txHash', async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    
    if (!txHash || !txHash.startsWith('0x')) {
      return res.status(400).json({
        error: 'Invalid transaction hash format',
        code: 'INVALID_TX_HASH'
      });
    }
    
    const risk = await oracleService.getRisk(txHash);
    
    if (!risk) {
      return res.status(404).json({
        error: 'Oracle risk assessment not found',
        code: 'RISK_NOT_FOUND'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        tx_hash: risk.txHash,
        score: risk.scoreStr,
        model_id: risk.modelId,
        ingested_at: risk.ingestedAt,
        source: risk.source
      }
    });
    
  } catch (error) {
    console.error('Oracle risk lookup error:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/oracle/health
 * Health check endpoint for Oracle service
 */
router.get('/health', (req: Request, res: Response) => {
  const wsStats = webSocketBus.getStats();
  
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    websocket: {
      connected_clients: wsStats.connectedClients,
      total_events: wsStats.totalEvents
    },
    config: {
      auth_enabled: !!process.env.DLX_ORACLE_INGEST_SECRET,
      model_id: process.env.DLX_ORACLE_MODEL_ID || 'risk-v1',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

export default router;