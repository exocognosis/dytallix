use serde::Deserialize;
use std::env;
use anyhow::{Context, Result};

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server_host: String,
    pub server_port: u16,
    pub database_url: String,
    pub master_encryption_key: String,
    pub api_key: String,
    pub job_poll_interval_secs: u64,
    pub job_batch_size: i64,
    pub blockchain_rpc_url: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        Ok(Self {
            server_host: env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .context("Failed to parse SERVER_PORT")?,
            database_url: env::var("DATABASE_URL")
                .context("DATABASE_URL must be set")?,
            master_encryption_key: env::var("MASTER_ENCRYPTION_KEY")
                .context("MASTER_ENCRYPTION_KEY must be set (32 bytes hex)")?,
            api_key: env::var("API_KEY")
                .unwrap_or_else(|_| "dev-api-key-change-in-production".to_string()),
            job_poll_interval_secs: env::var("JOB_POLL_INTERVAL_SECS")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .context("Failed to parse JOB_POLL_INTERVAL_SECS")?,
            job_batch_size: env::var("JOB_BATCH_SIZE")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .context("Failed to parse JOB_BATCH_SIZE")?,
            blockchain_rpc_url: env::var("BLOCKCHAIN_RPC_URL").ok(),
        })
    }

    pub fn master_key_bytes(&self) -> Result<Vec<u8>> {
        hex::decode(&self.master_encryption_key)
            .context("Failed to decode master key from hex")
    }
}
