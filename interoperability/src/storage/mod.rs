//! Database Storage Module for Dytallix Bridge
//!
//! Provides PostgreSQL-based persistence for bridge transactions, validator signatures,
//! chain configurations, and bridge state.

use crate::{Asset, AssetMetadata, BridgeError, BridgeTx, BridgeTxId, BridgeStatus, PQCSignature};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use uuid::Uuid;

pub mod models;

pub use models::*;

use crate::query_analysis::{QueryAnalyzer, PerformanceAnalysisReport};
use crate::cache::{BridgeCache, CacheConfig, CachePriority};

/// Bridge storage manager using PostgreSQL with Redis caching
#[derive(Debug, Clone)]
pub struct BridgeStorage {
    pool: PgPool,
    query_analyzer: Option<QueryAnalyzer>,
    cache: Option<BridgeCache>,
}

impl BridgeStorage {
    /// Create new bridge storage with database connection and optional cache
    pub async fn new(database_url: &str) -> Result<Self, BridgeError> {
        let pool = PgPool::connect(database_url)
            .await
            .map_err(|e| BridgeError::ConnectionError(format!("Database connection failed: {}", e)))?;
        
        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .map_err(|e| BridgeError::ConnectionError(format!("Migration failed: {}", e)))?;

        // Initialize query analyzer
        let query_analyzer = Some(QueryAnalyzer::new(pool.clone()));
        
        Ok(Self { 
            pool,
            query_analyzer,
            cache: None,
        })
    }

    /// Create new bridge storage with Redis caching enabled
    pub async fn new_with_cache(database_url: &str, cache_config: CacheConfig) -> Result<Self, BridgeError> {
        let mut storage = Self::new(database_url).await?;
        
        // Initialize Redis cache
        let cache = BridgeCache::new(cache_config)
            .await
            .map_err(|e| BridgeError::ConnectionError(format!("Cache initialization failed: {}", e)))?;
        
        storage.cache = Some(cache);
        
        Ok(storage)
    }
    
    /// Store bridge transaction with intelligent caching
    pub async fn store_bridge_transaction(&self, bridge_tx: &BridgeTx) -> Result<(), BridgeError> {
        let query = r#"
            INSERT INTO bridge_transactions (
                id, asset_id, asset_amount, asset_decimals, source_chain, dest_chain,
                source_address, dest_address, status, validator_signatures, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                dest_tx_hash = EXCLUDED.dest_tx_hash,
                validator_signatures = EXCLUDED.validator_signatures,
                updated_at = CURRENT_TIMESTAMP
        "#;
        
        let signatures_json = serde_json::to_value(&bridge_tx.validator_signatures)
            .map_err(|e| BridgeError::SerializationError(format!("Failed to serialize signatures: {}", e)))?;
        
        let metadata = serde_json::json!({
            "asset_metadata": bridge_tx.asset.metadata
        });
        
        sqlx::query(query)
            .bind(&bridge_tx.id.0)
            .bind(&bridge_tx.asset.id)
            .bind(bridge_tx.asset.amount as i64)
            .bind(bridge_tx.asset.decimals as i32)
            .bind(&bridge_tx.source_chain)
            .bind(&bridge_tx.dest_chain)
            .bind(&bridge_tx.source_address)
            .bind(&bridge_tx.dest_address)
            .bind(match bridge_tx.status {
                BridgeStatus::Pending => "pending",
                BridgeStatus::Confirmed => "confirmed",
                BridgeStatus::Completed => "completed",
                BridgeStatus::Failed => "failed",
                BridgeStatus::Locked => "locked",
                BridgeStatus::Minted => "minted",
                BridgeStatus::Reversed => "reversed",
            })
            .bind(signatures_json)
            .bind(metadata)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to store bridge transaction: {}", e)))?;
        
        // Cache the transaction if cache is available
        if let Some(cache) = &self.cache {
            let priority = match bridge_tx.status {
                BridgeStatus::Pending | BridgeStatus::Confirmed => CachePriority::High,
                BridgeStatus::Locked | BridgeStatus::Minted => CachePriority::Medium,
                _ => CachePriority::Low,
            };
            
            if let Err(e) = cache.cache_bridge_transaction(bridge_tx, priority).await {
                // Log cache error but don't fail the operation
                tracing::warn!("Failed to cache bridge transaction {}: {}", bridge_tx.id.0, e);
            }
        }
        
        Ok(())
    }
    
    /// Get bridge transaction by ID with cache-first approach
    pub async fn get_bridge_transaction(&self, tx_id: &BridgeTxId) -> Result<Option<BridgeTx>, BridgeError> {
        // Try cache first if available
        if let Some(cache) = &self.cache {
            match cache.get_bridge_transaction(tx_id).await {
                Ok(Some(cached_tx)) => {
                    tracing::debug!("Cache hit for bridge transaction {}", tx_id.0);
                    return Ok(Some(cached_tx));
                }
                Ok(None) => {
                    tracing::debug!("Cache miss for bridge transaction {}", tx_id.0);
                    // Continue to database lookup
                }
                Err(e) => {
                    tracing::warn!("Cache error for transaction {}: {}", tx_id.0, e);
                    // Continue to database lookup
                }
            }
        }

        let query = r#"
            SELECT id, asset_id, asset_amount, asset_decimals, source_chain, dest_chain,
                   source_address, dest_address, source_tx_hash, dest_tx_hash, status,
                   validator_signatures, metadata, created_at
            FROM bridge_transactions
            WHERE id = $1
        "#;
        
        let row = sqlx::query(query)
            .bind(&tx_id.0)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to fetch bridge transaction: {}", e)))?;
        
        if let Some(row) = row {
            let metadata: Value = row.get("metadata");
            let asset_metadata: AssetMetadata = serde_json::from_value(
                metadata.get("asset_metadata").cloned().unwrap_or_default()
            ).unwrap_or_default();
            
            let signatures_json: Value = row.get("validator_signatures");
            let validator_signatures: Vec<PQCSignature> = serde_json::from_value(signatures_json)
                .unwrap_or_default();
            
            let status_str: String = row.get("status");
            let status = match status_str.as_str() {
                "pending" => BridgeStatus::Pending,
                "confirmed" => BridgeStatus::Confirmed,
                "completed" => BridgeStatus::Completed,
                "failed" => BridgeStatus::Failed,
                "locked" => BridgeStatus::Locked,
                "minted" => BridgeStatus::Minted,
                "reversed" => BridgeStatus::Reversed,
                _ => BridgeStatus::Pending,
            };
            
            let bridge_tx = BridgeTx {
                id: BridgeTxId(row.get("id")),
                asset: Asset {
                    id: row.get("asset_id"),
                    amount: row.get::<i64, _>("asset_amount") as u64,
                    decimals: row.get::<i32, _>("asset_decimals") as u8,
                    metadata: asset_metadata,
                },
                source_chain: row.get("source_chain"),
                dest_chain: row.get("dest_chain"),
                source_address: row.get("source_address"),
                dest_address: row.get("dest_address"),
                timestamp: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").timestamp() as u64,
                validator_signatures,
                status,
            };
            
            // Cache the result if cache is available
            if let Some(cache) = &self.cache {
                let priority = match bridge_tx.status {
                    BridgeStatus::Pending | BridgeStatus::Confirmed => CachePriority::High,
                    BridgeStatus::Locked | BridgeStatus::Minted => CachePriority::Medium,
                    _ => CachePriority::Low,
                };
                
                if let Err(e) = cache.cache_bridge_transaction(&bridge_tx, priority).await {
                    tracing::warn!("Failed to cache bridge transaction {}: {}", tx_id.0, e);
                }
            }
            
            Ok(Some(bridge_tx))
        } else {
            Ok(None)
        }
    }
    
    /// Update bridge transaction status
    pub async fn update_bridge_transaction_status(
        &self,
        tx_id: &BridgeTxId,
        status: BridgeStatus,
        dest_tx_hash: Option<&str>,
    ) -> Result<(), BridgeError> {
        let query = r#"
            UPDATE bridge_transactions
            SET status = $1, dest_tx_hash = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        "#;
        
        let status_str = match status {
            BridgeStatus::Pending => "pending",
            BridgeStatus::Confirmed => "confirmed",
            BridgeStatus::Completed => "completed",
            BridgeStatus::Failed => "failed",
            BridgeStatus::Locked => "locked",
            BridgeStatus::Minted => "minted",
            BridgeStatus::Reversed => "reversed",
        };
        
        sqlx::query(query)
            .bind(status_str)
            .bind(dest_tx_hash)
            .bind(&tx_id.0)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to update bridge transaction: {}", e)))?;
        
        Ok(())
    }
    
    /// Add validator signature to bridge transaction
    pub async fn add_validator_signature(
        &self,
        tx_id: &BridgeTxId,
        validator_id: &str,
        signature: &PQCSignature,
    ) -> Result<(), BridgeError> {
        let query = r#"
            INSERT INTO validator_signatures (bridge_tx_id, validator_id, signature_data, signature_type)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (bridge_tx_id, validator_id) DO UPDATE SET
                signature_data = EXCLUDED.signature_data,
                signature_type = EXCLUDED.signature_type
        "#;
        
        sqlx::query(query)
            .bind(&tx_id.0)
            .bind(validator_id)
            .bind(&signature.signature)
            .bind(&signature.algorithm)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to store validator signature: {}", e)))?;
        
        // Update the bridge transaction's signatures cache
        self.update_bridge_transaction_signatures(tx_id).await?;
        
        Ok(())
    }
    
    /// Update bridge transaction signatures from validator_signatures table
    async fn update_bridge_transaction_signatures(&self, tx_id: &BridgeTxId) -> Result<(), BridgeError> {
        let query = r#"
            SELECT validator_id, signature_data, signature_type
            FROM validator_signatures
            WHERE bridge_tx_id = $1
            ORDER BY created_at
        "#;
        
        let rows = sqlx::query(query)
            .bind(&tx_id.0)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to fetch validator signatures: {}", e)))?;
        
        let mut signatures = Vec::new();
        for row in rows {
            let signature = PQCSignature {
                validator_id: row.get("validator_id"),
                signature: row.get("signature_data"),
                algorithm: row.get("signature_type"),
                public_key: vec![], // Placeholder - in production would be stored separately
                timestamp: chrono::Utc::now().timestamp() as u64,
            };
            signatures.push(signature);
        }
        
        let signatures_json = serde_json::to_value(&signatures)
            .map_err(|e| BridgeError::SerializationError(format!("Failed to serialize signatures: {}", e)))?;
        
        let update_query = r#"
            UPDATE bridge_transactions
            SET validator_signatures = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        "#;
        
        sqlx::query(update_query)
            .bind(signatures_json)
            .bind(&tx_id.0)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to update bridge transaction signatures: {}", e)))?;
        
        Ok(())
    }
    
    /// Store asset metadata
    pub async fn store_asset_metadata(&self, asset_id: &str, metadata: &AssetMetadata) -> Result<(), BridgeError> {
        let query = r#"
            INSERT INTO asset_metadata (asset_id, name, symbol, description, decimals, icon_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (asset_id) DO UPDATE SET
                name = EXCLUDED.name,
                symbol = EXCLUDED.symbol,
                description = EXCLUDED.description,
                decimals = EXCLUDED.decimals,
                icon_url = EXCLUDED.icon_url
        "#;
        
        sqlx::query(query)
            .bind(asset_id)
            .bind(&metadata.name)
            .bind(&metadata.symbol)
            .bind(&metadata.description)
            .bind(0i32) // Note: AssetMetadata doesn't have decimals, using 0 as default
            .bind(&metadata.icon_url)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to store asset metadata: {}", e)))?;
        
        Ok(())
    }
    
    /// Get pending bridge transactions
    pub async fn get_pending_transactions(&self) -> Result<Vec<BridgeTx>, BridgeError> {
        let query = r#"
            SELECT id, asset_id, asset_amount, asset_decimals, source_chain, dest_chain,
                   source_address, dest_address, source_tx_hash, dest_tx_hash, status,
                   validator_signatures, metadata, created_at
            FROM bridge_transactions
            WHERE status = 'pending'
            ORDER BY created_at
        "#;
        
        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to fetch pending transactions: {}", e)))?;
        
        let mut transactions = Vec::new();
        for row in rows {
            let metadata: Value = row.get("metadata");
            let asset_metadata: AssetMetadata = serde_json::from_value(
                metadata.get("asset_metadata").cloned().unwrap_or_default()
            ).unwrap_or_default();
            
            let signatures_json: Value = row.get("validator_signatures");
            let validator_signatures: Vec<PQCSignature> = serde_json::from_value(signatures_json)
                .unwrap_or_default();
            
            let bridge_tx = BridgeTx {
                id: BridgeTxId(row.get("id")),
                asset: Asset {
                    id: row.get("asset_id"),
                    amount: row.get::<i64, _>("asset_amount") as u64,
                    decimals: row.get::<i32, _>("asset_decimals") as u8,
                    metadata: asset_metadata,
                },
                source_chain: row.get("source_chain"),
                dest_chain: row.get("dest_chain"),
                source_address: row.get("source_address"),
                dest_address: row.get("dest_address"),
                timestamp: row.get::<chrono::DateTime<chrono::Utc>, _>("created_at").timestamp() as u64,
                validator_signatures,
                status: BridgeStatus::Pending,
            };
            
            transactions.push(bridge_tx);
        }
        
        Ok(transactions)
    }
    
    /// Store chain configuration
    pub async fn store_chain_config(
        &self,
        chain_name: &str,
        chain_type: &str,
        config: &Value,
    ) -> Result<(), BridgeError> {
        let query = r#"
            INSERT INTO chain_configs (chain_name, chain_type, config_data)
            VALUES ($1, $2, $3)
            ON CONFLICT (chain_name) DO UPDATE SET
                chain_type = EXCLUDED.chain_type,
                config_data = EXCLUDED.config_data,
                updated_at = CURRENT_TIMESTAMP
        "#;
        
        sqlx::query(query)
            .bind(chain_name)
            .bind(chain_type)
            .bind(config)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to store chain config: {}", e)))?;
        
        Ok(())
    }
    
    /// Get chain configuration
    pub async fn get_chain_config(&self, chain_name: &str) -> Result<Option<Value>, BridgeError> {
        let query = r#"
            SELECT config_data
            FROM chain_configs
            WHERE chain_name = $1 AND is_active = true
        "#;
        
        let row = sqlx::query(query)
            .bind(chain_name)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to fetch chain config: {}", e)))?;
        
        if let Some(row) = row {
            Ok(Some(row.get("config_data")))
        } else {
            Ok(None)
        }
    }
    
    /// Store bridge state
    pub async fn store_bridge_state(&self, key: &str, value: &Value) -> Result<(), BridgeError> {
        let query = r#"
            INSERT INTO bridge_state (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = CURRENT_TIMESTAMP
        "#;
        
        sqlx::query(query)
            .bind(key)
            .bind(value)
            .execute(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to store bridge state: {}", e)))?;
        
        Ok(())
    }
    
    /// Get bridge state
    pub async fn get_bridge_state(&self, key: &str) -> Result<Option<Value>, BridgeError> {
        let query = r#"
            SELECT value
            FROM bridge_state
            WHERE key = $1
        "#;
        
        let row = sqlx::query(query)
            .bind(key)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to fetch bridge state: {}", e)))?;
        
        if let Some(row) = row {
            Ok(Some(row.get("value")))
        } else {
            Ok(None)
        }
    }
    
    /// Get bridge statistics
    pub async fn get_bridge_statistics(&self) -> Result<BridgeStatistics, BridgeError> {
        let query = r#"
            SELECT 
                COUNT(*) as total_transactions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_transactions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                SUM(asset_amount) as total_volume
            FROM bridge_transactions
        "#;
        
        let row = sqlx::query(query)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| BridgeError::NetworkError(format!("Failed to fetch bridge statistics: {}", e)))?;
        
        Ok(BridgeStatistics {
            total_transactions: row.get::<i64, _>("total_transactions") as u64,
            pending_transactions: row.get::<i64, _>("pending_transactions") as u64,
            confirmed_transactions: row.get::<i64, _>("confirmed_transactions") as u64,
            completed_transactions: row.get::<i64, _>("completed_transactions") as u64,
            failed_transactions: row.get::<i64, _>("failed_transactions") as u64,
            total_volume: row.get::<Option<i64>, _>("total_volume").unwrap_or(0) as u64,
        })
    }

    /// Enable database query tracking and performance monitoring
    pub async fn enable_performance_monitoring(&self) -> Result<(), BridgeError> {
        if let Some(analyzer) = &self.query_analyzer {
            analyzer.enable_query_tracking()
                .await
                .map_err(|e| BridgeError::NetworkError(format!("Failed to enable query tracking: {}", e)))?;
        }
        Ok(())
    }

    /// Get comprehensive database performance analysis report
    pub async fn get_performance_analysis(&self) -> Result<PerformanceAnalysisReport, BridgeError> {
        if let Some(analyzer) = &self.query_analyzer {
            analyzer.generate_performance_report()
                .await
                .map_err(|e| BridgeError::NetworkError(format!("Failed to generate performance report: {}", e)))
        } else {
            Err(BridgeError::NetworkError("Query analyzer not initialized".to_string()))
        }
    }

    /// Get database health metrics for monitoring dashboard
    pub async fn get_database_health(&self) -> Result<crate::query_analysis::DatabaseHealthMetrics, BridgeError> {
        if let Some(analyzer) = &self.query_analyzer {
            analyzer.get_database_health_metrics()
                .await
                .map_err(|e| BridgeError::NetworkError(format!("Failed to get health metrics: {}", e)))
        } else {
            Err(BridgeError::NetworkError("Query analyzer not initialized".to_string()))
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeStatistics {
    pub total_transactions: u64,
    pub pending_transactions: u64,
    pub confirmed_transactions: u64,
    pub completed_transactions: u64,
    pub failed_transactions: u64,
    pub total_volume: u64,
}

impl Default for AssetMetadata {
    fn default() -> Self {
        Self {
            name: "Unknown".to_string(),
            symbol: "UNK".to_string(),
            description: "Unknown asset".to_string(),
            icon_url: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{BridgeTxId, BridgeStatus};
    
    // Note: These tests require a running PostgreSQL database
    // In a real environment, you'd use test containers or a test database
    
    #[tokio::test]
    #[ignore] // Ignore by default since it requires database setup
    async fn test_bridge_storage_operations() {
        let database_url = "postgresql://postgres:password@localhost/dytallix_test";
        let storage = BridgeStorage::new(database_url).await.unwrap();
        
        // Create test bridge transaction
        let bridge_tx = BridgeTx {
            id: BridgeTxId("test_tx_123".to_string()),
            asset: Asset {
                id: "ETH".to_string(),
                amount: 1000000000000000000, // 1 ETH
                decimals: 18,
                metadata: AssetMetadata {
                    name: "Ethereum".to_string(),
                    symbol: "ETH".to_string(),
                    description: "Ethereum native token".to_string(),
                    icon_url: Some("https://ethereum.org/icon.png".to_string()),
                },
            },
            source_chain: "ethereum".to_string(),
            dest_chain: "dytallix".to_string(),
            source_address: "0x742d35Cc6634C0532925a3b8D373d3e5e8e73a7e".to_string(),
            dest_address: "dyt1test".to_string(),
            timestamp: 1234567890,
            validator_signatures: Vec::new(),
            status: BridgeStatus::Pending,
        };
        
        // Store bridge transaction
        storage.store_bridge_transaction(&bridge_tx).await.unwrap();
        
        // Retrieve bridge transaction
        let retrieved = storage.get_bridge_transaction(&bridge_tx.id).await.unwrap();
        assert!(retrieved.is_some());
        
        let retrieved_tx = retrieved.unwrap();
        assert_eq!(retrieved_tx.id, bridge_tx.id);
        assert_eq!(retrieved_tx.asset.id, bridge_tx.asset.id);
        assert_eq!(retrieved_tx.source_chain, bridge_tx.source_chain);
        
        // Update status
        storage.update_bridge_transaction_status(
            &bridge_tx.id,
            BridgeStatus::Completed,
            Some("0xabcdef123456789"),
        ).await.unwrap();
        
        // Get statistics
        let stats = storage.get_bridge_statistics().await.unwrap();
        assert!(stats.total_transactions > 0);
    }
}
