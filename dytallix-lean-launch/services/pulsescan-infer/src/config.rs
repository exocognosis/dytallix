use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub blockchain_rpc_url: String,
    pub contract_address: String,
    pub signer_private_key: String,
    pub min_anomaly_score: f64,
    pub auto_submit_findings: bool,
    pub metrics_port: u16,
    pub inference: InferenceConfig,
    pub features: FeatureConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceConfig {
    pub model_type: String,
    pub batch_size: usize,
    pub confidence_threshold: f64,
    pub enable_ensemble: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureConfig {
    pub enable_graph_features: bool,
    pub enable_temporal_features: bool,
    pub enable_behavioral_features: bool,
    pub lookback_window_hours: u64,
    pub velocity_window_minutes: u64,
}

impl Config {
    pub fn load(path: &str) -> anyhow::Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            database_url: "postgresql://user:pass@localhost/pulsescan".to_string(),
            redis_url: "redis://localhost:6379".to_string(),
            blockchain_rpc_url: "http://localhost:26657".to_string(),
            contract_address: "dytallix1...".to_string(),
            signer_private_key: "".to_string(),
            min_anomaly_score: 0.7,
            auto_submit_findings: true,
            metrics_port: 9090,
            inference: InferenceConfig {
                model_type: "ensemble".to_string(),
                batch_size: 32,
                confidence_threshold: 0.8,
                enable_ensemble: true,
            },
            features: FeatureConfig {
                enable_graph_features: true,
                enable_temporal_features: true,
                enable_behavioral_features: true,
                lookback_window_hours: 24,
                velocity_window_minutes: 60,
            },
        }
    }
}