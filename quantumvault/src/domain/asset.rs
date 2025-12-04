use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "asset_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    TlsEndpoint,
    Certificate,
    DataStore,
    KeyMaterial,
    ApiEndpoint,
    FileShare,
    Application,
    Protocol,
    Other,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "business_criticality", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum BusinessCriticality {
    Low,
    Medium,
    High,
    Critical,
    Unknown,
}

impl BusinessCriticality {
    pub fn weight(&self) -> i32 {
        match self {
            Self::High => 20,
            Self::Medium => 10,
            Self::Low => 0,
            _ => 0,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "exposure_level", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ExposureLevel {
    Internal,
    PartnerNetwork,
    PublicInternet,
    Unknown,
}

impl ExposureLevel {
    pub fn weight(&self) -> i32 {
        match self {
            Self::PublicInternet => 25,
            Self::PartnerNetwork => 15,
            Self::Internal => 5,
            Self::Unknown => 10, // Default weight for unknown
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "sensitivity_level", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum SensitivityLevel {
    Public,
    Internal,
    Confidential,
    Secret,
    TopSecret,
    Unknown,
}

impl SensitivityLevel {
    pub fn weight(&self) -> i32 {
        match self {
            Self::TopSecret | Self::Secret => 25, // Mapping RESTRICTED/SECRET to highest
            Self::Confidential => 15,
            Self::Internal => 8,
            Self::Public => 0,
            Self::Unknown => 10, // Default weight for unknown
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "pqc_compliance", rename_all = "UPPERCASE")]
#[serde(rename_all = "UPPERCASE")]
pub enum PqcCompliance {
    Compliant,
    NonCompliant,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "risk_class", rename_all = "PascalCase")]
#[serde(rename_all = "PascalCase")]
pub enum RiskClass {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "crypto_usage", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum CryptoUsage {
    Channel,
    DataAtRest,
    CodeSigning,
    PkiRoot,
    PkiLeaf,
    Vpn,
    Ssh,
    Other,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "algo_public_key", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum AlgoPublicKey {
    RSA,
    ECDSA,
    ECDH,
    DSA,
    DH,
    None,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "algo_symmetric", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum AlgoSymmetric {
    AES,
    TripleDES,
    RC4,
    DES,
    None,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "crypto_agility", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum CryptoAgility {
    High,
    Medium,
    Low,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Asset {
    pub id: Uuid,
    pub name: String,
    pub asset_type: AssetType,
    pub endpoint_or_path: String,
    pub owner: String,
    pub sensitivity: SensitivityLevel,
    pub regulatory_tags: Vec<String>,
    pub exposure_level: ExposureLevel,
    pub data_lifetime_days: i32,
    pub risk_score: i32,
    pub encryption_profile: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    
    // PQC Risk Classification Fields
    pub environment: Option<String>,
    pub business_criticality: BusinessCriticality,
    pub service_role: Option<String>,
    pub crypto_usage: CryptoUsage,
    pub algo_pk: AlgoPublicKey,
    pub pk_key_bits: Option<i32>,
    pub algo_sym: AlgoSymmetric,
    pub sym_key_bits: Option<i32>,
    pub hash_algo: Option<String>,
    pub protocol_version: Option<String>,
    pub crypto_agility: CryptoAgility,
    pub stores_long_lived_data: bool,
    pub classical_issues: Option<Vec<String>>,
    
    // PQC Risk Scores (Computed)
    pub aqv: Option<i16>,
    pub dlv: Option<i16>,
    pub imp: Option<i16>,
    pub exp: Option<i16>,
    pub agi: Option<i16>,
    pub ccw: Option<i16>,
    pub pqc_risk_score: Option<i16>,
    
    // MVP New Fields
    pub wrapper_enabled: bool,
    pub wrapper_algorithm: Option<String>,
    pub wrapper_anchor_id: Option<Uuid>,
    pub wrapper_last_updated_at: Option<DateTime<Utc>>,
    pub policies_applied: serde_json::Value,
    pub last_scan_timestamp: Option<DateTime<Utc>>,
    pub pqc_compliance: PqcCompliance,
    pub risk_class: Option<RiskClass>,
}

impl Asset {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        name: String,
        asset_type: AssetType,
        endpoint_or_path: String,
        owner: String,
        sensitivity: SensitivityLevel,
        regulatory_tags: Vec<String>,
        exposure_level: ExposureLevel,
        data_lifetime_days: i32,
        encryption_profile: serde_json::Value,
        environment: Option<String>,
        business_criticality: Option<BusinessCriticality>,
        // Optional PQC fields
        service_role: Option<String>,
        crypto_usage: Option<CryptoUsage>,
        algo_pk: Option<AlgoPublicKey>,
        pk_key_bits: Option<i32>,
        algo_sym: Option<AlgoSymmetric>,
        sym_key_bits: Option<i32>,
        hash_algo: Option<String>,
        protocol_version: Option<String>,
        crypto_agility: Option<CryptoAgility>,
        stores_long_lived_data: Option<bool>,
    ) -> Self {
        let now = Utc::now();
        
        let mut asset = Self {
            id: Uuid::new_v4(),
            name,
            asset_type,
            endpoint_or_path,
            owner,
            sensitivity,
            regulatory_tags,
            exposure_level,
            data_lifetime_days,
            risk_score: 0, // Computed below
            encryption_profile,
            created_at: now,
            updated_at: now,
            environment,
            business_criticality: business_criticality.unwrap_or(BusinessCriticality::Unknown),
            service_role,
            crypto_usage: crypto_usage.unwrap_or(CryptoUsage::Other),
            algo_pk: algo_pk.unwrap_or(AlgoPublicKey::None),
            pk_key_bits,
            algo_sym: algo_sym.unwrap_or(AlgoSymmetric::None),
            sym_key_bits,
            hash_algo,
            protocol_version,
            crypto_agility: crypto_agility.unwrap_or(CryptoAgility::Unknown),
            stores_long_lived_data: stores_long_lived_data.unwrap_or(false),
            classical_issues: None,
            aqv: None, dlv: None, imp: None, exp: None, agi: None, ccw: None, pqc_risk_score: None,
            wrapper_enabled: false,
            wrapper_algorithm: None,
            wrapper_anchor_id: None,
            wrapper_last_updated_at: None,
            policies_applied: serde_json::json!([]),
            last_scan_timestamp: None,
            pqc_compliance: PqcCompliance::Unknown,
            risk_class: None,
        };
        
        asset.recompute_risk_score();
        asset
    }

    pub fn update_classification(
        &mut self,
        sensitivity: SensitivityLevel,
        regulatory_tags: Vec<String>,
        exposure_level: ExposureLevel,
        data_lifetime_days: i32,
        owner: String,
        business_criticality: BusinessCriticality,
    ) {
        self.sensitivity = sensitivity;
        self.regulatory_tags = regulatory_tags;
        self.exposure_level = exposure_level;
        self.data_lifetime_days = data_lifetime_days;
        self.owner = owner;
        self.business_criticality = business_criticality;
        self.recompute_risk_score();
        self.updated_at = Utc::now();
    }

    pub fn recompute_risk_score(&mut self) {
        // Base score from algorithm compliance
        let base_algo = match self.pqc_compliance {
            PqcCompliance::Compliant => 10,
            // Assume hybrid if wrapper is enabled for now, or check encryption_profile
            _ if self.wrapper_enabled => 30, 
            _ => 60,
        };

        // Staleness weight
        let staleness_weight = if let Some(last_scan) = self.last_scan_timestamp {
            let days = (Utc::now() - last_scan).num_days();
            if days <= 7 { 0 }
            else if days <= 30 { 5 }
            else if days <= 90 { 10 }
            else { 15 }
        } else {
            15 // Never scanned is stale
        };

        let raw_score = base_algo 
            + self.exposure_level.weight()
            + self.sensitivity.weight()
            + self.business_criticality.weight()
            + staleness_weight;

        self.risk_score = raw_score.clamp(0, 100);
        
        self.risk_class = Some(match self.risk_score {
            0..=24 => RiskClass::Low,
            25..=49 => RiskClass::Medium,
            50..=74 => RiskClass::High,
            _ => RiskClass::Critical,
        });
    }

    pub fn update_encryption_profile(&mut self, profile: serde_json::Value) {
        self.encryption_profile = profile;
        self.updated_at = Utc::now();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_risk_scoring_logic() {
        let mut asset = Asset::new(
            "Test Asset".to_string(),
            AssetType::DataStore,
            "/data".to_string(),
            "admin".to_string(),
            SensitivityLevel::Internal, // 8
            vec![],
            ExposureLevel::Internal, // 5
            365,
            serde_json::json!({}),
            Some("PROD".to_string()),
            Some(BusinessCriticality::Medium), // 10
            None, None, None, None, None, None, None, None, None, None
        );
        
        // Initial state: Unknown compliance (60) + Internal(8) + Internal(5) + Medium(10) + Stale(15) = 98
        // Wait, logic: base(60) + exp(5) + sens(8) + crit(10) + stale(15) = 98.
        assert_eq!(asset.risk_score, 98);
        assert_eq!(asset.risk_class, Some(RiskClass::Critical));

        // Mark compliant
        asset.pqc_compliance = PqcCompliance::Compliant;
        asset.last_scan_timestamp = Some(Utc::now()); // Not stale (0)
        asset.recompute_risk_score();
        
        // New score: base(10) + 5 + 8 + 10 + 0 = 33 -> Medium
        assert_eq!(asset.risk_score, 33);
        assert_eq!(asset.risk_class, Some(RiskClass::Medium));
    }
}

