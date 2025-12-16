BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','analyst')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('TLS','HTTP','POSTGRES')),
  environment text NOT NULL DEFAULT 'prod',
  address text NOT NULL,
  port int,
  url text,
  tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  db_dsn text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES scan_targets(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid REFERENCES scan_targets(id) ON DELETE SET NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('TLS_ENDPOINT','HTTP_SERVICE','POSTGRES_DB','SECRET_MATERIAL')),
  environment text NOT NULL DEFAULT 'prod',
  name text NOT NULL,
  locator text NOT NULL,
  exposure text NOT NULL DEFAULT 'INTERNAL' CHECK (exposure IN ('INTERNAL','EXTERNAL')),
  data_sensitivity text NOT NULL DEFAULT 'MEDIUM' CHECK (data_sensitivity IN ('LOW','MEDIUM','HIGH')),
  business_criticality text NOT NULL DEFAULT 'MEDIUM' CHECK (business_criticality IN ('LOW','MEDIUM','HIGH')),
  pqc_compliance text NOT NULL DEFAULT 'UNKNOWN' CHECK (pqc_compliance IN ('NON_PQC','PQC','HYBRID','UNKNOWN')),
  crypto_algorithms jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'DISCOVERED' CHECK (status IN ('DISCOVERED','AT_RISK','WRAPPED_PQC','ATTESTED')),
  quantum_risk_score int NOT NULL DEFAULT 0 CHECK (quantum_risk_score >= 0 AND quantum_risk_score <= 100),
  risk_level text NOT NULL DEFAULT 'Low' CHECK (risk_level IN ('Low','Medium','High','Critical')),
  last_scanned_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_type, locator)
);

CREATE TABLE IF NOT EXISTS scan_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  evidence jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  mode text NOT NULL CHECK (mode IN ('MONITOR_ONLY','ENFORCE')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_algorithms jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_threshold int NOT NULL DEFAULT 70 CHECK (risk_threshold >= 0 AND risk_threshold <= 100),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_assets (
  policy_id uuid NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  matched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(policy_id, asset_id)
);

CREATE TABLE IF NOT EXISTS anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  environment text NOT NULL DEFAULT 'prod',
  active boolean NOT NULL DEFAULT false,
  kem_algorithm text NOT NULL DEFAULT 'Kyber768',
  vault_path_public text NOT NULL,
  vault_path_private text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_from uuid REFERENCES anchors(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_anchor_per_env ON anchors(environment) WHERE active = true;

CREATE TABLE IF NOT EXISTS asset_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  secret_type text NOT NULL DEFAULT 'BLOB',
  vault_path_raw text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wrapping_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES policies(id) ON DELETE SET NULL,
  anchor_id uuid NOT NULL REFERENCES anchors(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS wrapping_results (
  job_id uuid NOT NULL REFERENCES wrapping_jobs(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('PENDING','WRAPPED','FAILED')),
  wrapper_algorithm text,
  vault_path_wrapped text,
  error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(job_id, asset_id)
);

CREATE TABLE IF NOT EXISTS attestation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  network text NOT NULL,
  chain_id bigint NOT NULL,
  contract_address text NOT NULL,
  tx_hash text NOT NULL,
  block_number bigint,
  status text NOT NULL CHECK (status IN ('SUBMITTED','CONFIRMED','FAILED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(asset_id, tx_hash)
);

CREATE TABLE IF NOT EXISTS org_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  totals jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
