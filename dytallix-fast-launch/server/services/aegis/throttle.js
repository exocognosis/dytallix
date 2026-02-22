/**
 * Aegis Wallet Throttling System
 * Automatic rate limiting based on risk scores
 */

import { logInfo, logError, logWarn } from '../../logger.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../../..', 'data', 'leads.db');

let db = null;

/**
 * Initialize throttle database table
 */
export const initializeThrottleTable = () => {
    try {
        db = new Database(dbPath);

        db.exec(`
            CREATE TABLE IF NOT EXISTS aegis_throttles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL UNIQUE,
                risk_score INTEGER NOT NULL,
                throttle_level INTEGER NOT NULL,
                last_transaction DATETIME,
                throttle_until DATETIME,
                violation_count INTEGER DEFAULT 0,
                transaction_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_throttles_address ON aegis_throttles(address);
            CREATE INDEX IF NOT EXISTS idx_throttles_until ON aegis_throttles(throttle_until);
            CREATE INDEX IF NOT EXISTS idx_throttles_level ON aegis_throttles(throttle_level);
        `);

        logInfo('Aegis throttle table initialized');
    } catch (error) {
        logError('Failed to initialize throttle table', { error: error.message });
        throw error;
    }
};

/**
 * Get throttle level based on risk score
 */
const getThrottleLevel = (riskScore) => {
    if (riskScore >= 90) return 4; // Critical - all to review queue
    if (riskScore >= 80) return 3; // Heavy throttle
    if (riskScore >= 60) return 2; // Medium throttle
    if (riskScore >= 40) return 1; // Light throttle
    return 0; // No throttle
};

/**
 * Get throttle rules for a level
 */
const getThrottleRules = (level) => {
    const rules = {
        0: { maxPerHour: Infinity, minSecondsBetween: 0, description: 'No throttle' },
        1: { maxPerHour: 10, minSecondsBetween: 0, description: 'Light throttle' },
        2: { maxPerHour: 5, minSecondsBetween: 120, description: 'Medium throttle' },
        3: { maxPerHour: 2, minSecondsBetween: 600, description: 'Heavy throttle' },
        4: { maxPerHour: 0, minSecondsBetween: Infinity, description: 'Critical - review required' }
    };
    return rules[level] || rules[0];
};

/**
 * Apply throttle to a wallet based on risk score
 */
export const applyThrottle = (address, riskScore) => {
    try {
        const throttleLevel = getThrottleLevel(riskScore);
        const rules = getThrottleRules(throttleLevel);

        const stmt = db.prepare(`
            INSERT INTO aegis_throttles (address, risk_score, throttle_level, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(address) DO UPDATE SET
                risk_score = excluded.risk_score,
                throttle_level = excluded.throttle_level,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(address, riskScore, throttleLevel);

        logInfo('Throttle applied', { address, riskScore, throttleLevel, rules: rules.description });

        return {
            address,
            throttle_level: throttleLevel,
            rules,
            risk_score: riskScore
        };
    } catch (error) {
        logError('Failed to apply throttle', { address, error: error.message });
        throw error;
    }
};

/**
 * Check if wallet is currently throttled
 */
export const checkThrottle = (address) => {
    try {
        const stmt = db.prepare(`
            SELECT * FROM aegis_throttles 
            WHERE address = ?
        `);

        const throttle = stmt.get(address);

        if (!throttle) {
            return {
                is_throttled: false,
                throttle_level: 0,
                rules: getThrottleRules(0)
            };
        }

        const rules = getThrottleRules(throttle.throttle_level);

        return {
            is_throttled: throttle.throttle_level > 0,
            throttle_level: throttle.throttle_level,
            risk_score: throttle.risk_score,
            rules,
            last_transaction: throttle.last_transaction,
            throttle_until: throttle.throttle_until,
            violation_count: throttle.violation_count,
            transaction_count: throttle.transaction_count
        };
    } catch (error) {
        logError('Failed to check throttle', { address, error: error.message });
        return { is_throttled: false, throttle_level: 0, rules: getThrottleRules(0) };
    }
};

/**
 * Record a transaction and check for throttle violations
 */
export const recordTransaction = (address) => {
    try {
        const throttle = checkThrottle(address);

        if (!throttle.is_throttled) {
            return { allowed: true, violation: false };
        }

        const now = new Date();
        const rules = throttle.rules;

        // Check time-based throttle
        if (throttle.last_transaction) {
            const lastTx = new Date(throttle.last_transaction);
            const secondsSince = (now - lastTx) / 1000;

            if (secondsSince < rules.minSecondsBetween) {
                // Violation: too soon
                recordViolation(address);
                return {
                    allowed: false,
                    violation: true,
                    reason: `Must wait ${rules.minSecondsBetween} seconds between transactions`,
                    wait_seconds: Math.ceil(rules.minSecondsBetween - secondsSince)
                };
            }
        }

        // Check hourly limit
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        const stmt = db.prepare(`
            SELECT COUNT(*) as count FROM aegis_transactions
            WHERE from_address = ? AND created_at > ?
        `);
        const result = stmt.get(address, oneHourAgo.toISOString());

        if (result.count >= rules.maxPerHour) {
            // Violation: hourly limit exceeded
            recordViolation(address);
            return {
                allowed: false,
                violation: true,
                reason: `Hourly limit of ${rules.maxPerHour} transactions exceeded`
            };
        }

        // Update last transaction time
        const updateStmt = db.prepare(`
            UPDATE aegis_throttles 
            SET last_transaction = CURRENT_TIMESTAMP,
                transaction_count = transaction_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE address = ?
        `);
        updateStmt.run(address);

        return { allowed: true, violation: false };
    } catch (error) {
        logError('Failed to record transaction', { address, error: error.message });
        return { allowed: true, violation: false }; // Fail open
    }
};

/**
 * Record a throttle violation
 */
export const recordViolation = (address) => {
    try {
        const stmt = db.prepare(`
            UPDATE aegis_throttles 
            SET violation_count = violation_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE address = ?
        `);
        stmt.run(address);

        logWarn('Throttle violation recorded', { address });
    } catch (error) {
        logError('Failed to record violation', { address, error: error.message });
    }
};

/**
 * Check if transaction would violate throttle (without recording)
 */
export const isThrottleViolation = (address) => {
    const result = recordTransaction(address);
    return result.violation === true;
};

/**
 * Get throttle status for an address
 */
export const getThrottleStatus = (address) => {
    return checkThrottle(address);
};

/**
 * Get all throttled wallets
 */
export const getThrottledWallets = (level = null) => {
    try {
        let query = 'SELECT * FROM aegis_throttles WHERE throttle_level > 0';
        const params = [];

        if (level !== null) {
            query += ' AND throttle_level = ?';
            params.push(level);
        }

        query += ' ORDER BY risk_score DESC, violation_count DESC';

        const stmt = db.prepare(query);
        const wallets = stmt.all(...params);

        return wallets.map(w => ({
            ...w,
            rules: getThrottleRules(w.throttle_level)
        }));
    } catch (error) {
        logError('Failed to get throttled wallets', { error: error.message });
        return [];
    }
};

/**
 * Clear throttle for an address (admin function)
 */
export const clearThrottle = (address) => {
    try {
        const stmt = db.prepare('DELETE FROM aegis_throttles WHERE address = ?');
        stmt.run(address);
        logInfo('Throttle cleared', { address });
        return { success: true };
    } catch (error) {
        logError('Failed to clear throttle', { address, error: error.message });
        return { success: false, error: error.message };
    }
};

export const closeThrottleDb = () => {
    if (!db) return;
    try {
        db.close();
        db = null;
        logInfo('Aegis throttle DB closed');
    } catch (error) {
        logWarn('Failed to close Aegis throttle DB cleanly', { error: error.message });
    }
};

// Initialize on module load
initializeThrottleTable();

export default {
    applyThrottle,
    checkThrottle,
    recordTransaction,
    isThrottleViolation,
    getThrottleStatus,
    getThrottledWallets,
    clearThrottle,
    recordViolation,
    closeThrottleDb
};
