import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logError, logInfo } from '../../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.HORIZON_DB_PATH || path.join(__dirname, '../../../data/leads.db');

let db = null;
let schemaInitialized = false;

const ensureDbHandle = () => {
    if (!db) {
        db = new Database(DB_PATH);
    }
    return db;
};

const parseJsonSafe = (value, fallback) => {
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const toLimit = (value, fallback = 50, max = 500) => {
    const parsed = Number.parseInt(String(value || ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
};

const normalizeRow = (row) => {
    if (!row) return null;
    return {
        ...row,
        details: parseJsonSafe(row.details_json, {}),
        attestation: parseJsonSafe(row.attestation_json, null),
        on_chain_result: parseJsonSafe(row.on_chain_result_json, null),
    };
};

const normalizeActionRow = (row) => {
    if (!row) return null;
    return {
        ...row,
        action_payload: parseJsonSafe(row.action_payload_json, {}),
        action_result: parseJsonSafe(row.action_result_json, null),
    };
};

const normalizeSnapshotRow = (row) => {
    if (!row) return null;
    return {
        ...row,
        emission_pools: parseJsonSafe(row.emission_pools_json, {}),
        raw_payload: parseJsonSafe(row.raw_payload_json, {}),
    };
};

const initializeSchema = () => {
    if (schemaInitialized) return;
    const dbi = ensureDbHandle();

    dbi.exec(`
      CREATE TABLE IF NOT EXISTS horizon_telemetry_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshot_hash TEXT UNIQUE NOT NULL,
        bridge_halted INTEGER NOT NULL DEFAULT 0,
        bridge_pending_count INTEGER NOT NULL DEFAULT 0,
        bridge_validator_count INTEGER NOT NULL DEFAULT 0,
        bridge_custody_total TEXT NOT NULL DEFAULT '0',
        mempool_count INTEGER NOT NULL DEFAULT 0,
        mempool_top_sender TEXT,
        mempool_top_sender_share REAL,
        emission_pools_json TEXT NOT NULL,
        raw_payload_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    dbi.exec(`
      CREATE TABLE IF NOT EXISTS horizon_incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT UNIQUE NOT NULL,
        fingerprint TEXT NOT NULL,
        incident_hash TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        risk_score REAL NOT NULL,
        confidence REAL,
        summary TEXT NOT NULL,
        details_json TEXT NOT NULL,
        source_snapshot_hash TEXT,
        canonical_payload TEXT,
        signature TEXT,
        oracle_pubkey TEXT,
        attestation_json TEXT,
        on_chain_status TEXT,
        on_chain_result_json TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      )
    `);

    dbi.exec(`
      CREATE TABLE IF NOT EXISTS horizon_circuit_breaker_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id TEXT UNIQUE NOT NULL,
        incident_id TEXT,
        fingerprint TEXT,
        action_type TEXT NOT NULL,
        scope TEXT,
        severity TEXT,
        reason TEXT,
        status TEXT NOT NULL,
        ttl_seconds INTEGER,
        expires_at DATETIME,
        action_payload_json TEXT NOT NULL,
        action_result_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
      )
    `);

    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_snapshots_created ON horizon_telemetry_snapshots(created_at)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_incidents_fingerprint ON horizon_incidents(fingerprint)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_incidents_status ON horizon_incidents(status)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_incidents_created ON horizon_incidents(created_at)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_actions_status ON horizon_circuit_breaker_actions(status)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_actions_expires ON horizon_circuit_breaker_actions(expires_at)`);
    dbi.exec(`CREATE INDEX IF NOT EXISTS idx_horizon_actions_created ON horizon_circuit_breaker_actions(created_at)`);

    schemaInitialized = true;
    logInfo('Horizon database initialized', { path: DB_PATH });
};

const getDb = () => {
    initializeSchema();
    return ensureDbHandle();
};

export const saveTelemetrySnapshot = (snapshot) => {
    try {
        const stmt = getDb().prepare(`
          INSERT OR REPLACE INTO horizon_telemetry_snapshots (
            snapshot_hash,
            bridge_halted,
            bridge_pending_count,
            bridge_validator_count,
            bridge_custody_total,
            mempool_count,
            mempool_top_sender,
            mempool_top_sender_share,
            emission_pools_json,
            raw_payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            snapshot.snapshot_hash,
            snapshot.bridge_halted ? 1 : 0,
            snapshot.bridge_pending_count || 0,
            snapshot.bridge_validator_count || 0,
            String(snapshot.bridge_custody_total || '0'),
            snapshot.mempool_count || 0,
            snapshot.mempool_top_sender || null,
            Number.isFinite(Number(snapshot.mempool_top_sender_share))
                ? Number(snapshot.mempool_top_sender_share)
                : null,
            JSON.stringify(snapshot.emission_pools || {}),
            JSON.stringify(snapshot.raw_payload || {})
        );

        return {
            success: true,
            id: result.lastInsertRowid,
            snapshot_hash: snapshot.snapshot_hash,
        };
    } catch (error) {
        logError('Failed to save Horizon telemetry snapshot', { error: error.message });
        throw error;
    }
};

export const getLatestTelemetrySnapshot = () => {
    const row = getDb().prepare(`
      SELECT * FROM horizon_telemetry_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `).get();
    return normalizeSnapshotRow(row);
};

export const getRecentTelemetrySnapshots = (limit = 50) => {
    const rows = getDb().prepare(`
      SELECT * FROM horizon_telemetry_snapshots
      ORDER BY created_at DESC
      LIMIT ?
    `).all(toLimit(limit));

    return rows.map(normalizeSnapshotRow);
};

export const saveIncident = (incident) => {
    try {
        const stmt = getDb().prepare(`
          INSERT INTO horizon_incidents (
            incident_id,
            fingerprint,
            incident_hash,
            incident_type,
            severity,
            risk_score,
            confidence,
            summary,
            details_json,
            source_snapshot_hash,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            incident.incident_id,
            incident.fingerprint,
            incident.incident_hash,
            incident.incident_type,
            incident.severity,
            Number(incident.risk_score) || 0,
            Number.isFinite(Number(incident.confidence)) ? Number(incident.confidence) : null,
            incident.summary,
            JSON.stringify(incident.details || {}),
            incident.source_snapshot_hash || null,
            incident.status || 'open'
        );

        return {
            success: true,
            id: result.lastInsertRowid,
            incident_id: incident.incident_id,
        };
    } catch (error) {
        logError('Failed to save Horizon incident', {
            error: error.message,
            incident_id: incident.incident_id,
            fingerprint: incident.fingerprint,
        });
        throw error;
    }
};

export const updateIncidentAttestation = (incidentId, payload) => {
    const stmt = getDb().prepare(`
      UPDATE horizon_incidents
      SET
        canonical_payload = ?,
        signature = ?,
        oracle_pubkey = ?,
        attestation_json = ?,
        on_chain_status = ?,
        on_chain_result_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE incident_id = ?
    `);

    stmt.run(
        payload.canonical_payload || null,
        payload.signature || null,
        payload.oracle_pubkey || null,
        JSON.stringify(payload.attestation || null),
        payload.on_chain_status || null,
        JSON.stringify(payload.on_chain_result || null),
        incidentId
    );
};

export const resolveIncident = (incidentId) => {
    const stmt = getDb().prepare(`
      UPDATE horizon_incidents
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE incident_id = ? AND status <> 'resolved'
    `);
    const result = stmt.run(incidentId);
    return {
        success: result.changes > 0,
        changed: result.changes,
    };
};

export const getOpenIncidentByFingerprint = (fingerprint, withinMinutes = null) => {
    const parsed = Number.parseInt(String(withinMinutes || ''), 10);
    const hasWindow = Number.isFinite(parsed) && parsed > 0;

    if (hasWindow) {
        const minutes = Math.max(1, Math.min(1440, parsed));
        const row = getDb().prepare(`
          SELECT * FROM horizon_incidents
          WHERE fingerprint = ?
            AND status = 'open'
            AND created_at >= datetime('now', ?)
          ORDER BY created_at DESC
          LIMIT 1
        `).get(fingerprint, `-${minutes} minutes`);
        return normalizeRow(row);
    }

    const row = getDb().prepare(`
      SELECT * FROM horizon_incidents
      WHERE fingerprint = ?
        AND status = 'open'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(fingerprint);
    return normalizeRow(row);
};

export const listIncidents = ({ status = 'all', limit = 100, incidentType = null } = {}) => {
    const clauses = [];
    const params = [];

    if (status && status !== 'all') {
        clauses.push('status = ?');
        params.push(String(status));
    }
    if (incidentType) {
        clauses.push('incident_type = ?');
        params.push(String(incidentType));
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `
      SELECT * FROM horizon_incidents
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const rows = getDb().prepare(query).all(...params, toLimit(limit, 100));
    return rows.map(normalizeRow);
};

export const saveCircuitBreakerAction = (action) => {
    try {
        const stmt = getDb().prepare(`
          INSERT INTO horizon_circuit_breaker_actions (
            action_id,
            incident_id,
            fingerprint,
            action_type,
            scope,
            severity,
            reason,
            status,
            ttl_seconds,
            expires_at,
            action_payload_json,
            action_result_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            action.action_id,
            action.incident_id || null,
            action.fingerprint || null,
            action.action_type,
            action.scope || null,
            action.severity || null,
            action.reason || null,
            action.status || 'pending',
            Number.isFinite(Number(action.ttl_seconds)) ? Number(action.ttl_seconds) : null,
            action.expires_at || null,
            JSON.stringify(action.action_payload || {}),
            JSON.stringify(action.action_result || null)
        );

        return {
            success: true,
            id: result.lastInsertRowid,
            action_id: action.action_id,
        };
    } catch (error) {
        logError('Failed to save Horizon circuit breaker action', {
            error: error.message,
            action_id: action.action_id,
            action_type: action.action_type,
        });
        throw error;
    }
};

export const updateCircuitBreakerAction = (actionId, patch = {}) => {
    const stmt = getDb().prepare(`
      UPDATE horizon_circuit_breaker_actions
      SET
        status = COALESCE(?, status),
        action_result_json = COALESCE(?, action_result_json),
        resolved_at = COALESCE(?, resolved_at),
        expires_at = COALESCE(?, expires_at),
        updated_at = CURRENT_TIMESTAMP
      WHERE action_id = ?
    `);

    const result = stmt.run(
        patch.status || null,
        patch.action_result ? JSON.stringify(patch.action_result) : null,
        patch.resolved_at || null,
        patch.expires_at || null,
        actionId
    );

    return {
        success: result.changes > 0,
        changed: result.changes,
    };
};

export const listCircuitBreakerActions = ({ status = 'all', limit = 100 } = {}) => {
    const params = [];
    let where = '';

    if (status && status !== 'all') {
        where = 'WHERE status = ?';
        params.push(String(status));
    }

    const rows = getDb().prepare(`
      SELECT * FROM horizon_circuit_breaker_actions
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...params, toLimit(limit, 100));

    return rows.map(normalizeActionRow);
};

export const listExpiredActiveBreakers = () => {
    const rows = getDb().prepare(`
      SELECT * FROM horizon_circuit_breaker_actions
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at <= CURRENT_TIMESTAMP
      ORDER BY created_at ASC
    `).all();

    return rows.map(normalizeActionRow);
};

export const getHorizonStats = () => {
    const totalIncidents = getDb().prepare(`SELECT COUNT(*) as count FROM horizon_incidents`).get().count;
    const openIncidents = getDb().prepare(`SELECT COUNT(*) as count FROM horizon_incidents WHERE status = 'open'`).get().count;
    const activeBreakers = getDb().prepare(`SELECT COUNT(*) as count FROM horizon_circuit_breaker_actions WHERE status = 'active'`).get().count;
    const totalBreakers = getDb().prepare(`SELECT COUNT(*) as count FROM horizon_circuit_breaker_actions`).get().count;
    const totalSnapshots = getDb().prepare(`SELECT COUNT(*) as count FROM horizon_telemetry_snapshots`).get().count;

    const bySeverityRows = getDb().prepare(`
      SELECT severity, COUNT(*) as count
      FROM horizon_incidents
      GROUP BY severity
    `).all();

    const byTypeRows = getDb().prepare(`
      SELECT incident_type, COUNT(*) as count
      FROM horizon_incidents
      GROUP BY incident_type
    `).all();

    const bySeverity = {};
    for (const row of bySeverityRows) {
        bySeverity[row.severity] = Number(row.count || 0);
    }

    const byType = {};
    for (const row of byTypeRows) {
        byType[row.incident_type] = Number(row.count || 0);
    }

    const latestIncident = getDb().prepare(`
      SELECT incident_id, incident_type, severity, risk_score, created_at
      FROM horizon_incidents
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    const latestSnapshot = getDb().prepare(`
      SELECT snapshot_hash, created_at
      FROM horizon_telemetry_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `).get();

    return {
        incidents_total: Number(totalIncidents || 0),
        incidents_open: Number(openIncidents || 0),
        snapshots_indexed: Number(totalSnapshots || 0),
        circuit_breakers_total: Number(totalBreakers || 0),
        circuit_breakers_active: Number(activeBreakers || 0),
        by_severity: bySeverity,
        by_type: byType,
        latest_incident: latestIncident || null,
        latest_snapshot: latestSnapshot || null,
    };
};

export const closeHorizonDatabase = () => {
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
    saveTelemetrySnapshot,
    getLatestTelemetrySnapshot,
    getRecentTelemetrySnapshots,
    saveIncident,
    updateIncidentAttestation,
    resolveIncident,
    getOpenIncidentByFingerprint,
    listIncidents,
    saveCircuitBreakerAction,
    updateCircuitBreakerAction,
    listCircuitBreakerActions,
    listExpiredActiveBreakers,
    getHorizonStats,
    closeHorizonDatabase,
};
