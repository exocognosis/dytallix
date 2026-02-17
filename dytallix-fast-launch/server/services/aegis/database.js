/**
 * Aegis Database Module
 * Handles database operations for transaction analysis and risk scoring
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from '../../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same database as leads
const DB_PATH = path.join(__dirname, '../../../data/leads.db');

let db = null;
let schemaInitialized = false;

const ensureDbHandle = () => {
    if (!db) {
        db = new Database(DB_PATH);
    }
    return db;
};

const initializeSchema = () => {
    if (schemaInitialized) return;
    const dbi = ensureDbHandle();

    dbi.exec(`
      CREATE TABLE IF NOT EXISTS aegis_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_hash TEXT UNIQUE NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT,
        amount REAL,
        risk_score INTEGER,
        confidence REAL,
        analysis_data TEXT,
        signature TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    dbi.exec(`
      CREATE TABLE IF NOT EXISTS aegis_wallet_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        current_score INTEGER,
        total_transactions INTEGER DEFAULT 0,
        first_seen DATETIME,
        last_analyzed DATETIME,
        metadata TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    dbi.exec(`
      CREATE TABLE IF NOT EXISTS aegis_signatures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_hash TEXT NOT NULL,
        signature TEXT NOT NULL,
        public_key TEXT NOT NULL,
        algorithm TEXT DEFAULT 'ML-DSA-87',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    dbi.exec(`
        CREATE TABLE IF NOT EXISTS aegis_validator_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            address TEXT NOT NULL,
            outcome TEXT NOT NULL,
            validator_id TEXT,
            notes TEXT,
            model_id TEXT,
            risk_score REAL,
            predicted_action TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    dbi.exec(`
        CREATE TABLE IF NOT EXISTS aegis_oracle_escalations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            action_type TEXT NOT NULL,
            risk_score REAL,
            confidence REAL,
            reason TEXT,
            status TEXT DEFAULT 'open',
            payload TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for performance
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_tx_hash ON aegis_transactions(tx_hash)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_tx_from ON aegis_transactions(from_address)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_wallet_addr ON aegis_wallet_scores(address)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_tx_created ON aegis_transactions(created_at)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_feedback_tx ON aegis_validator_feedback(tx_hash)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_feedback_model ON aegis_validator_feedback(model_id)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_feedback_created ON aegis_validator_feedback(created_at)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_escalations_tx ON aegis_oracle_escalations(tx_hash)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_escalations_status ON aegis_oracle_escalations(status)`);

    schemaInitialized = true;
    logInfo('Aegis database initialized', { path: DB_PATH });
};

const getDb = () => {
    initializeSchema();
    return ensureDbHandle();
};

/**
 * Save transaction analysis
 */
export const saveTransactionAnalysis = (txData) => {
    try {
        const stmt = getDb().prepare(`
      INSERT OR REPLACE INTO aegis_transactions (
        tx_hash, from_address, to_address, amount, risk_score, 
        confidence, analysis_data, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(
            txData.tx_hash,
            txData.from_address,
            txData.to_address || null,
            txData.amount || 0,
            txData.risk_score,
            txData.confidence,
            JSON.stringify(txData.analysis_data || {}),
            txData.signature || null
        );

        logInfo('Transaction analysis saved', { tx_hash: txData.tx_hash, risk_score: txData.risk_score });
        return { id: result.lastInsertRowid, success: true };
    } catch (error) {
        logError('Failed to save transaction analysis', { error: error.message, tx_hash: txData.tx_hash });
        throw error;
    }
};

/**
 * Get transaction analysis by hash
 */
export const getTransactionAnalysis = (txHash) => {
    const stmt = getDb().prepare('SELECT * FROM aegis_transactions WHERE tx_hash = ?');
    const result = stmt.get(txHash);

    if (result && result.analysis_data) {
        result.analysis_data = JSON.parse(result.analysis_data);
    }

    return result;
};

/**
 * Update or create wallet score
 */
export const updateWalletScore = (walletData) => {
    try {
        const existing = getDb().prepare('SELECT * FROM aegis_wallet_scores WHERE address = ?').get(walletData.address);

        if (existing) {
            const stmt = getDb().prepare(`
        UPDATE aegis_wallet_scores 
        SET current_score = ?, total_transactions = ?, last_analyzed = CURRENT_TIMESTAMP,
            metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE address = ?
      `);

            stmt.run(
                walletData.current_score,
                (existing.total_transactions || 0) + 1,
                JSON.stringify(walletData.metadata || {}),
                walletData.address
            );
        } else {
            const stmt = getDb().prepare(`
        INSERT INTO aegis_wallet_scores (
          address, current_score, total_transactions, first_seen, 
          last_analyzed, metadata
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      `);

            stmt.run(
                walletData.address,
                walletData.current_score,
                1,
                JSON.stringify(walletData.metadata || {})
            );
        }

        logInfo('Wallet score updated', { address: walletData.address, score: walletData.current_score });
        return { success: true };
    } catch (error) {
        logError('Failed to update wallet score', { error: error.message, address: walletData.address });
        throw error;
    }
};

/**
 * Get wallet score by address
 */
export const getWalletScore = (address) => {
    const stmt = getDb().prepare('SELECT * FROM aegis_wallet_scores WHERE address = ?');
    const result = stmt.get(address);

    if (result && result.metadata) {
        result.metadata = JSON.parse(result.metadata);
    }

    return result;
};

/**
 * Save quantum signature
 */
export const saveSignature = (signatureData) => {
    try {
        const stmt = getDb().prepare(`
      INSERT INTO aegis_signatures (data_hash, signature, public_key, algorithm)
      VALUES (?, ?, ?, ?)
    `);

        const result = stmt.run(
            signatureData.data_hash,
            signatureData.signature,
            signatureData.public_key,
            signatureData.algorithm || 'ML-DSA-87'
        );

        return { id: result.lastInsertRowid, success: true };
    } catch (error) {
        logError('Failed to save signature', { error: error.message });
        throw error;
    }
};

/**
 * Get recent transaction analyses
 */
export const getRecentAnalyses = (limit = 50) => {
    const stmt = getDb().prepare(`
    SELECT * FROM aegis_transactions 
    ORDER BY created_at DESC 
    LIMIT ?
  `);

    const results = stmt.all(limit);
    return results.map(r => {
        if (r.analysis_data) {
            r.analysis_data = JSON.parse(r.analysis_data);
        }
        return r;
    });
};

export const saveValidatorFeedback = (feedback) => {
    try {
        const stmt = getDb().prepare(`
      INSERT INTO aegis_validator_feedback (
        tx_hash, address, outcome, validator_id, notes, model_id, risk_score, predicted_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(
            feedback.tx_hash,
            feedback.address,
            feedback.outcome,
            feedback.validator_id || null,
            feedback.notes || null,
            feedback.model_id || null,
            Number.isFinite(Number(feedback.risk_score)) ? Number(feedback.risk_score) : null,
            feedback.predicted_action || null
        );

        return { id: result.lastInsertRowid, success: true };
    } catch (error) {
        logError('Failed to save validator feedback', { error: error.message, tx_hash: feedback.tx_hash });
        throw error;
    }
};

const outcomeIsConfirmedRisk = (outcome) => {
    const normalized = String(outcome || '').trim().toUpperCase();
    return ['BLOCKED', 'REJECTED', 'FRAUD_CONFIRMED', 'MALICIOUS'].includes(normalized);
};

const actionPredictsRisk = (action) => {
    const normalized = String(action || '').trim().toUpperCase();
    return ['REJECT', 'REVIEW', 'DELAY'].includes(normalized);
};

export const getOracleReputation = ({ modelId = null, daysBack = 30 } = {}) => {
    const days = Number.isFinite(daysBack) ? Math.max(1, Math.min(365, Math.floor(daysBack))) : 30;
    const params = [`-${days} days`];
    let where = `WHERE created_at >= datetime('now', ?)`;

    if (modelId) {
        where += ' AND model_id = ?';
        params.push(modelId);
    }

    const rows = getDb().prepare(`
      SELECT outcome, predicted_action
      FROM aegis_validator_feedback
      ${where}
    `).all(...params);

    if (rows.length === 0) {
        return {
            model_id: modelId,
            window_days: days,
            total_reports: 0,
            oracle_accuracy: null,
            reputation_score: null
        };
    }

    let correct = 0;
    for (const row of rows) {
        const confirmedRisk = outcomeIsConfirmedRisk(row.outcome);
        const predictedRisk = actionPredictsRisk(row.predicted_action);
        if ((confirmedRisk && predictedRisk) || (!confirmedRisk && !predictedRisk)) {
            correct += 1;
        }
    }

    const accuracy = correct / rows.length;
    const confidencePenalty = rows.length < 20 ? 0.85 : rows.length < 50 ? 0.93 : 1;
    const reputationScore = Math.round(accuracy * 100 * confidencePenalty);

    return {
        model_id: modelId,
        window_days: days,
        total_reports: rows.length,
        correct_reports: correct,
        oracle_accuracy: Number(accuracy.toFixed(4)),
        reputation_score: reputationScore
    };
};

export const saveEscalationEvent = (event) => {
    try {
        const stmt = getDb().prepare(`
      INSERT INTO aegis_oracle_escalations (
        tx_hash, action_type, risk_score, confidence, reason, status, payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(
            event.tx_hash,
            event.action_type,
            Number.isFinite(Number(event.risk_score)) ? Number(event.risk_score) : null,
            Number.isFinite(Number(event.confidence)) ? Number(event.confidence) : null,
            event.reason || null,
            event.status || 'open',
            JSON.stringify(event.payload || {})
        );

        return { id: result.lastInsertRowid, success: true };
    } catch (error) {
        logError('Failed to save escalation event', { error: error.message, tx_hash: event.tx_hash });
        throw error;
    }
};

const toIsoNoMs = (date) => {
    const iso = date.toISOString();
    return iso.replace(/\.\d{3}Z$/, 'Z');
};

/**
 * Get transaction timeseries buckets for dashboard/prediction.
 * Returns a filled series (missing buckets -> zeros).
 */
export const getAegisTimeseries = ({ hoursBack = 24, bucketMinutes = 60 } = {}) => {
    const hours = Number.isFinite(hoursBack) ? Math.max(1, Math.min(168, Math.floor(hoursBack))) : 24;
    const bucketMins = Number.isFinite(bucketMinutes) ? Math.max(5, Math.min(360, Math.floor(bucketMinutes))) : 60;
    const bucketSeconds = bucketMins * 60;

    const nowSec = Math.floor(Date.now() / 1000);
    const endBucketSec = Math.floor(nowSec / bucketSeconds) * bucketSeconds;
    const numBuckets = Math.max(1, Math.ceil((hours * 3600) / bucketSeconds));
    const startBucketSec = endBucketSec - (numBuckets - 1) * bucketSeconds;

    const stmt = getDb().prepare(`
        SELECT
            strftime('%Y-%m-%dT%H:%M:%SZ', CAST(strftime('%s', created_at) / ? AS INTEGER) * ?, 'unixepoch') as bucket,
            COUNT(*) as total,
            SUM(CASE WHEN risk_score > 70 THEN 1 ELSE 0 END) as high,
            SUM(CASE WHEN risk_score > 30 AND risk_score <= 70 THEN 1 ELSE 0 END) as medium,
            SUM(CASE WHEN risk_score <= 30 THEN 1 ELSE 0 END) as low,
            AVG(risk_score) as avg_risk
        FROM aegis_transactions
        WHERE created_at >= datetime(?, 'unixepoch')
        GROUP BY bucket
        ORDER BY bucket ASC
    `);

    const rows = stmt.all(bucketSeconds, bucketSeconds, startBucketSec);
    const byBucket = new Map(rows.map(r => [r.bucket, r]));

    const series = [];
    for (let s = startBucketSec; s <= endBucketSec; s += bucketSeconds) {
        const t = toIsoNoMs(new Date(s * 1000));
        const row = byBucket.get(t);
        series.push({
            t,
            total: row ? Number(row.total || 0) : 0,
            high: row ? Number(row.high || 0) : 0,
            medium: row ? Number(row.medium || 0) : 0,
            low: row ? Number(row.low || 0) : 0,
            avg_risk: row ? Math.round(Number(row.avg_risk || 0)) : 0
        });
    }

    return {
        window: {
            hours,
            bucket_minutes: bucketMins
        },
        series
    };
};

/**
 * Top wallets by max/avg risk in a recent window.
 */
export const getTopRiskyWallets = ({ hoursBack = 24, limit = 5 } = {}) => {
    const hours = Number.isFinite(hoursBack) ? Math.max(1, Math.min(168, Math.floor(hoursBack))) : 24;
    const rowLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 5;

    const stmt = getDb().prepare(`
        SELECT
            from_address as address,
            COUNT(*) as tx_count,
            AVG(risk_score) as avg_risk_score,
            MAX(risk_score) as max_risk_score,
            MAX(created_at) as last_seen
        FROM aegis_transactions
        WHERE created_at >= datetime('now', ?)
        GROUP BY from_address
        ORDER BY max_risk_score DESC, avg_risk_score DESC, tx_count DESC
        LIMIT ?
    `);

    const rows = stmt.all(`-${hours} hours`, rowLimit);
    return rows.map(r => ({
        address: r.address,
        tx_count: Number(r.tx_count || 0),
        avg_risk_score: Math.round(Number(r.avg_risk_score || 0)),
        max_risk_score: Number(r.max_risk_score || 0),
        last_seen: r.last_seen
    }));
};

/**
 * Get system statistics
 */
export const getAegisStats = () => {
    const stats = {};

    // Total transactions analyzed
    stats.totalTransactions = getDb().prepare('SELECT COUNT(*) as count FROM aegis_transactions').get().count;

    // Total unique wallets
    stats.totalWallets = getDb().prepare('SELECT COUNT(*) as count FROM aegis_wallet_scores').get().count;

    // Average risk score
    const avgScore = getDb().prepare('SELECT AVG(risk_score) as avg FROM aegis_transactions WHERE risk_score IS NOT NULL').get();
    stats.averageRiskScore = Math.round(avgScore.avg || 0);

    // High risk transactions (score > 70)
    stats.highRiskCount = getDb().prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score > 70').get().count;

    // Transactions today
    stats.today = getDb().prepare(`
    SELECT COUNT(*) as count 
    FROM aegis_transactions 
    WHERE date(created_at) = date('now')
  `).get().count;

    // Transactions this hour
    stats.thisHour = getDb().prepare(`
    SELECT COUNT(*) as count 
    FROM aegis_transactions 
    WHERE datetime(created_at) >= datetime('now', '-1 hour')
  `).get().count;

    // Last analysis timestamps (normalized to ISO for frontend consistency)
    const lastAnalysis = getDb().prepare(`
        SELECT strftime('%Y-%m-%dT%H:%M:%SZ', MAX(created_at)) as last
        FROM aegis_transactions
    `).get();
    const lastWalletAnalysis = getDb().prepare(`
        SELECT strftime('%Y-%m-%dT%H:%M:%SZ', MAX(last_analyzed)) as last
        FROM aegis_wallet_scores
    `).get();
    stats.lastAnalysis = lastAnalysis.last || null;
    stats.lastWalletAnalysis = lastWalletAnalysis.last || null;

    // Last update is the latest known wallet or transaction analysis event.
    const tsCandidates = [stats.lastAnalysis, stats.lastWalletAnalysis]
        .filter(Boolean)
        .map((value) => new Date(value).getTime())
        .filter((value) => Number.isFinite(value));
    stats.lastUpdate = tsCandidates.length > 0 ? new Date(Math.max(...tsCandidates)).toISOString() : null;

    // Risk distribution
    stats.riskDistribution = {
        low: getDb().prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score <= 30').get().count,
        medium: getDb().prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score > 30 AND risk_score <= 70').get().count,
        high: getDb().prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score > 70').get().count,
    };

    return stats;
};

export const closeAegisDatabase = () => {
    try {
        if (db) db.close();
    } catch {
        // ignore shutdown errors
    } finally {
        db = null;
        schemaInitialized = false;
    }
};

export default {
    saveTransactionAnalysis,
    getTransactionAnalysis,
    updateWalletScore,
    getWalletScore,
    saveSignature,
    getRecentAnalyses,
    saveValidatorFeedback,
    getOracleReputation,
    saveEscalationEvent,
    getAegisTimeseries,
    getTopRiskyWallets,
    getAegisStats,
    closeAegisDatabase,
};
