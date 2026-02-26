/**
 * Audit Service for QuantumVault
 * 
 * Enterprise-grade audit logging and compliance reporting:
 * - Track all proof operations
 * - Generate compliance reports
 * - Verification history tracking
 * - Export audit trails
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

class AuditService {
  constructor(auditDir = './audit-logs') {
    this.auditDir = auditDir;
    this.auditLog = [];
    this.maxLogSize = 10000; // Keep last 10k entries in memory
    this.initialized = false;
  }

  /**
   * Initialize audit service
   */
  async initialize() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.auditDir, { recursive: true });
      
      // Load existing audit log
      const logFile = join(this.auditDir, 'audit.json');
      try {
        const data = await fs.readFile(logFile, 'utf-8');
        this.auditLog = JSON.parse(data);
        console.log(`[AuditService] Loaded ${this.auditLog.length} audit entries`);
      } catch (err) {
        console.log('[AuditService] No existing audit log');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[AuditService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Log an audit event
   * 
   * @param {Object} event - Audit event data
   */
  async logEvent(event) {
    const auditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      ...event,
      hash: this.hashEvent(event)
    };

    this.auditLog.push(auditEntry);

    // Trim log if it exceeds max size
    if (this.auditLog.length > this.maxLogSize) {
      const archived = this.auditLog.slice(0, this.auditLog.length - this.maxLogSize);
      await this.archiveLogs(archived);
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    // Persist to disk
    await this.saveAuditLog();

    return auditEntry;
  }

  /**
   * Log proof generation event
   */
  async logProofGeneration(data) {
    return await this.logEvent({
      type: 'PROOF_GENERATION',
      action: 'CREATE_PROOF',
      proofId: data.proofId,
      fileHash: data.fileHash,
      filename: data.filename,
      storageLocation: data.storageLocation,
      userId: data.userId,
      apiKey: data.apiKey ? this.maskApiKey(data.apiKey) : null,
      success: true
    });
  }

  /**
   * Log proof verification event
   */
  async logProofVerification(data) {
    return await this.logEvent({
      type: 'PROOF_VERIFICATION',
      action: 'VERIFY_PROOF',
      proofId: data.proofId,
      fileHash: data.fileHash,
      result: data.result,
      userId: data.userId,
      apiKey: data.apiKey ? this.maskApiKey(data.apiKey) : null,
      success: data.result === 'VALID'
    });
  }

  /**
   * Log blockchain anchoring event
   */
  async logBlockchainAnchor(data) {
    return await this.logEvent({
      type: 'BLOCKCHAIN_ANCHOR',
      action: 'ANCHOR_PROOF',
      proofId: data.proofId,
      txHash: data.txHash,
      blockHeight: data.blockHeight,
      userId: data.userId,
      apiKey: data.apiKey ? this.maskApiKey(data.apiKey) : null,
      success: true
    });
  }

  /**
   * Log API access event
   */
  async logApiAccess(data) {
    return await this.logEvent({
      type: 'API_ACCESS',
      action: data.action,
      endpoint: data.endpoint,
      method: data.method,
      userId: data.userId,
      apiKey: data.apiKey ? this.maskApiKey(data.apiKey) : null,
      statusCode: data.statusCode,
      success: data.statusCode >= 200 && data.statusCode < 300
    });
  }

  /**
   * Get audit trail for a proof
   */
  async getProofAuditTrail(proofId) {
    return this.auditLog.filter(entry => entry.proofId === proofId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get audit trail for a user
   */
  async getUserAuditTrail(userId, options = {}) {
    const { limit = 100, offset = 0, startDate, endDate } = options;

    let entries = this.auditLog.filter(entry => entry.userId === userId);

    if (startDate) {
      entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }

    return entries
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(options = {}) {
    const { startDate, endDate, userId, type } = options;

    let entries = [...this.auditLog];

    // Filter by date range
    if (startDate) {
      entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }

    // Filter by user
    if (userId) {
      entries = entries.filter(e => e.userId === userId);
    }

    // Filter by type
    if (type) {
      entries = entries.filter(e => e.type === type);
    }

    // Generate statistics
    const stats = {
      totalEvents: entries.length,
      proofGenerations: entries.filter(e => e.type === 'PROOF_GENERATION').length,
      proofVerifications: entries.filter(e => e.type === 'PROOF_VERIFICATION').length,
      blockchainAnchors: entries.filter(e => e.type === 'BLOCKCHAIN_ANCHOR').length,
      apiAccess: entries.filter(e => e.type === 'API_ACCESS').length,
      successfulOperations: entries.filter(e => e.success).length,
      failedOperations: entries.filter(e => !e.success).length,
      uniqueUsers: [...new Set(entries.map(e => e.userId).filter(Boolean))].length,
      dateRange: {
        start: startDate || (entries[0]?.timestamp),
        end: endDate || (entries[entries.length - 1]?.timestamp)
      }
    };

    // Group by type
    const byType = entries.reduce((acc, entry) => {
      if (!acc[entry.type]) acc[entry.type] = [];
      acc[entry.type].push(entry);
      return acc;
    }, {});

    // Group by date
    const byDate = entries.reduce((acc, entry) => {
      const date = entry.timestamp.split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date]++;
      return acc;
    }, {});

    return {
      report: {
        id: this.generateAuditId(),
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate, userId, type },
        statistics: stats,
        byType,
        byDate,
        complianceStatus: stats.failedOperations / stats.totalEvents < 0.01 ? 'COMPLIANT' : 'NEEDS_REVIEW'
      },
      entries: entries.slice(0, 1000) // Limit to 1000 entries for report
    };
  }

  /**
   * Export audit trail as JSON
   */
  async exportAuditTrail(options = {}) {
    const report = await this.generateComplianceReport(options);
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      service: 'QuantumVault',
      ...report
    };

    const filename = `audit-export-${Date.now()}.json`;
    const filepath = join(this.auditDir, 'exports', filename);
    
    await fs.mkdir(join(this.auditDir, 'exports'), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    return { filename, filepath, ...report.report };
  }

  /**
   * Get verification history for a file hash
   */
  async getVerificationHistory(fileHash) {
    return this.auditLog
      .filter(entry => 
        entry.fileHash === fileHash && 
        (entry.type === 'PROOF_GENERATION' || entry.type === 'PROOF_VERIFICATION')
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 50) {
    return this.auditLog
      .slice(-limit)
      .reverse();
  }

  /**
   * Save audit log to disk
   * @private
   */
  async saveAuditLog() {
    const logFile = join(this.auditDir, 'audit.json');
    await fs.writeFile(logFile, JSON.stringify(this.auditLog, null, 2));
  }

  /**
   * Archive old logs
   * @private
   */
  async archiveLogs(logs) {
    const archiveFile = join(this.auditDir, `archive-${Date.now()}.json`);
    await fs.writeFile(archiveFile, JSON.stringify(logs, null, 2));
    console.log(`[AuditService] Archived ${logs.length} log entries to ${archiveFile}`);
  }

  /**
   * Generate audit entry ID
   * @private
   */
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash event for integrity verification
   * @private
   */
  hashEvent(event) {
    const data = JSON.stringify({
      type: event.type,
      action: event.action,
      timestamp: event.timestamp,
      data: event
    });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Mask API key for logging
   * @private
   */
  maskApiKey(apiKey) {
    if (!apiKey) return null;
    return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity() {
    let valid = 0;
    let invalid = 0;

    for (const entry of this.auditLog) {
      const expectedHash = this.hashEvent(entry);
      if (entry.hash === expectedHash) {
        valid++;
      } else {
        invalid++;
      }
    }

    return {
      totalEntries: this.auditLog.length,
      validEntries: valid,
      invalidEntries: invalid,
      integrity: invalid === 0 ? 'VALID' : 'COMPROMISED'
    };
  }
}

// Singleton instance
let auditServiceInstance = null;

export function getAuditService() {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

export { AuditService };
