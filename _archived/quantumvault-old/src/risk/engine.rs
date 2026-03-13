use super::types::*;

/// Compute Algorithm Quantum Vulnerability (AQV, 0-5)
/// 
/// Measures how vulnerable the cryptographic algorithm is to quantum attacks.
/// - 5: Quantum-vulnerable public-key algorithms (RSA, ECDSA, ECDH, DSA, DH)
/// - 3: Symmetric-only with ≤128-bit keys
/// - 1: Strong symmetric-only (≥192-bit keys)
pub fn compute_aqv(asset: &Asset) -> u8 {
    match asset.algo_pk {
        AlgoPublicKey::RSA
        | AlgoPublicKey::ECDSA
        | AlgoPublicKey::ECDH
        | AlgoPublicKey::DSA
        | AlgoPublicKey::DH => 5, // Quantum-vulnerable public-key

        AlgoPublicKey::None => {
            let sym_bits = asset.sym_key_bits.unwrap_or(0);
            if sym_bits <= 128 {
                3 // Symmetric-only, ≤ AES-128
            } else if sym_bits >= 192 {
                1 // Stronger symmetric
            } else {
                3
            }
        }
    }
}

/// Compute Data Longevity / Time-to-Value (DLV, 0-5)
/// 
/// Measures how critical it is to protect data long-term.
/// Higher scores indicate data that needs protection for longer periods.
pub fn compute_dlv(asset: &Asset) -> u8 {
    use DataSensitivity::*;

    match asset.data_sensitivity {
        Public => 0,

        Confidential | Regulated if asset.stores_long_lived_data => 5,

        Regulated => 4,
        Confidential => 3,
        Internal => 1,
        Unknown => 2,
    }
}

/// Compute Business / System Impact (IMP, 0-5)
/// 
/// Measures the business criticality and system importance.
/// Certain crypto usages (PKI root, code signing, VPN) add +1 to the score.
pub fn compute_imp(asset: &Asset) -> u8 {
    let mut imp: u8 = match asset.business_criticality {
        BusinessCriticality::Critical => 5,
        BusinessCriticality::High => 4,
        BusinessCriticality::Medium => 3,
        BusinessCriticality::Low => 1,
        BusinessCriticality::Unknown => 3,
    };

    // Boost for critical crypto usage types
    match asset.crypto_usage {
        CryptoUsage::PkiRoot | CryptoUsage::CodeSigning | CryptoUsage::Vpn => {
            imp = imp.saturating_add(1).min(5);
        }
        _ => {}
    }

    imp
}

/// Compute Exposure (EXP, 0-5)
/// 
/// Measures how exposed the asset is to potential attackers.
pub fn compute_exp(asset: &Asset) -> u8 {
    match asset.exposure {
        Exposure::Internet => 5,
        Exposure::Partner => 4,
        Exposure::Internal => 3,
        Exposure::Restricted => 1,
        Exposure::Airgapped => 0,
        Exposure::Unknown => 3, // Default to internal
    }
}

/// Compute Cryptographic Agility (AGI, 0-5)
/// 
/// Measures how difficult it is to change/upgrade the cryptography.
/// Higher score = worse / harder to change.
pub fn compute_agi(asset: &Asset) -> u8 {
    match asset.crypto_agility {
        CryptoAgility::Low => 5,
        CryptoAgility::High => 1,
        CryptoAgility::Medium => 3,
        CryptoAgility::Unknown => {
            // Infer from protocol
            match asset.protocol.as_str() {
                "TLS" | "SSH" => 3, // Stack likely supports multiple ciphers
                _ => 4,             // Appliances / firmware / unknown
            }
        }
    }
}

/// Compute Classical Cryptographic Weakness (CCW, 0-5)
/// 
/// Measures vulnerabilities in classical (pre-quantum) cryptography.
/// Checks for weak algorithms, small key sizes, and legacy protocols.
pub fn compute_ccw(asset: &Asset) -> u8 {
    let issues: std::collections::HashSet<&str> =
        asset.classical_issues.iter().map(|s| s.as_str()).collect();

    let legacy_proto = ["SSL3.0", "TLS1.0", "TLS1.1"].contains(&asset.protocol_version.as_str());

    // Critical weaknesses
    if issues.contains("rsa_keylen_1024")
        || issues.contains("uses_sha1")
        || issues.contains("uses_md5")
        || issues.contains("uses_rc4")
        || legacy_proto
    {
        return 5;
    }

    // Moderate weaknesses
    if issues.contains("uses_3des")
        || (asset.algo_pk == AlgoPublicKey::RSA
            && asset.pk_key_bits == Some(2048)
            && matches!(
                asset.business_criticality,
                BusinessCriticality::High | BusinessCriticality::Critical
            ))
    {
        return 3;
    }

    1 // Clean, modern config
}

/// Compute composite PQC risk score (0-100) using weighted dimensions
pub fn compute_pqc_risk_score(dims: &Dimensions, weights: &RiskWeights) -> u8 {
    let raw = weights.aqv * dims.aqv as f64
        + weights.dlv * dims.dlv as f64
        + weights.imp * dims.imp as f64
        + weights.exp * dims.exp as f64
        + weights.agi * dims.agi as f64
        + weights.ccw * dims.ccw as f64;

    let score = (raw * 20.0).round() as i32; // 0-5 -> 0-100
    score.max(0).min(100) as u8
}

/// Determine risk class based on dimensions and score with override rules
pub fn compute_risk_class(asset: &Asset, dims: &Dimensions, score: u8) -> RiskClass {
    let mut critical_flag = false;

    // Immediate critical if strong classical weakness on high/critical system
    if dims.ccw == 5 && dims.imp >= 4 {
        critical_flag = true;
    }

    // Critical if quantum-vulnerable, long-lived, high impact, hard to fix
    if dims.aqv == 5 && dims.dlv >= 4 && dims.imp >= 4 && dims.agi >= 4 {
        critical_flag = true;
    }

    if critical_flag {
        return RiskClass::Critical;
    }

    match score {
        75..=100 => RiskClass::Critical,
        50..=74 => RiskClass::High,
        25..=49 => RiskClass::Medium,
        _ => RiskClass::Low,
    }
}

/// Evaluate an asset and compute all risk dimensions and classifications
pub fn evaluate_asset_risk(asset: Asset, weights: &RiskWeights) -> AssetWithRisk {
    let aqv = compute_aqv(&asset);
    let dlv = compute_dlv(&asset);
    let imp = compute_imp(&asset);
    let exp = compute_exp(&asset);
    let agi = compute_agi(&asset);
    let ccw = compute_ccw(&asset);

    let dims = Dimensions {
        aqv,
        dlv,
        imp,
        exp,
        agi,
        ccw,
    };

    let pqc_risk_score = compute_pqc_risk_score(&dims, weights);
    let risk_class = compute_risk_class(&asset, &dims, pqc_risk_score);

    AssetWithRisk {
        asset,
        aqv,
        dlv,
        imp,
        exp,
        agi,
        ccw,
        pqc_risk_score,
        risk_class,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_asset() -> Asset {
        Asset {
            asset_id: "test-001".to_string(),
            hostname: "test.example.com".to_string(),
            ip: "10.0.0.1".to_string(),
            port: 443,
            protocol: "TLS".to_string(),
            environment: "prod".to_string(),
            service_role: Some("web-server".to_string()),
            business_criticality: BusinessCriticality::Medium,
            crypto_usage: CryptoUsage::Channel,
            algo_pk: AlgoPublicKey::RSA,
            pk_key_bits: Some(2048),
            algo_sym: AlgoSymmetric::AES,
            sym_key_bits: Some(256),
            hash_algo: "SHA256".to_string(),
            protocol_version: "TLS1.2".to_string(),
            exposure: Exposure::Internal,
            stores_long_lived_data: false,
            data_sensitivity: DataSensitivity::Internal,
            crypto_agility: CryptoAgility::Medium,
            classical_issues: vec![],
        }
    }

    #[test]
    fn test_compute_aqv_quantum_vulnerable() {
        let asset = create_test_asset();
        assert_eq!(compute_aqv(&asset), 5); // RSA is quantum-vulnerable
    }

    #[test]
    fn test_compute_aqv_symmetric_only() {
        let mut asset = create_test_asset();
        asset.algo_pk = AlgoPublicKey::None;
        asset.sym_key_bits = Some(128);
        assert_eq!(compute_aqv(&asset), 3); // AES-128

        asset.sym_key_bits = Some(256);
        assert_eq!(compute_aqv(&asset), 1); // AES-256
    }

    #[test]
    fn test_compute_dlv() {
        let mut asset = create_test_asset();

        asset.data_sensitivity = DataSensitivity::Public;
        assert_eq!(compute_dlv(&asset), 0);

        asset.data_sensitivity = DataSensitivity::Regulated;
        asset.stores_long_lived_data = true;
        assert_eq!(compute_dlv(&asset), 5);

        asset.stores_long_lived_data = false;
        assert_eq!(compute_dlv(&asset), 4);
    }

    #[test]
    fn test_compute_imp() {
        let mut asset = create_test_asset();

        asset.business_criticality = BusinessCriticality::Critical;
        assert_eq!(compute_imp(&asset), 5);

        asset.business_criticality = BusinessCriticality::High;
        asset.crypto_usage = CryptoUsage::PkiRoot;
        assert_eq!(compute_imp(&asset), 5); // 4 + 1 boost
    }

    #[test]
    fn test_compute_exp() {
        let mut asset = create_test_asset();

        asset.exposure = Exposure::Internet;
        assert_eq!(compute_exp(&asset), 5);

        asset.exposure = Exposure::Airgapped;
        assert_eq!(compute_exp(&asset), 0);
    }

    #[test]
    fn test_compute_agi() {
        let mut asset = create_test_asset();

        asset.crypto_agility = CryptoAgility::Low;
        assert_eq!(compute_agi(&asset), 5);

        asset.crypto_agility = CryptoAgility::High;
        assert_eq!(compute_agi(&asset), 1);
    }

    #[test]
    fn test_compute_ccw() {
        let mut asset = create_test_asset();

        // Clean config
        assert_eq!(compute_ccw(&asset), 1);

        // Weak hash
        asset.classical_issues = vec!["uses_sha1".to_string()];
        assert_eq!(compute_ccw(&asset), 5);

        // Legacy protocol
        asset.classical_issues = vec![];
        asset.protocol_version = "TLS1.0".to_string();
        assert_eq!(compute_ccw(&asset), 5);
    }

    #[test]
    fn test_critical_asset_scenario() {
        let asset = Asset {
            asset_id: "critical-001".to_string(),
            hostname: "critical.example.com".to_string(),
            ip: "203.0.113.1".to_string(),
            port: 443,
            protocol: "TLS".to_string(),
            environment: "prod".to_string(),
            service_role: Some("payment-gateway".to_string()),
            business_criticality: BusinessCriticality::Critical,
            crypto_usage: CryptoUsage::Channel,
            algo_pk: AlgoPublicKey::RSA,
            pk_key_bits: Some(2048),
            algo_sym: AlgoSymmetric::AES,
            sym_key_bits: Some(256),
            hash_algo: "SHA256".to_string(),
            protocol_version: "TLS1.2".to_string(),
            exposure: Exposure::Internet,
            stores_long_lived_data: true,
            data_sensitivity: DataSensitivity::Regulated,
            crypto_agility: CryptoAgility::Low,
            classical_issues: vec![],
        };

        let weights = RiskWeights::default();
        let result = evaluate_asset_risk(asset, &weights);

        assert!(result.pqc_risk_score >= 70);
        assert!(matches!(
            result.risk_class,
            RiskClass::High | RiskClass::Critical
        ));
    }

    #[test]
    fn test_low_risk_asset_scenario() {
        let asset = Asset {
            asset_id: "low-001".to_string(),
            hostname: "dev.internal.example.com".to_string(),
            ip: "10.0.0.100".to_string(),
            port: 8080,
            protocol: "HTTP".to_string(),
            environment: "non-prod".to_string(),
            service_role: Some("dev-server".to_string()),
            business_criticality: BusinessCriticality::Low,
            crypto_usage: CryptoUsage::Other,
            algo_pk: AlgoPublicKey::None,
            pk_key_bits: None,
            algo_sym: AlgoSymmetric::AES,
            sym_key_bits: Some(256),
            hash_algo: "SHA256".to_string(),
            protocol_version: "N/A".to_string(),
            exposure: Exposure::Internal,
            stores_long_lived_data: false,
            data_sensitivity: DataSensitivity::Internal,
            crypto_agility: CryptoAgility::High,
            classical_issues: vec![],
        };

        let weights = RiskWeights::default();
        let result = evaluate_asset_risk(asset, &weights);

        assert!(result.pqc_risk_score < 50);
        assert!(matches!(
            result.risk_class,
            RiskClass::Low | RiskClass::Medium
        ));
    }

    #[test]
    fn test_classical_weakness_critical_override() {
        let asset = Asset {
            asset_id: "weak-001".to_string(),
            hostname: "legacy.example.com".to_string(),
            ip: "10.0.1.50".to_string(),
            port: 443,
            protocol: "TLS".to_string(),
            environment: "prod".to_string(),
            service_role: Some("api-server".to_string()),
            business_criticality: BusinessCriticality::High,
            crypto_usage: CryptoUsage::Channel,
            algo_pk: AlgoPublicKey::RSA,
            pk_key_bits: Some(1024), // Weak key
            algo_sym: AlgoSymmetric::AES,
            sym_key_bits: Some(128),
            hash_algo: "SHA1".to_string(),
            protocol_version: "TLS1.2".to_string(),
            exposure: Exposure::Partner,
            stores_long_lived_data: false,
            data_sensitivity: DataSensitivity::Confidential,
            crypto_agility: CryptoAgility::Medium,
            classical_issues: vec!["rsa_keylen_1024".to_string(), "uses_sha1".to_string()],
        };

        let weights = RiskWeights::default();
        let result = evaluate_asset_risk(asset, &weights);

        // CCW should be 5 (critical classical weakness)
        assert_eq!(result.ccw, 5);
        // Should be Critical due to override rule (ccw=5 && imp>=4)
        assert_eq!(result.risk_class, RiskClass::Critical);
    }
}
