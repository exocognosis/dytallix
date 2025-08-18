//! Prometheus metrics exporter for Dytallix node
//! 
//! This module provides optional observability functionality that can be enabled
//! via CLI flags or environment variables. When disabled, it has zero performance impact.

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[cfg(feature = "metrics")]
use prometheus::{
    Gauge, Histogram, HistogramOpts, IntCounter, IntGauge, Opts, Registry,
    TextEncoder
};

#[cfg(feature = "metrics")]
use axum::{
    extract::Extension,
    http::StatusCode,
    response::Response,
    routing::get,
    Router,
};

#[cfg(feature = "metrics")]
use tokio::net::TcpListener;

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[cfg(feature = "metrics")]
    #[tokio::test]
    async fn test_metrics_creation() {
        let metrics = Metrics::new().expect("Failed to create metrics");
        
        // Test initial values
        assert_eq!(metrics.total_blocks.get(), 0);
        assert_eq!(metrics.total_transactions.get(), 0);
        assert_eq!(metrics.mempool_size.get(), 0);
        assert_eq!(metrics.build_info.get(), 1); // Should be set to 1 on creation
    }

    #[cfg(feature = "metrics")]
    #[tokio::test]
    async fn test_metrics_recording() {
        let metrics = Metrics::new().expect("Failed to create metrics");
        
        // Test block recording
        metrics.record_block(1, 5, 100, Duration::from_millis(250));
        assert_eq!(metrics.total_blocks.get(), 1);
        assert_eq!(metrics.total_transactions.get(), 5);
        assert_eq!(metrics.current_block_height.get(), 1);
        assert_eq!(metrics.total_gas_used.get(), 100);
        
        // Test mempool update
        metrics.update_mempool_size(25);
        assert_eq!(metrics.mempool_size.get(), 25);
        
        // Test oracle update
        metrics.record_oracle_update(Duration::from_millis(150));
        // Just ensure it doesn't panic - histogram values are not directly testable
        
        // Test emission pool update
        metrics.update_emission_pool(1500.0);
        assert_eq!(metrics.emission_pool_size.get(), 1500.0);
    }

    #[cfg(feature = "metrics")]
    #[tokio::test]
    async fn test_metrics_server_creation() {
        let config = MetricsConfig {
            enabled: true,
            listen_addr: "127.0.0.1:0".parse().unwrap(), // Use port 0 for dynamic allocation
        };
        
        let (server, metrics) = MetricsServer::new(config).expect("Failed to create metrics server");
        
        // Test that we can use the metrics
        metrics.record_block(1, 0, 0, Duration::from_millis(100));
        assert_eq!(metrics.total_blocks.get(), 1);
    }

    #[tokio::test]
    async fn test_metrics_config_default() {
        // Test default config
        let default_config = MetricsConfig::default();
        assert!(!default_config.enabled);
        assert_eq!(default_config.listen_addr.port(), 9464);
    }

    #[cfg(not(feature = "metrics"))]
    #[tokio::test]
    async fn test_metrics_disabled_no_ops() {
        let metrics = Metrics::new().expect("Should create no-op metrics");
        
        // All operations should be no-ops when metrics feature is disabled
        metrics.record_block(1, 5, 100, Duration::from_millis(250));
        metrics.update_mempool_size(25);
        metrics.record_oracle_update(Duration::from_millis(150));
        metrics.update_emission_pool(1500.0);
        
        // If we get here without panicking, the no-op implementation works
    }

    #[tokio::test] 
    async fn test_disabled_metrics_config() {
        let config = MetricsConfig {
            enabled: false,
            listen_addr: "127.0.0.1:9464".parse().unwrap(),
        };
        
        let (server, _metrics) = MetricsServer::new(config).expect("Should create server even when disabled");
        
        // Starting a disabled server should return immediately
        let result = tokio::time::timeout(Duration::from_millis(100), server.start()).await;
        assert!(result.is_ok(), "Disabled server should start immediately");
    }
}

/// Metrics configuration
#[derive(Debug, Clone)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub listen_addr: SocketAddr,
}

impl Default for MetricsConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            listen_addr: "0.0.0.0:9464".parse().unwrap(),
        }
    }
}

/// Main metrics context containing all metric collectors
#[cfg(feature = "metrics")]
pub struct Metrics {
    registry: Registry,
    
    // Block metrics
    pub total_blocks: IntCounter,
    pub current_block_height: IntGauge,
    pub block_processing_time: Histogram,
    
    // Transaction metrics  
    pub total_transactions: IntCounter,
    pub mempool_size: IntGauge,
    pub transaction_processing_time: Histogram,
    
    // Gas metrics
    pub total_gas_used: IntCounter,
    pub current_block_gas: IntGauge,
    
    // Oracle metrics
    pub oracle_latency: Histogram,
    pub last_oracle_update: IntGauge,
    
    // Emission metrics
    pub emission_pool_size: Gauge,
    
    // System metrics
    pub build_info: IntGauge,
}

#[cfg(feature = "metrics")]
impl Metrics {
    pub fn new() -> anyhow::Result<Self> {
        let registry = Registry::new();
        
        // Block metrics
        let total_blocks = IntCounter::with_opts(Opts::new(
            "dytallix_total_blocks",
            "Total number of blocks produced"
        ))?;
        registry.register(Box::new(total_blocks.clone()))?;
        
        let current_block_height = IntGauge::with_opts(Opts::new(
            "dytallix_current_block_height", 
            "Current blockchain height"
        ))?;
        registry.register(Box::new(current_block_height.clone()))?;
        
        let block_processing_time = Histogram::with_opts(HistogramOpts::new(
            "dytallix_block_processing_seconds",
            "Time spent processing blocks"
        ))?;
        registry.register(Box::new(block_processing_time.clone()))?;
        
        // Transaction metrics
        let total_transactions = IntCounter::with_opts(Opts::new(
            "dytallix_total_transactions",
            "Total number of transactions processed"
        ))?;
        registry.register(Box::new(total_transactions.clone()))?;
        
        let mempool_size = IntGauge::with_opts(Opts::new(
            "dytallix_mempool_size",
            "Current number of pending transactions in mempool"
        ))?;
        registry.register(Box::new(mempool_size.clone()))?;
        
        let transaction_processing_time = Histogram::with_opts(HistogramOpts::new(
            "dytallix_transaction_processing_seconds",
            "Time spent processing individual transactions"
        ))?;
        registry.register(Box::new(transaction_processing_time.clone()))?;
        
        // Gas metrics
        let total_gas_used = IntCounter::with_opts(Opts::new(
            "dytallix_total_gas_used",
            "Total gas consumed by all transactions"
        ))?;
        registry.register(Box::new(total_gas_used.clone()))?;
        
        let current_block_gas = IntGauge::with_opts(Opts::new(
            "dytallix_current_block_gas",
            "Gas used in the current block being processed"
        ))?;
        registry.register(Box::new(current_block_gas.clone()))?;
        
        // Oracle metrics
        let oracle_latency = Histogram::with_opts(HistogramOpts::new(
            "dytallix_oracle_latency_seconds",
            "Latency of oracle data updates"
        ))?;
        registry.register(Box::new(oracle_latency.clone()))?;
        
        let last_oracle_update = IntGauge::with_opts(Opts::new(
            "dytallix_last_oracle_update_timestamp",
            "Timestamp of the last oracle update"
        ))?;
        registry.register(Box::new(last_oracle_update.clone()))?;
        
        // Emission metrics
        let emission_pool_size = Gauge::with_opts(Opts::new(
            "dytallix_emission_pool_size",
            "Current size of the emission/reward pool"
        ))?;
        registry.register(Box::new(emission_pool_size.clone()))?;
        
        // Build info
        let build_info = IntGauge::with_opts(Opts::new(
            "dytallix_build_info",
            "Build information with version and commit labels"
        ))?;
        registry.register(Box::new(build_info.clone()))?;
        
        // Set build info to 1 
        build_info.set(1);
        
        Ok(Self {
            registry,
            total_blocks,
            current_block_height,
            block_processing_time,
            total_transactions,
            mempool_size,
            transaction_processing_time,
            total_gas_used,
            current_block_gas,
            oracle_latency,
            last_oracle_update,
            emission_pool_size,
            build_info,
        })
    }
    
    /// Record that a new block was produced
    pub fn record_block(&self, height: u64, tx_count: usize, gas_used: u64, processing_time: Duration) {
        self.total_blocks.inc();
        self.current_block_height.set(height as i64);
        self.total_transactions.inc_by(tx_count as u64);
        self.total_gas_used.inc_by(gas_used);
        self.block_processing_time.observe(processing_time.as_secs_f64());
    }
    
    /// Update mempool size
    pub fn update_mempool_size(&self, size: usize) {
        self.mempool_size.set(size as i64);
    }
    
    /// Record transaction processing time
    pub fn record_transaction(&self, processing_time: Duration) {
        self.transaction_processing_time.observe(processing_time.as_secs_f64());
    }
    
    /// Record oracle update
    pub fn record_oracle_update(&self, latency: Duration) {
        self.oracle_latency.observe(latency.as_secs_f64());
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.last_oracle_update.set(now as i64);
    }
    
    /// Update emission pool size
    pub fn update_emission_pool(&self, pool_size: f64) {
        self.emission_pool_size.set(pool_size);
    }
    
    /// Update current block gas
    pub fn update_current_block_gas(&self, gas: u64) {
        self.current_block_gas.set(gas as i64);
    }
}

#[cfg(not(feature = "metrics"))]
pub struct Metrics;

#[cfg(not(feature = "metrics"))]
impl Metrics {
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self)
    }
    
    pub fn record_block(&self, _height: u64, _tx_count: usize, _gas_used: u64, _processing_time: Duration) {}
    pub fn update_mempool_size(&self, _size: usize) {}
    pub fn record_transaction(&self, _processing_time: Duration) {}
    pub fn record_oracle_update(&self, _latency: Duration) {}
    pub fn update_emission_pool(&self, _pool_size: f64) {}
    pub fn update_current_block_gas(&self, _gas: u64) {}
}

/// Metrics server handle
pub struct MetricsServer {
    #[cfg(feature = "metrics")]
    metrics: Arc<Metrics>,
    config: MetricsConfig,
}

impl MetricsServer {
    pub fn new(config: MetricsConfig) -> anyhow::Result<(Self, Arc<Metrics>)> {
        let metrics = Arc::new(Metrics::new()?);
        let server = Self {
            #[cfg(feature = "metrics")]
            metrics: metrics.clone(),
            config,
        };
        Ok((server, metrics))
    }
    
    /// Start the metrics server if enabled
    pub async fn start(self) -> anyhow::Result<()> {
        if !self.config.enabled {
            // When disabled, this function returns immediately with no overhead
            println!("Metrics collection disabled");
            return Ok(());
        }
        
        #[cfg(feature = "metrics")]
        {
            println!("Starting metrics server on {}", self.config.listen_addr);
            
            let app = Router::new()
                .route("/metrics", get(metrics_handler))
                .layer(Extension(self.metrics));
            
            let listener = TcpListener::bind(self.config.listen_addr).await?;
            axum::serve(listener, app).await?;
        }
        
        #[cfg(not(feature = "metrics"))]
        {
            println!("Metrics feature not compiled in");
        }
        
        Ok(())
    }
}

#[cfg(feature = "metrics")]
async fn metrics_handler(Extension(metrics): Extension<Arc<Metrics>>) -> Result<Response<String>, StatusCode> {
    let encoder = TextEncoder::new();
    let metric_families = metrics.registry.gather();
    
    match encoder.encode_to_string(&metric_families) {
        Ok(body) => {
            let response = Response::builder()
                .status(StatusCode::OK)
                .header("content-type", "text/plain; version=0.0.4; charset=utf-8")
                .body(body)
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(response)
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Parse metrics configuration from environment and CLI args
pub fn parse_metrics_config() -> MetricsConfig {
    #[cfg(feature = "metrics")]
    {
        use clap::Parser;
        
        #[derive(Parser)]
        #[command(about = "Dytallix Node Metrics Configuration")]
        struct Args {
            /// Enable metrics collection and export
            #[arg(long)]
            enable_metrics: bool,
            
            /// Metrics server listen address
            #[arg(long, default_value = "0.0.0.0:9464")]
            metrics_addr: String,
        }
        
        // Try to parse args, fall back to env vars only if parsing fails
        let args = Args::try_parse().unwrap_or_else(|_| {
            // Fallback to just environment variables
            let enabled = std::env::var("DY_METRICS")
                .map(|v| v == "1" || v.to_lowercase() == "true")
                .unwrap_or(false);
            let addr = std::env::var("DY_METRICS_ADDR")
                .unwrap_or_else(|_| "0.0.0.0:9464".to_string());
            
            Args {
                enable_metrics: enabled,
                metrics_addr: addr,
            }
        });
        
        MetricsConfig {
            enabled: args.enable_metrics,
            listen_addr: args.metrics_addr.parse().unwrap_or_else(|_| "0.0.0.0:9464".parse().unwrap()),
        }
    }
    
    #[cfg(not(feature = "metrics"))]
    {
        // Check environment variables even without metrics feature
        let enabled = std::env::var("DY_METRICS")
            .map(|v| v == "1" || v.to_lowercase() == "true")
            .unwrap_or(false);
            
        if enabled {
            eprintln!("Warning: DY_METRICS=1 but metrics feature not compiled in. Rebuild with --features metrics");
        }
        
        MetricsConfig::default()
    }
}