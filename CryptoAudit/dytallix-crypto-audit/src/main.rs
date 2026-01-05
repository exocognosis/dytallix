//! Dytallix Cryptographic Audit Execution Script
//! 
//! A production-ready, deterministic audit tool for the Dytallix protocol.
//! Performs comprehensive cryptographic analysis and generates verifiable evidence.

mod config;
mod evidence;
mod report;
mod tests;

use anyhow::Result;
use chrono::Utc;
use clap::Parser;
use std::path::PathBuf;
use std::sync::Arc;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::config::AuditConfig;
use crate::evidence::EvidenceCollector;
use crate::report::ReportGenerator;

/// Dytallix Cryptographic Audit Execution Script
#[derive(Parser, Debug)]
#[command(name = "dytallix-audit")]
#[command(author = "Dytallix Security Team")]
#[command(version = "1.0.0")]
#[command(about = "Production-ready cryptographic audit for Dytallix protocol")]
struct Args {
    /// Path to the target codebase to audit
    #[arg(short, long, default_value = "/Users/rickglenn/Desktop/dytallix/dytallix-fast-launch")]
    target: PathBuf,

    /// Output directory for all audit artifacts
    #[arg(short, long, default_value = "/Users/rickglenn/Desktop/dytallix/CryptoAudit/01052026Audit")]
    output: PathBuf,

    /// Random seed for reproducibility (default: fixed seed)
    #[arg(short, long, default_value = "20260105")]
    seed: u64,

    /// Verbose output
    #[arg(short, long, default_value = "false")]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logging
    let log_level = if args.verbose { Level::DEBUG } else { Level::INFO };
    let subscriber = FmtSubscriber::builder()
        .with_max_level(log_level)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("╔════════════════════════════════════════════════════════════════╗");
    info!("║     DYTALLIX CRYPTOGRAPHIC AUDIT EXECUTION SCRIPT v1.0.0      ║");
    info!("╠════════════════════════════════════════════════════════════════╣");
    info!("║  Target:  {:54} ║", args.target.display());
    info!("║  Output:  {:54} ║", args.output.display());
    info!("║  Seed:    {:54} ║", args.seed);
    info!("║  Started: {:54} ║", Utc::now().format("%Y-%m-%d %H:%M:%S UTC"));
    info!("╚════════════════════════════════════════════════════════════════╝");

    // Initialize configuration
    let config = AuditConfig::new(args.target.clone(), args.output.clone(), args.seed)?;
    
    // Create output directories
    config.create_output_dirs()?;

    // Initialize evidence collector
    let evidence = Arc::new(EvidenceCollector::new(config.clone()));

    // Execute all audit test suites
    info!("\n[PHASE 1/7] Mathematical & Parameter Validation");
    tests::crypto_primitives::run_all(&config, evidence.clone()).await?;

    info!("\n[PHASE 2/7] Algorithmic Cryptanalysis");
    tests::cryptanalysis::run_all(&config, evidence.clone()).await?;

    info!("\n[PHASE 3/7] Protocol-Level Analysis");
    tests::protocol::run_all(&config, evidence.clone()).await?;

    info!("\n[PHASE 4/7] Side-Channel Analysis");
    tests::side_channel::run_all(&config, evidence.clone()).await?;

    info!("\n[PHASE 5/7] Fault Injection Simulation");
    tests::fault_injection::run_all(&config, evidence.clone()).await?;

    info!("\n[PHASE 6/7] Randomness & Determinism");
    tests::randomness::run_all(&config, evidence.clone()).await?;

    info!("\n[PHASE 7/7] Economic-Cryptographic Invariants");
    tests::economic::run_all(&config, evidence.clone()).await?;

    // Generate final report
    info!("\n[REPORT] Generating final audit report...");
    let report = ReportGenerator::new(config.clone(), evidence);
    report.generate_final_report().await?;

    info!("\n╔════════════════════════════════════════════════════════════════╗");
    info!("║               AUDIT EXECUTION COMPLETE                         ║");
    info!("╠════════════════════════════════════════════════════════════════╣");
    info!("║  Report: {}/reports/final_audit_report.json", args.output.display());
    info!("╚════════════════════════════════════════════════════════════════╝");

    Ok(())
}
