-- Upgrade Assets table
ALTER TABLE assets ADD COLUMN wrapper_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE assets ADD COLUMN wrapper_algorithm VARCHAR(255);
ALTER TABLE assets ADD COLUMN wrapper_anchor_id UUID;
ALTER TABLE assets ADD COLUMN wrapper_last_updated_at TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN policies_applied JSONB DEFAULT '[]';
ALTER TABLE assets ADD COLUMN last_scan_timestamp TIMESTAMPTZ;
ALTER TABLE assets ADD COLUMN pqc_compliance VARCHAR(50) DEFAULT 'UNKNOWN';

-- Asset Key Material
CREATE TYPE key_type AS ENUM ('private_key', 'api_secret', 'db_credential', 'config_blob', 'other');

CREATE TABLE asset_key_material (
    id UUID PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    key_type key_type NOT NULL,
    storage_reference VARCHAR(255) NOT NULL,
    wrapped_pqc_key_reference VARCHAR(255),
    last_wrapped_at TIMESTAMPTZ,
    is_pqc_wrapped BOOLEAN NOT NULL DEFAULT FALSE,
    algorithm_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_key_material_asset_id ON asset_key_material(asset_id);

-- Scans
CREATE TYPE scan_type AS ENUM ('discovery', 'rescan', 'policy_validation');
CREATE TYPE scan_status AS ENUM ('running', 'success', 'failed', 'partial');

CREATE TABLE scans (
    id UUID PRIMARY KEY,
    scan_type scan_type NOT NULL,
    triggered_by VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    number_of_assets_scanned INTEGER DEFAULT 0,
    number_of_non_pqc_assets_found INTEGER DEFAULT 0,
    status scan_status NOT NULL DEFAULT 'running',
    error_message TEXT
);

CREATE TABLE scan_assets (
    id UUID PRIMARY KEY,
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    scan_result VARCHAR(50) NOT NULL, -- NEW, UPDATED, UNCHANGED
    details JSONB
);

CREATE INDEX idx_scan_assets_scan_id ON scan_assets(scan_id);

-- Encryption Anchors
CREATE TYPE anchor_type AS ENUM ('root_of_trust', 'key_hierarchy', 'policy_bundle');

CREATE TABLE encryption_anchors (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    anchor_type anchor_type NOT NULL,
    associated_policy_ids JSONB DEFAULT '[]',
    root_public_key_reference VARCHAR(255),
    root_key_algorithm VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blockchain Attestation
CREATE TABLE blockchain_attestation_jobs (
    id UUID PRIMARY KEY,
    created_by VARCHAR(255),
    anchor_id UUID NOT NULL REFERENCES encryption_anchors(id),
    filters JSONB,
    total_assets INTEGER DEFAULT 0,
    succeeded_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status job_status NOT NULL DEFAULT 'pending',
    blockchain_network VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TYPE attestation_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE blockchain_attestations (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES blockchain_attestation_jobs(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id),
    anchor_id UUID NOT NULL REFERENCES encryption_anchors(id),
    attestation_status attestation_status NOT NULL DEFAULT 'pending',
    blockchain_tx_id VARCHAR(255),
    attested_at TIMESTAMPTZ,
    error_message TEXT,
    payload_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blockchain_attestations_job_id ON blockchain_attestations(job_id);
CREATE INDEX idx_blockchain_attestations_asset_id ON blockchain_attestations(asset_id);

-- Organization Risk Snapshots
CREATE TABLE organization_risk_snapshots (
    id UUID PRIMARY KEY,
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_assets INTEGER NOT NULL,
    total_non_pqc_assets INTEGER NOT NULL,
    total_wrapped_pqc_assets INTEGER NOT NULL,
    total_attested_assets INTEGER NOT NULL,
    high_risk_assets_count INTEGER NOT NULL,
    medium_risk_assets_count INTEGER NOT NULL,
    low_risk_assets_count INTEGER NOT NULL,
    critical_risk_assets_count INTEGER NOT NULL,
    policy_coverage_percent NUMERIC,
    assets_out_of_policy INTEGER,
    comments TEXT
);

CREATE INDEX idx_org_risk_snapshots_ts ON organization_risk_snapshots(snapshot_timestamp);
