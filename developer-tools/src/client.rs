use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct BlockchainClient {
    client: Client,
    base_url: String,
}

impl BlockchainClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }
    
    pub async fn get_health(&self) -> Result<ApiResponse<String>> {
        let url = format!("{}/health", self.base_url);
        let response = self.client.get(&url).send().await?;
        let result = response.json::<ApiResponse<String>>().await?;
        Ok(result)
    }
    
    pub async fn get_balance(&self, address: &str) -> Result<ApiResponse<u64>> {
        let url = format!("{}/balance/{}", self.base_url, address);
        let response = self.client.get(&url).send().await?;
        let result = response.json::<ApiResponse<u64>>().await?;
        Ok(result)
    }
    
    pub async fn submit_transaction(&self, tx_request: TransactionRequest) -> Result<ApiResponse<TransactionResponse>> {
        let url = format!("{}/submit", self.base_url);
        let response = self.client.post(&url).json(&tx_request).send().await?;
        let result = response.json::<ApiResponse<TransactionResponse>>().await?;
        Ok(result)
    }
    
    pub async fn get_transaction(&self, hash: &str) -> Result<ApiResponse<TransactionDetails>> {
        let url = format!("{}/transaction/{}", self.base_url, hash);
        let response = self.client.get(&url).send().await?;
        let result = response.json::<ApiResponse<TransactionDetails>>().await?;
        Ok(result)
    }
    
    pub async fn list_transactions(&self, account: Option<String>, limit: u64) -> Result<ApiResponse<Vec<TransactionDetails>>> {
        let mut url = format!("{}/transactions", self.base_url);
        let mut params = Vec::new();
        
        if let Some(acc) = account {
            params.push(format!("account={}", acc));
        }
        params.push(format!("limit={}", limit));
        
        if !params.is_empty() {
            url = format!("{}?{}", url, params.join("&"));
        }
        
        let response = self.client.get(&url).send().await?;
        let result = response.json::<ApiResponse<Vec<TransactionDetails>>>().await?;
        Ok(result)
    }
    
    pub async fn get_stats(&self) -> Result<ApiResponse<BlockchainStats>> {
        let url = format!("{}/stats", self.base_url);
        let response = self.client.get(&url).send().await?;
        let result = response.json::<ApiResponse<BlockchainStats>>().await?;
        Ok(result)
    }
    
    // Smart contract methods
    pub async fn deploy_smart_contract(&self, deployment_data: &DeploymentData) -> Result<serde_json::Value> {
        let url = format!("{}/contract/deploy", self.base_url);
        let response = self.client.post(&url).json(deployment_data).send().await?;
        let result = response.json::<serde_json::Value>().await?;
        Ok(result)
    }
    
    pub async fn get_contract_info(&self, address: &str) -> Result<serde_json::Value> {
        let url = format!("{}/contract/{}", self.base_url, address);
        let response = self.client.get(&url).send().await?;
        let result = response.json::<serde_json::Value>().await?;
        Ok(result)
    }
    
    pub async fn call_contract_method(&self, call_data: &ContractCallData) -> Result<serde_json::Value> {
        let url = format!("{}/contract/call", self.base_url);
        let response = self.client.post(&url).json(call_data).send().await?;
        let result = response.json::<serde_json::Value>().await?;
        Ok(result)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionRequest {
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub fee: Option<u64>,
    pub nonce: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionResponse {
    pub hash: String,
    pub status: String,
    pub block_number: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionDetails {
    pub hash: String,
    pub from: String,
    pub to: String,
    pub amount: u64,
    pub fee: u64,
    pub nonce: u64,
    pub status: String,
    pub block_number: Option<u64>,
    pub timestamp: Option<i64>,
    pub confirmations: Option<u64>,
    pub signature: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockchainStats {
    pub block_height: u64,
    pub total_transactions: u64,
    pub peer_count: u64,
    pub mempool_size: u64,
    pub consensus_status: String,
}

// Smart contract data structures
#[derive(Debug, Serialize, Deserialize)]
pub struct DeploymentData {
    pub code: String,  // Base64 encoded WASM
    pub constructor_params: Option<serde_json::Value>,
    pub gas_limit: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContractCallData {
    pub contract_address: String,
    pub method: String,
    pub params: Option<serde_json::Value>,
    pub gas_limit: u64,
}