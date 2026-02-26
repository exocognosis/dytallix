//! RPC Client for Dytallix blockchain

use crate::error::{Result, SdkError};
use crate::{TESTNET_RPC, TESTNET_CHAIN_ID};
use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

/// Dytallix RPC Client
#[derive(Clone)]
pub struct Client {
    http: HttpClient,
    base_url: String,
    chain_id: String,
}

impl Client {
    /// Create a new client with custom configuration
    pub fn new(rpc_url: &str, chain_id: &str) -> Self {
        Self {
            http: HttpClient::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap_or_default(),
            base_url: rpc_url.trim_end_matches('/').to_string(),
            chain_id: chain_id.to_string(),
        }
    }

    /// Create a client connected to testnet
    pub fn testnet() -> Self {
        Self::new(TESTNET_RPC, TESTNET_CHAIN_ID)
    }

    /// Get chain ID
    pub fn chain_id(&self) -> &str {
        &self.chain_id
    }

    /// Get current blockchain status
    pub async fn get_status(&self) -> Result<ChainStatus> {
        let resp = self
            .http
            .get(format!("{}/status", self.base_url))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Status request failed: {}", resp.status())));
        }

        let status = resp.json::<ChainStatus>().await?;
        Ok(status)
    }

    /// Get account information
    pub async fn get_account(&self, address: &str) -> Result<AccountInfo> {
        let resp = self
            .http
            .get(format!("{}/account/{}", self.base_url, address))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Account query failed: {}", resp.status())));
        }

        let info = resp.json::<AccountInfo>().await?;
        Ok(info)
    }

    /// Submit a signed transaction
    pub async fn submit_transaction(&self, signed_tx: &SignedTransaction) -> Result<String> {
        let resp = self
            .http
            .post(format!("{}/submit", self.base_url))
            .json(&serde_json::json!({ "signed_tx": signed_tx }))
            .send()
            .await?;

        if !resp.status().is_success() {
            let err_text = resp.text().await?;
            return Err(SdkError::Api(err_text));
        }

        #[derive(Deserialize)]
        struct SubmitResponse {
            tx_hash: Option<String>,
            hash: Option<String>,
        }

        let data = resp.json::<SubmitResponse>().await?;
        Ok(data.tx_hash.or(data.hash).unwrap_or_default())
    }

    /// Wait for transaction confirmation
    pub async fn wait_for_transaction(&self, hash: &str, timeout_secs: u64) -> Result<TransactionReceipt> {
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(timeout_secs);

        loop {
            if start.elapsed() > timeout {
                return Err(SdkError::Timeout);
            }

            let resp = self
                .http
                .get(format!("{}/tx/{}", self.base_url, hash))
                .send()
                .await;

            if let Ok(r) = resp {
                if r.status().is_success() {
                    if let Ok(receipt) = r.json::<TransactionReceipt>().await {
                        if receipt.status != "pending" {
                            return Ok(receipt);
                        }
                    }
                }
            }

            tokio::time::sleep(Duration::from_millis(1000)).await;
        }
    }

    /// Get transaction by hash
    pub async fn get_transaction(&self, hash: &str) -> Result<TransactionReceipt> {
        let resp = self
            .http
            .get(format!("{}/tx/{}", self.base_url, hash))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Transaction query failed: {}", resp.status())));
        }

        let tx = resp.json::<TransactionReceipt>().await?;
        Ok(tx)
    }

    /// List recent blocks
    pub async fn get_blocks(&self, limit: u32, offset: u32) -> Result<Vec<Block>> {
        let resp = self
            .http
            .get(format!("{}/blocks?limit={}&offset={}", self.base_url, limit, offset))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Blocks query failed: {}", resp.status())));
        }

        #[derive(Deserialize)]
        struct BlocksResponse {
            #[serde(default)]
            blocks: Vec<Block>,
        }

        let data = resp.json::<BlocksResponse>().await?;
        Ok(data.blocks)
    }

    /// Get block by height or hash
    pub async fn get_block(&self, id: &str) -> Result<Block> {
        let resp = self
            .http
            .get(format!("{}/block/{}", self.base_url, id))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Block query failed: {}", resp.status())));
        }

        let block = resp.json::<Block>().await?;
        Ok(block)
    }

    /// Get staking rewards for an address
    pub async fn get_staking_rewards(&self, address: &str) -> Result<StakingRewards> {
        let resp = self
            .http
            .get(format!("{}/api/rewards?address={}", self.base_url, address))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Rewards query failed: {}", resp.status())));
        }

        let rewards = resp.json::<StakingRewards>().await?;
        Ok(rewards)
    }

    /// Request tokens from the testnet faucet
    /// 
    /// Uses the node's dev/faucet endpoint to credit tokens directly.
    /// 
    /// # Arguments
    /// * `address` - The dyt1... address to receive tokens
    /// * `tokens` - Slice of tokens to request: &["DGT"], &["DRT"], or &["DGT", "DRT"]
    /// 
    /// # Example
    /// ```no_run
    /// use dytallix_sdk::{Client, Wallet};
    /// 
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let client = Client::testnet();
    ///     let wallet = Wallet::generate()?;
    ///     
    ///     let result = client.request_faucet(&wallet.address(), &["DGT", "DRT"]).await?;
    ///     println!("Received: {:?}", result.dispensed);
    ///     Ok(())
    /// }
    /// ```
    pub async fn request_faucet(&self, address: &str, tokens: &[&str]) -> Result<FaucetResponse> {
        // Build payload for node's dev/faucet endpoint
        // Amounts are in micro-units (1 token = 1,000,000 micro-units)
        let mut payload = serde_json::json!({ "address": address });
        
        if tokens.contains(&"DGT") {
            payload["udgt"] = serde_json::json!(1_000_000); // 1 DGT
        }
        if tokens.contains(&"DRT") {
            payload["udrt"] = serde_json::json!(50_000_000); // 50 DRT
        }
        
        let resp = self
            .http
            .post(format!("{}/dev/faucet", self.base_url))
            .json(&payload)
            .send()
            .await?;

        let status = resp.status();
        
        #[derive(Deserialize)]
        #[allow(dead_code)]
        struct NodeFaucetResponse {
            success: Option<bool>,
            address: Option<String>,
            credited: Option<NodeCredited>,
            error: Option<String>,
            message: Option<String>,
        }
        
        #[derive(Deserialize)]
        struct NodeCredited {
            udgt: Option<String>,
            udrt: Option<String>,
        }
        
        let data = resp.json::<NodeFaucetResponse>().await?;
        
        if !status.is_success() || data.error.is_some() {
            return Ok(FaucetResponse {
                success: false,
                dispensed: vec![],
                error: data.error,
                message: data.message,
                retry_after_seconds: None,
            });
        }

        // Convert node response to SDK format
        let mut dispensed = Vec::new();
        if let Some(ref credited) = data.credited {
            if let Some(ref udgt) = credited.udgt {
                if let Ok(amt) = udgt.parse::<u64>() {
                    dispensed.push(FaucetDispensed {
                        symbol: "DGT".to_string(),
                        amount: format!("{}", amt as f64 / 1_000_000.0),
                        tx_hash: format!("faucet-{}", chrono::Utc::now().timestamp_millis()),
                    });
                }
            }
            if let Some(ref udrt) = credited.udrt {
                if let Ok(amt) = udrt.parse::<u64>() {
                    dispensed.push(FaucetDispensed {
                        symbol: "DRT".to_string(),
                        amount: format!("{}", amt as f64 / 1_000_000.0),
                        tx_hash: format!("faucet-{}", chrono::Utc::now().timestamp_millis()),
                    });
                }
            }
        }

        Ok(FaucetResponse {
            success: true,
            dispensed,
            error: None,
            message: None,
            retry_after_seconds: None,
        })
    }

    // ===== Contract Methods =====

    /// Deploy a WASM smart contract
    ///
    /// # Arguments
    /// * `code` - Hex-encoded WASM bytecode
    /// * `deployer` - Address of the deployer
    /// * `gas_limit` - Optional gas limit (default: 1,000,000)
    ///
    /// # Example
    /// ```no_run
    /// use dytallix_sdk::Client;
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let client = Client::testnet();
    ///     let wasm_hex = std::fs::read("contract.wasm")
    ///         .map(|b| hex::encode(&b))?;
    ///     
    ///     let result = client.deploy_contract(&wasm_hex, "dyt1deployer...", None).await?;
    ///     println!("Contract deployed at: {}", result.address);
    ///     Ok(())
    /// }
    /// ```
    pub async fn deploy_contract(
        &self,
        code: &str,
        deployer: &str,
        gas_limit: Option<u64>,
    ) -> Result<ContractDeployResponse> {
        let payload = serde_json::json!({
            "code": code.strip_prefix("0x").unwrap_or(code),
            "deployer": deployer,
            "gas_limit": gas_limit.unwrap_or(1_000_000)
        });

        let resp = self
            .http
            .post(format!("{}/contracts/deploy", self.base_url))
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let err_text = resp.text().await?;
            return Err(SdkError::Api(format!("Contract deploy failed: {err_text}")));
        }

        #[derive(Deserialize)]
        struct DeployResp {
            address: String,
            tx_hash: String,
        }

        let data = resp.json::<DeployResp>().await?;
        Ok(ContractDeployResponse {
            address: data.address,
            tx_hash: data.tx_hash,
        })
    }

    /// Call a method on a deployed smart contract
    ///
    /// # Arguments
    /// * `address` - Contract address
    /// * `method` - Method name to call
    /// * `args` - Optional hex-encoded arguments
    /// * `gas_limit` - Optional gas limit (default: 1,000,000)
    pub async fn call_contract(
        &self,
        address: &str,
        method: &str,
        args: Option<&str>,
        gas_limit: Option<u64>,
    ) -> Result<ContractCallResponse> {
        let payload = serde_json::json!({
            "address": address,
            "method": method,
            "args": args.unwrap_or(""),
            "gas_limit": gas_limit.unwrap_or(1_000_000)
        });

        let resp = self
            .http
            .post(format!("{}/contracts/call", self.base_url))
            .json(&payload)
            .send()
            .await?;

        if !resp.status().is_success() {
            let err_text = resp.text().await?;
            return Err(SdkError::Api(format!("Contract call failed: {err_text}")));
        }

        #[derive(Deserialize)]
        struct CallResp {
            result: String,
            gas_used: u64,
            #[serde(default)]
            logs: Vec<String>,
        }

        let data = resp.json::<CallResp>().await?;
        Ok(ContractCallResponse {
            result: data.result,
            gas_used: data.gas_used,
            logs: data.logs,
        })
    }

    /// Query contract state by key
    ///
    /// # Arguments
    /// * `address` - Contract address
    /// * `key` - State key to query
    ///
    /// # Returns
    /// Hex-encoded state value
    pub async fn get_contract_state(&self, address: &str, key: &str) -> Result<String> {
        let resp = self
            .http
            .get(format!("{}/contracts/state/{}/{}", self.base_url, address, key))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!(
                "Contract state query failed: {}",
                resp.status()
            )));
        }

        #[derive(Deserialize)]
        struct StateResp {
            value: String,
        }

        let data = resp.json::<StateResp>().await?;
        Ok(data.value)
    }

    // ===== Genesis & Network Info =====

    /// Get the genesis configuration for this chain
    pub async fn get_genesis(&self) -> Result<GenesisConfig> {
        let resp = self
            .http
            .get(format!("{}/genesis", self.base_url))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Genesis query failed: {}", resp.status())));
        }

        let config = resp.json::<GenesisConfig>().await?;
        Ok(config)
    }

    /// Get list of connected peers
    pub async fn get_peers(&self) -> Result<Vec<PeerInfo>> {
        let resp = self
            .http
            .get(format!("{}/peers", self.base_url))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Peers query failed: {}", resp.status())));
        }

        let peers = resp.json::<Vec<PeerInfo>>().await?;
        Ok(peers)
    }

    /// Get chain statistics
    pub async fn get_stats(&self) -> Result<serde_json::Value> {
        let resp = self
            .http
            .get(format!("{}/api/stats", self.base_url))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(SdkError::Api(format!("Stats query failed: {}", resp.status())));
        }

        let stats = resp.json::<serde_json::Value>().await?;
        Ok(stats)
    }
}

/// Faucet request response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FaucetResponse {
    pub success: bool,
    #[serde(default)]
    pub dispensed: Vec<FaucetDispensed>,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default, rename = "retryAfterSeconds")]
    pub retry_after_seconds: Option<u64>,
}

/// Faucet dispensed token info
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct FaucetDispensed {
    pub symbol: String,
    pub amount: String,
    #[serde(rename = "txHash")]
    pub tx_hash: String,
}

/// Chain status response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChainStatus {
    /// Current block height (aliased from latest_height)
    #[serde(alias = "latest_height")]
    pub block_height: u64,
    pub chain_id: String,
    /// Latest block hash (may be empty on some endpoints)
    #[serde(default, alias = "latest_block_hash")]
    pub latest_block_hash: String,
    #[serde(default)]
    pub latest_block_time: String,
    /// Whether node is syncing
    #[serde(default)]
    pub syncing: bool,
    /// Node status (healthy, etc)
    #[serde(default)]
    pub status: String,
}

/// Account information
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AccountInfo {
    pub address: String,
    #[serde(default)]
    pub balances: HashMap<String, u64>,
    #[serde(default)]
    pub nonce: u64,
}

impl AccountInfo {
    /// Get DGT balance in human-readable units
    pub fn dgt_balance(&self) -> f64 {
        self.balances.get("udgt").copied().unwrap_or(0) as f64 / 1_000_000.0
    }

    /// Get DRT balance in human-readable units  
    pub fn drt_balance(&self) -> f64 {
        self.balances.get("udrt").copied().unwrap_or(0) as f64 / 1_000_000.0
    }
}

/// Signed transaction for submission
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedTransaction {
    pub chain_id: String,
    pub fee: String,
    pub nonce: u64,
    pub memo: String,
    pub msgs: Vec<TransactionMessage>,
    pub signature: TransactionSignature,
}

/// Transaction message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub from: String,
    pub to: String,
    pub amount: String,
    pub denom: String,
}

/// Transaction signature
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionSignature {
    pub sig: String,
    pub pub_key: String,
    pub algorithm: String,
}

/// Transaction receipt
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TransactionReceipt {
    pub hash: String,
    pub status: String,
    #[serde(default)]
    pub block: u64,
    #[serde(default)]
    pub gas_used: u64,
    #[serde(default)]
    pub events: Vec<serde_json::Value>,
}

/// Block information
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Block {
    pub height: u64,
    pub hash: String,
    #[serde(default, alias = "time")]
    pub timestamp: String,
    #[serde(default, alias = "tx_count")]
    pub transactions: u64,
    #[serde(default)]
    pub proposer: Option<String>,
}

/// Staking rewards
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct StakingRewards {
    pub address: String,
    #[serde(default)]
    pub rewards: RewardsBalance,
    #[serde(default)]
    pub last_claimed: Option<String>,
}

/// Rewards balance in micro-units
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct RewardsBalance {
    #[serde(default)]
    pub udgt: u64,
    #[serde(default)]
    pub udrt: u64,
}

impl StakingRewards {
    /// Get DGT rewards in human-readable units
    pub fn dgt_rewards(&self) -> f64 {
        self.rewards.udgt as f64 / 1_000_000.0
    }

    /// Get DRT rewards in human-readable units
    pub fn drt_rewards(&self) -> f64 {
        self.rewards.udrt as f64 / 1_000_000.0
    }
}

// ===== Contract Types =====

/// Contract deployment response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContractDeployResponse {
    /// Deployed contract address
    pub address: String,
    /// Deployment transaction hash
    pub tx_hash: String,
}

/// Contract call response
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ContractCallResponse {
    /// Return value as hex-encoded bytes
    pub result: String,
    /// Gas consumed
    pub gas_used: u64,
    /// Execution logs
    #[serde(default)]
    pub logs: Vec<String>,
}

// ===== Genesis Types =====

/// Genesis configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GenesisConfig {
    pub chain_id: String,
    pub chain_version: String,
    pub genesis_time: String,
    pub features: GenesisFeatures,
    pub pqc: PqcConfig,
    #[serde(default)]
    pub validators: Vec<ValidatorInfo>,
}

/// Genesis feature flags
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct GenesisFeatures {
    #[serde(default)]
    pub staking: bool,
    #[serde(default)]
    pub governance: bool,
    #[serde(default)]
    pub bridge: bool,
    #[serde(default)]
    pub smart_contracts: bool,
    #[serde(default)]
    pub wasm_contracts: bool,
    #[serde(default)]
    pub ai_oracle: bool,
}

/// Post-Quantum Cryptography configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PqcConfig {
    pub enabled: bool,
    pub algorithms: PqcAlgorithms,
}

/// PQC algorithm configuration
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PqcAlgorithms {
    #[serde(default)]
    pub signature: Vec<String>,
    #[serde(default)]
    pub encryption: Vec<String>,
}

/// Validator information
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ValidatorInfo {
    pub address: String,
    pub moniker: String,
    pub voting_power: String,
}

/// Peer information
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PeerInfo {
    pub id: String,
    pub address: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = Client::testnet();
        assert_eq!(client.chain_id(), TESTNET_CHAIN_ID);
    }

    #[test]
    fn test_account_info_balance() {
        let mut balances = HashMap::new();
        balances.insert("udgt".to_string(), 10_000_000);
        balances.insert("udrt".to_string(), 5_000_000);

        let info = AccountInfo {
            address: "dyt1test".to_string(),
            balances,
            nonce: 0,
        };

        assert_eq!(info.dgt_balance(), 10.0);
        assert_eq!(info.drt_balance(), 5.0);
    }
}
