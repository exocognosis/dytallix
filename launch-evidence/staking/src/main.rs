use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use clap::Parser;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn, error, debug};

/// Staking emission evidence collection script
#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Configuration file path
    #[arg(short, long, default_value = "sample_config.example.toml")]
    config: PathBuf,

    /// Override wait blocks from config
    #[arg(long)]
    wait_blocks: Option<u64>,

    /// Dry run - don't execute transactions
    #[arg(long)]
    dry_run: bool,

    /// Skip auto-claiming rewards
    #[arg(long)]
    no_claim: bool,
}

#[derive(Debug, Deserialize)]
struct Config {
    emission: EmissionConfig,
    chain: ChainConfig,
    logging: Option<LoggingConfig>,
    delegators: Vec<DelegatorConfig>,
    validators: Option<Vec<ValidatorConfig>>,
}

#[derive(Debug, Deserialize)]
struct EmissionConfig {
    wait_blocks: u64,
    min_reward_delta: u64,
    enable_auto_claim: bool,
    polling_interval: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct ChainConfig {
    binary: String,
    lcd_endpoint: String,
    rpc_endpoint: String,
    grpc_endpoint: String,
    denom: String,
    chain_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LoggingConfig {
    level: String,
    json_format: bool,
    log_file: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
struct DelegatorConfig {
    address: String,
    label: String,
    key_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ValidatorConfig {
    address: String,
    label: String,
}

#[derive(Debug, Serialize)]
struct BalanceSnapshot {
    timestamp: DateTime<Utc>,
    block_height: u64,
    delegators: Vec<DelegatorBalance>,
}

#[derive(Debug, Serialize)]
struct DelegatorBalance {
    address: String,
    label: String,
    balance: String,
    delegations: Vec<DelegationInfo>,
    pending_rewards: Option<String>,
}

#[derive(Debug, Serialize)]
struct DelegationInfo {
    validator_address: String,
    amount: String,
    shares: String,
}

#[derive(Debug, Serialize)]
struct ClaimTransaction {
    delegator: String,
    transaction_hash: String,
    timestamp: DateTime<Utc>,
    success: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct ClaimReport {
    timestamp: DateTime<Utc>,
    transactions: Vec<ClaimTransaction>,
    summary: ClaimSummary,
}

#[derive(Debug, Serialize)]
struct ClaimSummary {
    total_delegators: usize,
    successful_claims: usize,
    failed_claims: usize,
    total_rewards_claimed: String,
}

pub struct EmissionCollector {
    config: Config,
    client: reqwest::Client,
    dry_run: bool,
}

impl EmissionCollector {
    pub fn new(config: Config, dry_run: bool) -> Self {
        let client = reqwest::Client::new();
        Self {
            config,
            client,
            dry_run,
        }
    }

    /// Main execution flow for emission evidence collection
    pub async fn run(&self) -> Result<()> {
        info!("Starting staking emission evidence collection");

        // Validate environment
        self.validate_environment().await?;

        // Capture pre-state
        info!("Capturing pre-emission state...");
        let before_snapshot = self.capture_balances().await?;
        self.save_snapshot(&before_snapshot, "before_balances.json")?;

        // Wait for emission
        info!("Waiting for {} blocks of emission...", self.config.emission.wait_blocks);
        self.wait_for_blocks(self.config.emission.wait_blocks).await?;

        // Capture post-state
        info!("Capturing post-emission state...");
        let after_snapshot = self.capture_balances().await?;
        self.save_snapshot(&after_snapshot, "after_balances.json")?;

        // Validate rewards were distributed
        self.validate_reward_distribution(&before_snapshot, &after_snapshot)?;

        // Claim rewards if enabled
        if self.config.emission.enable_auto_claim && !self.dry_run {
            info!("Claiming rewards...");
            let claim_report = self.claim_rewards().await?;
            self.save_claim_report(&claim_report)?;
        }

        info!("Emission evidence collection completed successfully");
        Ok(())
    }

    async fn validate_environment(&self) -> Result<()> {
        info!("Validating environment configuration...");

        // Test chain connectivity
        let status_url = format!("{}/cosmos/base/tendermint/v1beta1/node_info", self.config.chain.lcd_endpoint);
        let response = self.client.get(&status_url)
            .send()
            .await
            .context("Failed to connect to LCD endpoint")?;

        if !response.status().is_success() {
            anyhow::bail!("LCD endpoint returned error: {}", response.status());
        }

        // Validate binary availability
        let binary_check = Command::new(&self.config.chain.binary)
            .arg("version")
            .output();

        match binary_check {
            Ok(output) if output.status.success() => {
                let version = String::from_utf8_lossy(&output.stdout);
                info!("Chain binary {} version: {}", self.config.chain.binary, version.trim());
            }
            _ => {
                anyhow::bail!("Chain binary '{}' not found or not executable", self.config.chain.binary);
            }
        }

        info!("Environment validation passed");
        Ok(())
    }

    async fn capture_balances(&self) -> Result<BalanceSnapshot> {
        let current_height = self.get_current_block_height().await?;
        let mut delegator_balances = Vec::new();

        for delegator in &self.config.delegators {
            debug!("Capturing balance for delegator: {}", delegator.label);

            // Get account balance
            let balance = self.get_account_balance(&delegator.address).await
                .unwrap_or_else(|e| {
                    warn!("Failed to get balance for {}: {}", delegator.address, e);
                    "0".to_string()
                });

            // Get delegations
            let delegations = self.get_delegations(&delegator.address).await
                .unwrap_or_else(|e| {
                    warn!("Failed to get delegations for {}: {}", delegator.address, e);
                    Vec::new()
                });

            // Get pending rewards
            let pending_rewards = self.get_pending_rewards(&delegator.address).await.ok();

            delegator_balances.push(DelegatorBalance {
                address: delegator.address.clone(),
                label: delegator.label.clone(),
                balance,
                delegations,
                pending_rewards,
            });
        }

        Ok(BalanceSnapshot {
            timestamp: Utc::now(),
            block_height: current_height,
            delegators: delegator_balances,
        })
    }

    async fn get_current_block_height(&self) -> Result<u64> {
        let url = format!("{}/cosmos/base/tendermint/v1beta1/blocks/latest", self.config.chain.lcd_endpoint);
        let response: serde_json::Value = self.client.get(&url)
            .send()
            .await?
            .json()
            .await?;

        let height_str = response["block"]["header"]["height"]
            .as_str()
            .context("Failed to parse block height")?;

        height_str.parse::<u64>()
            .context("Failed to convert block height to number")
    }

    async fn get_account_balance(&self, address: &str) -> Result<String> {
        let url = format!("{}/cosmos/bank/v1beta1/balances/{}", self.config.chain.lcd_endpoint, address);
        let response: serde_json::Value = self.client.get(&url)
            .send()
            .await?
            .json()
            .await?;

        // Find the balance for our denomination
        if let Some(balances) = response["balances"].as_array() {
            for balance in balances {
                if balance["denom"].as_str() == Some(&self.config.chain.denom) {
                    return Ok(balance["amount"].as_str().unwrap_or("0").to_string());
                }
            }
        }

        Ok("0".to_string())
    }

    async fn get_delegations(&self, address: &str) -> Result<Vec<DelegationInfo>> {
        let url = format!("{}/cosmos/staking/v1beta1/delegations/{}", self.config.chain.lcd_endpoint, address);
        let response: serde_json::Value = self.client.get(&url)
            .send()
            .await?
            .json()
            .await?;

        let mut delegations = Vec::new();

        if let Some(delegation_responses) = response["delegation_responses"].as_array() {
            for delegation in delegation_responses {
                if let (Some(validator), Some(balance)) = (
                    delegation["delegation"]["validator_address"].as_str(),
                    delegation["balance"]["amount"].as_str(),
                ) {
                    delegations.push(DelegationInfo {
                        validator_address: validator.to_string(),
                        amount: balance.to_string(),
                        shares: delegation["delegation"]["shares"].as_str().unwrap_or("0").to_string(),
                    });
                }
            }
        }

        Ok(delegations)
    }

    async fn get_pending_rewards(&self, address: &str) -> Result<String> {
        let url = format!("{}/cosmos/distribution/v1beta1/delegators/{}/rewards", 
                         self.config.chain.lcd_endpoint, address);
        let response: serde_json::Value = self.client.get(&url)
            .send()
            .await?
            .json()
            .await?;

        let mut total_rewards = 0u64;

        if let Some(rewards) = response["rewards"].as_array() {
            for reward in rewards {
                if let Some(reward_array) = reward["reward"].as_array() {
                    for reward_coin in reward_array {
                        if reward_coin["denom"].as_str() == Some(&self.config.chain.denom) {
                            if let Some(amount_str) = reward_coin["amount"].as_str() {
                                // Parse decimal amount and convert to integer
                                let amount_f64: f64 = amount_str.parse().unwrap_or(0.0);
                                total_rewards += amount_f64 as u64;
                            }
                        }
                    }
                }
            }
        }

        Ok(total_rewards.to_string())
    }

    async fn wait_for_blocks(&self, blocks_to_wait: u64) -> Result<()> {
        let start_height = self.get_current_block_height().await?;
        let target_height = start_height + blocks_to_wait;
        let polling_interval = Duration::from_secs(self.config.emission.polling_interval.unwrap_or(5));

        info!("Waiting for block height {} (current: {})", target_height, start_height);

        loop {
            sleep(polling_interval).await;
            let current_height = self.get_current_block_height().await?;
            
            debug!("Current block height: {} (target: {})", current_height, target_height);
            
            if current_height >= target_height {
                info!("Reached target block height: {}", current_height);
                break;
            }
        }

        Ok(())
    }

    fn validate_reward_distribution(&self, before: &BalanceSnapshot, after: &BalanceSnapshot) -> Result<()> {
        info!("Validating reward distribution...");

        let mut total_reward_increase = 0u64;

        for (before_del, after_del) in before.delegators.iter().zip(after.delegators.iter()) {
            if before_del.address != after_del.address {
                continue;
            }

            // Compare pending rewards
            let before_rewards: u64 = before_del.pending_rewards.as_ref()
                .and_then(|r| r.parse().ok())
                .unwrap_or(0);
            let after_rewards: u64 = after_del.pending_rewards.as_ref()
                .and_then(|r| r.parse().ok())
                .unwrap_or(0);

            if after_rewards > before_rewards {
                let increase = after_rewards - before_rewards;
                total_reward_increase += increase;
                info!("Delegator {} earned {} uDRT in rewards", 
                     before_del.label, increase);
            }
        }

        if total_reward_increase < self.config.emission.min_reward_delta {
            anyhow::bail!("Insufficient reward distribution: {} < {} uDRT minimum", 
                         total_reward_increase, self.config.emission.min_reward_delta);
        }

        info!("Reward distribution validation passed: {} uDRT total increase", total_reward_increase);
        Ok(())
    }

    async fn claim_rewards(&self) -> Result<ClaimReport> {
        let mut transactions = Vec::new();
        let mut successful_claims = 0;
        let mut total_rewards = 0u64;

        for delegator in &self.config.delegators {
            if let Some(key_name) = &delegator.key_name {
                info!("Claiming rewards for delegator: {}", delegator.label);

                let claim_result = self.execute_claim_command(key_name).await;
                
                match claim_result {
                    Ok((tx_hash, amount)) => {
                        successful_claims += 1;
                        total_rewards += amount;
                        transactions.push(ClaimTransaction {
                            delegator: delegator.address.clone(),
                            transaction_hash: tx_hash,
                            timestamp: Utc::now(),
                            success: true,
                            error: None,
                        });
                    }
                    Err(e) => {
                        error!("Failed to claim rewards for {}: {}", delegator.label, e);
                        transactions.push(ClaimTransaction {
                            delegator: delegator.address.clone(),
                            transaction_hash: "".to_string(),
                            timestamp: Utc::now(),
                            success: false,
                            error: Some(e.to_string()),
                        });
                    }
                }
            }
        }

        Ok(ClaimReport {
            timestamp: Utc::now(),
            transactions,
            summary: ClaimSummary {
                total_delegators: self.config.delegators.len(),
                successful_claims,
                failed_claims: self.config.delegators.len() - successful_claims,
                total_rewards_claimed: total_rewards.to_string(),
            },
        })
    }

    async fn execute_claim_command(&self, key_name: &str) -> Result<(String, u64)> {
        let output = Command::new(&self.config.chain.binary)
            .args(&[
                "tx", "distribution", "withdraw-all-rewards",
                "--from", key_name,
                "--gas", "auto",
                "--gas-adjustment", "1.3",
                "--fees", &format!("500{}", self.config.chain.denom),
                "--node", &self.config.chain.rpc_endpoint,
                "--yes",
                "--output", "json"
            ])
            .output()
            .context("Failed to execute claim command")?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Claim command failed: {}", error_msg);
        }

        let result: serde_json::Value = serde_json::from_slice(&output.stdout)
            .context("Failed to parse claim command output")?;

        let tx_hash = result["txhash"].as_str()
            .context("Failed to extract transaction hash")?
            .to_string();

        // For simplicity, return 0 for amount - would need to parse logs for actual amount
        Ok((tx_hash, 0))
    }

    fn save_snapshot(&self, snapshot: &BalanceSnapshot, filename: &str) -> Result<()> {
        let json = serde_json::to_string_pretty(snapshot)?;
        std::fs::write(filename, json)?;
        info!("Saved balance snapshot to {}", filename);
        Ok(())
    }

    fn save_claim_report(&self, report: &ClaimReport) -> Result<()> {
        let json = serde_json::to_string_pretty(report)?;
        std::fs::write("claim_tx.json", json)?;
        info!("Saved claim report to claim_tx.json");
        Ok(())
    }
}

fn setup_logging(config: &Config) -> Result<()> {
    let level = config.logging.as_ref()
        .map(|l| l.level.as_str())
        .unwrap_or("info");

    let filter = match level {
        "trace" => tracing::Level::TRACE,
        "debug" => tracing::Level::DEBUG,
        "info" => tracing::Level::INFO,
        "warn" => tracing::Level::WARN,
        "error" => tracing::Level::ERROR,
        _ => tracing::Level::INFO,
    };

    tracing_subscriber::fmt()
        .with_max_level(filter)
        .init();

    Ok(())
}

fn load_config(path: &PathBuf) -> Result<Config> {
    let config_str = std::fs::read_to_string(path)
        .with_context(|| format!("Failed to read config file: {}", path.display()))?;
    
    let mut config: Config = toml::from_str(&config_str)
        .with_context(|| format!("Failed to parse config file: {}", path.display()))?;

    // Override with environment variables if present
    if let Ok(binary) = std::env::var("DY_BINARY") {
        config.chain.binary = binary;
    }
    if let Ok(lcd) = std::env::var("DY_LCD") {
        config.chain.lcd_endpoint = lcd;
    }
    if let Ok(rpc) = std::env::var("DY_RPC") {
        config.chain.rpc_endpoint = rpc;
    }
    if let Ok(grpc) = std::env::var("DY_GRPC") {
        config.chain.grpc_endpoint = grpc;
    }
    if let Ok(denom) = std::env::var("DY_DENOM") {
        config.chain.denom = denom;
    }
    if let Ok(wait_blocks) = std::env::var("EMISSION_WAIT_BLOCKS") {
        if let Ok(blocks) = wait_blocks.parse::<u64>() {
            config.emission.wait_blocks = blocks;
        }
    }

    Ok(config)
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Load configuration
    let mut config = load_config(&args.config)?;

    // Override config with CLI args
    if let Some(wait_blocks) = args.wait_blocks {
        config.emission.wait_blocks = wait_blocks;
    }
    if args.no_claim {
        config.emission.enable_auto_claim = false;
    }

    // Setup logging
    setup_logging(&config)?;

    // Create and run collector
    let collector = EmissionCollector::new(config, args.dry_run);
    collector.run().await?;

    Ok(())
}