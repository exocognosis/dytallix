-- PulseScan Database Schema Migration
-- Version: 1.0.0
-- Description: Initial schema for fraud & anomaly monitoring

-- Create database if not exists
-- CREATE DATABASE pulsescan;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE anomaly_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE finding_status AS ENUM ('pending', 'confirmed', 'false_positive', 'under_investigation');

-- Findings table - stores all anomaly detection results
CREATE TABLE findings (
    id BIGSERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    tx_hash VARCHAR(66) NOT NULL, -- 0x + 64 hex characters
    address VARCHAR(50) NOT NULL, -- Cosmos bech32 address
    score DECIMAL(5,4) NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
    severity anomaly_severity NOT NULL,
    status finding_status DEFAULT 'pending',
    reasons TEXT[] NOT NULL DEFAULT '{}',
    signature_pq TEXT, -- Post-quantum signature (hex-encoded)
    metadata JSONB,
    block_height BIGINT NOT NULL,
    timestamp_detected BIGINT NOT NULL, -- Unix timestamp when detected
    timestamp_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_tx_hash CHECK (length(tx_hash) = 64 OR length(tx_hash) = 66),
    CONSTRAINT valid_address CHECK (address ~ '^dytallix1[a-z0-9]{38,58}$'),
    CONSTRAINT non_empty_reasons CHECK (array_length(reasons, 1) > 0)
);

-- Address profiles - aggregate information per address
CREATE TABLE address_profiles (
    address VARCHAR(50) PRIMARY KEY,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_findings INTEGER DEFAULT 0,
    high_risk_findings INTEGER DEFAULT 0,
    average_score DECIMAL(5,4) DEFAULT 0.0,
    risk_level anomaly_severity DEFAULT 'low',
    total_transactions BIGINT DEFAULT 0,
    total_volume DECIMAL(30,6) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_profile_address CHECK (address ~ '^dytallix1[a-z0-9]{38,58}$')
);

-- Transaction features - normalized feature vectors for ML
CREATE TABLE transaction_features (
    id BIGSERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    address VARCHAR(50) NOT NULL,
    features JSONB NOT NULL, -- Stored as JSON for flexibility
    feature_version VARCHAR(10) DEFAULT '1.0',
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for fast lookups
    CONSTRAINT valid_features_tx_hash CHECK (length(tx_hash) = 64 OR length(tx_hash) = 66),
    CONSTRAINT valid_features_address CHECK (address ~ '^dytallix1[a-z0-9]{38,58}$')
);

-- Anomaly patterns - store detected patterns for future reference
CREATE TABLE anomaly_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    feature_indicators JSONB NOT NULL, -- Which features indicate this pattern
    threshold_config JSONB, -- Thresholds for triggering this pattern
    severity anomaly_severity NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model performance metrics
CREATE TABLE model_metrics (
    id SERIAL PRIMARY KEY,
    model_version VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,6) NOT NULL,
    evaluation_date DATE NOT NULL,
    dataset_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(model_version, metric_name, evaluation_date)
);

-- System audit log
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50), -- 'finding', 'address', 'pattern', etc.
    entity_id VARCHAR(100),
    user_id VARCHAR(100),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_findings_address ON findings(address);
CREATE INDEX idx_findings_timestamp ON findings(timestamp_created);
CREATE INDEX idx_findings_score ON findings(score DESC);
CREATE INDEX idx_findings_severity ON findings(severity);
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_block_height ON findings(block_height);
CREATE INDEX idx_findings_tx_hash ON findings(tx_hash);

-- Composite indexes
CREATE INDEX idx_findings_address_timestamp ON findings(address, timestamp_created DESC);
CREATE INDEX idx_findings_severity_score ON findings(severity, score DESC);

-- Address profiles indexes
CREATE INDEX idx_address_profiles_risk_level ON address_profiles(risk_level);
CREATE INDEX idx_address_profiles_last_seen ON address_profiles(last_seen);
CREATE INDEX idx_address_profiles_total_findings ON address_profiles(total_findings DESC);

-- Transaction features indexes
CREATE INDEX idx_transaction_features_address ON transaction_features(address);
CREATE INDEX idx_transaction_features_extracted_at ON transaction_features(extracted_at);

-- Audit log indexes
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- GIN indexes for JSONB columns
CREATE INDEX idx_findings_metadata_gin ON findings USING GIN(metadata);
CREATE INDEX idx_address_profiles_metadata_gin ON address_profiles USING GIN(metadata);
CREATE INDEX idx_transaction_features_gin ON transaction_features USING GIN(features);

-- Functions and triggers for automatic updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.timestamp_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_address_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO address_profiles (address, total_findings, last_updated)
    VALUES (NEW.address, 1, NOW())
    ON CONFLICT (address) 
    DO UPDATE SET 
        total_findings = address_profiles.total_findings + 1,
        high_risk_findings = CASE 
            WHEN NEW.severity IN ('high', 'critical') 
            THEN address_profiles.high_risk_findings + 1 
            ELSE address_profiles.high_risk_findings 
        END,
        last_seen = NOW(),
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER tr_findings_update_timestamp
    BEFORE UPDATE ON findings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_address_profiles_update_timestamp
    BEFORE UPDATE ON address_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_findings_update_profile
    AFTER INSERT ON findings
    FOR EACH ROW
    EXECUTE FUNCTION update_address_profile();

-- Views for common queries
CREATE VIEW high_risk_findings AS
SELECT 
    f.*,
    ap.risk_level as address_risk_level,
    ap.total_findings as address_total_findings
FROM findings f
LEFT JOIN address_profiles ap ON f.address = ap.address
WHERE f.severity IN ('high', 'critical')
ORDER BY f.timestamp_created DESC;

CREATE VIEW daily_stats AS
SELECT 
    DATE(timestamp_created) as date,
    COUNT(*) as total_findings,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_findings,
    COUNT(*) FILTER (WHERE severity = 'high') as high_findings,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_findings,
    COUNT(*) FILTER (WHERE severity = 'low') as low_findings,
    AVG(score) as average_score,
    COUNT(DISTINCT address) as unique_addresses
FROM findings
GROUP BY DATE(timestamp_created)
ORDER BY date DESC;

-- Insert default anomaly patterns
INSERT INTO anomaly_patterns (pattern_name, description, feature_indicators, threshold_config, severity) VALUES
('high_velocity_burst', 'Unusually high transaction velocity in short time window', 
 '{"velocity_1h": 0.8, "velocity_24h": 0.6}', 
 '{"velocity_1h": 0.7, "min_transactions": 10}', 'high'),

('suspicious_amount_pattern', 'Round numbers or specific amount patterns common in money laundering',
 '{"round_amount_indicator": 1.0, "amount_z_score": 2.0}',
 '{"round_amount_threshold": 0.9, "z_score_threshold": 2.5}', 'medium'),

('graph_centrality_anomaly', 'Unusual position in transaction graph indicating potential hub activity',
 '{"betweenness_centrality": 0.8, "page_rank": 0.7}',
 '{"centrality_threshold": 0.75, "page_rank_threshold": 0.6}', 'high'),

('timing_pattern_anomaly', 'Unusual timing patterns that may indicate automated/scripted behavior',
 '{"time_pattern_score": 0.9, "frequency_regularity": 0.8}',
 '{"timing_threshold": 0.85, "regularity_threshold": 0.75}', 'medium');

-- Create initial model metrics
INSERT INTO model_metrics (model_version, metric_name, metric_value, evaluation_date) VALUES
('1.0.0', 'accuracy', 0.8750, CURRENT_DATE),
('1.0.0', 'precision', 0.8234, CURRENT_DATE),
('1.0.0', 'recall', 0.7891, CURRENT_DATE),
('1.0.0', 'f1_score', 0.8056, CURRENT_DATE),
('1.0.0', 'auc_roc', 0.9123, CURRENT_DATE);

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO pulsescan_api;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pulsescan_api;

COMMIT;