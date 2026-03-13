#!/usr/bin/env rust
//! Test runner for Dytallix test suite
//!
//! This binary provides a command-line interface for running the various
//! test categories in the Dytallix blockchain test suite.

use clap::{Arg, Command};
use dytallix_tests::{run_all_tests, run_gas_price_analysis, run_performance_benchmarks, TestConfig, OutputFormat};
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let matches = Command::new("dytallix-test-runner")
        .version("0.1.0")
        .author("Dytallix Team")
        .about("Comprehensive test suite for Dytallix blockchain")
        .arg(
            Arg::new("benchmarks")
                .long("benchmarks")
                .short('b')
                .help("Run performance benchmarks")
                .action(clap::ArgAction::SetTrue)
        )
        .arg(
            Arg::new("gas-analysis")
                .long("gas-analysis")
                .short('g')
                .help("Run gas price analysis")
                .action(clap::ArgAction::SetTrue)
        )
        .arg(
            Arg::new("stress-tests")
                .long("stress-tests")
                .short('s')
                .help("Run stress tests")
                .action(clap::ArgAction::SetTrue)
        )
        .arg(
            Arg::new("all")
                .long("all")
                .short('a')
                .help("Run all test categories")
                .action(clap::ArgAction::SetTrue)
        )
        .arg(
            Arg::new("duration")
                .long("duration")
                .short('d')
                .value_name("SECONDS")
                .help("Test duration in seconds")
                .default_value("60")
        )
        .arg(
            Arg::new("output")
                .long("output")
                .short('o')
                .value_name("FORMAT")
                .help("Output format: human, json, csv")
                .default_value("human")
        )
        .get_matches();

    // Parse command line arguments
    let run_benchmarks = matches.get_flag("benchmarks");
    let run_gas_analysis_only = matches.get_flag("gas-analysis");
    let run_stress_tests = matches.get_flag("stress-tests");
    let run_all = matches.get_flag("all");

    let duration = matches.get_one::<String>("duration")
        .unwrap()
        .parse::<u64>()?;

    let output_format = match matches.get_one::<String>("output").unwrap().as_str() {
        "json" => OutputFormat::Json,
        "csv" => OutputFormat::Csv,
        _ => OutputFormat::Human,
    };

    // Create test configuration
    let config = TestConfig {
        enable_benchmarks: run_benchmarks || run_all,
        enable_stress_tests: run_stress_tests || run_all,
        test_duration: Duration::from_secs(duration),
        output_format,
    };

    // Run the requested tests
    if run_all {
        run_all_tests(config).await?;
    } else if run_benchmarks {
        run_performance_benchmarks().await?;
    } else if run_gas_analysis_only {
        run_gas_price_analysis().await?;
    } else if run_stress_tests {
        println!("🚀 To run stress tests, use:");
        println!("cd tests && python stress_tests.py --help");
    } else {
        // Default: run all tests
        run_all_tests(config).await?;
    }

    Ok(())
}