//! Evidence Collection Module
//! 
//! Collects and stores all audit evidence with cryptographic verification.

use anyhow::Result;
use blake3::Hasher;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
#[allow(unused_imports)]
use std::path::PathBuf;
use std::sync::Mutex;

use crate::config::AuditConfig;

/// Test verdict
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Verdict {
    Pass,
    Warn,
    Fail,
}

impl std::fmt::Display for Verdict {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Verdict::Pass => write!(f, "PASS"),
            Verdict::Warn => write!(f, "WARN"),
            Verdict::Fail => write!(f, "FAIL"),
        }
    }
}

/// Individual test result evidence
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TestEvidence {
    /// Unique test identifier
    pub test_id: String,
    /// Category of the test
    pub category: String,
    /// Assumption being tested
    pub assumption: String,
    /// Test verdict
    pub verdict: Verdict,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
    /// Execution time in milliseconds
    pub execution_time_ms: u64,
    /// Reproduction seed
    pub reproduction_seed: u64,
    /// Hash of test artifacts
    pub artifact_hash: String,
    /// Detailed findings
    pub findings: Vec<String>,
    /// Metrics collected
    pub metrics: HashMap<String, f64>,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
}

impl TestEvidence {
    pub fn new(test_id: impl Into<String>, category: impl Into<String>) -> Self {
        Self {
            test_id: test_id.into(),
            category: category.into(),
            assumption: String::new(),
            verdict: Verdict::Pass,
            confidence: 1.0,
            execution_time_ms: 0,
            reproduction_seed: 0,
            artifact_hash: String::new(),
            findings: Vec::new(),
            metrics: HashMap::new(),
            timestamp: Utc::now(),
        }
    }

    pub fn with_assumption(mut self, assumption: impl Into<String>) -> Self {
        self.assumption = assumption.into();
        self
    }

    pub fn with_verdict(mut self, verdict: Verdict) -> Self {
        self.verdict = verdict;
        self
    }

    pub fn with_confidence(mut self, confidence: f64) -> Self {
        self.confidence = confidence.clamp(0.0, 1.0);
        self
    }

    pub fn with_execution_time(mut self, ms: u64) -> Self {
        self.execution_time_ms = ms;
        self
    }

    pub fn with_seed(mut self, seed: u64) -> Self {
        self.reproduction_seed = seed;
        self
    }

    pub fn with_finding(mut self, finding: impl Into<String>) -> Self {
        self.findings.push(finding.into());
        self
    }

    pub fn with_metric(mut self, key: impl Into<String>, value: f64) -> Self {
        self.metrics.insert(key.into(), value);
        self
    }

    pub fn compute_artifact_hash(&mut self, data: &[u8]) {
        let hash = blake3::hash(data);
        self.artifact_hash = hex::encode(hash.as_bytes());
    }
}

/// Evidence collector for the entire audit
pub struct EvidenceCollector {
    config: AuditConfig,
    evidence: Mutex<Vec<TestEvidence>>,
    artifact_hashes: Mutex<HashMap<String, String>>,
}

impl EvidenceCollector {
    pub fn new(config: AuditConfig) -> Self {
        Self {
            config,
            evidence: Mutex::new(Vec::new()),
            artifact_hashes: Mutex::new(HashMap::new()),
        }
    }

    /// Add test evidence
    pub fn add_evidence(&self, evidence: TestEvidence) {
        let mut evidence_lock = self.evidence.lock().unwrap();
        
        // Log the verdict
        match evidence.verdict {
            Verdict::Pass => tracing::info!(
                "  ✓ [{}] {} - PASS (confidence: {:.1}%)",
                evidence.test_id,
                evidence.assumption,
                evidence.confidence * 100.0
            ),
            Verdict::Warn => tracing::warn!(
                "  ⚠ [{}] {} - WARN (confidence: {:.1}%)",
                evidence.test_id,
                evidence.assumption,
                evidence.confidence * 100.0
            ),
            Verdict::Fail => tracing::error!(
                "  ✗ [{}] {} - FAIL (confidence: {:.1}%)",
                evidence.test_id,
                evidence.assumption,
                evidence.confidence * 100.0
            ),
        }

        evidence_lock.push(evidence);
    }

    /// Save artifact to disk and return hash
    pub fn save_artifact(&self, name: &str, data: &[u8]) -> Result<String> {
        let path = self.config.artifacts_dir().join(name);
        let mut file = File::create(&path)?;
        file.write_all(data)?;

        let hash = blake3::hash(data);
        let hash_hex = hex::encode(hash.as_bytes());

        let mut hashes = self.artifact_hashes.lock().unwrap();
        hashes.insert(name.to_string(), hash_hex.clone());

        Ok(hash_hex)
    }

    /// Save trace data
    #[allow(dead_code)]
    pub fn save_trace(&self, name: &str, trace: &impl Serialize) -> Result<()> {
        let path = self.config.traces_dir().join(format!("{}.json", name));
        let json = serde_json::to_string_pretty(trace)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Save metrics data
    pub fn save_metrics(&self, name: &str, metrics: &impl Serialize) -> Result<()> {
        let path = self.config.metrics_dir().join(format!("{}.json", name));
        let json = serde_json::to_string_pretty(metrics)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Get all evidence
    pub fn get_all_evidence(&self) -> Vec<TestEvidence> {
        self.evidence.lock().unwrap().clone()
    }

    /// Get evidence summary statistics
    pub fn get_summary(&self) -> EvidenceSummary {
        let evidence = self.evidence.lock().unwrap();
        
        let total = evidence.len();
        let passed = evidence.iter().filter(|e| e.verdict == Verdict::Pass).count();
        let warned = evidence.iter().filter(|e| e.verdict == Verdict::Warn).count();
        let failed = evidence.iter().filter(|e| e.verdict == Verdict::Fail).count();
        
        let total_time_ms: u64 = evidence.iter().map(|e| e.execution_time_ms).sum();
        let avg_confidence: f64 = if total > 0 {
            evidence.iter().map(|e| e.confidence).sum::<f64>() / total as f64
        } else {
            0.0
        };

        EvidenceSummary {
            total_tests: total,
            passed,
            warned,
            failed,
            total_execution_time_ms: total_time_ms,
            average_confidence: avg_confidence,
        }
    }

    /// Get artifact hashes
    pub fn get_artifact_hashes(&self) -> HashMap<String, String> {
        self.artifact_hashes.lock().unwrap().clone()
    }

    /// Compute Merkle root of all evidence
    pub fn compute_evidence_merkle_root(&self) -> String {
        let evidence = self.evidence.lock().unwrap();
        
        let mut hasher = Hasher::new();
        for e in evidence.iter() {
            let json = serde_json::to_string(e).unwrap_or_default();
            hasher.update(json.as_bytes());
        }
        
        hex::encode(hasher.finalize().as_bytes())
    }
}

/// Evidence summary statistics
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EvidenceSummary {
    pub total_tests: usize,
    pub passed: usize,
    pub warned: usize,
    pub failed: usize,
    pub total_execution_time_ms: u64,
    pub average_confidence: f64,
}

/// Audit severity levels for decision policy
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DecisionPolicy {
    /// Conditions that trigger HARD FAIL
    pub hard_fail_conditions: Vec<String>,
    /// Conditions that trigger WARN
    pub warn_conditions: Vec<String>,
}

impl Default for DecisionPolicy {
    fn default() -> Self {
        Self {
            hard_fail_conditions: vec![
                "Key recovery attack successful".to_string(),
                "Signature forgery demonstrated".to_string(),
                "KEM decapsulation break".to_string(),
                "Quorum safety violation".to_string(),
                "BFT intersection failure".to_string(),
            ],
            warn_conditions: vec![
                "Reduced safety margin (< 20 bits)".to_string(),
                "Detectable timing variance".to_string(),
                "Non-constant-time code pattern".to_string(),
                "Entropy source concerns".to_string(),
            ],
        }
    }
}
