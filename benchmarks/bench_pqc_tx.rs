//! PQC Transaction Verification Benchmark
//!
//! Benchmarks signature verification performance for Post-Quantum Cryptography
//! algorithms in Dytallix transaction processing.

use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use std::env;
use std::time::{Instant, Duration};
use chrono::{DateTime, Utc};
use sha3::{Digest, Sha3_256};

// Import PQC functionality
use dytallix_pqc::{PQCManager, SignatureAlgorithm, KeyPair};

/// Benchmark configuration from environment variables
#[derive(Debug, Clone)]
struct BenchmarkConfig {
    tx_count: usize,
    algorithm: SignatureAlgorithm,
}

/// Benchmark results
#[derive(Debug, Clone, Serialize, Deserialize)]
struct BenchmarkResults {
    algorithm: String,
    total_txs: usize,
    total_time_ms: u64,
    avg_verify_us: f64,
    tx_per_second: f64,
    cpu_user_time_ms: Option<u64>,
    cpu_system_time_ms: Option<u64>,
    timestamp: DateTime<Utc>,
}

fn main() -> Result<()> {
    println!("🚀 Dytallix PQC Transaction Verification Benchmark");
    println!("==================================================");

    // Parse configuration from environment variables
    let config = parse_config()?;

    println!("Configuration:");
    println!("  Algorithm: {:?}", config.algorithm);
    println!("  Transaction count: {}", config.tx_count);
    println!();

    // Run benchmark
    let results = run_benchmark(&config)?;

    // Print results
    print_results(&results);

    // Save results to artifacts directory
    save_results(&results)?;

    Ok(())
}

/// Parse benchmark configuration from environment variables
fn parse_config() -> Result<BenchmarkConfig> {
    // Parse TX_COUNT (default: 10000)
    let tx_count = env::var("TX_COUNT")
        .unwrap_or_else(|_| "10000".to_string())
        .parse::<usize>()
        .map_err(|e| anyhow!("Invalid TX_COUNT: {}", e))?;

    // Parse PQC_ALGO (default: dilithium)
    let algo_str = env::var("PQC_ALGO").unwrap_or_else(|_| "dilithium".to_string());
    let algorithm = match algo_str.as_str() {
        "dilithium" => SignatureAlgorithm::Dilithium5,
        "falcon" => SignatureAlgorithm::Falcon1024,
        "sphincs" => SignatureAlgorithm::SphincsSha256128s,
        _ => return Err(anyhow!("Unsupported algorithm: {}. Use dilithium, falcon, or sphincs", algo_str)),
    };

    Ok(BenchmarkConfig {
        tx_count,
        algorithm,
    })
}

/// Run the benchmark
fn run_benchmark(config: &BenchmarkConfig) -> Result<BenchmarkResults> {
    println!("📊 Running benchmark...");

    // Get CPU usage before benchmark (Unix only)
    #[cfg(unix)]
    let cpu_before = get_cpu_usage();

    // Generate one PQC keypair
    println!("  Generating keypair...");
    let pqc_manager = PQCManager::new_with_algorithms(
        config.algorithm.clone(),
        dytallix_pqc::KeyExchangeAlgorithm::Kyber1024,
    )?;
    // Generate a fresh keypair for the selected algorithm
    let keypair = pqc_manager.generate_keypair(&config.algorithm)?;

    // Generate transaction messages and signatures
    println!("  Generating {} transactions and signatures...", config.tx_count);
    let mut messages = Vec::new();
    let mut signatures = Vec::new();

    for i in 0..config.tx_count {
        // Create transaction message
        let message = format!("tx:{}:benchmark", i);

        // Hash with SHA3-256
        let mut hasher = Sha3_256::new();
        hasher.update(message.as_bytes());
        let hash = hasher.finalize();

        // Sign the hash
        let signature = sign_with_algorithm(&config.algorithm, &keypair.secret_key, &hash)?;

        messages.push(hash.to_vec());
        signatures.push(signature);
    }

    println!("  Verifying signatures (timed)...");

    // Time the verification loop only
    let start_time = Instant::now();

    for (message, signature) in messages.iter().zip(signatures.iter()) {
        let is_valid = verify_with_algorithm(&config.algorithm, &keypair.public_key, message, signature)?;
        if !is_valid {
            return Err(anyhow!("Signature verification failed during benchmark"));
        }
    }

    let elapsed = start_time.elapsed();

    // Get CPU usage after benchmark (Unix only)
    #[cfg(unix)]
    let cpu_after = get_cpu_usage();

    // Calculate metrics
    let total_time_ms = elapsed.as_millis() as u64;
    let avg_verify_us = (elapsed.as_micros() as f64) / (config.tx_count as f64);
    let tx_per_second = (config.tx_count as f64) / elapsed.as_secs_f64();

    #[cfg(unix)]
    let (cpu_user_time_ms, cpu_system_time_ms) = match (cpu_before, cpu_after) {
        (Some(before), Some(after)) => {
            let user_diff = after.0.saturating_sub(before.0);
            let system_diff = after.1.saturating_sub(before.1);
            (Some(user_diff), Some(system_diff))
        }
        _ => (None, None),
    };

    #[cfg(not(unix))]
    let (cpu_user_time_ms, cpu_system_time_ms) = (None, None);

    Ok(BenchmarkResults {
        algorithm: format!("{:?}", config.algorithm),
        total_txs: config.tx_count,
        total_time_ms,
        avg_verify_us,
        tx_per_second,
        cpu_user_time_ms,
        cpu_system_time_ms,
        timestamp: Utc::now(),
    })
}

/// Sign with the specified algorithm
fn sign_with_algorithm(
    algorithm: &SignatureAlgorithm,
    secret_key: &[u8],
    message: &[u8],
) -> Result<Vec<u8>> {
    match algorithm {
        SignatureAlgorithm::Dilithium5 => {
            use pqcrypto_dilithium::dilithium5;
            use pqcrypto_traits::sign::{SecretKey, SignedMessage};

            let sk = dilithium5::SecretKey::from_bytes(secret_key)
                .map_err(|_| anyhow!("Invalid Dilithium secret key"))?;
            let signed_message = dilithium5::sign(message, &sk);
            Ok(signed_message.as_bytes().to_vec())
        }
        SignatureAlgorithm::Falcon1024 => {
            use pqcrypto_falcon::falcon1024;
            use pqcrypto_traits::sign::{SecretKey, SignedMessage};

            let sk = falcon1024::SecretKey::from_bytes(secret_key)
                .map_err(|_| anyhow!("Invalid Falcon secret key"))?;
            let signed_message = falcon1024::sign(message, &sk);
            Ok(signed_message.as_bytes().to_vec())
        }
        SignatureAlgorithm::SphincsSha256128s => {
            use pqcrypto_sphincsplus::sphincssha2128ssimple; // corrected
            use pqcrypto_traits::sign::{SecretKey, SignedMessage};

            let sk = sphincssha2128ssimple::SecretKey::from_bytes(secret_key)
                .map_err(|_| anyhow!("Invalid SPHINCS+ secret key"))?;
            let signed_message = sphincssha2128ssimple::sign(message, &sk);
            Ok(signed_message.as_bytes().to_vec())
        }
    }
}

/// Verify with the specified algorithm
fn verify_with_algorithm(
    algorithm: &SignatureAlgorithm,
    public_key: &[u8],
    message: &[u8],
    signature: &[u8],
) -> Result<bool> {
    match algorithm {
        SignatureAlgorithm::Dilithium5 => {
            use pqcrypto_dilithium::dilithium5;
            use pqcrypto_traits::sign::{PublicKey, SignedMessage};

            let pk = dilithium5::PublicKey::from_bytes(public_key)
                .map_err(|_| anyhow!("Invalid Dilithium public key"))?;
            let signed_message = dilithium5::SignedMessage::from_bytes(signature)
                .map_err(|_| anyhow!("Invalid Dilithium signature"))?;

            match dilithium5::open(&signed_message, &pk) {
                Ok(opened_message) => Ok(opened_message == message),
                Err(_) => Ok(false),
            }
        }
        SignatureAlgorithm::Falcon1024 => {
            use pqcrypto_falcon::falcon1024;
            use pqcrypto_traits::sign::{PublicKey, SignedMessage};

            let pk = falcon1024::PublicKey::from_bytes(public_key)
                .map_err(|_| anyhow!("Invalid Falcon public key"))?;
            let signed_message = falcon1024::SignedMessage::from_bytes(signature)
                .map_err(|_| anyhow!("Invalid Falcon signature"))?;

            match falcon1024::open(&signed_message, &pk) {
                Ok(opened_message) => Ok(opened_message == message),
                Err(_) => Ok(false),
            }
        }
        SignatureAlgorithm::SphincsSha256128s => {
            use pqcrypto_sphincsplus::sphincssha2128ssimple; // corrected
            use pqcrypto_traits::sign::{PublicKey, SignedMessage};

            let pk = sphincssha2128ssimple::PublicKey::from_bytes(public_key)
                .map_err(|_| anyhow!("Invalid SPHINCS+ public key"))?;
            let signed_message = sphincssha2128ssimple::SignedMessage::from_bytes(signature)
                .map_err(|_| anyhow!("Invalid SPHINCS+ signature"))?;

            match sphincssha2128ssimple::open(&signed_message, &pk) {
                Ok(opened_message) => Ok(opened_message == message),
                Err(_) => Ok(false),
            }
        }
    }
}

/// Get CPU usage (Unix only)
#[cfg(unix)]
fn get_cpu_usage() -> Option<(u64, u64)> {
    use nix::sys::resource::{getrusage, Usage, UsageWho};

    match getrusage(UsageWho::RUSAGE_SELF) {
        Ok(usage) => {
            let user_ms = (usage.user_time().tv_sec() * 1000) as u64 +
                         (usage.user_time().tv_usec() / 1000) as u64;
            let system_ms = (usage.system_time().tv_sec() * 1000) as u64 +
                           (usage.system_time().tv_usec() / 1000) as u64;
            Some((user_ms, system_ms))
        }
        Err(_) => None,
    }
}

/// Print benchmark results
fn print_results(results: &BenchmarkResults) {
    println!("✅ Benchmark completed!");
    println!();
    println!("Results:");
    println!("  Algorithm: {}", results.algorithm);
    println!("  Total transactions: {}", results.total_txs);
    println!("  Total time: {} ms", results.total_time_ms);
    println!("  Average verification time: {:.2} μs", results.avg_verify_us);
    println!("  Transactions per second: {:.0}", results.tx_per_second);

    if let (Some(user), Some(system)) = (results.cpu_user_time_ms, results.cpu_system_time_ms) {
        println!("  CPU user time: {} ms", user);
        println!("  CPU system time: {} ms", system);
    }

    println!("  Timestamp: {}", results.timestamp.format("%Y-%m-%d %H:%M:%S UTC"));
}

/// Save results to artifacts directory
fn save_results(results: &BenchmarkResults) -> Result<()> {
    // Create artifacts directory
    std::fs::create_dir_all("artifacts")?;

    // Save to bench_pqc.json
    let json = serde_json::to_string_pretty(results)?;
    std::fs::write("artifacts/bench_pqc.json", json)?;

    println!();
    println!("📁 Results saved to: artifacts/bench_pqc.json");

    Ok(())
}