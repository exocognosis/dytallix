use clap::{Arg, Command};
use std::env;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod models;
mod features;
mod inference;
mod blockchain;
mod metrics;
mod storage;

use crate::config::Config;
use crate::inference::InferenceEngine;
use crate::blockchain::BlockchainMonitor;
use crate::metrics::MetricsServer;
use crate::storage::Database;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "pulsescan_infer=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let matches = Command::new("pulsescan-infer")
        .version("1.0.0")
        .about("PulseScan fraud & anomaly detection inference service")
        .arg(
            Arg::new("config")
                .short('c')
                .long("config")
                .value_name("FILE")
                .help("Configuration file path")
                .default_value("config.toml"),
        )
        .arg(
            Arg::new("model-path")
                .short('m')
                .long("model-path")
                .value_name("PATH")
                .help("Path to ML model artifacts")
                .default_value("./models"),
        )
        .get_matches();

    let config_path = matches.get_one::<String>("config").unwrap();
    let model_path = matches.get_one::<String>("model-path").unwrap();

    info!("Starting PulseScan inference service");
    info!("Config file: {}", config_path);
    info!("Model path: {}", model_path);

    // Load configuration
    let config = Config::load(config_path)?;

    // Initialize database
    let database = Database::new(&config.database_url).await?;

    // Initialize inference engine
    let inference_engine = InferenceEngine::new(model_path, &config).await?;

    // Initialize blockchain monitor
    let blockchain_monitor = BlockchainMonitor::new(&config).await?;

    // Start metrics server
    let metrics_server = MetricsServer::new(config.metrics_port);
    let metrics_handle = tokio::spawn(async move {
        if let Err(e) = metrics_server.start().await {
            warn!("Metrics server error: {}", e);
        }
    });

    // Start main processing loop
    let processor = InferenceProcessor::new(
        inference_engine,
        blockchain_monitor,
        database,
        config.clone(),
    );

    let processor_handle = tokio::spawn(async move {
        processor.run().await
    });

    // Wait for shutdown signal
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            info!("Received shutdown signal");
        }
        result = processor_handle => {
            if let Err(e) = result {
                warn!("Processor error: {}", e);
            }
        }
        result = metrics_handle => {
            if let Err(e) = result {
                warn!("Metrics server error: {}", e);
            }
        }
    }

    info!("Shutting down PulseScan inference service");
    Ok(())
}

struct InferenceProcessor {
    inference_engine: InferenceEngine,
    blockchain_monitor: BlockchainMonitor,
    database: Database,
    config: Config,
}

impl InferenceProcessor {
    fn new(
        inference_engine: InferenceEngine,
        blockchain_monitor: BlockchainMonitor,
        database: Database,
        config: Config,
    ) -> Self {
        Self {
            inference_engine,
            blockchain_monitor,
            database,
            config,
        }
    }

    async fn run(mut self) -> anyhow::Result<()> {
        info!("Starting inference processing loop");

        let mut transaction_stream = self.blockchain_monitor.transaction_stream().await?;

        while let Some(transaction) = transaction_stream.recv().await {
            if let Err(e) = self.process_transaction(transaction).await {
                warn!("Error processing transaction: {}", e);
            }
        }

        Ok(())
    }

    async fn process_transaction(&mut self, transaction: blockchain::Transaction) -> anyhow::Result<()> {
        // Extract features from transaction
        let features = self.inference_engine.extract_features(&transaction).await?;

        // Run inference
        let inference_result = self.inference_engine.infer(&features).await?;

        // If anomaly detected, create finding and submit to contract
        if inference_result.score >= self.config.min_anomaly_score {
            let finding = self.create_finding(&transaction, &inference_result).await?;

            // Store in database
            self.database.store_finding(&finding).await?;

            // Submit to blockchain contract
            if self.config.auto_submit_findings {
                self.blockchain_monitor.submit_finding(&finding).await?;
            }

            info!(
                "Anomaly detected: tx={}, score={:.3}, reasons={:?}",
                transaction.hash,
                inference_result.score,
                inference_result.reasons
            );
        }

        Ok(())
    }

    async fn create_finding(
        &self,
        transaction: &blockchain::Transaction,
        inference_result: &inference::InferenceResult,
    ) -> anyhow::Result<blockchain::Finding> {
        use crate::blockchain::{Finding, PQSignature};

        let finding = Finding {
            tx_hash: transaction.hash.clone(),
            addr: transaction.from.clone(),
            score: inference_result.score,
            reasons: inference_result.reasons.clone(),
            timestamp: chrono::Utc::now().timestamp() as u64,
            metadata: Some(serde_json::to_string(&inference_result.metadata)?),
        };

        Ok(finding)
    }
}