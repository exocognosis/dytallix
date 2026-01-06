//! Audit Configuration Module

use anyhow::{Context, Result};
use std::fs;

#[allow(unused_imports)]
use std::path::PathBuf;

/// Configuration for the cryptographic audit
#[derive(Clone, Debug)]
pub struct AuditConfig {
    /// Path to the target codebase
    pub target_path: PathBuf,
    /// Base output directory
    pub output_path: PathBuf,
    /// Random seed for reproducibility
    pub seed: u64,
    /// Audit timestamp
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl AuditConfig {
    pub fn new(target_path: PathBuf, output_path: PathBuf, seed: u64) -> Result<Self> {
        // Validate target path exists
        if !target_path.exists() {
            tracing::warn!(
                "Target path does not exist: {}. Will perform synthetic tests only.",
                target_path.display()
            );
        }

        Ok(Self {
            target_path,
            output_path,
            seed,
            timestamp: chrono::Utc::now(),
        })
    }

    /// Create all required output directories
    pub fn create_output_dirs(&self) -> Result<()> {
        let dirs = ["logs", "metrics", "artifacts", "traces", "reports"];
        
        for dir in &dirs {
            let path = self.output_path.join(dir);
            fs::create_dir_all(&path)
                .with_context(|| format!("Failed to create directory: {}", path.display()))?;
            tracing::debug!("Created directory: {}", path.display());
        }

        Ok(())
    }

    /// Get path to logs directory
    #[allow(dead_code)]
    pub fn logs_dir(&self) -> PathBuf {
        self.output_path.join("logs")
    }

    /// Get path to metrics directory
    pub fn metrics_dir(&self) -> PathBuf {
        self.output_path.join("metrics")
    }

    /// Get path to artifacts directory
    pub fn artifacts_dir(&self) -> PathBuf {
        self.output_path.join("artifacts")
    }

    /// Get path to traces directory
    #[allow(dead_code)]
    pub fn traces_dir(&self) -> PathBuf {
        self.output_path.join("traces")
    }

    /// Get path to reports directory
    pub fn reports_dir(&self) -> PathBuf {
        self.output_path.join("reports")
    }

    /// Get the final report path
    pub fn final_report_path(&self) -> PathBuf {
        self.reports_dir().join("final_audit_report.json")
    }
}

/// NIST Security Level 3 parameters for PQC primitives
#[derive(Clone, Debug)]
pub struct SecurityParameters {
    /// ML-DSA-65 (Dilithium) parameters
    pub ml_dsa_65: MlDsa65Params,
    /// SLH-DSA-SHAKE-192s (SPHINCS+) parameters
    pub slh_dsa_shake_192s: SlhDsaParams,
    /// ML-KEM-768 (Kyber) parameters
    pub ml_kem_768: MlKemParams,
}

impl Default for SecurityParameters {
    fn default() -> Self {
        Self {
            ml_dsa_65: MlDsa65Params::default(),
            slh_dsa_shake_192s: SlhDsaParams::default(),
            ml_kem_768: MlKemParams::default(),
        }
    }
}

/// ML-DSA-65 (FIPS 204) parameters
#[derive(Clone, Debug)]
pub struct MlDsa65Params {
    pub n: usize,
    pub k: usize,
    pub l: usize,
    pub eta: usize,
    pub tau: usize,
    pub gamma1: u64,
    pub gamma2: u64,
    pub q: u64,
    pub d: usize,
    pub beta: u64,
    pub omega: usize,
    /// Classical security bits
    pub classical_security: u32,
    /// Quantum security bits
    pub quantum_security: u32,
}

impl Default for MlDsa65Params {
    fn default() -> Self {
        Self {
            n: 256,
            k: 6,
            l: 5,
            eta: 4,
            tau: 49,
            gamma1: 1 << 19,
            gamma2: (8380417 - 1) / 32,
            q: 8380417,
            d: 13,
            beta: 196,
            omega: 55,
            classical_security: 192,
            quantum_security: 128,
        }
    }
}

/// SLH-DSA-SHAKE-192s (FIPS 205) parameters
#[derive(Clone, Debug)]
pub struct SlhDsaParams {
    pub n: usize,
    pub h: usize,
    pub d: usize,
    pub hp: usize,
    pub a: usize,
    pub k: usize,
    pub w: usize,
    /// Classical security bits
    pub classical_security: u32,
    /// Quantum security bits
    pub quantum_security: u32,
}

impl Default for SlhDsaParams {
    fn default() -> Self {
        Self {
            n: 24,
            h: 63,
            d: 7,
            hp: 9,
            a: 14,
            k: 17,
            w: 16,
            classical_security: 192,
            quantum_security: 128,
        }
    }
}

/// ML-KEM-768 (FIPS 203) parameters
#[derive(Clone, Debug)]
pub struct MlKemParams {
    pub n: usize,
    pub k: usize,
    pub q: u64,
    pub eta1: usize,
    pub eta2: usize,
    pub du: usize,
    pub dv: usize,
    /// Classical security bits
    pub classical_security: u32,
    /// Quantum security bits
    pub quantum_security: u32,
}

impl Default for MlKemParams {
    fn default() -> Self {
        Self {
            n: 256,
            k: 3,
            q: 3329,
            eta1: 2,
            eta2: 2,
            du: 10,
            dv: 4,
            classical_security: 192,
            quantum_security: 128,
        }
    }
}

/// Attack cost estimation results
#[derive(Clone, Debug, serde::Serialize)]
pub struct AttackCostEstimate {
    /// Algorithm name
    pub algorithm: String,
    /// Classical attack cost (log2 operations)
    pub classical_cost_log2: f64,
    /// Quantum attack cost (log2 operations)
    pub quantum_cost_log2: f64,
    /// Best known attack
    pub best_known_attack: String,
    /// Safety margin over NIST Level 3
    pub safety_margin_bits: i32,
}
