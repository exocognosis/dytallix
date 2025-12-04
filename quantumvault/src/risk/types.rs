use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BusinessCriticality {
    Low,
    Medium,
    High,
    Critical,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Exposure {
    Internet,
    Partner,
    Internal,
    Restricted,
    Airgapped,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DataSensitivity {
    Public,
    Internal,
    Confidential,
    Regulated,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CryptoAgility {
    High,
    Medium,
    Low,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskClass {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum AlgoPublicKey {
    RSA,
    ECDSA,
    ECDH,
    DSA,
    DH,
    None,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum AlgoSymmetric {
    AES,
    #[serde(rename = "3DES")]
    TripleDES,
    RC4,
    DES,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub asset_id: String,
    pub hostname: String,
    pub ip: String,
    pub port: u16,
    pub protocol: String,

    pub environment: String, // "prod" | "non-prod"
    pub service_role: Option<String>,
    pub business_criticality: BusinessCriticality,

    pub crypto_usage: CryptoUsage,

    pub algo_pk: AlgoPublicKey,
    pub pk_key_bits: Option<u32>,

    pub algo_sym: AlgoSymmetric,
    pub sym_key_bits: Option<u32>,

    pub hash_algo: String,
    pub protocol_version: String,

    pub exposure: Exposure,
    pub stores_long_lived_data: bool,
    pub data_sensitivity: DataSensitivity,

    pub crypto_agility: CryptoAgility,
    pub classical_issues: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dimensions {
    pub aqv: u8, // Algorithm Quantum Vulnerability (0-5)
    pub dlv: u8, // Data Longevity / Time-to-Value (0-5)
    pub imp: u8, // Business / System Impact (0-5)
    pub exp: u8, // Exposure (0-5)
    pub agi: u8, // Cryptographic Agility (0-5)
    pub ccw: u8, // Classical Crypto Weakness (0-5)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskWeights {
    pub aqv: f64,
    pub dlv: f64,
    pub imp: f64,
    pub exp: f64,
    pub agi: f64,
    pub ccw: f64,
}

impl Default for RiskWeights {
    fn default() -> Self {
        Self {
            aqv: 0.20,
            dlv: 0.25,
            imp: 0.25,
            exp: 0.10,
            agi: 0.10,
            ccw: 0.10,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetWithRisk {
    #[serde(flatten)]
    pub asset: Asset,

    // Dimension scores
    pub aqv: u8,
    pub dlv: u8,
    pub imp: u8,
    pub exp: u8,
    pub agi: u8,
    pub ccw: u8,

    pub pqc_risk_score: u8,
    pub risk_class: RiskClass,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskSummary {
    pub total_assets: usize,
    pub by_risk_class: RiskClassCounts,
    pub by_environment: EnvironmentRiskCounts,
    pub by_crypto_usage: CryptoUsageCounts,
    pub average_risk_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskClassCounts {
    #[serde(rename = "Low")]
    pub low: usize,
    #[serde(rename = "Medium")]
    pub medium: usize,
    #[serde(rename = "High")]
    pub high: usize,
    #[serde(rename = "Critical")]
    pub critical: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentRiskCounts {
    pub prod: RiskClassCounts,
    #[serde(rename = "non-prod")]
    pub non_prod: RiskClassCounts,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CryptoUsageCounts {
    pub channel: usize,
    pub data_at_rest: usize,
    pub code_signing: usize,
    pub pki_root: usize,
    pub pki_leaf: usize,
    pub vpn: usize,
    pub ssh: usize,
    pub other: usize,
}
