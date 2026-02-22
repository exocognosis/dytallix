import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logError, logInfo } from '../../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.VECTOR_DB_PATH || path.join(__dirname, '../../../data/leads.db');

let db = null;
let schemaInitialized = false;
const tableExistsCache = new Map();

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

const toWindowHours = (value, fallback = 24) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 24 * 30);
};

const hasTable = (tableName) => {
  if (tableExistsCache.has(tableName)) {
    return tableExistsCache.get(tableName);
  }

  const row = ensureDbHandle().prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
      LIMIT 1
    `).get(tableName);

  const exists = Boolean(row?.name);
  tableExistsCache.set(tableName, exists);
  return exists;
};

const normalizeProfileRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    behavior: parseJsonSafe(row.behavior_json, {}),
    on_chain_result: parseJsonSafe(row.on_chain_result_json, null),
  };
};

const normalizeAttestationRow = (row) => {
  if (!row) return null;
  return {
    ...row,
    behavior: parseJsonSafe(row.behavior_json, {}),
    attestation: parseJsonSafe(row.attestation_json, null),
    on_chain_result: parseJsonSafe(row.on_chain_result_json, null),
  };
};

const initializeSchema = () => {
  if (schemaInitialized) return;
  const dbi = ensureDbHandle();

  dbi.exec(`
      CREATE TABLE IF NOT EXISTS vector_address_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT UNIQUE NOT NULL,
        reputation_score INTEGER NOT NULL,
        risk_score REAL NOT NULL,
        risk_tier TEXT NOT NULL,
        confidence REAL,
        model_id TEXT,
        model_version TEXT,
        behavior_json TEXT NOT NULL,
        last_seen_at DATETIME,
        last_analyzed_at DATETIME,
        attestation_tx_hash TEXT,
        signature TEXT,
        oracle_pubkey TEXT,
        on_chain_status TEXT,
        on_chain_result_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  dbi.exec(`
      CREATE TABLE IF NOT EXISTS vector_address_attestations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attestation_id TEXT UNIQUE NOT NULL,
        address TEXT NOT NULL,
        reputation_score INTEGER NOT NULL,
        risk_score REAL NOT NULL,
        risk_tier TEXT NOT NULL,
        confidence REAL,
        model_id TEXT,
        canonical_payload TEXT,
        signature TEXT,
        oracle_pubkey TEXT,
        behavior_json TEXT NOT NULL,
        attestation_json TEXT NOT NULL,
        on_chain_status TEXT,
        on_chain_result_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_profiles_risk_tier ON vector_address_profiles(risk_tier)`);
  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_profiles_reputation ON vector_address_profiles(reputation_score)`);
  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_profiles_updated ON vector_address_profiles(updated_at)`);
  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_profiles_analyzed ON vector_address_profiles(last_analyzed_at)`);

  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_attest_address ON vector_address_attestations(address)`);
  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_attest_risk_tier ON vector_address_attestations(risk_tier)`);
  dbi.exec(`CREATE INDEX IF NOT EXISTS idx_vector_attest_created ON vector_address_attestations(created_at)`);

  schemaInitialized = true;
  logInfo('Vector database initialized', { path: DB_PATH });
};

const getDb = () => {
  initializeSchema();
  return ensureDbHandle();
};

export const listAegisCandidateAddresses = ({ windowHours = 24, limit = 50, minTxCount = 1 } = {}) => {
  const rowLimit = toLimit(limit, 50);
  const hours = toWindowHours(windowHours, 24);
  const minTx = Math.max(1, Number.parseInt(String(minTxCount || '1'), 10) || 1);

  const addresses = [];
  const seen = new Set();
  const dbi = getDb();

  if (hasTable('aegis_transactions')) {
    const rows = dbi.prepare(`
          SELECT
            from_address AS address,
            COUNT(*) AS tx_count,
            AVG(COALESCE(risk_score, 0)) AS avg_risk_score,
            MAX(created_at) AS last_seen_at
          FROM aegis_transactions
          WHERE from_address IS NOT NULL
            AND TRIM(from_address) <> ''
            AND created_at >= datetime('now', ?)
          GROUP BY from_address
          HAVING COUNT(*) >= ?
          ORDER BY tx_count DESC, avg_risk_score DESC
          LIMIT ?
        `).all(`-${hours} hours`, minTx, rowLimit);

    for (const row of rows) {
      const address = String(row.address || '').trim();
      if (!address || seen.has(address)) continue;
      seen.add(address);
      addresses.push({
        address,
        tx_count: Number(row.tx_count || 0),
        avg_risk_score: Number(row.avg_risk_score || 0),
        last_seen_at: row.last_seen_at || null,
      });
    }
  }

  if (addresses.length < rowLimit && hasTable('aegis_wallet_scores')) {
    const fillRows = dbi.prepare(`
          SELECT
            address,
            COALESCE(total_transactions, 0) AS tx_count,
            COALESCE(current_score, 0) AS avg_risk_score,
            last_analyzed AS last_seen_at
          FROM aegis_wallet_scores
          WHERE address IS NOT NULL
            AND TRIM(address) <> ''
          ORDER BY COALESCE(last_analyzed, updated_at) DESC
          LIMIT ?
        `).all(rowLimit * 2);

    for (const row of fillRows) {
      if (addresses.length >= rowLimit) break;
      const address = String(row.address || '').trim();
      if (!address || seen.has(address)) continue;
      seen.add(address);
      addresses.push({
        address,
        tx_count: Number(row.tx_count || 0),
        avg_risk_score: Number(row.avg_risk_score || 0),
        last_seen_at: row.last_seen_at || null,
      });
    }
  }

  return addresses;
};

export const getAegisAddressFeatures = (address, { windowHours = 24 } = {}) => {
  const normalizedAddress = String(address || '').trim();
  const hours = toWindowHours(windowHours, 24);
  const dbi = getDb();

  const features = {
    address: normalizedAddress,
    window_hours: hours,
    tx_count: 0,
    tx_count_last_hour: 0,
    avg_risk_score: 0,
    max_risk_score: 0,
    high_risk_tx_count: 0,
    critical_risk_tx_count: 0,
    unique_counterparties: 0,
    confirmed_risk_feedback: 0,
    benign_feedback: 0,
    feedback_count: 0,
    wallet_score: 0,
    wallet_total_transactions: 0,
    wallet_first_seen: null,
    wallet_last_analyzed: null,
    last_seen_at: null,
  };

  if (!normalizedAddress) return features;

  if (hasTable('aegis_transactions')) {
    const txRow = dbi.prepare(`
          SELECT
            COUNT(*) AS tx_count,
            SUM(CASE WHEN created_at >= datetime('now', '-1 hour') THEN 1 ELSE 0 END) AS tx_count_last_hour,
            SUM(CASE WHEN created_at >= datetime('now', '-6 hours') AND created_at < datetime('now', '-1 hour') THEN 1 ELSE 0 END) AS tx_count_prev_5_hours,
            SUM(CASE WHEN created_at >= datetime('now', '-24 hours') AND created_at < datetime('now', '-6 hours') THEN 1 ELSE 0 END) AS tx_count_prev_18_hours,
            AVG(COALESCE(risk_score, 0)) AS avg_risk_score,
            MAX(COALESCE(risk_score, 0)) AS max_risk_score,
            SUM(CASE WHEN COALESCE(risk_score, 0) < 40 THEN 1 ELSE 0 END) AS low_risk_tx_count,
            SUM(CASE WHEN COALESCE(risk_score, 0) >= 40 AND COALESCE(risk_score, 0) < 70 THEN 1 ELSE 0 END) AS medium_risk_tx_count,
            SUM(CASE WHEN COALESCE(risk_score, 0) >= 70 AND COALESCE(risk_score, 0) < 90 THEN 1 ELSE 0 END) AS high_risk_tx_count,
            SUM(CASE WHEN COALESCE(risk_score, 0) >= 90 THEN 1 ELSE 0 END) AS critical_risk_tx_count,
            COUNT(DISTINCT CASE
                WHEN to_address IS NOT NULL AND TRIM(to_address) <> '' THEN to_address
                ELSE NULL
            END) AS unique_counterparties,
            MAX(created_at) AS last_seen_at
          FROM aegis_transactions
          WHERE from_address = ?
            AND created_at >= datetime('now', ?)
        `).get(normalizedAddress, `-${hours} hours`);

    if (txRow) {
      features.tx_count = Number(txRow.tx_count || 0);
      features.tx_count_last_hour = Number(txRow.tx_count_last_hour || 0);
      features.avg_risk_score = Number(txRow.avg_risk_score || 0);
      features.max_risk_score = Number(txRow.max_risk_score || 0);
      features.high_risk_tx_count = Number(txRow.high_risk_tx_count || 0);
      features.critical_risk_tx_count = Number(txRow.critical_risk_tx_count || 0);
      features.unique_counterparties = Number(txRow.unique_counterparties || 0);
      features.last_seen_at = txRow.last_seen_at || null;

      // Extract raw distribution counts for Geometry module
      features.counterparty_risk_distribution_raw = [
        Number(txRow.low_risk_tx_count || 0),
        Number(txRow.medium_risk_tx_count || 0),
        Number(txRow.high_risk_tx_count || 0),
        Number(txRow.critical_risk_tx_count || 0)
      ];

      // Extract raw temporal velocity bins
      features.temporal_velocity_distribution_raw = [
        Number(txRow.tx_count_last_hour || 0),
        Number(txRow.tx_count_prev_5_hours || 0),
        Number(txRow.tx_count_prev_18_hours || 0)
      ];
    }
  }

  if (hasTable('aegis_validator_feedback')) {
    const feedbackRow = dbi.prepare(`
          SELECT
            COUNT(*) AS feedback_count,
            SUM(CASE
              WHEN UPPER(COALESCE(outcome, '')) IN ('BLOCKED', 'REJECTED', 'FRAUD_CONFIRMED', 'MALICIOUS')
              THEN 1 ELSE 0 END
            ) AS confirmed_risk_feedback
          FROM aegis_validator_feedback
          WHERE address = ?
            AND created_at >= datetime('now', ?)
        `).get(normalizedAddress, `-${hours} hours`);

    if (feedbackRow) {
      const feedbackCount = Number(feedbackRow.feedback_count || 0);
      const confirmedRisk = Number(feedbackRow.confirmed_risk_feedback || 0);
      features.feedback_count = feedbackCount;
      features.confirmed_risk_feedback = confirmedRisk;
      features.benign_feedback = Math.max(0, feedbackCount - confirmedRisk);
    }
  }

  if (hasTable('aegis_wallet_scores')) {
    const walletRow = dbi.prepare(`
          SELECT
            COALESCE(current_score, 0) AS wallet_score,
            COALESCE(total_transactions, 0) AS wallet_total_transactions,
            first_seen AS wallet_first_seen,
            last_analyzed AS wallet_last_analyzed
          FROM aegis_wallet_scores
          WHERE address = ?
          LIMIT 1
        `).get(normalizedAddress);

    if (walletRow) {
      features.wallet_score = Number(walletRow.wallet_score || 0);
      features.wallet_total_transactions = Number(walletRow.wallet_total_transactions || 0);
      features.wallet_first_seen = walletRow.wallet_first_seen || null;
      features.wallet_last_analyzed = walletRow.wallet_last_analyzed || null;
      if (!features.last_seen_at) {
        features.last_seen_at = walletRow.wallet_last_analyzed || null;
      }
    }
  }

  return features;
};

export const upsertAddressProfile = (profile) => {
  const stmt = getDb().prepare(`
      INSERT INTO vector_address_profiles (
        address,
        reputation_score,
        risk_score,
        risk_tier,
        confidence,
        model_id,
        model_version,
        behavior_json,
        last_seen_at,
        last_analyzed_at,
        attestation_tx_hash,
        signature,
        oracle_pubkey,
        on_chain_status,
        on_chain_result_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(address) DO UPDATE SET
        reputation_score = excluded.reputation_score,
        risk_score = excluded.risk_score,
        risk_tier = excluded.risk_tier,
        confidence = excluded.confidence,
        model_id = excluded.model_id,
        model_version = excluded.model_version,
        behavior_json = excluded.behavior_json,
        last_seen_at = excluded.last_seen_at,
        last_analyzed_at = excluded.last_analyzed_at,
        attestation_tx_hash = excluded.attestation_tx_hash,
        signature = excluded.signature,
        oracle_pubkey = excluded.oracle_pubkey,
        on_chain_status = excluded.on_chain_status,
        on_chain_result_json = excluded.on_chain_result_json,
        updated_at = CURRENT_TIMESTAMP
    `);

  stmt.run(
    profile.address,
    Math.round(Number(profile.reputation_score) || 0),
    Number(profile.risk_score) || 0,
    profile.risk_tier || 'low',
    Number.isFinite(Number(profile.confidence)) ? Number(profile.confidence) : null,
    profile.model_id || null,
    profile.model_version || null,
    JSON.stringify(profile.behavior || {}),
    profile.last_seen_at || null,
    profile.last_analyzed_at || new Date().toISOString(),
    profile.attestation_tx_hash || null,
    profile.signature || null,
    profile.oracle_pubkey || null,
    profile.on_chain_status || null,
    JSON.stringify(profile.on_chain_result || null),
  );
};

export const getAddressProfile = (address) => {
  const row = getDb().prepare(`
      SELECT *
      FROM vector_address_profiles
      WHERE address = ?
      LIMIT 1
    `).get(String(address || '').trim());

  return normalizeProfileRow(row);
};

export const listAddressProfiles = ({ limit = 100, riskTier = null } = {}) => {
  const rowLimit = toLimit(limit, 100);
  const tier = riskTier ? String(riskTier).trim().toLowerCase() : null;
  let query = `
      SELECT *
      FROM vector_address_profiles
    `;
  const params = [];

  if (tier && tier !== 'all') {
    query += ` WHERE lower(risk_tier) = ? `;
    params.push(tier);
  }

  query += `
      ORDER BY reputation_score ASC, risk_score DESC, updated_at DESC
      LIMIT ?
    `;
  params.push(rowLimit);

  const rows = getDb().prepare(query).all(...params);
  return rows.map(normalizeProfileRow);
};

export const saveAddressAttestation = (record) => {
  const stmt = getDb().prepare(`
      INSERT INTO vector_address_attestations (
        attestation_id,
        address,
        reputation_score,
        risk_score,
        risk_tier,
        confidence,
        model_id,
        canonical_payload,
        signature,
        oracle_pubkey,
        behavior_json,
        attestation_json,
        on_chain_status,
        on_chain_result_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const result = stmt.run(
    record.attestation_id,
    record.address,
    Math.round(Number(record.reputation_score) || 0),
    Number(record.risk_score) || 0,
    record.risk_tier || 'low',
    Number.isFinite(Number(record.confidence)) ? Number(record.confidence) : null,
    record.model_id || null,
    record.canonical_payload || null,
    record.signature || null,
    record.oracle_pubkey || null,
    JSON.stringify(record.behavior || {}),
    JSON.stringify(record.attestation || {}),
    record.on_chain_status || null,
    JSON.stringify(record.on_chain_result || null),
  );

  return {
    success: true,
    id: result.lastInsertRowid,
  };
};

export const listAddressAttestations = ({ limit = 100, address = null, riskTier = null } = {}) => {
  const rowLimit = toLimit(limit, 100);
  const normalizedAddress = address ? String(address).trim() : null;
  const tier = riskTier ? String(riskTier).trim().toLowerCase() : null;
  const clauses = [];
  const params = [];

  if (normalizedAddress) {
    clauses.push('address = ?');
    params.push(normalizedAddress);
  }
  if (tier && tier !== 'all') {
    clauses.push('lower(risk_tier) = ?');
    params.push(tier);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = getDb().prepare(`
      SELECT *
      FROM vector_address_attestations
      ${where}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...params, rowLimit);

  return rows.map(normalizeAttestationRow);
};

export const getVectorStats = () => {
  const dbi = getDb();

  const profilesTotal = dbi.prepare(`
      SELECT COUNT(*) AS count
      FROM vector_address_profiles
    `).get().count;

  const attestationsTotal = dbi.prepare(`
      SELECT COUNT(*) AS count
      FROM vector_address_attestations
    `).get().count;

  const attestationsSubmitted = dbi.prepare(`
      SELECT COUNT(*) AS count
      FROM vector_address_attestations
      WHERE on_chain_status = 'submitted'
    `).get().count;

  const avgReputation = dbi.prepare(`
      SELECT AVG(reputation_score) AS value
      FROM vector_address_profiles
    `).get().value;

  const tierRows = dbi.prepare(`
      SELECT lower(risk_tier) AS risk_tier, COUNT(*) AS count
      FROM vector_address_profiles
      GROUP BY lower(risk_tier)
    `).all();

  const byTier = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const row of tierRows) {
    const tier = String(row.risk_tier || '').toLowerCase();
    if (!(tier in byTier)) continue;
    byTier[tier] = Number(row.count || 0);
  }

  const latestProfile = dbi.prepare(`
      SELECT MAX(last_analyzed_at) AS latest_profile_at
      FROM vector_address_profiles
    `).get().latest_profile_at;

  const latestAttestation = dbi.prepare(`
      SELECT MAX(created_at) AS latest_attestation_at
      FROM vector_address_attestations
    `).get().latest_attestation_at;

  return {
    profiles_total: Number(profilesTotal || 0),
    attestations_total: Number(attestationsTotal || 0),
    attestations_submitted: Number(attestationsSubmitted || 0),
    average_reputation: Number.isFinite(Number(avgReputation))
      ? Number(Number(avgReputation).toFixed(2))
      : null,
    by_tier: byTier,
    latest_profile_at: latestProfile || null,
    latest_attestation_at: latestAttestation || null,
  };
};

export const closeVectorDatabase = () => {
  try {
    if (db) db.close();
  } catch (error) {
    logError('Failed to close Vector database', { error: error.message });
  } finally {
    db = null;
    schemaInitialized = false;
    tableExistsCache.clear();
  }
};

export default {
  listAegisCandidateAddresses,
  getAegisAddressFeatures,
  upsertAddressProfile,
  getAddressProfile,
  listAddressProfiles,
  saveAddressAttestation,
  listAddressAttestations,
  getVectorStats,
  closeVectorDatabase,
};
