use crate::models::{RpcBlockResponse, RpcTransaction};
use reqwest::Client;
use anyhow::{anyhow, Result};
use serde_json::Value;

pub struct RpcClient {
    client: Client,
    base_url: String,
}

impl RpcClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }

    pub async fn get_latest_height(&self) -> Result<u64> {
        let url = format!("{}/blocks/latest", self.base_url);
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow!("Failed to get latest height: {}", response.status()));
        }

        let json: Value = response.json().await?;
        
        // Try different possible response formats
        if let Some(height) = json.get("height").and_then(|h| h.as_u64()) {
            return Ok(height);
        }
        
        if let Some(block) = json.get("block") {
            if let Some(header) = block.get("header") {
                if let Some(height) = header.get("height").and_then(|h| h.as_str()) {
                    return Ok(height.parse()?);
                }
            }
        }

        Err(anyhow!("Could not parse height from response"))
    }

    pub async fn get_blocks(&self, height: u64) -> Result<RpcBlockResponse> {
        let url = format!("{}/blocks?height={}", self.base_url, height);
        let response = self.client.get(&url).send().await?;
        
        if !response.status().is_success() {
            return Err(anyhow!("Failed to get blocks: {}", response.status()));
        }

        let json: Value = response.json().await?;
        
        // Handle different possible response formats based on the RPC code I saw
        if let Some(blocks_array) = json.get("blocks").and_then(|b| b.as_array()) {
            let mut blocks = Vec::new();
            for block_val in blocks_array {
                if let (Some(height), Some(hash), Some(txs)) = (
                    block_val.get("height").and_then(|h| h.as_u64()),
                    block_val.get("hash").and_then(|h| h.as_str()),
                    block_val.get("txs").and_then(|t| t.as_array()),
                ) {
                    blocks.push(crate::models::RpcBlock {
                        height,
                        hash: hash.to_string(),
                        txs: txs.iter()
                            .filter_map(|tx| tx.as_str().map(|s| s.to_string()))
                            .collect(),
                    });
                }
            }
            return Ok(RpcBlockResponse { blocks });
        }

        // If no blocks array, try single block format
        if let (Some(height), Some(hash)) = (
            json.get("height").and_then(|h| h.as_u64()),
            json.get("hash").and_then(|h| h.as_str()),
        ) {
            let txs = json.get("txs")
                .and_then(|t| t.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|tx| tx.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();

            return Ok(RpcBlockResponse {
                blocks: vec![crate::models::RpcBlock {
                    height,
                    hash: hash.to_string(),
                    txs,
                }],
            });
        }

        Err(anyhow!("Could not parse blocks from response"))
    }

    pub async fn get_transaction(&self, hash: &str) -> Result<Option<RpcTransaction>> {
        let url = format!("{}/tx/{}", self.base_url, hash);
        let response = self.client.get(&url).send().await?;
        
        if response.status().is_client_error() {
            // Transaction not found
            return Ok(None);
        }
        
        if !response.status().is_success() {
            return Err(anyhow!("Failed to get transaction: {}", response.status()));
        }

        let json: Value = response.json().await?;
        
        let tx = RpcTransaction {
            hash: hash.to_string(),
            height: json.get("height").and_then(|h| h.as_u64()),
            from: json.get("from").and_then(|f| f.as_str()).map(|s| s.to_string()),
            to: json.get("to").and_then(|t| t.as_str()).map(|s| s.to_string()),
            amount: json.get("amount").and_then(|a| a.as_str()).map(|s| s.to_string()),
            denom: json.get("denom").and_then(|d| d.as_str()).map(|s| s.to_string()),
            status: json.get("status").and_then(|s| s.as_str()).map(|s| s.to_string()),
            gas_used: json.get("gas_used").and_then(|g| g.as_u64()),
        };

        Ok(Some(tx))
    }
}