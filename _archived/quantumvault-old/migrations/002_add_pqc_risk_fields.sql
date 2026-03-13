-- Add PQC risk classification fields to assets table

-- Add enum types for PQC risk fields
CREATE TYPE business_criticality AS ENUM ('low', 'medium', 'high', 'critical', 'unknown');
CREATE TYPE crypto_usage AS ENUM ('channel', 'data_at_rest', 'code_signing', 'pki_root', 'pki_leaf', 'vpn', 'ssh', 'other');
CREATE TYPE exposure_type AS ENUM ('internet', 'partner', 'internal', 'restricted', 'airgapped', 'unknown');
CREATE TYPE data_sensitivity AS ENUM ('public', 'internal', 'confidential', 'regulated', 'unknown');
CREATE TYPE crypto_agility AS ENUM ('high', 'medium', 'low', 'unknown');
CREATE TYPE risk_class AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE algo_public_key AS ENUM ('RSA', 'ECDSA', 'ECDH', 'DSA', 'DH', 'None');
CREATE TYPE algo_symmetric AS ENUM ('AES', '3DES', 'RC4', 'DES', 'None');

-- Add PQC risk fields to assets table
ALTER TABLE assets ADD COLUMN environment VARCHAR(20);
ALTER TABLE assets ADD COLUMN service_role VARCHAR(255);
ALTER TABLE assets ADD COLUMN business_criticality business_criticality NOT NULL DEFAULT 'unknown';

ALTER TABLE assets ADD COLUMN crypto_usage crypto_usage NOT NULL DEFAULT 'other';

ALTER TABLE assets ADD COLUMN algo_pk algo_public_key NOT NULL DEFAULT 'None';
ALTER TABLE assets ADD COLUMN pk_key_bits INTEGER;

ALTER TABLE assets ADD COLUMN algo_sym algo_symmetric NOT NULL DEFAULT 'None';
ALTER TABLE assets ADD COLUMN sym_key_bits INTEGER;

ALTER TABLE assets ADD COLUMN hash_algo VARCHAR(50);
ALTER TABLE assets ADD COLUMN protocol_version VARCHAR(50);

ALTER TABLE assets ADD COLUMN exposure_type exposure_type NOT NULL DEFAULT 'unknown';
ALTER TABLE assets ADD COLUMN stores_long_lived_data BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assets ADD COLUMN data_sensitivity data_sensitivity NOT NULL DEFAULT 'unknown';

ALTER TABLE assets ADD COLUMN crypto_agility crypto_agility NOT NULL DEFAULT 'unknown';
ALTER TABLE assets ADD COLUMN classical_issues TEXT[] NOT NULL DEFAULT '{}';

-- PQC risk dimension scores (0-5)
ALTER TABLE assets ADD COLUMN aqv SMALLINT;
ALTER TABLE assets ADD COLUMN dlv SMALLINT;
ALTER TABLE assets ADD COLUMN imp SMALLINT;
ALTER TABLE assets ADD COLUMN exp SMALLINT;
ALTER TABLE assets ADD COLUMN agi SMALLINT;
ALTER TABLE assets ADD COLUMN ccw SMALLINT;

-- Composite PQC risk score (0-100)
ALTER TABLE assets ADD COLUMN pqc_risk_score SMALLINT;
ALTER TABLE assets ADD COLUMN risk_class risk_class;

-- Create indices for risk queries
CREATE INDEX idx_assets_pqc_risk_score ON assets(pqc_risk_score);
CREATE INDEX idx_assets_risk_class ON assets(risk_class);
CREATE INDEX idx_assets_business_criticality ON assets(business_criticality);
CREATE INDEX idx_assets_crypto_usage ON assets(crypto_usage);
CREATE INDEX idx_assets_environment ON assets(environment);

-- Create a table to store risk weight profiles
CREATE TABLE risk_weight_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    aqv_weight DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    dlv_weight DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    imp_weight DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    exp_weight DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    agi_weight DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    ccw_weight DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default risk weight profile
INSERT INTO risk_weight_profiles (name, description, is_default)
VALUES ('default', 'Default balanced PQC risk weighting profile', true);

-- Create index for default profile lookup
CREATE INDEX idx_risk_weight_profiles_default ON risk_weight_profiles(is_default);
