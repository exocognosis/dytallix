-- Initial schema for Dytallix faucet and API server
-- Version: 0001

-- Faucet grants table
CREATE TABLE IF NOT EXISTS faucet_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  ip TEXT NOT NULL,
  amount INTEGER NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_faucet_grants_address_created 
  ON faucet_grants(address, created_at);
CREATE INDEX IF NOT EXISTS idx_faucet_grants_ip_created 
  ON faucet_grants(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_faucet_grants_status 
  ON faucet_grants(status);

-- Request fingerprints for abuse detection
CREATE TABLE IF NOT EXISTS request_fingerprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  address TEXT NOT NULL,
  user_agent TEXT,
  fingerprint TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fingerprints_ip_created 
  ON request_fingerprints(ip, created_at);
CREATE INDEX IF NOT EXISTS idx_fingerprints_address_created 
  ON request_fingerprints(address, created_at);

-- Nonce tracking for replay protection
CREATE TABLE IF NOT EXISTS nonces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  nonce INTEGER NOT NULL,
  used BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nonces_address_nonce 
  ON nonces(address, nonce);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nonces_unique 
  ON nonces(address, nonce);

-- Admin state for pause/resume functionality
CREATE TABLE IF NOT EXISTS admin_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_paused BOOLEAN DEFAULT 0,
  paused_reason TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);

-- Insert default admin state
INSERT OR IGNORE INTO admin_state (id, is_paused) VALUES (1, 0);

-- Key-value store for configuration and state
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_faucet_grants_timestamp 
  AFTER UPDATE ON faucet_grants
BEGIN
  UPDATE faucet_grants SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_admin_state_timestamp 
  AFTER UPDATE ON admin_state
BEGIN
  UPDATE admin_state SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_kv_timestamp 
  AFTER UPDATE ON kv
BEGIN
  UPDATE kv SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;
