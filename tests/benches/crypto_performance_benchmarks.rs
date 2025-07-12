//! Cryptographic Performance Testing Suite
//!
//! This module provides comprehensive performance testing for cryptographic operations
//! in the Dytallix blockchain, focusing on Post-Quantum Cryptography algorithms.
//!
//! Performance metrics include:
//! - Throughput under various load conditions
//! - Latency percentiles for critical operations
//! - Memory usage patterns and optimization opportunities
//! - Concurrency performance and scaling characteristics

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId, Throughput};
use rand::rngs::OsRng;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

/// Configuration for performance testing
#[derive(Debug, Clone)]
pub struct PerformanceTestConfig {
    /// Number of concurrent operations
    pub concurrency_levels: Vec<usize>,
    /// Duration for sustained load testing
    pub test_duration: Duration,
    /// Transaction batch sizes
    pub batch_sizes: Vec<usize>,
    /// Memory pressure levels (MB)
    pub memory_pressure_levels: Vec<usize>,
    /// Whether to include latency percentile analysis
    pub enable_percentile_analysis: bool,
}

impl Default for PerformanceTestConfig {
    fn default() -> Self {
        Self {
            concurrency_levels: vec![1, 10, 50, 100, 500],
            test_duration: Duration::from_secs(30),
            batch_sizes: vec![1, 10, 100, 1000],
            memory_pressure_levels: vec![1, 10, 100, 500], // MB
            enable_percentile_analysis: true,
        }
    }
}

/// Performance metrics for cryptographic operations
#[derive(Debug, Clone)]
pub struct CryptoPerformanceMetrics {
    /// Operations per second
    pub ops_per_second: f64,
    /// Average latency in microseconds
    pub avg_latency_us: f64,
    /// 95th percentile latency in microseconds
    pub p95_latency_us: f64,
    /// 99th percentile latency in microseconds
    pub p99_latency_us: f64,
    /// Memory usage in bytes
    pub memory_usage_bytes: usize,
    /// CPU utilization percentage
    pub cpu_utilization: f64,
    /// Success rate (0.0 to 1.0)
    pub success_rate: f64,
}

/// Represents different types of cryptographic operations
#[derive(Debug, Clone, Copy)]
pub enum CryptoOperation {
    KeyGeneration,
    Signing,
    Verification,
    FullCycle, // Key generation + signing + verification
}

impl CryptoOperation {
    pub fn name(&self) -> &'static str {
        match self {
            CryptoOperation::KeyGeneration => "key_generation",
            CryptoOperation::Signing => "signing",
            CryptoOperation::Verification => "verification",
            CryptoOperation::FullCycle => "full_cycle",
        }
    }
}

/// Mock cryptographic service for performance testing
/// TODO: Replace with actual dytallix-pqc implementations
pub struct MockCryptoService {
    algorithm: crate::gas_price_benchmarks::PQCAlgorithm,
    keys: Vec<(Vec<u8>, Vec<u8>)>, // (private_key, public_key) pairs
}

impl MockCryptoService {
    pub fn new(algorithm: crate::gas_price_benchmarks::PQCAlgorithm, pregenerated_keys: usize) -> Self {
        let mut keys = Vec::with_capacity(pregenerated_keys);
        
        for _ in 0..pregenerated_keys {
            let (private_key, public_key) = match algorithm {
                crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5 => {
                    (vec![0u8; 4864], vec![0u8; 2592])
                },
                crate::gas_price_benchmarks::PQCAlgorithm::Falcon1024 => {
                    (vec![0u8; 2305], vec![0u8; 1793])
                },
                crate::gas_price_benchmarks::PQCAlgorithm::Sphincs256 => {
                    (vec![0u8; 128], vec![0u8; 64])
                },
            };
            keys.push((private_key, public_key));
        }
        
        Self { algorithm, keys }
    }

    pub async fn perform_operation(&self, operation: CryptoOperation, data: &[u8]) -> Result<Duration, &'static str> {
        let start = Instant::now();
        
        match operation {
            CryptoOperation::KeyGeneration => {
                self.generate_key_pair().await?;
            },
            CryptoOperation::Signing => {
                if self.keys.is_empty() {
                    return Err("No keys available for signing");
                }
                self.sign_data(data, 0).await?;
            },
            CryptoOperation::Verification => {
                if self.keys.is_empty() {
                    return Err("No keys available for verification");
                }
                // First sign, then verify
                let signature = self.sign_data(data, 0).await?;
                self.verify_signature(data, &signature, 0).await?;
            },
            CryptoOperation::FullCycle => {
                let key_index = self.generate_key_pair().await?;
                let signature = self.sign_data(data, key_index).await?;
                self.verify_signature(data, &signature, key_index).await?;
            },
        }
        
        Ok(start.elapsed())
    }

    async fn generate_key_pair(&self) -> Result<usize, &'static str> {
        // Simulate key generation time based on algorithm
        let generation_time = match self.algorithm {
            crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5 => Duration::from_micros(200),
            crate::gas_price_benchmarks::PQCAlgorithm::Falcon1024 => Duration::from_micros(800),
            crate::gas_price_benchmarks::PQCAlgorithm::Sphincs256 => Duration::from_micros(100),
        };
        
        tokio::time::sleep(generation_time).await;
        Ok(0) // Return first key index for simplicity
    }

    async fn sign_data(&self, data: &[u8], key_index: usize) -> Result<Vec<u8>, &'static str> {
        if key_index >= self.keys.len() {
            return Err("Key index out of bounds");
        }
        
        // Simulate signing time
        let signing_time = match self.algorithm {
            crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5 => Duration::from_micros(50),
            crate::gas_price_benchmarks::PQCAlgorithm::Falcon1024 => Duration::from_micros(100),
            crate::gas_price_benchmarks::PQCAlgorithm::Sphincs256 => Duration::from_micros(500),
        };
        
        tokio::time::sleep(signing_time).await;
        
        // Return mock signature
        let signature_size = match self.algorithm {
            crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5 => 3906,
            crate::gas_price_benchmarks::PQCAlgorithm::Falcon1024 => 1330,
            crate::gas_price_benchmarks::PQCAlgorithm::Sphincs256 => 49856,
        };
        
        Ok(vec![0u8; signature_size])
    }

    async fn verify_signature(&self, data: &[u8], signature: &[u8], key_index: usize) -> Result<bool, &'static str> {
        if key_index >= self.keys.len() {
            return Err("Key index out of bounds");
        }
        
        // Simulate verification time
        let verification_time = match self.algorithm {
            crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5 => Duration::from_micros(30),
            crate::gas_price_benchmarks::PQCAlgorithm::Falcon1024 => Duration::from_micros(80),
            crate::gas_price_benchmarks::PQCAlgorithm::Sphincs256 => Duration::from_micros(20),
        };
        
        tokio::time::sleep(verification_time).await;
        Ok(true) // Always return success for mock
    }
}

/// Benchmark throughput for different cryptographic operations
fn benchmark_crypto_throughput(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let config = PerformanceTestConfig::default();
    
    for &batch_size in &config.batch_sizes {
        let mut group = c.benchmark_group(format!("crypto_throughput_batch_{}", batch_size));
        group.throughput(Throughput::Elements(batch_size as u64));
        
        for operation in [CryptoOperation::Signing, CryptoOperation::Verification, CryptoOperation::FullCycle] {
            group.bench_with_input(
                BenchmarkId::new(operation.name(), batch_size),
                &(operation, batch_size),
                |b, &(operation, batch_size)| {
                    b.to_async(&rt).iter_batched(
                        || {
                            let service = MockCryptoService::new(
                                crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5,
                                100
                            );
                            let data = vec![0u8; 256]; // Standard transaction size
                            (service, data)
                        },
                        |(service, data)| async move {
                            let mut tasks = Vec::with_capacity(batch_size);
                            for _ in 0..batch_size {
                                let service_ref = &service;
                                let data_ref = &data;
                                tasks.push(async move {
                                    service_ref.perform_operation(operation, data_ref).await
                                });
                            }
                            
                            let results: Vec<_> = futures::future::join_all(tasks).await;
                            black_box(results)
                        },
                        criterion::BatchSize::SmallInput,
                    );
                }
            );
        }
        group.finish();
    }
}

/// Benchmark concurrency performance
fn benchmark_crypto_concurrency(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let config = PerformanceTestConfig::default();
    
    let mut group = c.benchmark_group("crypto_concurrency");
    
    for &concurrency in &config.concurrency_levels {
        group.bench_with_input(
            BenchmarkId::new("concurrent_signing", concurrency),
            &concurrency,
            |b, &concurrency| {
                b.to_async(&rt).iter_batched(
                    || {
                        let service = Arc::new(MockCryptoService::new(
                            crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5,
                            1000
                        ));
                        let data = vec![0u8; 256];
                        let semaphore = Arc::new(Semaphore::new(concurrency));
                        (service, data, semaphore)
                    },
                    |(service, data, semaphore)| async move {
                        let mut tasks = JoinSet::new();
                        
                        for _ in 0..concurrency {
                            let service = Arc::clone(&service);
                            let data = data.clone();
                            let semaphore = Arc::clone(&semaphore);
                            
                            tasks.spawn(async move {
                                let _permit = semaphore.acquire().await.unwrap();
                                service.perform_operation(CryptoOperation::Signing, &data).await
                            });
                        }
                        
                        let mut results = Vec::new();
                        while let Some(result) = tasks.join_next().await {
                            results.push(result.unwrap());
                        }
                        
                        black_box(results)
                    },
                    criterion::BatchSize::SmallInput,
                );
            }
        );
    }
    group.finish();
}

/// Run comprehensive performance analysis
pub async fn run_performance_analysis() {
    println!("🚀 Running comprehensive cryptographic performance analysis...");
    
    let config = PerformanceTestConfig::default();
    let algorithms = [
        crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5,
        crate::gas_price_benchmarks::PQCAlgorithm::Falcon1024,
        crate::gas_price_benchmarks::PQCAlgorithm::Sphincs256,
    ];
    
    for algorithm in algorithms {
        println!("\n🔐 Testing {} performance...", algorithm.name());
        
        let service = MockCryptoService::new(algorithm, 1000);
        let data = vec![0u8; 1024];
        
        // Test different operations
        for operation in [CryptoOperation::KeyGeneration, CryptoOperation::Signing, 
                         CryptoOperation::Verification, CryptoOperation::FullCycle] {
            println!("\n  📊 Operation: {}", operation.name());
            
            let mut latencies = Vec::new();
            let mut successes = 0;
            let total_operations = 1000;
            
            let start_time = Instant::now();
            
            for _ in 0..total_operations {
                match service.perform_operation(operation, &data).await {
                    Ok(duration) => {
                        latencies.push(duration.as_micros() as f64);
                        successes += 1;
                    },
                    Err(_) => {
                        // Count as failure
                    }
                }
            }
            
            let total_duration = start_time.elapsed();
            let metrics = calculate_performance_metrics(&latencies, successes, total_operations, total_duration);
            
            print_performance_metrics(&metrics);
        }
        
        // Test concurrency performance
        println!("\n  🔄 Concurrency test...");
        await_concurrency_test(&service, &data).await;
    }
    
    println!("\n✅ Performance analysis complete!");
}

async fn await_concurrency_test(service: &MockCryptoService, data: &[u8]) {
    let concurrency_levels = [1, 10, 50, 100];
    
    for &concurrency in &concurrency_levels {
        let start_time = Instant::now();
        let mut tasks = JoinSet::new();
        
        for _ in 0..concurrency {
            let data = data.to_vec();
            tasks.spawn(async move {
                service.perform_operation(CryptoOperation::Signing, &data).await
            });
        }
        
        let mut successes = 0;
        while let Some(result) = tasks.join_next().await {
            if result.unwrap().is_ok() {
                successes += 1;
            }
        }
        
        let duration = start_time.elapsed();
        let ops_per_sec = (concurrency as f64) / duration.as_secs_f64();
        
        println!("    Concurrency {}: {:.2} ops/sec, {:.2}ms avg latency", 
                concurrency, ops_per_sec, duration.as_millis() as f64 / concurrency as f64);
    }
}

fn calculate_performance_metrics(
    latencies: &[f64], 
    successes: usize, 
    total_ops: usize, 
    total_duration: Duration
) -> CryptoPerformanceMetrics {
    let ops_per_second = successes as f64 / total_duration.as_secs_f64();
    let success_rate = successes as f64 / total_ops as f64;
    
    let avg_latency = if !latencies.is_empty() {
        latencies.iter().sum::<f64>() / latencies.len() as f64
    } else {
        0.0
    };
    
    // Calculate percentiles
    let mut sorted_latencies = latencies.to_vec();
    sorted_latencies.sort_by(|a, b| a.partial_cmp(b).unwrap());
    
    let p95_latency = if !sorted_latencies.is_empty() {
        let index = (sorted_latencies.len() as f64 * 0.95) as usize;
        sorted_latencies.get(index).copied().unwrap_or(0.0)
    } else {
        0.0
    };
    
    let p99_latency = if !sorted_latencies.is_empty() {
        let index = (sorted_latencies.len() as f64 * 0.99) as usize;
        sorted_latencies.get(index).copied().unwrap_or(0.0)
    } else {
        0.0
    };
    
    CryptoPerformanceMetrics {
        ops_per_second,
        avg_latency_us: avg_latency,
        p95_latency_us: p95_latency,
        p99_latency_us: p99_latency,
        memory_usage_bytes: 0, // TODO: Implement memory profiling
        cpu_utilization: 0.0,  // TODO: Implement CPU monitoring
        success_rate,
    }
}

fn print_performance_metrics(metrics: &CryptoPerformanceMetrics) {
    println!("    📈 Throughput: {:.2} ops/sec", metrics.ops_per_second);
    println!("    ⏱️  Average Latency: {:.2} μs", metrics.avg_latency_us);
    println!("    📊 95th Percentile: {:.2} μs", metrics.p95_latency_us);
    println!("    🎯 99th Percentile: {:.2} μs", metrics.p99_latency_us);
    println!("    ✅ Success Rate: {:.2}%", metrics.success_rate * 100.0);
}

criterion_group!(
    benches,
    benchmark_crypto_throughput,
    benchmark_crypto_concurrency
);
criterion_main!(benches);

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_crypto_service() {
        let service = MockCryptoService::new(
            crate::gas_price_benchmarks::PQCAlgorithm::Dilithium5,
            10
        );
        let data = b"test data";
        
        let result = service.perform_operation(CryptoOperation::Signing, data).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_performance_analysis() {
        // This test verifies the analysis runs without panicking
        // In a real implementation, you might want to add more specific assertions
        run_performance_analysis().await;
    }

    #[test]
    fn test_performance_metrics_calculation() {
        let latencies = vec![100.0, 200.0, 150.0, 300.0, 120.0];
        let metrics = calculate_performance_metrics(
            &latencies,
            5,
            5,
            Duration::from_millis(1000)
        );
        
        assert_eq!(metrics.success_rate, 1.0);
        assert!(metrics.ops_per_second > 0.0);
        assert!(metrics.avg_latency_us > 0.0);
    }
}