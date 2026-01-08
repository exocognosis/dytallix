use crate::Transaction;
use reqwest::Client as HttpClient;
use serde::Deserialize;
use std::time::Duration;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ClientError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("API error: {0}")]
    Api(String),
    #[error("Transaction timeout")]
    Timeout,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChainStatus {
    pub block_height: u64,
    pub chain_id: String,
    pub latest_block_hash: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AccountInfo {
    pub address: String,
    pub balances: std::collections::HashMap<String, u64>,
    pub nonce: u64,
}

#[derive(Clone)]
pub struct Client {
    http: HttpClient,
    base_url: String,
    chain_id: String,
}

impl Client {
    pub fn new(url: &str, chain_id: &str) -> Self {
        Self {
            http: HttpClient::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap_or_default(),
            base_url: url.trim_end_matches('/').to_string(),
            chain_id: chain_id.to_string(),
        }
    }

    pub async fn get_status(&self) -> Result<ChainStatus, ClientError> {
        let resp = self
            .http
            .get(format!("{}/status", self.base_url))
            .send()
            .await?
            .json::<ChainStatus>()
            .await?;
        Ok(resp)
    }

    pub async fn get_account(&self, address: &str) -> Result<AccountInfo, ClientError> {
        let resp = self
            .http
            .get(format!("{}/account/{}", self.base_url, address))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(ClientError::Api(format!("Failed to get account: {}", resp.status())));
        }

        // The node might return simplified struct, adapt as needed based on actual API
        // For now, assume it matches AccountInfo
        let data = resp.json::<AccountInfo>().await?;
        Ok(data)
    }

    pub async fn submit_transaction(&self, signed_tx: Transaction) -> Result<String, ClientError> {
        let resp = self
            .http
            .post(format!("{}/submit", self.base_url))
            .json(&serde_json::json!({ "signed_tx": signed_tx }))
            .send()
            .await?;

        if !resp.status().is_success() {
            let err_text = resp.text().await?;
            return Err(ClientError::Api(err_text));
        }

        #[derive(Deserialize)]
        struct SubmitResponse {
            tx_hash: Option<String>,
            hash: Option<String>,
        }

        let data = resp.json::<SubmitResponse>().await?;
        Ok(data.tx_hash.or(data.hash).unwrap_or_default())
    }

    pub async fn wait_for_transaction(&self, hash: &str) -> Result<(), ClientError> {
        let start = std::time::Instant::now();
        loop {
            if start.elapsed() > Duration::from_secs(30) {
                return Err(ClientError::Timeout);
            }
            
            let resp = self.http.get(format!("{}/tx/{}", self.base_url, hash)).send().await;
             
            if let Ok(r) = resp {
                if r.status().is_success() {
                    #[derive(Deserialize)]
                    struct TxStatus {
                        status: String,
                    }
                    if let Ok(s) = r.json::<TxStatus>().await {
                        if s.status != "pending" {
                            return Ok(());
                        }
                    }
                }
            }
            
            tokio::time::sleep(Duration::from_millis(1000)).await;
        }
    }
}
