use crate::domain::asset::*;
use crate::risk::{self, RiskWeights};

/// Convert domain Asset to risk engine Asset format
pub fn domain_asset_to_risk_asset(asset: &Asset) -> risk::Asset {
    risk::Asset {
        asset_id: asset.id.to_string(),
        hostname: asset.name.clone(),
        ip: "".to_string(), // Not tracked in current domain
        port: 443, // Default, not tracked
        protocol: asset.protocol_version.clone().unwrap_or_default(),
        
        environment: asset.environment.clone().unwrap_or_else(|| "unknown".to_string()),
        service_role: asset.service_role.clone(),
        business_criticality: convert_business_criticality(asset.business_criticality),
        
        crypto_usage: convert_crypto_usage(asset.crypto_usage),
        
        algo_pk: convert_algo_pk(asset.algo_pk),
        pk_key_bits: asset.pk_key_bits.map(|b| b as u32),
        
        algo_sym: convert_algo_sym(asset.algo_sym),
        sym_key_bits: asset.sym_key_bits.map(|b| b as u32),
        
        hash_algo: asset.hash_algo.clone().unwrap_or_default(),
        protocol_version: asset.protocol_version.clone().unwrap_or_default(),
        
        exposure: convert_exposure(asset.exposure_level),
        stores_long_lived_data: asset.stores_long_lived_data,
        data_sensitivity: convert_data_sensitivity(asset.sensitivity),
        
        crypto_agility: convert_crypto_agility(asset.crypto_agility),
        classical_issues: asset.classical_issues.clone().unwrap_or_default(),
    }
}


pub fn evaluate_and_update_asset_risk(asset: &mut Asset, weights: &RiskWeights) {
    let risk_asset = domain_asset_to_risk_asset(asset);
    let asset_with_risk = risk::engine::evaluate_asset_risk(risk_asset, weights);
    
    asset.aqv = Some(asset_with_risk.aqv as i16);
    asset.dlv = Some(asset_with_risk.dlv as i16);
    asset.imp = Some(asset_with_risk.imp as i16);
    asset.exp = Some(asset_with_risk.exp as i16);
    asset.agi = Some(asset_with_risk.agi as i16);
    asset.ccw = Some(asset_with_risk.ccw as i16);
    asset.pqc_risk_score = Some(asset_with_risk.pqc_risk_score as i16);
    asset.risk_class = Some(convert_risk_class(asset_with_risk.risk_class));
}


fn convert_exposure(exp: ExposureLevel) -> risk::Exposure {
    match exp {
        ExposureLevel::PublicInternet => risk::Exposure::Internet,
        ExposureLevel::PartnerNetwork => risk::Exposure::Partner,
        ExposureLevel::Internal => risk::Exposure::Internal,
        ExposureLevel::Unknown => risk::Exposure::Internal, // Default to Internal
    }
}

fn convert_data_sensitivity(ds: SensitivityLevel) -> risk::DataSensitivity {
    match ds {
        SensitivityLevel::Public => risk::DataSensitivity::Public,
        SensitivityLevel::Internal => risk::DataSensitivity::Internal,
        SensitivityLevel::Confidential => risk::DataSensitivity::Confidential,
        SensitivityLevel::Secret => risk::DataSensitivity::Regulated, // Mapping Secret to Regulated for risk engine
        SensitivityLevel::TopSecret => risk::DataSensitivity::Regulated,
        SensitivityLevel::Unknown => risk::DataSensitivity::Internal, // Default to Internal
    }
}

fn convert_crypto_agility(ca: CryptoAgility) -> risk::CryptoAgility {
    match ca {
        CryptoAgility::High => risk::CryptoAgility::High,
        CryptoAgility::Medium => risk::CryptoAgility::Medium,
        CryptoAgility::Low => risk::CryptoAgility::Low,
        CryptoAgility::Unknown => risk::CryptoAgility::Unknown,
    }
}

fn convert_risk_class(rc: risk::RiskClass) -> RiskClass {
    match rc {
        risk::RiskClass::Low => RiskClass::Low,
        risk::RiskClass::Medium => RiskClass::Medium,
        risk::RiskClass::High => RiskClass::High,
        risk::RiskClass::Critical => RiskClass::Critical,
    }
}


fn convert_business_criticality(bc: BusinessCriticality) -> risk::BusinessCriticality {
    match bc {
        BusinessCriticality::Low => risk::BusinessCriticality::Low,
        BusinessCriticality::Medium => risk::BusinessCriticality::Medium,
        BusinessCriticality::High => risk::BusinessCriticality::High,
        BusinessCriticality::Critical => risk::BusinessCriticality::Critical,
        BusinessCriticality::Unknown => risk::BusinessCriticality::Medium, // Default
    }
}

fn convert_crypto_usage(cu: CryptoUsage) -> risk::CryptoUsage {
    match cu {
        CryptoUsage::Channel => risk::CryptoUsage::Channel,
        CryptoUsage::DataAtRest => risk::CryptoUsage::DataAtRest,
        CryptoUsage::CodeSigning => risk::CryptoUsage::CodeSigning,
        CryptoUsage::PkiRoot => risk::CryptoUsage::PkiRoot,
        CryptoUsage::PkiLeaf => risk::CryptoUsage::PkiLeaf,
        CryptoUsage::Vpn => risk::CryptoUsage::Vpn,
        CryptoUsage::Ssh => risk::CryptoUsage::Ssh,
        CryptoUsage::Other => risk::CryptoUsage::Other,
    }
}

fn convert_algo_pk(algo: AlgoPublicKey) -> risk::AlgoPublicKey {
    match algo {
        AlgoPublicKey::RSA => risk::AlgoPublicKey::RSA,
        AlgoPublicKey::ECDSA => risk::AlgoPublicKey::ECDSA,
        AlgoPublicKey::ECDH => risk::AlgoPublicKey::ECDH,
        AlgoPublicKey::DSA => risk::AlgoPublicKey::DSA,
        AlgoPublicKey::DH => risk::AlgoPublicKey::DH,
        AlgoPublicKey::None => risk::AlgoPublicKey::None,
    }
}

fn convert_algo_sym(algo: AlgoSymmetric) -> risk::AlgoSymmetric {
    match algo {
        AlgoSymmetric::AES => risk::AlgoSymmetric::AES,
        AlgoSymmetric::TripleDES => risk::AlgoSymmetric::TripleDES,
        AlgoSymmetric::RC4 => risk::AlgoSymmetric::RC4,
        AlgoSymmetric::DES => risk::AlgoSymmetric::DES,
        AlgoSymmetric::None => risk::AlgoSymmetric::None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_evaluate_asset_risk() {
        let mut asset = Asset::new(
            "Test TLS Endpoint".to_string(),
            AssetType::TlsEndpoint,
            "https://api.example.com".to_string(),
            "security-team".to_string(),
            SensitivityLevel::Confidential,
            vec!["PCI-DSS".to_string()],
            ExposureLevel::PublicInternet,
            1825,
            serde_json::json!({}),
            None, None, None, None, None, None, None, None, None, None, None, None
        );
        
        // Set PQC risk fields
        asset.environment = Some("prod".to_string());
        asset.business_criticality = BusinessCriticality::High;
        asset.crypto_usage = CryptoUsage::Channel;
        asset.algo_pk = AlgoPublicKey::RSA;
        asset.pk_key_bits = Some(2048);
        asset.algo_sym = AlgoSymmetric::AES;
        asset.sym_key_bits = Some(256);
        asset.protocol_version = Some("TLS1.2".to_string());
        asset.exposure_level = ExposureLevel::PublicInternet;
        asset.stores_long_lived_data = true;
        asset.sensitivity = SensitivityLevel::Confidential;
        asset.crypto_agility = CryptoAgility::Medium;
        
        let weights = RiskWeights::default();
        evaluate_and_update_asset_risk(&mut asset, &weights);
        
        // Verify risk scores are computed
        assert!(asset.aqv.is_some());
        assert!(asset.pqc_risk_score.is_some());
        assert!(asset.risk_class.is_some());
        
        // RSA should have high AQV
        assert_eq!(asset.aqv.unwrap(), 5);
    }
}
