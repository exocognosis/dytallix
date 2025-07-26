-- Database Performance Optimization Migration
-- This migration implements comprehensive indexing strategy for optimal query performance

-- Enable pg_stat_statements extension for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- =============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- Composite index for bridge transactions filtered by status and chain
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_status_chains 
ON bridge_transactions(status, source_chain, dest_chain) 
WHERE status IN ('pending', 'confirmed', 'locked');

-- Composite index for time-range queries with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_time_status 
ON bridge_transactions(created_at DESC, status) 
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Composite index for validator signature queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_validator_signatures_bridge_validator 
ON validator_signatures(bridge_tx_id, validator_id, created_at DESC);

-- =============================================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- =============================================================================

-- Partial index for active bridge transactions only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_active 
ON bridge_transactions(id, created_at DESC) 
WHERE status NOT IN ('completed', 'failed', 'reversed');

-- Partial index for large value transactions (> 1000 units)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_high_value 
ON bridge_transactions(asset_amount DESC, created_at DESC) 
WHERE asset_amount > 1000;

-- Partial index for failed transactions for monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_failed 
ON bridge_transactions(created_at DESC, source_chain, dest_chain) 
WHERE status = 'failed';

-- Partial index for active chain configurations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_configs_active 
ON chain_configs(chain_name, chain_type) 
WHERE is_active = true;

-- =============================================================================
-- COVERING INDEXES TO REDUCE TABLE LOOKUPS
-- =============================================================================

-- Covering index for bridge transaction summary queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_summary_covering 
ON bridge_transactions(status, source_chain, dest_chain) 
INCLUDE (id, asset_id, asset_amount, created_at);

-- Covering index for transaction monitoring dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_monitoring_covering 
ON bridge_transactions(created_at DESC) 
INCLUDE (id, status, source_chain, dest_chain, asset_amount);

-- Covering index for validator performance analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_validator_signatures_performance_covering 
ON validator_signatures(validator_id, created_at DESC) 
INCLUDE (bridge_tx_id, signature_type);

-- =============================================================================
-- JSONB INDEXES FOR METADATA QUERIES
-- =============================================================================

-- GIN index for metadata searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_metadata_gin 
ON bridge_transactions USING gin(metadata);

-- GIN index for validator signatures JSONB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_signatures_gin 
ON bridge_transactions USING gin(validator_signatures);

-- GIN index for chain config data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chain_configs_data_gin 
ON chain_configs USING gin(config_data);

-- Specific JSONB path indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_asset_type 
ON bridge_transactions USING gin((metadata->>'asset_type'));

-- =============================================================================
-- HASH INDEXES FOR EXACT MATCH QUERIES
-- =============================================================================

-- Hash index for exact transaction ID lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_id_hash 
ON bridge_transactions USING hash(id);

-- Hash index for asset ID exact matches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_asset_id_hash 
ON bridge_transactions USING hash(asset_id);

-- Hash index for validator ID exact matches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_validator_signatures_validator_hash 
ON validator_signatures USING hash(validator_id);

-- =============================================================================
-- EXPRESSION INDEXES FOR COMPUTED QUERIES
-- =============================================================================

-- Index on transaction value in different units (for different decimals)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_normalized_amount 
ON bridge_transactions((asset_amount::numeric / (10^asset_decimals)));

-- Index on transaction age in hours
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_age_hours 
ON bridge_transactions((EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 3600));

-- Index on date part for daily aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bridge_transactions_date 
ON bridge_transactions(DATE(created_at), status);

-- =============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =============================================================================

-- Daily transaction summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_bridge_stats AS
SELECT 
    DATE(created_at) as transaction_date,
    source_chain,
    dest_chain,
    status,
    COUNT(*) as transaction_count,
    SUM(asset_amount) as total_volume,
    AVG(asset_amount) as avg_amount,
    MIN(asset_amount) as min_amount,
    MAX(asset_amount) as max_amount,
    COUNT(DISTINCT asset_id) as unique_assets
FROM bridge_transactions 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), source_chain, dest_chain, status;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_bridge_stats_unique 
ON daily_bridge_stats(transaction_date, source_chain, dest_chain, status);

-- Validator performance materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS validator_performance_stats AS
SELECT 
    validator_id,
    DATE(created_at) as performance_date,
    COUNT(*) as signatures_count,
    COUNT(DISTINCT bridge_tx_id) as unique_transactions,
    signature_type,
    AVG(EXTRACT(EPOCH FROM (created_at - 
        (SELECT bt.created_at FROM bridge_transactions bt WHERE bt.id = bridge_tx_id)
    ))) as avg_response_time_seconds
FROM validator_signatures 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY validator_id, DATE(created_at), signature_type;

-- Create index on validator performance view
CREATE INDEX IF NOT EXISTS idx_validator_performance_stats_lookup 
ON validator_performance_stats(validator_id, performance_date DESC);

-- Chain performance materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS chain_performance_stats AS
SELECT 
    source_chain,
    dest_chain,
    DATE(created_at) as performance_date,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_transactions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
    AVG(CASE 
        WHEN status = 'completed' THEN 
            EXTRACT(EPOCH FROM (updated_at - created_at)) 
        ELSE NULL 
    END) as avg_completion_time_seconds,
    SUM(asset_amount) as total_volume
FROM bridge_transactions 
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY source_chain, dest_chain, DATE(created_at);

-- Create index on chain performance view
CREATE INDEX IF NOT EXISTS idx_chain_performance_stats_lookup 
ON chain_performance_stats(source_chain, dest_chain, performance_date DESC);

-- =============================================================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- =============================================================================

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_bridge_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY validator_performance_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY chain_performance_stats;
    
    -- Log refresh completion
    INSERT INTO bridge_state (key, value, updated_at) 
    VALUES ('last_analytics_refresh', to_jsonb(CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View for query performance monitoring
CREATE OR REPLACE VIEW query_performance_summary AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) as hit_ratio
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 50;

-- View for index usage statistics
CREATE OR REPLACE VIEW index_usage_summary AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'Never used'
        WHEN idx_scan < 50 THEN 'Rarely used'
        WHEN idx_scan < 500 THEN 'Moderately used'
        ELSE 'Frequently used'
    END as usage_category
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- View for table bloat estimation
CREATE OR REPLACE VIEW table_bloat_summary AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename LIKE 'bridge_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =============================================================================
-- AUTOMATED MAINTENANCE PROCEDURES
-- =============================================================================

-- Function for automated index maintenance
CREATE OR REPLACE FUNCTION maintain_bridge_indexes()
RETURNS void AS $$
BEGIN
    -- Reindex tables if needed (based on bloat)
    REINDEX INDEX CONCURRENTLY idx_bridge_transactions_created_at;
    REINDEX INDEX CONCURRENTLY idx_bridge_transactions_status;
    
    -- Analyze tables for updated statistics
    ANALYZE bridge_transactions;
    ANALYZE validator_signatures;
    ANALYZE chain_configs;
    ANALYZE bridge_state;
    
    -- Log maintenance completion
    INSERT INTO bridge_state (key, value, updated_at) 
    VALUES ('last_index_maintenance', to_jsonb(CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE SET 
        value = EXCLUDED.value, 
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UPDATE STATISTICS AND CONFIGURATION
-- =============================================================================

-- Update table statistics
ANALYZE bridge_transactions;
ANALYZE validator_signatures;
ANALYZE asset_metadata;
ANALYZE chain_configs;
ANALYZE bridge_state;

-- Initial refresh of materialized views
SELECT refresh_analytics_views();

-- Record optimization completion
INSERT INTO bridge_state (key, value, updated_at) 
VALUES ('database_optimization_applied', to_jsonb(CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    updated_at = EXCLUDED.updated_at;

-- Add performance monitoring configuration
INSERT INTO bridge_state (key, value, updated_at) 
VALUES ('performance_monitoring_config', to_jsonb('{
    "slow_query_threshold_ms": 100,
    "index_usage_check_interval_hours": 24,
    "analytics_refresh_interval_hours": 1,
    "maintenance_interval_hours": 168
}'::json), CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    updated_at = EXCLUDED.updated_at;