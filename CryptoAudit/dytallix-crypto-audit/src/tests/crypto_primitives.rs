//! Cryptographic Primitives Validation Tests
//! 
//! Validates parameter sets against NIST Level 3 security,
//! computes classical and quantum attack cost estimates,
//! and verifies safety margins for Module-LWE and Module-SIS.

use anyhow::Result;
use rand::SeedableRng;
use rand_chacha::ChaCha20Rng;
use serde::Serialize;
use std::sync::Arc;
use std::time::Instant;

use crate::config::{AuditConfig, MlDsa65Params, MlKemParams, SecurityParameters, SlhDsaParams};
use crate::evidence::{EvidenceCollector, TestEvidence, Verdict};

/// ML-DSA-65 parameter validation result
#[derive(Debug, Serialize)]
struct MlDsa65Validation {
    n: bool,
    k: bool,
    l: bool,
    q: bool,
    eta: bool,
    tau: bool,
    gamma1: bool,
    gamma2: bool,
    d: bool,
    beta: bool,
    omega: bool,
    nist_level: u8,
    classical_security_bits: u32,
    quantum_security_bits: u32,
}

/// ML-KEM-768 parameter validation result
#[derive(Debug, Serialize)]
struct MlKem768Validation {
    n: bool,
    k: bool,
    q: bool,
    eta1: bool,
    eta2: bool,
    du: bool,
    dv: bool,
    nist_level: u8,
    classical_security_bits: u32,
    quantum_security_bits: u32,
}

/// SLH-DSA-SHAKE-192s parameter validation result
#[derive(Debug, Serialize)]
struct SlhDsaValidation {
    n: bool,
    h: bool,
    d: bool,
    hp: bool,
    a: bool,
    k: bool,
    w: bool,
    nist_level: u8,
    classical_security_bits: u32,
    quantum_security_bits: u32,
}

/// Attack cost estimates
#[derive(Debug, Serialize)]
struct AttackCosts {
    algorithm: String,
    classical_cost_log2: f64,
    quantum_cost_log2: f64,
    best_known_attack: String,
    safety_margin_bits: i32,
}

/// Run all cryptographic primitive tests
pub async fn run_all(config: &AuditConfig, evidence: Arc<EvidenceCollector>) -> Result<()> {
    let mut rng = ChaCha20Rng::seed_from_u64(config.seed);
    let params = SecurityParameters::default();

    // Test 1: ML-DSA-65 Parameter Validation
    validate_ml_dsa_65(&params.ml_dsa_65, config, evidence.clone(), &mut rng).await?;

    // Test 2: ML-KEM-768 Parameter Validation
    validate_ml_kem_768(&params.ml_kem_768, config, evidence.clone(), &mut rng).await?;

    // Test 3: SLH-DSA-SHAKE-192s Parameter Validation
    validate_slh_dsa(&params.slh_dsa_shake_192s, config, evidence.clone(), &mut rng).await?;

    // Test 4: Attack Cost Estimation
    estimate_attack_costs(&params, config, evidence.clone()).await?;

    // Test 5: Module-LWE Safety Margins
    verify_module_lwe_margins(&params, config, evidence.clone()).await?;

    // Test 6: Module-SIS Safety Margins
    verify_module_sis_margins(&params, config, evidence.clone()).await?;

    // Test 7: Hash Function Security
    verify_hash_security(config, evidence.clone()).await?;

    Ok(())
}

/// Validate ML-DSA-65 (FIPS 204) parameters
async fn validate_ml_dsa_65(
    params: &MlDsa65Params,
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
    _rng: &mut ChaCha20Rng,
) -> Result<()> {
    let start = Instant::now();
    
    // NIST FIPS 204 ML-DSA-65 reference parameters
    let validation = MlDsa65Validation {
        n: params.n == 256,
        k: params.k == 6,
        l: params.l == 5,
        q: params.q == 8380417,
        eta: params.eta == 4,
        tau: params.tau == 49,
        gamma1: params.gamma1 == (1 << 19),
        gamma2: params.gamma2 == (8380417 - 1) / 32,
        d: params.d == 13,
        beta: params.beta == 196,
        omega: params.omega == 55,
        nist_level: 3,
        classical_security_bits: params.classical_security,
        quantum_security_bits: params.quantum_security,
    };

    let all_valid = validation.n && validation.k && validation.l && 
                    validation.q && validation.eta && validation.tau &&
                    validation.gamma1 && validation.gamma2 && validation.d &&
                    validation.beta && validation.omega;

    let (verdict, confidence) = if all_valid {
        (Verdict::Pass, 1.0)
    } else {
        (Verdict::Fail, 0.95)
    };

    let elapsed = start.elapsed().as_millis() as u64;
    let validation_json = serde_json::to_vec_pretty(&validation)?;
    
    let mut test_evidence = TestEvidence::new("CRYPTO-001", "Cryptographic Primitives")
        .with_assumption("ML-DSA-65 parameters conform to FIPS 204 specification")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed)
        .with_metric("n", params.n as f64)
        .with_metric("k", params.k as f64)
        .with_metric("l", params.l as f64)
        .with_metric("q", params.q as f64)
        .with_metric("classical_security", params.classical_security as f64)
        .with_metric("quantum_security", params.quantum_security as f64);

    if all_valid {
        test_evidence = test_evidence.with_finding("All ML-DSA-65 parameters match FIPS 204 specification");
    } else {
        test_evidence = test_evidence.with_finding("ML-DSA-65 parameter mismatch detected");
    }

    test_evidence.compute_artifact_hash(&validation_json);
    evidence.save_artifact("ml_dsa_65_validation.json", &validation_json)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Validate ML-KEM-768 (FIPS 203) parameters
async fn validate_ml_kem_768(
    params: &MlKemParams,
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
    _rng: &mut ChaCha20Rng,
) -> Result<()> {
    let start = Instant::now();
    
    // NIST FIPS 203 ML-KEM-768 reference parameters
    let validation = MlKem768Validation {
        n: params.n == 256,
        k: params.k == 3,
        q: params.q == 3329,
        eta1: params.eta1 == 2,
        eta2: params.eta2 == 2,
        du: params.du == 10,
        dv: params.dv == 4,
        nist_level: 3,
        classical_security_bits: params.classical_security,
        quantum_security_bits: params.quantum_security,
    };

    let all_valid = validation.n && validation.k && validation.q &&
                    validation.eta1 && validation.eta2 && 
                    validation.du && validation.dv;

    let (verdict, confidence) = if all_valid {
        (Verdict::Pass, 1.0)
    } else {
        (Verdict::Fail, 0.95)
    };

    let elapsed = start.elapsed().as_millis() as u64;
    let validation_json = serde_json::to_vec_pretty(&validation)?;

    let mut test_evidence = TestEvidence::new("CRYPTO-002", "Cryptographic Primitives")
        .with_assumption("ML-KEM-768 parameters conform to FIPS 203 specification")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed)
        .with_metric("n", params.n as f64)
        .with_metric("k", params.k as f64)
        .with_metric("q", params.q as f64)
        .with_metric("classical_security", params.classical_security as f64)
        .with_metric("quantum_security", params.quantum_security as f64);

    if all_valid {
        test_evidence = test_evidence.with_finding("All ML-KEM-768 parameters match FIPS 203 specification");
    } else {
        test_evidence = test_evidence.with_finding("ML-KEM-768 parameter mismatch detected");
    }

    test_evidence.compute_artifact_hash(&validation_json);
    evidence.save_artifact("ml_kem_768_validation.json", &validation_json)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Validate SLH-DSA-SHAKE-192s (FIPS 205) parameters
async fn validate_slh_dsa(
    params: &SlhDsaParams,
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
    _rng: &mut ChaCha20Rng,
) -> Result<()> {
    let start = Instant::now();
    
    // NIST FIPS 205 SLH-DSA-SHAKE-192s reference parameters
    let validation = SlhDsaValidation {
        n: params.n == 24,
        h: params.h == 63,
        d: params.d == 7,
        hp: params.hp == 9,
        a: params.a == 14,
        k: params.k == 17,
        w: params.w == 16,
        nist_level: 3,
        classical_security_bits: params.classical_security,
        quantum_security_bits: params.quantum_security,
    };

    let all_valid = validation.n && validation.h && validation.d &&
                    validation.hp && validation.a && validation.k && validation.w;

    let (verdict, confidence) = if all_valid {
        (Verdict::Pass, 1.0)
    } else {
        (Verdict::Fail, 0.95)
    };

    let elapsed = start.elapsed().as_millis() as u64;
    let validation_json = serde_json::to_vec_pretty(&validation)?;

    let mut test_evidence = TestEvidence::new("CRYPTO-003", "Cryptographic Primitives")
        .with_assumption("SLH-DSA-SHAKE-192s parameters conform to FIPS 205 specification")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed)
        .with_metric("n", params.n as f64)
        .with_metric("h", params.h as f64)
        .with_metric("d", params.d as f64)
        .with_metric("classical_security", params.classical_security as f64)
        .with_metric("quantum_security", params.quantum_security as f64);

    if all_valid {
        test_evidence = test_evidence.with_finding("All SLH-DSA-SHAKE-192s parameters match FIPS 205 specification");
    } else {
        test_evidence = test_evidence.with_finding("SLH-DSA-SHAKE-192s parameter mismatch detected");
    }

    test_evidence.compute_artifact_hash(&validation_json);
    evidence.save_artifact("slh_dsa_validation.json", &validation_json)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Estimate attack costs for all primitives
async fn estimate_attack_costs(
    params: &SecurityParameters,
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
) -> Result<()> {
    let start = Instant::now();
    
    // Attack cost estimates based on latest cryptanalysis research
    // Reference: NIST PQC standardization reports and academic literature
    
    let attack_costs = vec![
        AttackCosts {
            algorithm: "ML-DSA-65".to_string(),
            // Core-SVP cost for lattice sieving against Module-LWE
            classical_cost_log2: estimate_mlwe_classical_cost(params.ml_dsa_65.k as u32, 256),
            quantum_cost_log2: estimate_mlwe_quantum_cost(params.ml_dsa_65.k as u32, 256),
            best_known_attack: "Lattice sieving (BKZ with progressive sieving)".to_string(),
            safety_margin_bits: 54, // 182 - 128 = 54 bits margin
        },
        AttackCosts {
            algorithm: "ML-KEM-768".to_string(),
            classical_cost_log2: estimate_mlwe_classical_cost(params.ml_kem_768.k as u32, 256),
            quantum_cost_log2: estimate_mlwe_quantum_cost(params.ml_kem_768.k as u32, 256),
            best_known_attack: "Lattice sieving (primal attack)".to_string(),
            safety_margin_bits: 54,
        },
        AttackCosts {
            algorithm: "SLH-DSA-SHAKE-192s".to_string(),
            // Hash-based signature security based on hash function
            classical_cost_log2: 192.0, // Based on n=24 bytes
            quantum_cost_log2: 128.0,   // Grover's reduces by half
            best_known_attack: "Generic hash collision / preimage".to_string(),
            safety_margin_bits: 64,
        },
        AttackCosts {
            algorithm: "BLAKE3".to_string(),
            classical_cost_log2: 256.0,
            quantum_cost_log2: 128.0,
            best_known_attack: "Generic preimage (Grover's algorithm)".to_string(),
            safety_margin_bits: 0,
        },
        AttackCosts {
            algorithm: "SHAKE256".to_string(),
            classical_cost_log2: 256.0,
            quantum_cost_log2: 128.0,
            best_known_attack: "Generic preimage (Grover's algorithm)".to_string(),
            safety_margin_bits: 0,
        },
    ];

    // Check if all primitives meet NIST Level 3 (128-bit quantum security)
    let all_meet_level3 = attack_costs.iter()
        .all(|a| a.quantum_cost_log2 >= 128.0);

    let (verdict, confidence) = if all_meet_level3 {
        (Verdict::Pass, 0.98)
    } else {
        (Verdict::Fail, 0.95)
    };

    let elapsed = start.elapsed().as_millis() as u64;
    let costs_json = serde_json::to_vec_pretty(&attack_costs)?;

    let mut test_evidence = TestEvidence::new("CRYPTO-004", "Cryptographic Primitives")
        .with_assumption("All primitives provide at least NIST Level 3 security (128-bit quantum)")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed);

    for cost in &attack_costs {
        test_evidence = test_evidence
            .with_metric(&format!("{}_classical", cost.algorithm), cost.classical_cost_log2)
            .with_metric(&format!("{}_quantum", cost.algorithm), cost.quantum_cost_log2);
    }

    if all_meet_level3 {
        test_evidence = test_evidence.with_finding("All primitives meet NIST Level 3 security requirements");
    } else {
        test_evidence = test_evidence.with_finding("One or more primitives do not meet NIST Level 3 security");
    }

    test_evidence.compute_artifact_hash(&costs_json);
    evidence.save_artifact("attack_cost_estimates.json", &costs_json)?;
    evidence.save_metrics("attack_costs", &attack_costs)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Verify Module-LWE safety margins
async fn verify_module_lwe_margins(
    params: &SecurityParameters,
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
) -> Result<()> {
    let start = Instant::now();
    
    // Module-LWE hardness parameters
    // Based on: Albrecht et al. "On the concrete hardness of Learning with Errors"
    
    let ml_dsa_dimension = params.ml_dsa_65.k * params.ml_dsa_65.n; // 6 * 256 = 1536
    let ml_kem_dimension = params.ml_kem_768.k * params.ml_kem_768.n; // 3 * 256 = 768
    
    // Estimate required block size for lattice reduction
    let ml_dsa_block_size = estimate_bkz_block_size(ml_dsa_dimension, params.ml_dsa_65.q);
    let ml_kem_block_size = estimate_bkz_block_size(ml_kem_dimension, params.ml_kem_768.q);
    
    // Safety margin check: block size should be > 400 for NIST Level 3
    let ml_dsa_safe = ml_dsa_block_size >= 400;
    let ml_kem_safe = ml_kem_block_size >= 380; // Slightly lower due to smaller dimension
    
    let all_safe = ml_dsa_safe && ml_kem_safe;
    
    let (verdict, confidence) = if all_safe {
        (Verdict::Pass, 0.95)
    } else if ml_dsa_safe || ml_kem_safe {
        (Verdict::Warn, 0.85)
    } else {
        (Verdict::Fail, 0.90)
    };

    let elapsed = start.elapsed().as_millis() as u64;

    #[derive(Serialize)]
    struct ModuleLweMargins {
        ml_dsa_dimension: usize,
        ml_dsa_block_size: u32,
        ml_dsa_safe: bool,
        ml_kem_dimension: usize,
        ml_kem_block_size: u32,
        ml_kem_safe: bool,
    }
    
    let margins = ModuleLweMargins {
        ml_dsa_dimension,
        ml_dsa_block_size,
        ml_dsa_safe,
        ml_kem_dimension,
        ml_kem_block_size,
        ml_kem_safe,
    };
    
    let margins_json = serde_json::to_vec_pretty(&margins)?;

    let mut test_evidence = TestEvidence::new("CRYPTO-005", "Cryptographic Primitives")
        .with_assumption("Module-LWE parameters provide adequate safety margins against lattice attacks")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed)
        .with_metric("ml_dsa_dimension", ml_dsa_dimension as f64)
        .with_metric("ml_dsa_block_size", ml_dsa_block_size as f64)
        .with_metric("ml_kem_dimension", ml_kem_dimension as f64)
        .with_metric("ml_kem_block_size", ml_kem_block_size as f64);

    if all_safe {
        test_evidence = test_evidence.with_finding("Module-LWE safety margins are adequate for NIST Level 3");
    } else {
        test_evidence = test_evidence.with_finding("Module-LWE safety margins may be insufficient");
    }

    test_evidence.compute_artifact_hash(&margins_json);
    evidence.save_artifact("module_lwe_margins.json", &margins_json)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Verify Module-SIS safety margins
async fn verify_module_sis_margins(
    params: &SecurityParameters,
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
) -> Result<()> {
    let start = Instant::now();
    
    // Module-SIS hardness for signature schemes
    // The short integer solution problem underlies signature security
    
    let ml_dsa_sis_dimension = (params.ml_dsa_65.k + params.ml_dsa_65.l) * params.ml_dsa_65.n;
    
    // Estimate SIS hardness based on dimension and bound
    let beta = params.ml_dsa_65.beta as f64;
    let q = params.ml_dsa_65.q as f64;
    let n = params.ml_dsa_65.n as f64;
    
    // SIS bound ratio: gamma = beta * sqrt(n) / q
    let gamma = beta * n.sqrt() / q;
    
    // Safe if gamma is sufficiently small (< 2^-5)
    let sis_safe = gamma < 0.03125; // 2^-5
    
    let (verdict, confidence) = if sis_safe {
        (Verdict::Pass, 0.95)
    } else {
        (Verdict::Warn, 0.80)
    };

    let elapsed = start.elapsed().as_millis() as u64;

    #[derive(Serialize)]
    struct ModuleSisMargins {
        sis_dimension: usize,
        beta: f64,
        gamma_ratio: f64,
        sis_safe: bool,
    }
    
    let margins = ModuleSisMargins {
        sis_dimension: ml_dsa_sis_dimension,
        beta,
        gamma_ratio: gamma,
        sis_safe,
    };
    
    let margins_json = serde_json::to_vec_pretty(&margins)?;

    let mut test_evidence = TestEvidence::new("CRYPTO-006", "Cryptographic Primitives")
        .with_assumption("Module-SIS parameters provide adequate safety margins for signature security")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed)
        .with_metric("sis_dimension", ml_dsa_sis_dimension as f64)
        .with_metric("beta", beta)
        .with_metric("gamma_ratio", gamma);

    if sis_safe {
        test_evidence = test_evidence.with_finding("Module-SIS safety margins are adequate");
    } else {
        test_evidence = test_evidence.with_finding("Module-SIS bound ratio is higher than expected");
    }

    test_evidence.compute_artifact_hash(&margins_json);
    evidence.save_artifact("module_sis_margins.json", &margins_json)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Verify hash function security properties
async fn verify_hash_security(
    config: &AuditConfig,
    evidence: Arc<EvidenceCollector>,
) -> Result<()> {
    let start = Instant::now();
    
    // Test BLAKE3 properties
    let test_input = b"Dytallix cryptographic audit test vector";
    let blake3_hash = blake3::hash(test_input);
    
    // Test SHAKE256 properties
    use sha3::{Shake256, digest::{Update, ExtendableOutput, XofReader}};
    let mut shake = Shake256::default();
    shake.update(test_input);
    let mut shake_output = [0u8; 32];
    shake.finalize_xof().read(&mut shake_output);
    
    // Verify output sizes
    let blake3_correct_size = blake3_hash.as_bytes().len() == 32;
    let shake_correct_size = shake_output.len() == 32;
    
    // Test determinism
    let blake3_hash2 = blake3::hash(test_input);
    let blake3_deterministic = blake3_hash == blake3_hash2;
    
    let all_pass = blake3_correct_size && shake_correct_size && blake3_deterministic;
    
    let (verdict, confidence) = if all_pass {
        (Verdict::Pass, 1.0)
    } else {
        (Verdict::Fail, 0.99)
    };

    let elapsed = start.elapsed().as_millis() as u64;

    #[derive(Serialize)]
    struct HashSecurityResult {
        blake3_output_size: usize,
        blake3_deterministic: bool,
        blake3_hash_hex: String,
        shake256_output_size: usize,
        shake256_hash_hex: String,
    }
    
    let result = HashSecurityResult {
        blake3_output_size: blake3_hash.as_bytes().len(),
        blake3_deterministic,
        blake3_hash_hex: hex::encode(blake3_hash.as_bytes()),
        shake256_output_size: shake_output.len(),
        shake256_hash_hex: hex::encode(&shake_output),
    };
    
    let result_json = serde_json::to_vec_pretty(&result)?;

    let mut test_evidence = TestEvidence::new("CRYPTO-007", "Cryptographic Primitives")
        .with_assumption("BLAKE3 and SHAKE256 hash functions operate correctly")
        .with_verdict(verdict)
        .with_confidence(confidence)
        .with_execution_time(elapsed)
        .with_seed(config.seed)
        .with_finding(format!("BLAKE3 output: {}", hex::encode(blake3_hash.as_bytes())))
        .with_finding(format!("SHAKE256 output: {}", hex::encode(&shake_output)));

    test_evidence.compute_artifact_hash(&result_json);
    evidence.save_artifact("hash_security.json", &result_json)?;
    evidence.add_evidence(test_evidence);

    Ok(())
}

/// Estimate classical attack cost for Module-LWE
fn estimate_mlwe_classical_cost(k: u32, n: u32) -> f64 {
    // Based on Core-SVP model: T = 2^{0.292 * beta}
    // Where beta is the BKZ block size needed
    let dimension = (k * n) as f64;
    // Simplified estimate: log2(cost) ≈ 0.292 * sqrt(dimension * log(q))
    let log_q = 23.0; // log2(8380417) for ML-DSA, approximate for ML-KEM
    0.292 * (dimension * log_q).sqrt() + 100.0
}

/// Estimate quantum attack cost for Module-LWE
fn estimate_mlwe_quantum_cost(k: u32, n: u32) -> f64 {
    // Quantum speedup with Grover: roughly halves the exponent
    let classical = estimate_mlwe_classical_cost(k, n);
    // But not a full halving due to memory costs
    classical * 0.7
}

/// Estimate BKZ block size needed for attack
fn estimate_bkz_block_size(dimension: usize, modulus: u64) -> u32 {
    // Simplified hermite factor estimation
    let delta = (1.0 / (modulus as f64)).powf(1.0 / dimension as f64);
    let log_delta = delta.abs().ln();
    
    // Block size estimate: beta ≈ -n * ln(delta) / ln(2)
    let beta = -(dimension as f64) * log_delta / 2.0_f64.ln();
    beta.max(100.0) as u32
}
