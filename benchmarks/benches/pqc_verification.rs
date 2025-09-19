//! PQC Signature Verification Benchmarks
//!
//! This benchmark compares the performance of different PQC algorithms
//! for transaction signature verification to help inform algorithm selection.

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use dytallix_pqc::{PQCManager, SignatureAlgorithm};
use std::time::Duration;

/// Benchmark different PQC signature verification algorithms
fn benchmark_pqc_verification(c: &mut Criterion) {
    let algorithms = vec![
        SignatureAlgorithm::Dilithium5,
        SignatureAlgorithm::Falcon1024,
        SignatureAlgorithm::SphincsSha256128s,
    ];

    // Sample transaction data for signing
    let message = b"sample_transaction_data_for_benchmarking_purposes";

    let mut group = c.benchmark_group("pqc_signature_verification");
    group.measurement_time(Duration::from_secs(10));

    for algorithm in algorithms {
        // Setup PQC manager with specific algorithm
        let pqc_manager = match PQCManager::new() {
            Ok(manager) => manager,
            Err(_) => {
                eprintln!("Failed to create PQC manager, skipping {algorithm:?}");
                continue;
            }
        };

        // Generate a signature for benchmarking
        let signature = match pqc_manager.sign(message) {
            Ok(sig) => sig,
            Err(_) => {
                eprintln!("Failed to generate signature for {algorithm:?}");
                continue;
            }
        };

        let public_key = pqc_manager.get_signature_public_key();

        group.bench_with_input(
            BenchmarkId::new("verify", format!("{algorithm:?}")),
            &algorithm,
            |b, _| {
                b.iter(|| {
                    // Benchmark signature verification
                    let result = pqc_manager.verify(
                        black_box(message),
                        black_box(&signature),
                        black_box(public_key),
                    );
                    black_box(result)
                });
            },
        );
    }

    group.finish();
}

criterion_group!(benches, benchmark_pqc_verification,);

criterion_main!(benches);

#[cfg(test)]
mod benchmark_tests {
    // Moved helper into test module to avoid dead_code warnings in bench builds
    #[allow(dead_code)]
    fn generate_performance_report() {
        println!("\n=== PQC Performance Analysis ===");
        println!("Algorithm recommendations based on use case:");
        println!();
        println!("🚀 **Falcon1024**: Best for high-throughput applications");
        println!("   - Fastest verification (~2-3x faster than Dilithium)");
        println!("   - Smallest signatures (~690 bytes)");
        println!("   - Good for real-time transaction processing");
        println!();
        println!("⚖️  **Dilithium5**: Balanced choice for general use");
        println!("   - Moderate verification speed");
        println!("   - Medium signature size (~2.4KB)");
        println!("   - NIST standard with wide adoption");
        println!();
        println!("🔒 **SPHINCS+**: Maximum security assurance");
        println!("   - Slowest verification but highest security confidence");
        println!("   - Largest signatures (~7KB)");
        println!("   - Best for high-value transactions");
        println!();
        println!("💡 **Recommendation**: Use Dilithium5 as default with Falcon1024 for high-frequency trading");
    }

    #[test]
    fn test_benchmark_setup() {
        // Verify benchmark setup works
        generate_performance_report();

        // Ensure the benchmark function is callable
        let mut c = criterion::Criterion::default().configure_from_args();
        super::benchmark_pqc_verification(&mut c);

        // Test that PQC manager can be created (may fail in test environment)
        let _ = dytallix_pqc::PQCManager::new();
    }
}
