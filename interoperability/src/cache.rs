//! Redis Caching Layer for High-Performance Bridge Operations
//!
//! Implements intelligent caching strategies for bridge transactions, validator signatures,
//! and frequently accessed data to achieve 1000+ ops/sec performance targets.

use serde::{Deserialize, Serialize};
// remove unused Duration import
// use std::time::Duration;
use crate::{AssetMetadata, BridgeStatus, BridgeTx, BridgeTxId, PQCSignature};
use deadpool_redis::{Config, Pool, Runtime};
use redis::AsyncCommands;
use std::fmt;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub redis_url: String,
    pub max_connections: usize,
    pub default_ttl_seconds: u64,
    pub high_priority_ttl_seconds: u64,
    pub enable_compression: bool,
    pub cache_key_prefix: String,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            redis_url: "redis://localhost:6379".to_string(),
            max_connections: 20,
            default_ttl_seconds: 3600,      // 1 hour
            high_priority_ttl_seconds: 300, // 5 minutes
            enable_compression: true,
            cache_key_prefix: "dytallix:bridge".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheMetrics {
    pub hits: u64,
    pub misses: u64,
    pub sets: u64,
    pub deletions: u64,
    pub errors: u64,
    pub total_operations: u64,
    pub hit_ratio: f64,
    pub avg_response_time_ms: f64,
}

impl Default for CacheMetrics {
    fn default() -> Self {
        Self {
            hits: 0,
            misses: 0,
            sets: 0,
            deletions: 0,
            errors: 0,
            total_operations: 0,
            hit_ratio: 0.0,
            avg_response_time_ms: 0.0,
        }
    }
}

#[derive(Debug, Clone)]
pub enum CacheKey {
    BridgeTransaction(String),
    ValidatorSignatures(String),
    AssetMetadata(String),
    BridgeStatistics,
    QueryResult(String),
    ChainConfig(String),
    PerformanceMetrics,
    HealthCheck,
}

impl CacheKey {
    pub fn to_string(&self, prefix: &str) -> String {
        match self {
            CacheKey::BridgeTransaction(id) => format!("{}:tx:{}", prefix, id),
            CacheKey::ValidatorSignatures(tx_id) => format!("{}:sigs:{}", prefix, tx_id),
            CacheKey::AssetMetadata(asset_id) => format!("{}:asset:{}", prefix, asset_id),
            CacheKey::BridgeStatistics => format!("{}:stats", prefix),
            CacheKey::QueryResult(hash) => format!("{}:query:{}", prefix, hash),
            CacheKey::ChainConfig(chain) => format!("{}:chain:{}", prefix, chain),
            CacheKey::PerformanceMetrics => format!("{}:perf", prefix),
            CacheKey::HealthCheck => format!("{}:health", prefix),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedBridgeTransaction {
    pub bridge_tx: BridgeTx,
    pub cached_at: u64,
    pub access_count: u32,
    pub priority: CachePriority,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CachePriority {
    Low,
    Medium,
    High,
    Critical,
}

impl CachePriority {
    pub fn ttl_seconds(&self, config: &CacheConfig) -> u64 {
        match self {
            CachePriority::Low => config.default_ttl_seconds / 2,
            CachePriority::Medium => config.default_ttl_seconds,
            CachePriority::High => config.high_priority_ttl_seconds * 2,
            CachePriority::Critical => config.high_priority_ttl_seconds * 4,
        }
    }
}

#[derive(Clone)]
pub struct BridgeCache {
    pool: Pool,
    config: CacheConfig,
    metrics: Arc<tokio::sync::RwLock<CacheMetrics>>,
}

impl fmt::Debug for BridgeCache {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("BridgeCache")
            .field("config", &self.config)
            .finish()
    }
}

impl BridgeCache {
    pub async fn new(config: CacheConfig) -> Result<Self, redis::RedisError> {
        info!("Initializing Redis cache with URL: {}", config.redis_url);
        let pool_config = Config::from_url(&config.redis_url);
        let pool = pool_config
            .create_pool(Some(Runtime::Tokio1))
            .map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::IoError,
                    "Pool creation failed",
                    e.to_string(),
                ))
            })?;
        {
            let mut conn = pool.get().await.map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::IoError,
                    "Pool get failed",
                    e.to_string(),
                ))
            })?;
            // Use explicit command invocation for PING
            let _: () = redis::cmd("PING")
                .query_async(&mut *conn)
                .await
                .map_err(|e| {
                    redis::RedisError::from((
                        redis::ErrorKind::IoError,
                        "PING failed",
                        e.to_string(),
                    ))
                })?;
            info!("Redis connection established successfully");
        }
        let cache = Self {
            pool,
            config,
            metrics: Arc::new(tokio::sync::RwLock::new(CacheMetrics::default())),
        };
        cache.setup_cache_monitoring().await?;
        Ok(cache)
    }

    async fn setup_cache_monitoring(&self) -> Result<(), redis::RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        // CONFIG SET via explicit command (not available as method on connection wrapper)
        let _: () = redis::cmd("CONFIG")
            .arg("SET")
            .arg("maxmemory-policy")
            .arg("allkeys-lru")
            .query_async(&mut *conn)
            .await
            .map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::IoError,
                    "CONFIG SET maxmemory-policy failed",
                    e.to_string(),
                ))
            })?;
        let _: () = redis::cmd("CONFIG")
            .arg("SET")
            .arg("timeout")
            .arg("300")
            .query_async(&mut *conn)
            .await
            .map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::IoError,
                    "CONFIG SET timeout failed",
                    e.to_string(),
                ))
            })?;
        info!("Cache monitoring and configuration initialized");
        Ok(())
    }

    /// Cache a bridge transaction with intelligent TTL
    pub async fn cache_bridge_transaction(
        &self,
        bridge_tx: &BridgeTx,
        priority: CachePriority,
    ) -> Result<(), redis::RedisError> {
        let start_time = std::time::Instant::now();

        let cached_tx = CachedBridgeTransaction {
            bridge_tx: bridge_tx.clone(),
            cached_at: chrono::Utc::now().timestamp() as u64,
            access_count: 0,
            priority: priority.clone(),
        };

        let key = CacheKey::BridgeTransaction(bridge_tx.id.0.clone())
            .to_string(&self.config.cache_key_prefix);

        let serialized = if self.config.enable_compression {
            self.compress_serialize(&cached_tx)?
        } else {
            serde_json::to_vec(&cached_tx).map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::TypeError,
                    "Serialization failed",
                    e.to_string(),
                ))
            })?
        };

        let ttl = priority.ttl_seconds(&self.config);

        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let _: () = conn.set_ex(&key, serialized, ttl as usize).await?;

        // Update metrics
        {
            let mut metrics = self.metrics.write().await;
            metrics.sets += 1;
            metrics.total_operations += 1;
            metrics.avg_response_time_ms = self.update_avg_response_time(
                metrics.avg_response_time_ms,
                start_time.elapsed().as_millis() as f64,
                metrics.total_operations,
            );
        }

        debug!(
            "Cached bridge transaction {} with TTL {}s",
            bridge_tx.id.0, ttl
        );
        Ok(())
    }

    /// Retrieve cached bridge transaction
    pub async fn get_bridge_transaction(
        &self,
        tx_id: &BridgeTxId,
    ) -> Result<Option<BridgeTx>, redis::RedisError> {
        let start_time = std::time::Instant::now();
        let key =
            CacheKey::BridgeTransaction(tx_id.0.clone()).to_string(&self.config.cache_key_prefix);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let cached_data: Option<Vec<u8>> = conn.get(&key).await?;

        let result = if let Some(data) = cached_data {
            let cached_tx: CachedBridgeTransaction = if self.config.enable_compression {
                self.decompress_deserialize(&data)?
            } else {
                serde_json::from_slice(&data).map_err(|e| {
                    redis::RedisError::from((
                        redis::ErrorKind::TypeError,
                        "Deserialization failed",
                        e.to_string(),
                    ))
                })?
            };

            // Update access count
            self.increment_access_count(&key).await?;

            // Update metrics - cache hit
            {
                let mut metrics = self.metrics.write().await;
                metrics.hits += 1;
                metrics.total_operations += 1;
                metrics.hit_ratio = metrics.hits as f64 / metrics.total_operations as f64;
                metrics.avg_response_time_ms = self.update_avg_response_time(
                    metrics.avg_response_time_ms,
                    start_time.elapsed().as_millis() as f64,
                    metrics.total_operations,
                );
            }

            debug!("Cache hit for bridge transaction {}", tx_id.0);
            Some(cached_tx.bridge_tx)
        } else {
            // Update metrics - cache miss
            {
                let mut metrics = self.metrics.write().await;
                metrics.misses += 1;
                metrics.total_operations += 1;
                metrics.hit_ratio = metrics.hits as f64 / metrics.total_operations as f64;
                metrics.avg_response_time_ms = self.update_avg_response_time(
                    metrics.avg_response_time_ms,
                    start_time.elapsed().as_millis() as f64,
                    metrics.total_operations,
                );
            }

            debug!("Cache miss for bridge transaction {}", tx_id.0);
            None
        };

        Ok(result)
    }

    /// Cache validator signatures for a transaction
    pub async fn cache_validator_signatures(
        &self,
        tx_id: &BridgeTxId,
        signatures: &[PQCSignature],
    ) -> Result<(), redis::RedisError> {
        let key =
            CacheKey::ValidatorSignatures(tx_id.0.clone()).to_string(&self.config.cache_key_prefix);

        let serialized = serde_json::to_vec(signatures).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Serialization failed",
                e.to_string(),
            ))
        })?;

        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let _: () = conn
            .set_ex(&key, serialized, self.config.default_ttl_seconds as usize)
            .await?;

        debug!(
            "Cached {} validator signatures for transaction {}",
            signatures.len(),
            tx_id.0
        );
        Ok(())
    }

    /// Get cached validator signatures
    pub async fn get_validator_signatures(
        &self,
        tx_id: &BridgeTxId,
    ) -> Result<Option<Vec<PQCSignature>>, redis::RedisError> {
        let key =
            CacheKey::ValidatorSignatures(tx_id.0.clone()).to_string(&self.config.cache_key_prefix);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let cached_data: Option<Vec<u8>> = conn.get(&key).await?;

        if let Some(data) = cached_data {
            let signatures: Vec<PQCSignature> = serde_json::from_slice(&data).map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::TypeError,
                    "Deserialization failed",
                    e.to_string(),
                ))
            })?;

            debug!(
                "Retrieved {} cached validator signatures for transaction {}",
                signatures.len(),
                tx_id.0
            );
            Ok(Some(signatures))
        } else {
            Ok(None)
        }
    }

    /// Cache query results with hash-based keys
    pub async fn cache_query_result<T: Serialize>(
        &self,
        query_hash: &str,
        result: &T,
        ttl_seconds: Option<u64>,
    ) -> Result<(), redis::RedisError> {
        let key =
            CacheKey::QueryResult(query_hash.to_string()).to_string(&self.config.cache_key_prefix);

        let serialized = serde_json::to_vec(result).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Serialization failed",
                e.to_string(),
            ))
        })?;

        let ttl = ttl_seconds.unwrap_or(self.config.default_ttl_seconds);

        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let _: () = conn.set_ex(&key, serialized, ttl as usize).await?;
        Ok(())
    }

    /// Get cached query result
    pub async fn get_query_result<T: for<'de> Deserialize<'de>>(
        &self,
        query_hash: &str,
    ) -> Result<Option<T>, redis::RedisError> {
        let key =
            CacheKey::QueryResult(query_hash.to_string()).to_string(&self.config.cache_key_prefix);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let cached_data: Option<Vec<u8>> = conn.get(&key).await?;

        if let Some(data) = cached_data {
            let result: T = serde_json::from_slice(&data).map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::TypeError,
                    "Deserialization failed",
                    e.to_string(),
                ))
            })?;

            Ok(Some(result))
        } else {
            Ok(None)
        }
    }

    /// Cache asset metadata
    pub async fn cache_asset_metadata(
        &self,
        asset_id: &str,
        metadata: &AssetMetadata,
    ) -> Result<(), redis::RedisError> {
        let key =
            CacheKey::AssetMetadata(asset_id.to_string()).to_string(&self.config.cache_key_prefix);

        let serialized = serde_json::to_vec(metadata).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Serialization failed",
                e.to_string(),
            ))
        })?;

        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let _: () = conn
            .set_ex(
                &key,
                serialized,
                self.config.default_ttl_seconds as usize * 2,
            )
            .await?;
        Ok(())
    }

    /// Get cached asset metadata
    pub async fn get_asset_metadata(
        &self,
        asset_id: &str,
    ) -> Result<Option<AssetMetadata>, redis::RedisError> {
        let key =
            CacheKey::AssetMetadata(asset_id.to_string()).to_string(&self.config.cache_key_prefix);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let cached_data: Option<Vec<u8>> = conn.get(&key).await?;

        if let Some(data) = cached_data {
            let metadata: AssetMetadata = serde_json::from_slice(&data).map_err(|e| {
                redis::RedisError::from((
                    redis::ErrorKind::TypeError,
                    "Deserialization failed",
                    e.to_string(),
                ))
            })?;

            Ok(Some(metadata))
        } else {
            Ok(None)
        }
    }

    /// Invalidate cache for bridge transaction and related data
    pub async fn invalidate_bridge_transaction(
        &self,
        tx_id: &BridgeTxId,
    ) -> Result<(), redis::RedisError> {
        let tx_key =
            CacheKey::BridgeTransaction(tx_id.0.clone()).to_string(&self.config.cache_key_prefix);
        let sig_key =
            CacheKey::ValidatorSignatures(tx_id.0.clone()).to_string(&self.config.cache_key_prefix);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let deleted: u32 = conn.del(&[&tx_key, &sig_key]).await?;

        // Update metrics
        {
            let mut metrics = self.metrics.write().await;
            metrics.deletions += deleted as u64;
        }

        debug!(
            "Invalidated {} cache entries for transaction {}",
            deleted, tx_id.0
        );
        Ok(())
    }

    /// Invalidate all caches (use carefully)
    pub async fn invalidate_all(&self) -> Result<(), redis::RedisError> {
        let pattern = format!("{}:*", self.config.cache_key_prefix);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let keys: Vec<String> = conn.keys(&pattern).await?;
        if !keys.is_empty() {
            let deleted: u32 = conn.del(&keys).await?;

            // Update metrics
            {
                let mut metrics = self.metrics.write().await;
                metrics.deletions += deleted as u64;
            }

            info!("Invalidated {} cache entries", deleted);
        }
        Ok(())
    }

    /// Get cache metrics
    pub async fn get_metrics(&self) -> CacheMetrics {
        self.metrics.read().await.clone()
    }

    /// Reset cache metrics
    pub async fn reset_metrics(&self) {
        let mut metrics = self.metrics.write().await;
        *metrics = CacheMetrics::default();
        info!("Cache metrics reset");
    }

    /// Health check for cache system
    pub async fn health_check(&self) -> Result<bool, redis::RedisError> {
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let _: () = redis::cmd("PING")
            .query_async(&mut *conn)
            .await
            .map_err(|e| {
                redis::RedisError::from((redis::ErrorKind::IoError, "PING failed", e.to_string()))
            })?;
        let key = CacheKey::HealthCheck.to_string(&self.config.cache_key_prefix);
        let health_data = serde_json::json!({
            "status": "healthy",
            "timestamp": chrono::Utc::now().timestamp(),
            "version": env!("CARGO_PKG_VERSION")
        });
        let _: () = conn.set_ex(&key, health_data.to_string(), 60).await?;
        Ok(true)
    }

    /// Warm up cache with frequently accessed data
    pub async fn warmup_cache(
        &self,
        bridge_transactions: &[BridgeTx],
    ) -> Result<u32, redis::RedisError> {
        let mut cached_count = 0;

        for tx in bridge_transactions {
            // Prioritize based on transaction status
            let priority = match tx.status {
                BridgeStatus::Pending | BridgeStatus::Confirmed => CachePriority::High,
                BridgeStatus::Locked | BridgeStatus::Minted => CachePriority::Medium,
                BridgeStatus::Completed => CachePriority::Low,
                BridgeStatus::Failed | BridgeStatus::Reversed => CachePriority::Low,
            };

            if let Err(e) = self.cache_bridge_transaction(tx, priority).await {
                warn!("Failed to warm up cache for transaction {}: {}", tx.id.0, e);
            } else {
                cached_count += 1;
            }
        }

        info!("Cache warmed up with {} transactions", cached_count);
        Ok(cached_count)
    }

    /// Generate query hash for caching
    pub fn generate_query_hash(query: &str, params: &[&str]) -> String {
        let combined = format!("{}:{}", query, params.join(":"));
        let hash = blake3::hash(combined.as_bytes());
        hex::encode(hash.as_bytes())
    }

    /// Helper methods
    async fn increment_access_count(&self, key: &str) -> Result<(), redis::RedisError> {
        let access_key = format!("{}:access", key);
        let mut conn = self.pool.get().await.map_err(|e| {
            redis::RedisError::from((redis::ErrorKind::IoError, "Pool get failed", e.to_string()))
        })?;
        let _: () = conn.incr(&access_key, 1).await?;
        let _: () = conn
            .expire(&access_key, self.config.default_ttl_seconds as usize)
            .await?;
        Ok(())
    }

    fn update_avg_response_time(&self, current_avg: f64, new_time: f64, total_ops: u64) -> f64 {
        if total_ops == 1 {
            new_time
        } else {
            (current_avg * (total_ops - 1) as f64 + new_time) / total_ops as f64
        }
    }

    fn compress_serialize<T: Serialize>(&self, data: &T) -> Result<Vec<u8>, redis::RedisError> {
        let serialized = serde_json::to_vec(data).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Serialization failed",
                e.to_string(),
            ))
        })?;

        // Simple compression using zlib (you could use other compression algorithms)
        use flate2::write::ZlibEncoder;
        use flate2::Compression;
        use std::io::prelude::*;

        let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&serialized).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Compression failed",
                e.to_string(),
            ))
        })?;
        encoder.finish().map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Compression finish failed",
                e.to_string(),
            ))
        })
    }

    fn decompress_deserialize<T: for<'de> Deserialize<'de>>(
        &self,
        data: &[u8],
    ) -> Result<T, redis::RedisError> {
        use flate2::read::ZlibDecoder;
        use std::io::prelude::*;

        let mut decoder = ZlibDecoder::new(data);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Decompression failed",
                e.to_string(),
            ))
        })?;

        serde_json::from_slice(&decompressed).map_err(|e| {
            redis::RedisError::from((
                redis::ErrorKind::TypeError,
                "Deserialization failed",
                e.to_string(),
            ))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Asset, BridgeStatus};

    #[tokio::test]
    #[ignore] // Requires Redis server
    async fn test_bridge_cache_operations() {
        let config = CacheConfig::default();
        let cache = BridgeCache::new(config).await.unwrap();

        // Create test bridge transaction
        let bridge_tx = BridgeTx {
            id: BridgeTxId("test_cache_tx".to_string()),
            asset: Asset {
                id: "TEST".to_string(),
                amount: 1000,
                decimals: 18,
                metadata: AssetMetadata {
                    name: "Test Token".to_string(),
                    symbol: "TEST".to_string(),
                    description: "Test token for caching".to_string(),
                    icon_url: None,
                },
            },
            source_chain: "ethereum".to_string(),
            dest_chain: "dytallix".to_string(),
            source_address: "0x123".to_string(),
            dest_address: "dyt123".to_string(),
            timestamp: 1234567890,
            validator_signatures: Vec::new(),
            status: BridgeStatus::Pending,
        };

        // Test caching
        cache
            .cache_bridge_transaction(&bridge_tx, CachePriority::High)
            .await
            .unwrap();

        // Test retrieval
        let cached_tx = cache.get_bridge_transaction(&bridge_tx.id).await.unwrap();
        assert!(cached_tx.is_some());
        assert_eq!(cached_tx.unwrap().id.0, bridge_tx.id.0);

        // Test invalidation
        cache
            .invalidate_bridge_transaction(&bridge_tx.id)
            .await
            .unwrap();

        // Verify invalidation
        let cached_tx_after = cache.get_bridge_transaction(&bridge_tx.id).await.unwrap();
        assert!(cached_tx_after.is_none());

        // Test metrics
        let metrics = cache.get_metrics().await;
        assert!(metrics.total_operations > 0);
        assert!(metrics.hit_ratio >= 0.0);
    }

    #[test]
    fn test_query_hash_generation() {
        let query = "SELECT * FROM bridge_transactions WHERE status = $1";
        let params = vec!["pending"];
        let hash = BridgeCache::generate_query_hash(query, &params);
        assert!(!hash.is_empty());
        assert_eq!(hash.len(), 64); // Blake3 hash length in hex
    }
}
