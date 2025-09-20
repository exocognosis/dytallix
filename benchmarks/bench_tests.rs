//! Simple smoke test for the PQC benchmark to ensure basic structure works

#[cfg(test)]
mod tests {
    use serde_json;
    use std::env;

    #[derive(serde::Serialize, serde::Deserialize)]
    struct MockBenchmarkResults {
        algorithm: String,
        total_txs: usize,
        total_time_ms: u64,
        avg_verify_us: f64,
        tx_per_second: f64,
        timestamp: chrono::DateTime<chrono::Utc>,
    }

    #[test]
    fn test_benchmark_config_parsing() {
        // Test default values
        let tx_count = env::var("TX_COUNT")
            .unwrap_or_else(|_| "10000".to_string())
            .parse::<usize>()
            .unwrap();
        let algo = env::var("PQC_ALGO").unwrap_or_else(|_| "dilithium".to_string());

        assert_eq!(tx_count, 10000);
        assert_eq!(algo, "dilithium");

        // Test environment variable override
        env::set_var("TX_COUNT", "5000");
        env::set_var("PQC_ALGO", "falcon");

        let tx_count = env::var("TX_COUNT").unwrap().parse::<usize>().unwrap();
        let algo = env::var("PQC_ALGO").unwrap();

        assert_eq!(tx_count, 5000);
        assert_eq!(algo, "falcon");

        // Clean up
        env::remove_var("TX_COUNT");
        env::remove_var("PQC_ALGO");
    }

    #[test]
    fn test_benchmark_results_serialization() {
        let results = MockBenchmarkResults {
            algorithm: "Dilithium5".to_string(),
            total_txs: 1000,
            total_time_ms: 350,
            avg_verify_us: 350.0,
            tx_per_second: 2857.14,
            timestamp: chrono::Utc::now(),
        };

        // Test serialization to JSON
        let json = serde_json::to_string_pretty(&results).unwrap();
        assert!(json.contains("Dilithium5"));
        assert!(json.contains("1000"));
        assert!(json.contains("350"));

        // Test deserialization
        let parsed: MockBenchmarkResults = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.algorithm, "Dilithium5");
        assert_eq!(parsed.total_txs, 1000);

        println!("Benchmark JSON structure:\n{}", json);
    }

    #[test]
    fn test_artifacts_directory_creation() {
        // Test that we can create artifacts directory
        std::fs::create_dir_all("/tmp/test-artifacts").unwrap();

        // Test that we can write to it
        let test_content = r#"{"test": "benchmark result"}"#;
        std::fs::write("/tmp/test-artifacts/test_bench.json", test_content).unwrap();

        // Test that we can read it back
        let content = std::fs::read_to_string("/tmp/test-artifacts/test_bench.json").unwrap();
        assert!(content.contains("benchmark result"));

        // Clean up
        std::fs::remove_file("/tmp/test-artifacts/test_bench.json").unwrap();
        std::fs::remove_dir("/tmp/test-artifacts").unwrap();
    }
}
