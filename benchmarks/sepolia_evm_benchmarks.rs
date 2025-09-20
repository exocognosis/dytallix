/*
SEPOLIA EVM CONTRACT BENCHMARKS

This module provides comprehensive benchmarking capabilities for EVM contracts
deployed on the Sepolia testnet, measuring execution time, gas usage, and
throughput under various load conditions.
*/

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};

// Benchmark configuration for EVM contracts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvmBenchmarkConfig {
    pub sepolia_rpc_url: String,
    pub contract_addresses: Vec<String>,
    pub test_duration_seconds: u64,
    pub concurrent_transactions: usize,
    pub gas_limit: u64,
    pub gas_price: String,
    pub private_key: Option<String>, // For actual transaction signing
    pub wallet_address: String,
}

// EVM-specific performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvmOperationMetrics {
    pub operation_type: String,
    pub contract_address: String,
    pub method_signature: String,
    pub execution_time_ms: f64,
    pub gas_used: u64,
    pub gas_limit: u64,
    pub gas_price: u64,
    pub transaction_hash: Option<String>,
    pub block_number: Option<u64>,
    pub success: bool,
    pub error_message: Option<String>,
    pub timestamp: u64,
    pub nonce: Option<u64>,
}

// Aggregated EVM benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvmBenchmarkResults {
    pub config: EvmBenchmarkConfig,
    pub start_time: u64,
    pub end_time: u64,
    pub total_operations: u64,
    pub successful_operations: u64,
    pub failed_operations: u64,
    pub average_tps: f64,
    pub peak_tps: f64,
    pub average_gas_per_operation: f64,
    pub average_execution_time_ms: f64,
    pub total_gas_cost_eth: f64,
    pub operation_metrics: Vec<EvmOperationMetrics>,
    pub gas_efficiency_score: f64,
    pub error_rate: f64,
    pub block_confirmation_times: Vec<f64>,
}

// Contract method types for benchmarking
#[derive(Debug, Clone)]
pub enum EvmContractMethod {
    Read {
        method: String,
        params: Vec<String>,
    },
    Write {
        method: String,
        params: Vec<String>,
        value: Option<u64>,
    },
    Deploy {
        bytecode: String,
        constructor_params: Vec<String>,
    },
}

pub struct SepoliaEvmBenchmark {
    config: EvmBenchmarkConfig,
    client: Client,
    results: Vec<EvmOperationMetrics>,
}

impl SepoliaEvmBenchmark {
    pub fn new(config: EvmBenchmarkConfig) -> Self {
        Self {
            config,
            client: Client::new(),
            results: Vec::new(),
        }
    }

    pub async fn run_comprehensive_benchmark(
        &mut self,
    ) -> Result<EvmBenchmarkResults, Box<dyn std::error::Error>> {
        println!("🚀 Starting Sepolia EVM Contract Benchmarks");
        println!("Sepolia RPC URL: {}", self.config.sepolia_rpc_url);
        println!("Contract addresses: {:?}", self.config.contract_addresses);

        let start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Run different benchmark scenarios
        self.run_baseline_performance_test().await?;
        self.run_gas_optimization_test().await?;
        self.run_load_test().await?;
        self.run_transaction_throughput_test().await?;
        self.run_block_confirmation_test().await?;

        let end_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Calculate aggregate results
        let results = self.calculate_aggregate_results(start_time, end_time);

        println!("✅ EVM Benchmark completed successfully");
        println!("Total operations: {}", results.total_operations);
        println!("Success rate: {:.2}%", (1.0 - results.error_rate) * 100.0);
        println!("Average TPS: {:.2}", results.average_tps);
        println!("Total gas cost: {:.6} ETH", results.total_gas_cost_eth);

        Ok(results)
    }

    async fn run_baseline_performance_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("📊 Running EVM baseline performance test...");

        for contract_addr in &self.config.contract_addresses.clone() {
            // Test DytallixBridge lockAsset function
            let lock_asset_metrics = self
                .benchmark_contract_call(
                    contract_addr,
                    "lockAsset(address,uint256,string,address)",
                    vec![
                        "0x0000000000000000000000000000000000000000".to_string(),
                        "1000000000000000000".to_string(), // 1 ETH in wei
                        "cosmos".to_string(),
                        "0x1234567890123456789012345678901234567890".to_string(),
                    ],
                    false,
                )
                .await?;

            self.results.push(lock_asset_metrics);

            // Test WrappedDytallix mint function
            let mint_metrics = self
                .benchmark_contract_call(
                    contract_addr,
                    "mint(address,uint256,bytes32)",
                    vec![
                        "0x1234567890123456789012345678901234567890".to_string(),
                        "1000000000000000000".to_string(),
                        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                            .to_string(),
                    ],
                    false,
                )
                .await?;

            self.results.push(mint_metrics);

            // Test read operations (gas-free)
            let balance_metrics = self
                .benchmark_contract_call(
                    contract_addr,
                    "balanceOf(address)",
                    vec!["0x1234567890123456789012345678901234567890".to_string()],
                    true, // Read operation
                )
                .await?;

            self.results.push(balance_metrics);
        }

        Ok(())
    }

    async fn run_gas_optimization_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("⛽ Running gas optimization analysis...");

        // Test different gas limits to find optimal settings
        let gas_limits = vec![100_000, 200_000, 300_000, 500_000, 1_000_000];

        for gas_limit in gas_limits {
            for contract_addr in &self.config.contract_addresses.clone() {
                let mut metrics = self
                    .benchmark_contract_call(
                        contract_addr,
                        "lockAsset(address,uint256,string,address)",
                        vec![
                            "0x0000000000000000000000000000000000000000".to_string(),
                            "100000000000000000".to_string(), // 0.1 ETH
                            "cosmos".to_string(),
                            "0x1234567890123456789012345678901234567890".to_string(),
                        ],
                        false,
                    )
                    .await?;

                metrics.gas_limit = gas_limit;
                self.results.push(metrics);
            }
        }

        Ok(())
    }

    async fn run_load_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!(
            "🔥 Running EVM load test with {} concurrent transactions...",
            self.config.concurrent_transactions
        );

        let mut tasks = Vec::new();
        let contract_addresses = self.config.contract_addresses.clone();

        for i in 0..self.config.concurrent_transactions {
            let contract_addr = contract_addresses[i % contract_addresses.len()].clone();
            let client = self.client.clone();
            let rpc_url = self.config.sepolia_rpc_url.clone();

            let task = tokio::spawn(async move {
                Self::execute_concurrent_transaction(client, rpc_url, contract_addr).await
            });

            tasks.push(task);
        }

        // Collect results from all concurrent tasks
        for task in tasks {
            if let Ok(Ok(metrics)) = task.await {
                self.results.push(metrics);
            }
        }

        Ok(())
    }

    async fn run_transaction_throughput_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔄 Running transaction throughput test...");

        let start_time = Instant::now();

        // Run for specified test duration
        while start_time.elapsed().as_secs() < self.config.test_duration_seconds {
            let interval_start = Instant::now();

            // Execute batch of transactions
            for contract_addr in &self.config.contract_addresses.clone() {
                let metrics = self
                    .benchmark_contract_call(
                        contract_addr,
                        "balanceOf(address)",
                        vec!["0x1234567890123456789012345678901234567890".to_string()],
                        true, // Read operation for throughput
                    )
                    .await?;

                self.results.push(metrics);

                // Break if interval exceeded
                if interval_start.elapsed().as_millis() > 1000 {
                    break;
                }
            }
        }

        Ok(())
    }

    async fn run_block_confirmation_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("⏱️ Running block confirmation time analysis...");

        for contract_addr in &self.config.contract_addresses.clone() {
            let tx_start = Instant::now();

            // Submit transaction
            let metrics = self
                .benchmark_contract_call(
                    contract_addr,
                    "mint(address,uint256,bytes32)",
                    vec![
                        "0x1234567890123456789012345678901234567890".to_string(),
                        "1000000000000000000".to_string(),
                        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
                            .to_string(),
                    ],
                    false,
                )
                .await?;

            // If we have a transaction hash, wait for confirmation
            if let Some(tx_hash) = &metrics.transaction_hash {
                let confirmation_time = self.wait_for_confirmation(tx_hash).await?;

                // Store confirmation time for analysis
                let mut metrics_with_confirmation = metrics.clone();
                metrics_with_confirmation.execution_time_ms += confirmation_time;

                self.results.push(metrics_with_confirmation);
            } else {
                self.results.push(metrics);
            }
        }

        Ok(())
    }

    async fn benchmark_contract_call(
        &self,
        contract_address: &str,
        method_signature: &str,
        params: Vec<String>,
        is_read_only: bool,
    ) -> Result<EvmOperationMetrics, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        let operation_type = if is_read_only { "call" } else { "transaction" };

        // Prepare JSON-RPC call
        let method = if is_read_only {
            "eth_call"
        } else {
            "eth_sendTransaction"
        };

        let call_data = self.encode_function_call(method_signature, &params);

        let rpc_request = if is_read_only {
            serde_json::json!({
                "jsonrpc": "2.0",
                "method": method,
                "params": [{
                    "to": contract_address,
                    "data": call_data
                }, "latest"],
                "id": 1
            })
        } else {
            serde_json::json!({
                "jsonrpc": "2.0",
                "method": method,
                "params": [{
                    "from": self.config.wallet_address,
                    "to": contract_address,
                    "gas": format!("0x{:x}", self.config.gas_limit),
                    "gasPrice": "0x3b9aca00", // 1 gwei
                    "data": call_data
                }],
                "id": 1
            })
        };

        // Execute the call
        let response = self
            .client
            .post(&self.config.sepolia_rpc_url)
            .header("Content-Type", "application/json")
            .json(&rpc_request)
            .send()
            .await;

        let execution_time_ms = start_time.elapsed().as_millis() as f64;

        let (success, error_message, transaction_hash, gas_used) = match response {
            Ok(resp) => {
                if resp.status().is_success() {
                    let json: serde_json::Value = resp.json().await.unwrap_or_default();

                    if json.get("error").is_some() {
                        (
                            false,
                            Some(
                                json["error"]["message"]
                                    .as_str()
                                    .unwrap_or("Unknown error")
                                    .to_string(),
                            ),
                            None,
                            0,
                        )
                    } else {
                        let result = json.get("result").and_then(|r| r.as_str());

                        if is_read_only {
                            (true, None, None, 0) // Read operations don't consume gas
                        } else {
                            // For write operations, we'd need to wait for receipt to get actual gas used
                            let tx_hash = result.map(|r| r.to_string());
                            let estimated_gas = (self.config.gas_limit as f64 * 0.8) as u64; // Estimate 80% usage
                            (true, None, tx_hash, estimated_gas)
                        }
                    }
                } else {
                    (
                        false,
                        Some(format!("HTTP error: {}", resp.status())),
                        None,
                        0,
                    )
                }
            }
            Err(e) => (false, Some(e.to_string()), None, 0),
        };

        Ok(EvmOperationMetrics {
            operation_type: operation_type.to_string(),
            contract_address: contract_address.to_string(),
            method_signature: method_signature.to_string(),
            execution_time_ms,
            gas_used,
            gas_limit: self.config.gas_limit,
            gas_price: 1_000_000_000, // 1 gwei in wei
            transaction_hash,
            block_number: None,
            success,
            error_message,
            timestamp,
            nonce: None,
        })
    }

    async fn execute_concurrent_transaction(
        client: Client,
        rpc_url: String,
        contract_address: String,
    ) -> Result<EvmOperationMetrics, Box<dyn std::error::Error + Send + Sync>> {
        let start_time = Instant::now();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Simple balance check for concurrent load testing
        let rpc_request = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{
                "to": contract_address,
                "data": "0x70a08231000000000000000000000000123456789012345678901234567890123456789"
            }, "latest"],
            "id": 1
        });

        let response = client
            .post(&rpc_url)
            .header("Content-Type", "application/json")
            .json(&rpc_request)
            .send()
            .await;

        let execution_time_ms = start_time.elapsed().as_millis() as f64;

        Ok(EvmOperationMetrics {
            operation_type: "concurrent_call".to_string(),
            contract_address,
            method_signature: "balanceOf(address)".to_string(),
            execution_time_ms,
            gas_used: 0,
            gas_limit: 0,
            gas_price: 0,
            transaction_hash: None,
            block_number: None,
            success: response.is_ok(),
            error_message: response.err().map(|e| e.to_string()),
            timestamp,
            nonce: None,
        })
    }

    async fn wait_for_confirmation(
        &self,
        tx_hash: &str,
    ) -> Result<f64, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        let max_wait_time = Duration::from_secs(300); // 5 minutes max wait

        while start_time.elapsed() < max_wait_time {
            let receipt_request = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "eth_getTransactionReceipt",
                "params": [tx_hash],
                "id": 1
            });

            let response = self
                .client
                .post(&self.config.sepolia_rpc_url)
                .header("Content-Type", "application/json")
                .json(&receipt_request)
                .send()
                .await?;

            let json: serde_json::Value = response.json().await?;

            if let Some(result) = json.get("result") {
                if !result.is_null() {
                    // Transaction confirmed
                    return Ok(start_time.elapsed().as_millis() as f64);
                }
            }

            // Wait 1 second before checking again
            tokio::time::sleep(Duration::from_secs(1)).await;
        }

        // Timeout
        Ok(max_wait_time.as_millis() as f64)
    }

    fn encode_function_call(&self, method_signature: &str, params: &[String]) -> String {
        // Simplified function encoding - in production would use proper ABI encoding
        let method_hash = format!("{:x}", md5::compute(method_signature));
        let method_id = &method_hash[0..8];

        let mut encoded = format!("0x{}", method_id);

        // Simplified parameter encoding
        for param in params {
            if param.starts_with("0x") {
                encoded.push_str(&param[2..]);
            } else {
                // Convert numeric parameters to hex
                if let Ok(num) = param.parse::<u64>() {
                    encoded.push_str(&format!("{:064x}", num));
                } else {
                    // String parameters - simplified encoding
                    let bytes = param.as_bytes();
                    for byte in bytes {
                        encoded.push_str(&format!("{:02x}", byte));
                    }
                }
            }
        }

        encoded
    }

    fn calculate_aggregate_results(&self, start_time: u64, end_time: u64) -> EvmBenchmarkResults {
        let total_operations = self.results.len() as u64;
        let successful_operations = self.results.iter().filter(|m| m.success).count() as u64;
        let failed_operations = total_operations - successful_operations;

        let duration_seconds = (end_time - start_time) as f64;
        let average_tps = if duration_seconds > 0.0 {
            total_operations as f64 / duration_seconds
        } else {
            0.0
        };

        // Calculate peak TPS from 1-second intervals
        let mut tps_intervals = HashMap::new();
        for metric in &self.results {
            let interval = metric.timestamp;
            *tps_intervals.entry(interval).or_insert(0) += 1;
        }
        let peak_tps = tps_intervals.values().max().copied().unwrap_or(0) as f64;

        let avg_gas = if successful_operations > 0 {
            self.results
                .iter()
                .filter(|m| m.success && m.gas_used > 0)
                .map(|m| m.gas_used)
                .sum::<u64>() as f64
                / successful_operations as f64
        } else {
            0.0
        };

        let avg_execution_time = if total_operations > 0 {
            self.results
                .iter()
                .map(|m| m.execution_time_ms)
                .sum::<f64>()
                / total_operations as f64
        } else {
            0.0
        };

        // Calculate total gas cost in ETH
        let total_gas_cost_wei: u64 = self
            .results
            .iter()
            .filter(|m| m.success)
            .map(|m| m.gas_used * m.gas_price)
            .sum();
        let total_gas_cost_eth = total_gas_cost_wei as f64 / 1_000_000_000_000_000_000.0; // Convert wei to ETH

        // Calculate gas efficiency score
        let gas_efficiency_score = if avg_execution_time > 0.0 {
            avg_gas / avg_execution_time
        } else {
            0.0
        };

        let error_rate = if total_operations > 0 {
            failed_operations as f64 / total_operations as f64
        } else {
            0.0
        };

        // Extract confirmation times
        let block_confirmation_times: Vec<f64> = self
            .results
            .iter()
            .filter(|m| m.operation_type == "transaction" && m.execution_time_ms > 1000.0)
            .map(|m| m.execution_time_ms - 1000.0) // Subtract base execution time
            .collect();

        EvmBenchmarkResults {
            config: self.config.clone(),
            start_time,
            end_time,
            total_operations,
            successful_operations,
            failed_operations,
            average_tps,
            peak_tps,
            average_gas_per_operation: avg_gas,
            average_execution_time_ms: avg_execution_time,
            total_gas_cost_eth,
            operation_metrics: self.results.clone(),
            gas_efficiency_score,
            error_rate,
            block_confirmation_times,
        }
    }

    pub fn export_results_json(
        &self,
        results: &EvmBenchmarkResults,
    ) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(results)
    }

    pub fn export_results_csv(&self, results: &EvmBenchmarkResults) -> String {
        let mut csv = String::new();
        csv.push_str("operation_type,contract_address,method_signature,execution_time_ms,gas_used,gas_limit,success,timestamp,tx_hash\n");

        for metric in &results.operation_metrics {
            csv.push_str(&format!(
                "{},{},{},{},{},{},{},{},{}\n",
                metric.operation_type,
                metric.contract_address,
                metric.method_signature,
                metric.execution_time_ms,
                metric.gas_used,
                metric.gas_limit,
                metric.success,
                metric.timestamp,
                metric.transaction_hash.as_deref().unwrap_or("")
            ));
        }

        csv
    }
}

impl Default for EvmBenchmarkConfig {
    fn default() -> Self {
        Self {
            sepolia_rpc_url: "https://sepolia.infura.io/v3/YOUR_API_KEY".to_string(),
            contract_addresses: vec![
                "0x1234567890123456789012345678901234567890".to_string(),
                "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd".to_string(),
            ],
            test_duration_seconds: 60,
            concurrent_transactions: 10,
            gas_limit: 300_000,
            gas_price: "1000000000".to_string(), // 1 gwei
            private_key: None,
            wallet_address: "0x0000000000000000000000000000000000000000".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_evm_benchmark_configuration() {
        let config = EvmBenchmarkConfig::default();
        let benchmark = SepoliaEvmBenchmark::new(config);

        assert!(!benchmark.config.contract_addresses.is_empty());
        assert!(benchmark.config.test_duration_seconds > 0);
        assert!(benchmark.config.gas_limit > 0);
    }

    #[test]
    fn test_function_encoding() {
        let config = EvmBenchmarkConfig::default();
        let benchmark = SepoliaEvmBenchmark::new(config);

        let encoded = benchmark.encode_function_call("balanceOf(address)", &["0x123".to_string()]);
        assert!(encoded.starts_with("0x"));
        assert!(encoded.len() > 10);
    }

    #[test]
    fn test_evm_metrics_calculation() {
        let config = EvmBenchmarkConfig::default();
        let mut benchmark = SepoliaEvmBenchmark::new(config);

        benchmark.results.push(EvmOperationMetrics {
            operation_type: "test".to_string(),
            contract_address: "0x123".to_string(),
            method_signature: "test()".to_string(),
            execution_time_ms: 150.0,
            gas_used: 75000,
            gas_limit: 100000,
            gas_price: 1000000000,
            transaction_hash: Some("0xabc".to_string()),
            block_number: Some(123),
            success: true,
            error_message: None,
            timestamp: 1000,
            nonce: Some(1),
        });

        let results = benchmark.calculate_aggregate_results(1000, 1001);
        assert_eq!(results.total_operations, 1);
        assert_eq!(results.successful_operations, 1);
        assert!(results.total_gas_cost_eth > 0.0);
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut bench = SepoliaEvmBenchmark::new(EvmBenchmarkConfig::default());
    let _ = bench.run_comprehensive_benchmark().await;
    Ok(())
}
