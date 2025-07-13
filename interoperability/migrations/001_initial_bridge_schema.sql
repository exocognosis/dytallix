-- Create bridge transactions table
CREATE TABLE bridge_transactions (
    id VARCHAR PRIMARY KEY,
    asset_id VARCHAR NOT NULL,
    asset_amount BIGINT NOT NULL,
    asset_decimals INTEGER NOT NULL,
    source_chain VARCHAR NOT NULL,
    dest_chain VARCHAR NOT NULL,
    source_address VARCHAR NOT NULL,
    dest_address VARCHAR NOT NULL,
    source_tx_hash VARCHAR,
    dest_tx_hash VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validator_signatures JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create asset metadata table
CREATE TABLE asset_metadata (
    asset_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    symbol VARCHAR NOT NULL,
    description TEXT,
    decimals INTEGER NOT NULL,
    icon_url VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create validator signatures table
CREATE TABLE validator_signatures (
    id SERIAL PRIMARY KEY,
    bridge_tx_id VARCHAR NOT NULL REFERENCES bridge_transactions(id),
    validator_id VARCHAR NOT NULL,
    signature_data BYTEA NOT NULL,
    signature_type VARCHAR NOT NULL DEFAULT 'pqc',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bridge_tx_id, validator_id)
);

-- Create chain configs table
CREATE TABLE chain_configs (
    chain_name VARCHAR PRIMARY KEY,
    chain_type VARCHAR NOT NULL, -- ethereum, cosmos, polkadot, dytallix
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create bridge state table for tracking bridge status
CREATE TABLE bridge_state (
    key VARCHAR PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_bridge_transactions_status ON bridge_transactions(status);
CREATE INDEX idx_bridge_transactions_source_chain ON bridge_transactions(source_chain);
CREATE INDEX idx_bridge_transactions_dest_chain ON bridge_transactions(dest_chain);
CREATE INDEX idx_bridge_transactions_created_at ON bridge_transactions(created_at);
CREATE INDEX idx_validator_signatures_bridge_tx_id ON validator_signatures(bridge_tx_id);
CREATE INDEX idx_chain_configs_chain_type ON chain_configs(chain_type);
