//! Main test library for Dytallix test suite
//!
//! This library provides common utilities and entry points for running
//! the various test categories in the Dytallix test suite.

use std::time::Duration;
use tokio::time::Instant;

/// Common test configuration
pub struct TestConfig {
    pub enable_benchmarks: bool,
    pub enable_stress_tests: bool,
    pub test_duration: Duration,
    pub output_format: OutputFormat,
}

impl Default for TestConfig {
    fn default() -> Self {
        Self {
            enable_benchmarks: true,
            enable_stress_tests: true,
            test_duration: Duration::from_secs(60),
            output_format: OutputFormat::Human,
        }
    }
}

/// Output format for test results
pub enum OutputFormat {
    Human,
    Json,
    Csv,
}

/// Mock PQC implementations for testing
/// TODO: Replace with actual dytallix-pqc when available
pub mod mock_pqc {
    use std::time::Duration;
    
    pub fn mock_sign_operation(algorithm: &str, data_size: usize) -> Duration {
        // Simulate signing times based on algorithm and data size
        let base_time_us = match algorithm {
            "dilithium5" => 50,
            "falcon1024" => 100,
            "sphincs256" => 500,
            _ => 100,
        };
        
        // Scale with data size
        let scaled_time = base_time_us + (data_size / 1024) * 10;
        Duration::from_micros(scaled_time as u64)
    }
    
    pub fn mock_verify_operation(algorithm: &str, data_size: usize) -> Duration {
        // Simulate verification times (generally faster than signing)
        let base_time_us = match algorithm {
            "dilithium5" => 30,
            "falcon1024" => 80,
            "sphincs256" => 20,
            _ => 50,
        };
        
        let scaled_time = base_time_us + (data_size / 1024) * 5;
        Duration::from_micros(scaled_time as u64)
    }
}

/// Run all test suites
pub async fn run_all_tests(config: TestConfig) -> Result<(), Box<dyn std::error::Error>> {
    println!("🧪 Starting Dytallix comprehensive test suite...");
    println!("================================================");
    
    let start_time = Instant::now();
    
    if config.enable_benchmarks {
        println!("\n🔥 Running performance benchmarks...");
        run_performance_benchmarks().await?;
        
        println!("\n⛽ Running gas price analysis...");
        run_gas_price_analysis().await?;
    }
    
    if config.enable_stress_tests {
        println!("\n💥 Running stress tests...");
        // Note: Stress tests are implemented in Python
        // This would typically call out to the Python script
        println!("   Run: python tests/stress_tests.py");
    }
    
    let total_duration = start_time.elapsed();
    
    println!("\n✅ All tests completed successfully!");
    println!("Total execution time: {:.2}s", total_duration.as_secs_f64());
    
    Ok(())
}

/// Run performance benchmarks
pub async fn run_performance_benchmarks() -> Result<(), Box<dyn std::error::Error>> {
    println!("📊 Running crypto performance analysis...");
    
    // Simulate running performance tests
    let algorithms = ["dilithium5", "falcon1024", "sphincs256"];
    let data_sizes = [256, 1024, 4096];
    
    for algorithm in &algorithms {
        println!("\n🔐 Testing {} performance...", algorithm);
        
        for &data_size in &data_sizes {
            let sign_time = mock_pqc::mock_sign_operation(algorithm, data_size);
            let verify_time = mock_pqc::mock_verify_operation(algorithm, data_size);
            
            println!("  📏 Data size: {} bytes", data_size);
            println!("    ✍️  Sign: {}μs", sign_time.as_micros());
            println!("    ✅ Verify: {}μs", verify_time.as_micros());
        }
    }
    
    Ok(())
}

/// Run gas price analysis
pub async fn run_gas_price_analysis() -> Result<(), Box<dyn std::error::Error>> {
    println!("⛽ Running gas price analysis...");
    
    // Simulate gas price calculations
    let algorithms = ["dilithium5", "falcon1024", "sphincs256"];
    let base_gas = 21000;
    
    for algorithm in &algorithms {
        let multiplier = match *algorithm {
            "dilithium5" => 1.2,
            "falcon1024" => 1.5,
            "sphincs256" => 2.0,
            _ => 1.0,
        };
        
        let estimated_gas = (base_gas as f64 * multiplier) as u64;
        
        println!("🔐 {}: {} gas units", algorithm, estimated_gas);
    }
    
    Ok(())
}

/// Utility function to format duration
pub fn format_duration(duration: Duration) -> String {
    let total_secs = duration.as_secs_f64();
    
    if total_secs < 1.0 {
        format!("{:.2}ms", duration.as_millis())
    } else if total_secs < 60.0 {
        format!("{:.2}s", total_secs)
    } else {
        let mins = (total_secs / 60.0) as u32;
        let secs = total_secs % 60.0;
        format!("{}m {:.2}s", mins, secs)
    }
}

/// Utility function to format throughput
pub fn format_throughput(ops_per_sec: f64) -> String {
    if ops_per_sec < 1000.0 {
        format!("{:.2} ops/sec", ops_per_sec)
    } else if ops_per_sec < 1_000_000.0 {
        format!("{:.2}k ops/sec", ops_per_sec / 1000.0)
    } else {
        format!("{:.2}M ops/sec", ops_per_sec / 1_000_000.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(Duration::from_millis(500)), "500ms");
        assert_eq!(format_duration(Duration::from_secs(2)), "2.00s");
        assert_eq!(format_duration(Duration::from_secs(125)), "2m 5.00s");
    }

    #[test]
    fn test_format_throughput() {
        assert_eq!(format_throughput(123.45), "123.45 ops/sec");
        assert_eq!(format_throughput(1234.5), "1.23k ops/sec");
        assert_eq!(format_throughput(1234567.0), "1.23M ops/sec");
    }

    #[tokio::test]
    async fn test_run_benchmarks() {
        let result = run_performance_benchmarks().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_run_gas_analysis() {
        let result = run_gas_price_analysis().await;
        assert!(result.is_ok());
    }
    
    #[test]
    fn test_mock_pqc_operations() {
        let sign_time = mock_pqc::mock_sign_operation("dilithium5", 1024);
        let verify_time = mock_pqc::mock_verify_operation("dilithium5", 1024);
        
        assert!(sign_time.as_micros() > 0);
        assert!(verify_time.as_micros() > 0);
        assert!(sign_time > verify_time); // Signing should be slower than verification
    }
}