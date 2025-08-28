//! Cross-Chain Bridge Test Orchestrator
//!
//! This module implements the test orchestrator for managing cross-chain operations,
//! bidirectional flow testing, and comprehensive monitoring of bridge functionality.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{Mutex, RwLock};
use tokio::time::{Instant, timeout};
use serde::{Deserialize, Serialize};
use crate::ai_test_generator::{GeneratedTestCase, TestOutcome, ChainTarget, TestAction};

/// Main orchestrator for cross-chain bridge testing
pub struct BridgeTestOrchestrator {
    /// Ethereum client for Sepolia testnet
    ethereum_client: Arc<EthereumClient>,
    /// Cosmos client for Osmosis
    cosmos_client: Arc<CosmosClient>,
    /// Event monitor for real-time tracking
    event_monitor: Arc<EventMonitor>,
    /// Balance tracker for verification
    balance_tracker: Arc<BalanceTracker>,
    /// Test execution results
    results: Arc<RwLock<Vec<TestExecutionResult>>>,
    /// Active test sessions
    active_sessions: Arc<Mutex<HashMap<String, TestSession>>>,
    /// Configuration
    config: OrchestratorConfig,
}

/// Configuration for the bridge orchestrator
#[derive(Debug, Clone)]
pub struct OrchestratorConfig {
    pub ethereum_rpc_url: String,
    pub cosmos_rpc_url: String,
    pub bridge_contract_address: String,
    pub cosmos_channel_id: String,
    pub default_timeout: Duration,
    pub max_concurrent_tests: usize,
    pub retry_attempts: u32,
    pub confirmation_blocks: u32,
}

/// Ethereum client for Sepolia testnet integration
pub struct EthereumClient {
    rpc_url: String,
    bridge_contract_address: String,
    current_nonce: Arc<Mutex<u64>>,
}

/// Cosmos client for Osmosis integration
pub struct CosmosClient {
    rpc_url: String,
    channel_id: String,
}

/// Real-time event monitoring system
pub struct EventMonitor {
    ethereum_events: Arc<RwLock<Vec<EthereumEvent>>>,
    cosmos_events: Arc<RwLock<Vec<CosmosEvent>>>,
    correlation_map: Arc<RwLock<HashMap<String, String>>>, // tx_hash -> related_tx_hash
}

/// Balance tracking across both chains
pub struct BalanceTracker {
    ethereum_balances: Arc<RwLock<HashMap<String, TokenBalance>>>,
    cosmos_balances: Arc<RwLock<HashMap<String, TokenBalance>>>,
    snapshots: Arc<RwLock<Vec<BalanceSnapshot>>>,
}

/// Test execution session
#[derive(Debug, Clone)]
pub struct TestSession {
    pub id: String,
    pub test_case: GeneratedTestCase,
    pub status: SessionStatus,
    pub start_time: Instant,
    pub steps_completed: usize,
    pub current_step: Option<TestStepExecution>,
    pub transaction_hashes: HashMap<ChainTarget, Vec<String>>,
    pub balance_before: BalanceSnapshot,
    pub balance_after: Option<BalanceSnapshot>,
    pub monitoring_data: MonitoringData,
}

/// Test session status
#[derive(Debug, Clone)]
pub enum SessionStatus {
    Running,
    Completed(TestOutcome),
    Failed(String),
    Timeout,
}

/// Test step execution details
#[derive(Debug, Clone)]
pub struct TestStepExecution {
    pub step_index: usize,
    pub action: TestAction,
    pub chain: ChainTarget,
    pub start_time: Instant,
    pub parameters: HashMap<String, String>,
    pub status: StepStatus,
}

/// Step execution status
#[derive(Debug, Clone)]
pub enum StepStatus {
    Running,
    Completed,
    Failed(String),
}

/// Ethereum event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthereumEvent {
    pub event_type: EthereumEventType,
    pub transaction_hash: String,
    pub block_number: u64,
    pub timestamp: u64,
    pub data: HashMap<String, String>,
}

/// Cosmos event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CosmosEvent {
    pub event_type: CosmosEventType,
    pub transaction_hash: String,
    pub block_height: u64,
    pub timestamp: u64,
    pub data: HashMap<String, String>,
}

/// Ethereum event categories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EthereumEventType {
    TokenLocked,
    TokenUnlocked,
    BridgeInitiated,
    BridgeCompleted,
    BridgeError,
}

/// Cosmos event categories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CosmosEventType {
    TokenMinted,
    TokenBurned,
    IBCPacketSent,
    IBCPacketReceived,
    IBCAcknowledgment,
    IBCError,
}

/// Token balance information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenBalance {
    pub token_address: String,
    pub balance: u64,
    pub decimals: u8,
    pub last_updated: u64,
}

/// Balance snapshot for verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceSnapshot {
    pub session_id: String,
    pub timestamp: u64,
    pub ethereum_balances: HashMap<String, TokenBalance>,
    pub cosmos_balances: HashMap<String, TokenBalance>,
}

/// Monitoring data collection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringData {
    pub gas_used: HashMap<String, u64>,
    pub transaction_times: HashMap<String, Duration>,
    pub confirmation_times: HashMap<String, Duration>,
    pub error_count: u32,
    pub retry_count: u32,
}

/// Test execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestExecutionResult {
    pub session_id: String,
    pub test_case_id: String,
    pub outcome: TestOutcome,
    pub execution_time: Duration,
    pub gas_used_total: u64,
    pub transaction_hashes: HashMap<ChainTarget, Vec<String>>,
    pub balance_verification: BalanceVerificationResult,
    pub monitoring_data: MonitoringData,
    pub error_details: Option<String>,
}

/// Balance verification result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceVerificationResult {
    pub is_balanced: bool,
    pub ethereum_delta: i64,
    pub cosmos_delta: i64,
    pub discrepancy_details: Option<String>,
}

/// Bridge flow direction
#[derive(Debug, Clone)]
pub enum BridgeFlow {
    Forward,  // Ethereum -> Cosmos (Lock -> Mint)
    Reverse,  // Cosmos -> Ethereum (Burn -> Unlock)
}

impl BridgeTestOrchestrator {
    /// Create a new bridge test orchestrator
    pub fn new(config: OrchestratorConfig) -> Self {
        let ethereum_client = Arc::new(EthereumClient::new(
            config.ethereum_rpc_url.clone(),
            config.bridge_contract_address.clone(),
        ));

        let cosmos_client = Arc::new(CosmosClient::new(
            config.cosmos_rpc_url.clone(),
            config.cosmos_channel_id.clone(),
        ));

        let event_monitor = Arc::new(EventMonitor::new());
        let balance_tracker = Arc::new(BalanceTracker::new());

        Self {
            ethereum_client,
            cosmos_client,
            event_monitor,
            balance_tracker,
            results: Arc::new(RwLock::new(Vec::new())),
            active_sessions: Arc::new(Mutex::new(HashMap::new())),
            config,
        }
    }

    /// Execute a single test case with full monitoring
    pub async fn execute_test_case(
        &self,
        test_case: GeneratedTestCase,
    ) -> Result<TestExecutionResult, Box<dyn std::error::Error>> {
        let session_id = format!("session_{}", uuid::Uuid::new_v4());
        let start_time = Instant::now();

        // Create balance snapshot before execution
        let balance_before = self.balance_tracker.create_snapshot(&session_id).await?;

        let mut session = TestSession {
            id: session_id.clone(),
            test_case: test_case.clone(),
            status: SessionStatus::Running,
            start_time,
            steps_completed: 0,
            current_step: None,
            transaction_hashes: HashMap::new(),
            balance_before: balance_before.clone(),
            balance_after: None,
            monitoring_data: MonitoringData {
                gas_used: HashMap::new(),
                transaction_times: HashMap::new(),
                confirmation_times: HashMap::new(),
                error_count: 0,
                retry_count: 0,
            },
        };

        // Register active session
        {
            let mut active_sessions = self.active_sessions.lock().await;
            active_sessions.insert(session_id.clone(), session.clone());
        }

        // Execute test steps
        let execution_result = match timeout(
            test_case.estimated_duration + Duration::from_secs(60),
            self.execute_test_steps(&mut session),
        ).await {
            Ok(result) => result,
            Err(_) => {
                session.status = SessionStatus::Timeout;
                Err("Test execution timeout".into())
            }
        };

        // Create balance snapshot after execution
        let balance_after = self.balance_tracker.create_snapshot(&session_id).await?;
        session.balance_after = Some(balance_after.clone());

        // Verify balance consistency
        let balance_verification = self.verify_balance_consistency(
            &balance_before,
            &balance_after,
            &test_case,
        ).await?;

        let execution_time = start_time.elapsed();

        let result = TestExecutionResult {
            session_id: session_id.clone(),
            test_case_id: test_case.id.clone(),
            outcome: match execution_result {
                Ok(_) => {
                    if balance_verification.is_balanced {
                        TestOutcome::Success
                    } else {
                        TestOutcome::Failure("Balance verification failed".to_string())
                    }
                },
                Err(e) => TestOutcome::Failure(e.to_string()),
            },
            execution_time,
            gas_used_total: session.monitoring_data.gas_used.values().sum(),
            transaction_hashes: session.transaction_hashes.clone(),
            balance_verification,
            monitoring_data: session.monitoring_data.clone(),
            error_details: match execution_result {
                Err(e) => Some(e.to_string()),
                _ => None,
            },
        };

        // Store result
        {
            let mut results = self.results.write().await;
            results.push(result.clone());
        }

        // Remove from active sessions
        {
            let mut active_sessions = self.active_sessions.lock().await;
            active_sessions.remove(&session_id);
        }

        Ok(result)
    }

    /// Execute bidirectional flow test (Forward + Reverse)
    pub async fn execute_bidirectional_test(
        &self,
        forward_case: GeneratedTestCase,
        reverse_case: GeneratedTestCase,
    ) -> Result<(TestExecutionResult, TestExecutionResult), Box<dyn std::error::Error>> {
        println!("🔄 Starting bidirectional flow test");

        // Execute forward flow: Ethereum -> Cosmos (Lock -> Mint)
        println!("➡️  Executing forward flow (Ethereum -> Cosmos)");
        let forward_result = self.execute_test_case(forward_case).await?;

        if !matches!(forward_result.outcome, TestOutcome::Success) {
            return Err(format!("Forward flow failed: {:?}", forward_result.outcome).into());
        }

        // Wait for settlement
        tokio::time::sleep(Duration::from_secs(10)).await;

        // Execute reverse flow: Cosmos -> Ethereum (Burn -> Unlock)
        println!("⬅️  Executing reverse flow (Cosmos -> Ethereum)");
        let reverse_result = self.execute_test_case(reverse_case).await?;

        println!("✅ Bidirectional flow test completed");

        Ok((forward_result, reverse_result))
    }

    /// Execute parallel test cases for stress testing
    pub async fn execute_parallel_tests(
        &self,
        test_cases: Vec<GeneratedTestCase>,
    ) -> Result<Vec<TestExecutionResult>, Box<dyn std::error::Error>> {
        let max_concurrent = self.config.max_concurrent_tests;
        let mut results = Vec::new();

        // Process tests in batches
        for chunk in test_cases.chunks(max_concurrent) {
            let mut handles = Vec::new();

            for test_case in chunk {
                let orchestrator_clone = self.clone_for_async();
                let test_case_clone = test_case.clone();

                let handle = tokio::spawn(async move {
                    orchestrator_clone.execute_test_case(test_case_clone).await
                });

                handles.push(handle);
            }

            // Wait for all tests in the batch to complete
            for handle in handles {
                match handle.await {
                    Ok(Ok(result)) => results.push(result),
                    Ok(Err(e)) => eprintln!("Test execution error: {}", e),
                    Err(e) => eprintln!("Task join error: {}", e),
                }
            }
        }

        Ok(results)
    }

    /// Monitor real-time events and correlate transactions
    pub async fn start_event_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let ethereum_monitor = self.event_monitor.clone();
        let cosmos_monitor = self.event_monitor.clone();
        let ethereum_client = self.ethereum_client.clone();
        let cosmos_client = self.cosmos_client.clone();

        // Start Ethereum event monitoring
        tokio::spawn(async move {
            if let Err(e) = ethereum_client.monitor_events(ethereum_monitor).await {
                eprintln!("Ethereum event monitoring error: {}", e);
            }
        });

        // Start Cosmos event monitoring
        tokio::spawn(async move {
            if let Err(e) = cosmos_client.monitor_events(cosmos_monitor).await {
                eprintln!("Cosmos event monitoring error: {}", e);
            }
        });

        Ok(())
    }

    /// Get comprehensive test report
    pub async fn generate_test_report(&self) -> TestReport {
        let results = self.results.read().await;
        let total_tests = results.len();
        let successful_tests = results.iter().filter(|r| matches!(r.outcome, TestOutcome::Success)).count();
        let failed_tests = total_tests - successful_tests;

        let total_execution_time: Duration = results.iter().map(|r| r.execution_time).sum();
        let total_gas_used: u64 = results.iter().map(|r| r.gas_used_total).sum();

        let avg_execution_time = if total_tests > 0 {
            total_execution_time / total_tests as u32
        } else {
            Duration::from_secs(0)
        };

        TestReport {
            total_tests,
            successful_tests,
            failed_tests,
            success_rate: if total_tests > 0 { successful_tests as f64 / total_tests as f64 } else { 0.0 },
            total_execution_time,
            avg_execution_time,
            total_gas_used,
            test_results: results.clone(),
        }
    }

    // Private helper methods

    async fn execute_test_steps(
        &self,
        session: &mut TestSession,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for (step_index, step) in session.test_case.scenario.steps.iter().enumerate() {
            let step_start = Instant::now();

            session.current_step = Some(TestStepExecution {
                step_index,
                action: step.action.clone(),
                chain: step.chain.clone(),
                start_time: step_start,
                parameters: step.parameters.clone(),
                status: StepStatus::Running,
            });

            let step_result = self.execute_single_step(step, session).await;

            match step_result {
                Ok(tx_hash) => {
                    if let Some(hash) = tx_hash {
                        session.transaction_hashes
                            .entry(step.chain.clone())
                            .or_insert_with(Vec::new)
                            .push(hash);
                    }
                    session.steps_completed += 1;
                },
                Err(e) => {
                    session.monitoring_data.error_count += 1;
                    return Err(e);
                }
            }

            let step_duration = step_start.elapsed();
            session.monitoring_data.transaction_times.insert(
                format!("step_{}", step_index),
                step_duration,
            );
        }

        Ok(())
    }

    async fn execute_single_step(
        &self,
        step: &crate::ai_test_generator::TestStep,
        session: &mut TestSession,
    ) -> Result<Option<String>, Box<dyn std::error::Error>> {
        match (&step.action, &step.chain) {
            (TestAction::LockTokens, ChainTarget::Ethereum) => {
                self.ethereum_client.lock_tokens(&step.parameters).await
            },
            (TestAction::UnlockTokens, ChainTarget::Ethereum) => {
                self.ethereum_client.unlock_tokens(&step.parameters).await
            },
            (TestAction::MintTokens, ChainTarget::Cosmos) => {
                self.cosmos_client.mint_tokens(&step.parameters).await
            },
            (TestAction::BurnTokens, ChainTarget::Cosmos) => {
                self.cosmos_client.burn_tokens(&step.parameters).await
            },
            (TestAction::VerifyBalance, ChainTarget::Both) => {
                self.verify_balances(&step.parameters).await?;
                Ok(None)
            },
            (TestAction::VerifyEvent, _) => {
                self.verify_events(&step.parameters).await?;
                Ok(None)
            },
            (TestAction::WaitForConfirmation, _) => {
                self.wait_for_confirmations(&step.parameters).await?;
                Ok(None)
            },
            _ => Err("Unsupported step action/chain combination".into()),
        }
    }

    async fn verify_balance_consistency(
        &self,
        before: &BalanceSnapshot,
        after: &BalanceSnapshot,
        test_case: &GeneratedTestCase,
    ) -> Result<BalanceVerificationResult, Box<dyn std::error::Error>> {
        // Implement balance verification logic
        // This is a simplified version - real implementation would be more complex

        let is_balanced = true; // TODO: Implement actual verification
        let ethereum_delta = 0; // TODO: Calculate actual delta
        let cosmos_delta = 0; // TODO: Calculate actual delta

        Ok(BalanceVerificationResult {
            is_balanced,
            ethereum_delta,
            cosmos_delta,
            discrepancy_details: None,
        })
    }

    async fn verify_balances(&self, _parameters: &HashMap<String, String>) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement balance verification
        Ok(())
    }

    async fn verify_events(&self, _parameters: &HashMap<String, String>) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement event verification
        Ok(())
    }

    async fn wait_for_confirmations(&self, _parameters: &HashMap<String, String>) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement confirmation waiting
        tokio::time::sleep(Duration::from_secs(5)).await;
        Ok(())
    }

    fn clone_for_async(&self) -> Self {
        // Create a clone suitable for async operations
        Self {
            ethereum_client: self.ethereum_client.clone(),
            cosmos_client: self.cosmos_client.clone(),
            event_monitor: self.event_monitor.clone(),
            balance_tracker: self.balance_tracker.clone(),
            results: self.results.clone(),
            active_sessions: self.active_sessions.clone(),
            config: self.config.clone(),
        }
    }
}

/// Comprehensive test report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestReport {
    pub total_tests: usize,
    pub successful_tests: usize,
    pub failed_tests: usize,
    pub success_rate: f64,
    pub total_execution_time: Duration,
    pub avg_execution_time: Duration,
    pub total_gas_used: u64,
    pub test_results: Vec<TestExecutionResult>,
}

// Implementation of client structs

impl EthereumClient {
    pub fn new(rpc_url: String, bridge_contract_address: String) -> Self {
        Self {
            rpc_url,
            bridge_contract_address,
            current_nonce: Arc::new(Mutex::new(0)),
        }
    }

    pub async fn lock_tokens(&self, parameters: &HashMap<String, String>) -> Result<Option<String>, Box<dyn std::error::Error>> {
        // TODO: Implement actual Ethereum token locking
        println!("🔒 Locking tokens on Ethereum...");
        tokio::time::sleep(Duration::from_millis(500)).await;
        Ok(Some("0x1234567890abcdef".to_string()))
    }

    pub async fn unlock_tokens(&self, parameters: &HashMap<String, String>) -> Result<Option<String>, Box<dyn std::error::Error>> {
        // TODO: Implement actual Ethereum token unlocking
        println!("🔓 Unlocking tokens on Ethereum...");
        tokio::time::sleep(Duration::from_millis(500)).await;
        Ok(Some("0xfedcba0987654321".to_string()))
    }

    pub async fn monitor_events(&self, event_monitor: Arc<EventMonitor>) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement Ethereum event monitoring
        Ok(())
    }
}

impl CosmosClient {
    pub fn new(rpc_url: String, channel_id: String) -> Self {
        Self {
            rpc_url,
            channel_id,
        }
    }

    pub async fn mint_tokens(&self, parameters: &HashMap<String, String>) -> Result<Option<String>, Box<dyn std::error::Error>> {
        // TODO: Implement actual Cosmos token minting
        println!("🪙 Minting tokens on Cosmos...");
        tokio::time::sleep(Duration::from_millis(300)).await;
        Ok(Some("cosmos_tx_hash_123".to_string()))
    }

    pub async fn burn_tokens(&self, parameters: &HashMap<String, String>) -> Result<Option<String>, Box<dyn std::error::Error>> {
        // TODO: Implement actual Cosmos token burning
        println!("🔥 Burning tokens on Cosmos...");
        tokio::time::sleep(Duration::from_millis(300)).await;
        Ok(Some("cosmos_tx_hash_456".to_string()))
    }

    pub async fn monitor_events(&self, event_monitor: Arc<EventMonitor>) -> Result<(), Box<dyn std::error::Error>> {
        // TODO: Implement Cosmos event monitoring
        Ok(())
    }
}

impl EventMonitor {
    pub fn new() -> Self {
        Self {
            ethereum_events: Arc::new(RwLock::new(Vec::new())),
            cosmos_events: Arc::new(RwLock::new(Vec::new())),
            correlation_map: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn correlate_transactions(&self, eth_hash: &str, cosmos_hash: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut correlation_map = self.correlation_map.write().await;
        correlation_map.insert(eth_hash.to_string(), cosmos_hash.to_string());
        correlation_map.insert(cosmos_hash.to_string(), eth_hash.to_string());
        Ok(())
    }
}

impl BalanceTracker {
    pub fn new() -> Self {
        Self {
            ethereum_balances: Arc::new(RwLock::new(HashMap::new())),
            cosmos_balances: Arc::new(RwLock::new(HashMap::new())),
            snapshots: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn create_snapshot(&self, session_id: &str) -> Result<BalanceSnapshot, Box<dyn std::error::Error>> {
        let ethereum_balances = self.ethereum_balances.read().await.clone();
        let cosmos_balances = self.cosmos_balances.read().await.clone();

        let snapshot = BalanceSnapshot {
            session_id: session_id.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_secs(),
            ethereum_balances,
            cosmos_balances,
        };

        let mut snapshots = self.snapshots.write().await;
        snapshots.push(snapshot.clone());

        Ok(snapshot)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai_test_generator::{AITestGenerator, ScenarioType};

    fn create_test_config() -> OrchestratorConfig {
        OrchestratorConfig {
            ethereum_rpc_url: "http://localhost:8545".to_string(),
            cosmos_rpc_url: "http://localhost:26657".to_string(),
            bridge_contract_address: "0x1234567890abcdef".to_string(),
            cosmos_channel_id: "channel-0".to_string(),
            default_timeout: Duration::from_secs(120),
            max_concurrent_tests: 5,
            retry_attempts: 3,
            confirmation_blocks: 6,
        }
    }

    #[tokio::test]
    async fn test_orchestrator_creation() {
        let config = create_test_config();
        let orchestrator = BridgeTestOrchestrator::new(config);

        // Verify orchestrator is created properly
        assert_eq!(orchestrator.config.max_concurrent_tests, 5);
    }

    #[tokio::test]
    async fn test_balance_tracker() {
        let tracker = BalanceTracker::new();
        let snapshot = tracker.create_snapshot("test_session").await;

        assert!(snapshot.is_ok());
        let snapshot = snapshot.unwrap();
        assert_eq!(snapshot.session_id, "test_session");
    }

    #[tokio::test]
    async fn test_event_monitor() {
        let monitor = EventMonitor::new();
        let result = monitor.correlate_transactions("eth_hash", "cosmos_hash").await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_ethereum_client() {
        let client = EthereumClient::new(
            "http://localhost:8545".to_string(),
            "0x1234567890abcdef".to_string(),
        );

        let mut params = HashMap::new();
        params.insert("amount".to_string(), "1000".to_string());

        let result = client.lock_tokens(&params).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_cosmos_client() {
        let client = CosmosClient::new(
            "http://localhost:26657".to_string(),
            "channel-0".to_string(),
        );

        let mut params = HashMap::new();
        params.insert("amount".to_string(), "1000".to_string());

        let result = client.mint_tokens(&params).await;
        assert!(result.is_ok());
    }
}

// UUID placeholder - in real implementation, use uuid crate
mod uuid {
    pub struct Uuid;
    impl Uuid {
        pub fn new_v4() -> String {
            format!("test-uuid-{}", std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos())
        }
    }
}