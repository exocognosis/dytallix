-- Asset types enum
CREATE TYPE asset_type AS ENUM ('tlsendpoint', 'certificate', 'datastore', 'keymaterial', 'apiendpoint');

-- Sensitivity levels enum
CREATE TYPE sensitivity_level AS ENUM ('public', 'internal', 'confidential', 'secret', 'topsecret');

-- Exposure levels enum
CREATE TYPE exposure_level AS ENUM ('internal', 'partnernetwork', 'publicinternet');

-- Assets table
CREATE TABLE assets (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    asset_type asset_type NOT NULL,
    endpoint_or_path TEXT NOT NULL,
    owner VARCHAR(255) NOT NULL,
    sensitivity sensitivity_level NOT NULL,
    regulatory_tags TEXT[] NOT NULL DEFAULT '{}',
    exposure_level exposure_level NOT NULL,
    data_lifetime_days INTEGER NOT NULL,
    risk_score INTEGER NOT NULL,
    encryption_profile JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_owner ON assets(owner);
CREATE INDEX idx_assets_risk_score ON assets(risk_score);
CREATE INDEX idx_assets_asset_type ON assets(asset_type);
CREATE INDEX idx_assets_sensitivity ON assets(sensitivity);

-- Protection mode enum
CREATE TYPE protection_mode AS ENUM ('classical', 'pqc', 'hybrid');

-- Policies table
CREATE TABLE policies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    kem VARCHAR(50) NOT NULL,
    signature_scheme VARCHAR(50) NOT NULL,
    symmetric_algo VARCHAR(50) NOT NULL,
    mode protection_mode NOT NULL,
    rotation_interval_days INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_mode ON policies(mode);

-- Job status enum
CREATE TYPE job_status AS ENUM ('pending', 'running', 'success', 'failed');

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    status job_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_asset_id ON jobs(asset_id);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

-- Audit events table (immutable)
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    actor VARCHAR(255) NOT NULL,
    payload_json JSONB NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_asset_id ON audit_events(asset_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at);

-- Prevent updates and deletes on audit_events
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER prevent_audit_delete
    BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Data keys table
CREATE TABLE data_keys (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    wrapped_key_blob BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    pqc_ciphertext BYTEA NOT NULL,
    classical_ciphertext BYTEA NOT NULL,
    algorithm VARCHAR(50) NOT NULL,
    kem_algorithm VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ
);

CREATE INDEX idx_data_keys_asset_id ON data_keys(asset_id);

-- Insert default policies
INSERT INTO policies (id, name, description, kem, signature_scheme, symmetric_algo, mode, rotation_interval_days, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'Hybrid Kyber768 + Dilithium3', 'Production-grade hybrid PQC protection with Kyber768 KEM and Dilithium3 signatures', 'kyber768', 'dilithium3', 'aes256gcm', 'hybrid', 180, NOW(), NOW()),
    (gen_random_uuid(), 'Hybrid Kyber1024 + Dilithium5', 'Maximum security hybrid PQC protection with Kyber1024 KEM and Dilithium5 signatures', 'kyber1024', 'dilithium5', 'aes256gcm', 'hybrid', 90, NOW(), NOW()),
    (gen_random_uuid(), 'PQC Kyber768 + Falcon512', 'Pure PQC protection with Kyber768 and Falcon512 for compact signatures', 'kyber768', 'falcon512', 'chacha20poly1305', 'pqc', 180, NOW(), NOW()),
    (gen_random_uuid(), 'Classical X25519 + Ed25519', 'Classical cryptography baseline for comparison', 'x25519', 'ed25519', 'aes256gcm', 'classical', 365, NOW(), NOW());
