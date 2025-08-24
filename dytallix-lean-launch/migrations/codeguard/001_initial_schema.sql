-- CodeGuard Database Migration V1
-- Creates tables for storing scan results and configuration

-- Scan results table
CREATE TABLE IF NOT EXISTS scan_results (
    id SERIAL PRIMARY KEY,
    contract_address VARCHAR(255) NOT NULL UNIQUE,
    code_hash VARCHAR(255) NOT NULL,
    security_score INTEGER NOT NULL CHECK (security_score >= 0 AND security_score <= 100),
    vulnerability_report TEXT,
    model_version VARCHAR(50) NOT NULL,
    scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    pq_signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scan statistics table
CREATE TABLE IF NOT EXISTS scan_statistics (
    id SERIAL PRIMARY KEY,
    total_scans INTEGER DEFAULT 0,
    total_score_sum NUMERIC(10,2) DEFAULT 0,
    verified_contracts INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configuration table
CREATE TABLE IF NOT EXISTS codeguard_config (
    id SERIAL PRIMARY KEY,
    min_score NUMERIC(5,2) NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
    signer_pubkey_pq TEXT NOT NULL,
    allow_model_versions JSONB NOT NULL,
    admin_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rules table
CREATE TABLE IF NOT EXISTS security_rules (
    id SERIAL PRIMARY KEY,
    rule_id VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    penalty INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    config JSONB,
    rule_set VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scan_results_contract_address ON scan_results(contract_address);
CREATE INDEX IF NOT EXISTS idx_scan_results_timestamp ON scan_results(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_scan_results_verified ON scan_results(is_verified);
CREATE INDEX IF NOT EXISTS idx_security_rules_rule_set ON security_rules(rule_set);
CREATE INDEX IF NOT EXISTS idx_security_rules_enabled ON security_rules(is_enabled);

-- Insert initial configuration
INSERT INTO scan_statistics (total_scans, total_score_sum, verified_contracts) 
VALUES (0, 0, 0) 
ON CONFLICT DO NOTHING;

-- Insert default configuration
INSERT INTO codeguard_config (min_score, signer_pubkey_pq, allow_model_versions, admin_address)
VALUES (
    75.0,
    'pqc_pubkey_placeholder_for_development',
    '["v1.0", "v1.1"]'::jsonb,
    'dytallix1admin_placeholder_address_for_development'
) ON CONFLICT DO NOTHING;

-- Insert default security rules
INSERT INTO security_rules (rule_id, rule_type, description, severity, penalty, rule_set, config) VALUES
('min_security_score', 'min_score_threshold', 'Contract must meet minimum security score', 'high', 20, 'default', '{"category": "static", "threshold": 60}'::jsonb),
('max_critical_vulnerabilities', 'max_vulnerability_count', 'No critical vulnerabilities allowed', 'critical', 30, 'default', '{"maxCount": 0}'::jsonb),
('access_control_required', 'access_control_check', 'Contract must have proper access controls', 'high', 15, 'default', '{}'::jsonb),
('complexity_limit', 'complexity_limit', 'Contract complexity must be reasonable', 'medium', 10, 'default', '{"maxComplexity": 15}'::jsonb),
('documentation_coverage', 'documentation_requirement', 'Contract should have adequate documentation', 'low', 5, 'default', '{"minCoverage": 30}'::jsonb)
ON CONFLICT (rule_id) DO NOTHING;