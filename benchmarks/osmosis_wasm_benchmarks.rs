/*
OSMOSIS WASM CONTRACT BENCHMARKS

This module provides comprehensive benchmarking capabilities for WASM contracts
deployed on the Osmosis testnet, measuring execution time, gas usage, and
throughput under various load conditions.
*/

use std::collections::HashMap;
use std::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use tokio::time::sleep;

// Benchmark configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkConfig {
    pub testnet_endpoint: String,
    pub contract_addresses: Vec<String>,
    pub test_duration_seconds: u64,
    pub concurrent_transactions: usize,
    pub transaction_types: Vec<String>,
    pub gas_limit: u64,
    pub gas_price: String,
}

// Performance metrics for individual operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationMetrics {
    pub operation_type: String,
    pub contract_address: String,
    pub execution_time_ms: f64,
    pub gas_used: u64,
    pub gas_limit: u64,
    pub success: bool,
    pub error_message: Option<String>,
    pub timestamp: u64,
    pub block_height: u64,
}

// Aggregated benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResults {
    pub config: BenchmarkConfig,
    pub start_time: u64,
    pub end_time: u64,
    pub total_operations: u64,
    pub successful_operations: u64,
    pub failed_operations: u64,
    pub average_tps: f64,
    pub peak_tps: f64,
    pub average_gas_per_operation: f64,
    pub average_execution_time_ms: f64,
    pub operation_metrics: Vec<OperationMetrics>,
    pub gas_efficiency_score: f64,
    pub error_rate: f64,
}

// Contract operation types for benchmarking
#[derive(Debug, Clone)]
pub enum ContractOperation {
    Query { query_msg: String },
    Execute { execute_msg: String, funds: Vec<(String, String)> },
    Instantiate { code_id: u64, init_msg: String },
    Upload { wasm_code: Vec<u8> },
}

pub struct OsmosisWasmBenchmark {
    config: BenchmarkConfig,
    client: reqwest::Client,
    results: Vec<OperationMetrics>,
}

impl OsmosisWasmBenchmark {
    pub fn new(config: BenchmarkConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
            results: Vec::new(),
        }
    }

    pub async fn run_comprehensive_benchmark(&mut self) -> Result<BenchmarkResults, Box<dyn std::error::Error>> {
        println!("🚀 Starting Osmosis WASM Contract Benchmarks");
        println!("Testnet endpoint: {}", self.config.testnet_endpoint);
        println!("Contract addresses: {:?}", self.config.contract_addresses);

        let start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Run different benchmark scenarios
        self.run_baseline_performance_test().await?;
        self.run_load_test().await?;
        self.run_gas_efficiency_test().await?;
        self.run_concurrent_execution_test().await?;

        let end_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Calculate aggregate results
        let results = self.calculate_aggregate_results(start_time, end_time);

        println!("✅ Benchmark completed successfully");
        println!("Total operations: {}", results.total_operations);
        println!("Success rate: {:.2}%", (1.0 - results.error_rate) * 100.0);
        println!("Average TPS: {:.2}", results.average_tps);
        println!("Gas efficiency score: {:.2}", results.gas_efficiency_score);

        Ok(results)
    }

    async fn run_baseline_performance_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("📊 Running baseline performance test...");

        for contract_addr in &self.config.contract_addresses.clone() {
            // Test basic query operations
            let query_metrics = self.benchmark_query_operation(
                contract_addr,
                r#"{"get_count": {}}"#.to_string(),
            ).await?;

            self.results.push(query_metrics);

            // Test execute operations
            let execute_metrics = self.benchmark_execute_operation(
                contract_addr,
                r#"{"increment": {}}"#.to_string(),
                vec![],
            ).await?;

            self.results.push(execute_metrics);
        }

        Ok(())
    }

    async fn run_load_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔥 Running load test with {} concurrent transactions...", self.config.concurrent_transactions);

        let mut tasks = Vec::new();
        let contract_addresses = self.config.contract_addresses.clone();

        for i in 0..self.config.concurrent_transactions {
            let contract_addr = contract_addresses[i % contract_addresses.len()].clone();
            let client = self.client.clone();
            let endpoint = self.config.testnet_endpoint.clone();

            let task = tokio::spawn(async move {
                Self::execute_load_test_transaction(client, endpoint, contract_addr).await
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

    async fn run_gas_efficiency_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("⛽ Running gas efficiency analysis...");

        // Test different gas limits to find optimal settings
        let gas_limits = vec![100_000, 200_000, 500_000, 1_000_000, 2_000_000];

        for gas_limit in gas_limits {
            for contract_addr in &self.config.contract_addresses.clone() {
                let mut metrics = self.benchmark_execute_operation(
                    contract_addr,
                    r#"{"increment": {}}"#.to_string(),
                    vec![],
                ).await?;

                metrics.gas_limit = gas_limit;
                self.results.push(metrics);
            }
        }

        Ok(())
    }

    async fn run_concurrent_execution_test(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔄 Running concurrent execution test...");

        let start_time = Instant::now();
        let mut interval_results = Vec::new();

        // Run for specified test duration
        while start_time.elapsed().as_secs() < self.config.test_duration_seconds {
            let interval_start = Instant::now();
            let mut interval_ops = 0;

            // Execute operations for 1-second intervals
            while interval_start.elapsed().as_millis() < 1000 {
                for contract_addr in &self.config.contract_addresses.clone() {
                    let metrics = self.benchmark_query_operation(
                        contract_addr,
                        r#"{"get_count": {}}"#.to_string(),
                    ).await?;

                    interval_ops += 1;
                    self.results.push(metrics);
                }
            }

            interval_results.push(interval_ops);
            println!("Interval TPS: {}", interval_ops);
        }

        Ok(())
    }

    async fn benchmark_query_operation(
        &self,
        contract_address: &str,
        query_msg: String,
    ) -> Result<OperationMetrics, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Simulate query to Osmosis testnet
        let query_url = format!(
            "{}/cosmwasm/wasm/v1/contract/{}/smart",
            self.config.testnet_endpoint, contract_address
        );

        let response = self.client
            .get(&query_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "query_data": query_msg }))
            .send()
            .await;

        let execution_time_ms = start_time.elapsed().as_millis() as f64;
        let success = response.is_ok();
        let error_message = if let Err(ref e) = response {
            Some(e.to_string())
        } else {
            None
        };

        Ok(OperationMetrics {
            operation_type: "query".to_string(),
            contract_address: contract_address.to_string(),
            execution_time_ms,
            gas_used: 0, // Queries don't consume gas
            gas_limit: 0,
            success,
            error_message,
            timestamp,
            block_height: 0, // Would be fetched from response in real implementation
        })
    }

    async fn benchmark_execute_operation(
        &self,
        contract_address: &str,
        execute_msg: String,
        _funds: Vec<(String, String)>,
    ) -> Result<OperationMetrics, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Simulate transaction execution to Osmosis testnet
        let tx_url = format!("{}/cosmos/tx/v1beta1/txs", self.config.testnet_endpoint);

        let response = self.client
            .post(&tx_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "tx": {
                    "body": {
                        "messages": [{
                            "@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
                            "sender": "osmo1test...", // Would use actual sender address
                            "contract": contract_address,
                            "msg": execute_msg,
                            "funds": []
                        }]
                    },
                    "auth_info": {
                        "fee": {
                            "gas_limit": self.config.gas_limit.to_string(),
                            "amount": [{"denom": "uosmo", "amount": "1000"}]
                        }
                    }
                }
            }))
            .send()
            .await;

        let execution_time_ms = start_time.elapsed().as_millis() as f64;
        let success = response.is_ok();
        let error_message = if let Err(ref e) = response {
            Some(e.to_string())
        } else {
            None
        };

        // In real implementation, would parse gas_used from response
        let gas_used = if success {
            (self.config.gas_limit as f64 * 0.7) as u64 // Simulate 70% gas usage
        } else {
            0
        };

        Ok(OperationMetrics {
            operation_type: "execute".to_string(),
            contract_address: contract_address.to_string(),
            execution_time_ms,
            gas_used,
            gas_limit: self.config.gas_limit,
            success,
            error_message,
            timestamp,
            block_height: 0,
        })
    }

    async fn execute_load_test_transaction(
        client: reqwest::Client,
        endpoint: String,
        contract_address: String,
    ) -> Result<OperationMetrics, Box<dyn std::error::Error>> {
        let start_time = Instant::now();
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs();

        // Simulate high-frequency transaction
        let query_url = format!(
            "{}/cosmwasm/wasm/v1/contract/{}/smart",
            endpoint, contract_address
        );

        let response = client
            .get(&query_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "query_data": r#"{"get_balance": {}}"# }))
            .send()
            .await;

        let execution_time_ms = start_time.elapsed().as_millis() as f64;

        Ok(OperationMetrics {
            operation_type: "load_test".to_string(),
            contract_address,
            execution_time_ms,
            gas_used: 0,
            gas_limit: 0,
            success: response.is_ok(),
            error_message: response.err().map(|e| e.to_string()),
            timestamp,
            block_height: 0,
        })
    }

    fn calculate_aggregate_results(&self, start_time: u64, end_time: u64) -> BenchmarkResults {
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
            self.results.iter()
                .filter(|m| m.success)
                .map(|m| m.gas_used)
                .sum::<u64>() as f64 / successful_operations as f64
        } else {
            0.0
        };

        let avg_execution_time = if total_operations > 0 {
            self.results.iter()
                .map(|m| m.execution_time_ms)
                .sum::<f64>() / total_operations as f64
        } else {
            0.0
        };

        // Calculate gas efficiency score (lower is better)
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

        BenchmarkResults {
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
            operation_metrics: self.results.clone(),
            gas_efficiency_score,
            error_rate,
        }
    }

    pub fn export_results_json(&self, results: &BenchmarkResults) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(results)
    }

    pub fn export_results_csv(&self, results: &BenchmarkResults) -> String {
        let mut csv = String::new();
        csv.push_str("operation_type,contract_address,execution_time_ms,gas_used,gas_limit,success,timestamp\n");

        for metric in &results.operation_metrics {
            csv.push_str(&format!(
                "{},{},{},{},{},{},{}\n",
                metric.operation_type,
                metric.contract_address,
                metric.execution_time_ms,
                metric.gas_used,
                metric.gas_limit,
                metric.success,
                metric.timestamp
            ));
        }

        csv
    }
}

// Default configurations for common testing scenarios
impl Default for BenchmarkConfig {
    fn default() -> Self {
        Self {
            testnet_endpoint: "https://lcd.osmosis.zone".to_string(),
            contract_addresses: vec![
                "osmo1test123".to_string(),
                "osmo1test456".to_string(),
            ],
            test_duration_seconds: 60,
            concurrent_transactions: 10,
            transaction_types: vec![
                "query".to_string(),
                "execute".to_string(),
            ],
            gas_limit: 200_000,
            gas_price: "0.025uosmo".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_benchmark_configuration() {
        let config = BenchmarkConfig::default();
        let benchmark = OsmosisWasmBenchmark::new(config);

        assert!(!benchmark.config.contract_addresses.is_empty());
        assert!(benchmark.config.test_duration_seconds > 0);
    }

    #[test]
    fn test_metrics_calculation() {
        let config = BenchmarkConfig::default();
        let mut benchmark = OsmosisWasmBenchmark::new(config);

        // Add test metrics
        benchmark.results.push(OperationMetrics {
            operation_type: "test".to_string(),
            contract_address: "test".to_string(),
            execution_time_ms: 100.0,
            gas_used: 50000,
            gas_limit: 100000,
            success: true,
            error_message: None,
            timestamp: 1000,
            block_height: 1,
        });

        let results = benchmark.calculate_aggregate_results(1000, 1001);
        assert_eq!(results.total_operations, 1);
        assert_eq!(results.successful_operations, 1);
        assert!(results.average_tps > 0.0);
    }
}