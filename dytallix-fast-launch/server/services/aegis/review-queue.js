/**
 * Aegis Review Queue System
 * Manual review workflow for high-risk transactions
 */

import { logInfo, logError, logWarn } from '../../logger.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../..', 'data', 'leads.db');

let db = null;
let expirationWorker = null;

/**
 * Initialize review queue database table
 */
export const initializeReviewQueueTable = () => {
    try {
        db = new Database(dbPath);

        db.exec(`
            CREATE TABLE IF NOT EXISTS aegis_review_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_hash TEXT NOT NULL UNIQUE,
                from_address TEXT NOT NULL,
                to_address TEXT NOT NULL,
                amount REAL NOT NULL,
                risk_score INTEGER NOT NULL,
                confidence REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                priority INTEGER DEFAULT 0,
                reviewed_by TEXT,
                reviewed_at DATETIME,
                review_notes TEXT,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                analysis_data TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_review_status ON aegis_review_queue(status);
            CREATE INDEX IF NOT EXISTS idx_review_priority ON aegis_review_queue(priority, created_at);
            CREATE INDEX IF NOT EXISTS idx_review_expires ON aegis_review_queue(expires_at);
            CREATE INDEX IF NOT EXISTS idx_review_address ON aegis_review_queue(from_address);
        `);

        logInfo('Aegis review queue table initialized');
    } catch (error) {
        logError('Failed to initialize review queue table', { error: error.message });
        throw error;
    }
};

/**
 * Calculate expiration time based on priority
 */
const getExpirationTime = (priority) => {
    const now = new Date();
    const hours = priority === 2 ? 1 : priority === 1 ? 6 : 24;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

/**
 * Determine if transaction should be queued
 */
export const shouldQueue = (txData, riskScore) => {
    // Auto-queue if risk >= 90
    if (riskScore >= 90) return true;

    // Check for high-value transactions with elevated risk
    if (txData.amount > 10000 && riskScore >= 70) return true;

    // Check for new wallets with medium-high risk
    if (txData.walletAge && txData.walletAge < 24 * 60 * 60 * 1000 && riskScore >= 60) return true;

    return false;
};

/**
 * Calculate priority based on risk score and other factors
 */
const calculatePriority = (riskScore, amount) => {
    if (riskScore >= 90) return 2; // Critical
    if (riskScore >= 80 || amount > 50000) return 1; // High
    return 0; // Normal
};

/**
 * Add transaction to review queue
 */
export const addToQueue = (txData, analysisData = null) => {
    try {
        const priority = calculatePriority(txData.risk_score, txData.amount);
        const expiresAt = getExpirationTime(priority);

        const stmt = db.prepare(`
            INSERT INTO aegis_review_queue (
                tx_hash, from_address, to_address, amount, risk_score, confidence,
                priority, expires_at, analysis_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            txData.tx_hash,
            txData.from,
            txData.to,
            txData.amount,
            txData.risk_score,
            txData.confidence,
            priority,
            expiresAt.toISOString(),
            analysisData ? JSON.stringify(analysisData) : null
        );

        logInfo('Transaction added to review queue', {
            tx_hash: txData.tx_hash,
            risk_score: txData.risk_score,
            priority: priority === 2 ? 'CRITICAL' : priority === 1 ? 'HIGH' : 'NORMAL',
            expires_at: expiresAt.toISOString()
        });

        return {
            success: true,
            id: result.lastInsertRowid,
            priority,
            expires_at: expiresAt.toISOString()
        };
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            logWarn('Transaction already in review queue', { tx_hash: txData.tx_hash });
            return { success: false, error: 'Already queued' };
        }
        logError('Failed to add to review queue', { error: error.message });
        throw error;
    }
};

/**
 * Get queued transactions
 */
export const getQueuedTransactions = (filters = {}) => {
    try {
        let query = 'SELECT * FROM aegis_review_queue WHERE 1=1';
        const params = [];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.priority !== undefined) {
            query += ' AND priority = ?';
            params.push(filters.priority);
        }

        if (filters.from_address) {
            query += ' AND from_address = ?';
            params.push(filters.from_address);
        }

        // Order by priority (desc) and creation time (asc)
        query += ' ORDER BY priority DESC, created_at ASC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        const stmt = db.prepare(query);
        const transactions = stmt.all(...params);

        // Parse analysis_data JSON
        return transactions.map(tx => ({
            ...tx,
            analysis_data: tx.analysis_data ? JSON.parse(tx.analysis_data) : null,
            priority_label: tx.priority === 2 ? 'CRITICAL' : tx.priority === 1 ? 'HIGH' : 'NORMAL'
        }));
    } catch (error) {
        logError('Failed to get queued transactions', { error: error.message });
        return [];
    }
};

/**
 * Get single transaction from queue
 */
export const getQueuedTransaction = (txHash) => {
    try {
        const stmt = db.prepare('SELECT * FROM aegis_review_queue WHERE tx_hash = ?');
        const tx = stmt.get(txHash);

        if (!tx) return null;

        return {
            ...tx,
            analysis_data: tx.analysis_data ? JSON.parse(tx.analysis_data) : null,
            priority_label: tx.priority === 2 ? 'CRITICAL' : tx.priority === 1 ? 'HIGH' : 'NORMAL'
        };
    } catch (error) {
        logError('Failed to get queued transaction', { txHash, error: error.message });
        return null;
    }
};

/**
 * Approve transaction
 */
export const approveTransaction = (txHash, reviewerId, notes = null) => {
    try {
        const stmt = db.prepare(`
            UPDATE aegis_review_queue
            SET status = 'approved',
                reviewed_by = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                review_notes = ?
            WHERE tx_hash = ? AND status = 'pending'
        `);

        const result = stmt.run(reviewerId, notes, txHash);

        if (result.changes === 0) {
            return { success: false, error: 'Transaction not found or already reviewed' };
        }

        logInfo('Transaction approved', { tx_hash: txHash, reviewer: reviewerId });

        return { success: true, status: 'approved' };
    } catch (error) {
        logError('Failed to approve transaction', { txHash, error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * Reject transaction
 */
export const rejectTransaction = (txHash, reviewerId, notes = null) => {
    try {
        const stmt = db.prepare(`
            UPDATE aegis_review_queue
            SET status = 'rejected',
                reviewed_by = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                review_notes = ?
            WHERE tx_hash = ? AND status = 'pending'
        `);

        const result = stmt.run(reviewerId, notes, txHash);

        if (result.changes === 0) {
            return { success: false, error: 'Transaction not found or already reviewed' };
        }

        logInfo('Transaction rejected', { tx_hash: txHash, reviewer: reviewerId });

        return { success: true, status: 'rejected' };
    } catch (error) {
        logError('Failed to reject transaction', { txHash, error: error.message });
        return { success: false, error: error.message };
    }
};

/**
 * Check for expired reviews
 */
export const checkExpired = () => {
    try {
        const now = new Date().toISOString();

        const stmt = db.prepare(`
            UPDATE aegis_review_queue
            SET status = 'expired'
            WHERE status = 'pending' AND expires_at < ?
        `);

        const result = stmt.run(now);

        if (result.changes > 0) {
            logWarn('Expired reviews auto-rejected', { count: result.changes });
        }

        return { expired_count: result.changes };
    } catch (error) {
        logError('Failed to check expired reviews', { error: error.message });
        return { expired_count: 0 };
    }
};

/**
 * Get queue statistics
 */
export const getQueueStats = () => {
    try {
        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            expired: 0,
            critical: 0,
            high: 0,
            normal: 0
        };

        // Get counts by status
        const statusStmt = db.prepare(`
            SELECT status, COUNT(*) as count
            FROM aegis_review_queue
            GROUP BY status
        `);
        const statusResults = statusStmt.all();
        statusResults.forEach(row => {
            stats[row.status] = row.count;
        });

        // Get counts by priority (pending only)
        const priorityStmt = db.prepare(`
            SELECT priority, COUNT(*) as count
            FROM aegis_review_queue
            WHERE status = 'pending'
            GROUP BY priority
        `);
        const priorityResults = priorityStmt.all();
        priorityResults.forEach(row => {
            const label = row.priority === 2 ? 'critical' : row.priority === 1 ? 'high' : 'normal';
            stats[label] = row.count;
        });

        // Get oldest pending
        const oldestStmt = db.prepare(`
            SELECT created_at, expires_at
            FROM aegis_review_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
        `);
        const oldest = oldestStmt.get();

        return {
            ...stats,
            oldest_pending: oldest ? {
                created_at: oldest.created_at,
                expires_at: oldest.expires_at
            } : null
        };
    } catch (error) {
        logError('Failed to get queue stats', { error: error.message });
        return {};
    }
};

/**
 * Delete old reviewed transactions (cleanup)
 */
export const cleanupOldReviews = (daysOld = 30) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const stmt = db.prepare(`
            DELETE FROM aegis_review_queue
            WHERE status IN ('approved', 'rejected', 'expired')
            AND reviewed_at < ?
        `);

        const result = stmt.run(cutoffDate.toISOString());

        logInfo('Old reviews cleaned up', { deleted: result.changes, days: daysOld });

        return { deleted_count: result.changes };
    } catch (error) {
        logError('Failed to cleanup old reviews', { error: error.message });
        return { deleted_count: 0 };
    }
};

export const closeReviewQueueDb = () => {
    if (!db) return;
    try {
        db.close();
        db = null;
        logInfo('Aegis review queue DB closed');
    } catch (error) {
        logWarn('Failed to close Aegis review queue DB cleanly', { error: error.message });
    }
};

export const startExpirationWorker = (intervalMs = 5 * 60 * 1000) => {
    if (expirationWorker) return expirationWorker;
    expirationWorker = setInterval(checkExpired, intervalMs);
    return expirationWorker;
};

// Initialize on module load
initializeReviewQueueTable();

// Run expiration check every 5 minutes
startExpirationWorker();

export default {
    shouldQueue,
    addToQueue,
    getQueuedTransactions,
    getQueuedTransaction,
    approveTransaction,
    rejectTransaction,
    checkExpired,
    getQueueStats,
    cleanupOldReviews,
    closeReviewQueueDb
};
