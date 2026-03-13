use crate::domain::asset::{
    Asset, BusinessCriticality, CryptoUsage, ExposureLevel,
    SensitivityLevel, CryptoAgility
};
use std::collections::HashMap;

/// Asset deployment preset - represents common deployment patterns
#[derive(Debug, Clone)]
pub struct AssetPreset {
    pub name: &'static str,
    pub description: &'static str,
    pub business_criticality: BusinessCriticality,
    pub crypto_usage: CryptoUsage,
    pub exposure: ExposureLevel,
    pub data_sensitivity: SensitivityLevel,
    pub crypto_agility: CryptoAgility,
    pub stores_long_lived_data: bool,
    pub typical_environments: Vec<&'static str>,
}

impl AssetPreset {
    /// Apply this preset to an Asset, filling in missing fields
    pub fn apply_to_asset(&self, asset: &mut Asset) {
        if asset.business_criticality == BusinessCriticality::Unknown {
            asset.business_criticality = self.business_criticality.clone();
        }
        if asset.crypto_usage == CryptoUsage::Other {
            asset.crypto_usage = self.crypto_usage.clone();
        }
        if asset.exposure_level == ExposureLevel::Unknown {
            asset.exposure_level = self.exposure.clone();
        }
        if asset.sensitivity == SensitivityLevel::Unknown {
            asset.sensitivity = self.data_sensitivity.clone();
        }
        if asset.crypto_agility == CryptoAgility::Unknown {
            asset.crypto_agility = self.crypto_agility.clone();
        }
        if !asset.stores_long_lived_data {
            asset.stores_long_lived_data = self.stores_long_lived_data;
        }
    }
}

/// Preset profiles for common asset deployment patterns
pub fn get_asset_presets() -> HashMap<&'static str, AssetPreset> {
    let mut presets = HashMap::new();

    // PKI Root CA
    presets.insert("pki_root", AssetPreset {
        name: "PKI Root CA",
        description: "Root Certificate Authority - extremely long-lived, high-impact",
        business_criticality: BusinessCriticality::Critical,
        crypto_usage: CryptoUsage::PkiRoot,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::Low, // Very hard to rotate root CA
        stores_long_lived_data: true, // Certificates valid for years/decades
        typical_environments: vec!["production", "dr"],
    });

    // Code Signing
    presets.insert("code_signing", AssetPreset {
        name: "Code Signing Key",
        description: "Software/firmware signing - long-lived, very hard to revoke",
        business_criticality: BusinessCriticality::Critical,
        crypto_usage: CryptoUsage::CodeSigning,
        exposure: ExposureLevel::PartnerNetwork, // Signed code distributed externally
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::Low, // Extremely hard to rotate after distribution
        stores_long_lived_data: true, // Signatures remain valid indefinitely
        typical_environments: vec!["production", "build"],
    });

    // Database Encryption
    presets.insert("database_encryption", AssetPreset {
        name: "Database Encryption",
        description: "Database TDE/encryption at rest - long-lived critical data",
        business_criticality: BusinessCriticality::High,
        crypto_usage: CryptoUsage::DataAtRest,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Secret, // Often contains PII, PHI, PCI
        crypto_agility: CryptoAgility::Medium, // Can be rotated but requires planning
        stores_long_lived_data: true, // Data retained for years
        typical_environments: vec!["production", "dr", "staging"],
    });

    // VPN Gateway
    presets.insert("vpn_gateway", AssetPreset {
        name: "VPN Gateway",
        description: "VPN tunnel endpoint - medium/high impact, medium agility",
        business_criticality: BusinessCriticality::High,
        crypto_usage: CryptoUsage::Vpn,
        exposure: ExposureLevel::PublicInternet, // Exposed to remote workers
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::Medium, // Can upgrade but requires client updates
        stores_long_lived_data: false, // Session keys are ephemeral
        typical_environments: vec!["production", "corporate"],
    });

    // API Gateway / Load Balancer TLS
    presets.insert("api_gateway_tls", AssetPreset {
        name: "API Gateway TLS",
        description: "Public-facing API/web server TLS endpoint",
        business_criticality: BusinessCriticality::High,
        crypto_usage: CryptoUsage::Channel,
        exposure: ExposureLevel::PublicInternet, // Publicly accessible
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::High, // Can rotate certs easily
        stores_long_lived_data: false, // TLS sessions are ephemeral
        typical_environments: vec!["production", "staging"],
    });

    // Internal Service TLS
    presets.insert("internal_service_tls", AssetPreset {
        name: "Internal Service TLS",
        description: "Service-to-service mTLS or internal API",
        business_criticality: BusinessCriticality::Medium,
        crypto_usage: CryptoUsage::Channel,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Internal,
        crypto_agility: CryptoAgility::High, // Easier to rotate internally
        stores_long_lived_data: false,
        typical_environments: vec!["production", "staging", "dev"],
    });

    // SSH Server
    presets.insert("ssh_server", AssetPreset {
        name: "SSH Server",
        description: "SSH host key or authorized key for remote access",
        business_criticality: BusinessCriticality::Medium,
        crypto_usage: CryptoUsage::Ssh,
        exposure: ExposureLevel::PartnerNetwork, // Often accessible via bastion/VPN
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::Medium, // Can rotate but requires client updates
        stores_long_lived_data: false,
        typical_environments: vec!["production", "staging", "dev"],
    });

    // Document Archive
    presets.insert("document_archive", AssetPreset {
        name: "Document Archive",
        description: "Long-term document storage (backups, archives, compliance)",
        business_criticality: BusinessCriticality::High,
        crypto_usage: CryptoUsage::DataAtRest,
        exposure: ExposureLevel::Internal, // Limited access
        data_sensitivity: SensitivityLevel::Secret, // Often legal/compliance hold
        crypto_agility: CryptoAgility::Low, // Archives are hard to re-encrypt
        stores_long_lived_data: true, // Retained for 7+ years
        typical_environments: vec!["production", "archive"],
    });

    // User Data Storage
    presets.insert("user_data_storage", AssetPreset {
        name: "User Data Storage",
        description: "User-generated content, files, or profile data",
        business_criticality: BusinessCriticality::High,
        crypto_usage: CryptoUsage::DataAtRest,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Confidential, // User PII
        crypto_agility: CryptoAgility::Medium, // Can re-encrypt but costly
        stores_long_lived_data: true, // User data retained long-term
        typical_environments: vec!["production", "dr"],
    });

    // Session/Cache Encryption
    presets.insert("session_cache", AssetPreset {
        name: "Session/Cache Encryption",
        description: "Short-lived session tokens or cached data",
        business_criticality: BusinessCriticality::Medium,
        crypto_usage: CryptoUsage::DataAtRest,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Internal,
        crypto_agility: CryptoAgility::High, // Easy to rotate
        stores_long_lived_data: false, // TTL < 24 hours
        typical_environments: vec!["production", "staging"],
    });

    // Blockchain/Ledger
    presets.insert("blockchain_ledger", AssetPreset {
        name: "Blockchain/Ledger",
        description: "Immutable ledger or blockchain node",
        business_criticality: BusinessCriticality::Critical,
        crypto_usage: CryptoUsage::Other,
        exposure: ExposureLevel::PublicInternet, // Often public or partner network
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::Low, // Cannot change historical signatures
        stores_long_lived_data: true, // Immutable, permanent record
        typical_environments: vec!["production", "mainnet", "testnet"],
    });

    // IoT/Embedded Device
    presets.insert("iot_device", AssetPreset {
        name: "IoT/Embedded Device",
        description: "IoT sensor, embedded firmware, or constrained device",
        business_criticality: BusinessCriticality::Medium,
        crypto_usage: CryptoUsage::Other,
        exposure: ExposureLevel::PartnerNetwork, // Often on customer premises
        data_sensitivity: SensitivityLevel::Internal,
        crypto_agility: CryptoAgility::Low, // Firmware updates are hard
        stores_long_lived_data: false,
        typical_environments: vec!["production", "field"],
    });

    // Backup Encryption
    presets.insert("backup_encryption", AssetPreset {
        name: "Backup Encryption",
        description: "Encrypted backup (database dumps, snapshots)",
        business_criticality: BusinessCriticality::Critical,
        crypto_usage: CryptoUsage::DataAtRest,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Secret, // Contains full production data
        crypto_agility: CryptoAgility::Low, // Hard to re-encrypt old backups
        stores_long_lived_data: true, // Retained for disaster recovery
        typical_environments: vec!["production", "dr"],
    });

    // Configuration Secret
    presets.insert("config_secret", AssetPreset {
        name: "Configuration Secret",
        description: "Encrypted config file or secret storage (Vault, etc.)",
        business_criticality: BusinessCriticality::High,
        crypto_usage: CryptoUsage::Other,
        exposure: ExposureLevel::Internal,
        data_sensitivity: SensitivityLevel::Confidential,
        crypto_agility: CryptoAgility::High, // Secrets can be rotated
        stores_long_lived_data: false,
        typical_environments: vec!["production", "staging", "dev"],
    });

    presets
}

/// Infer preset key from asset metadata (filename, tags, environment, etc.)
pub fn infer_preset_from_asset(asset: &Asset) -> Option<&'static str> {
    let name_lower = asset.name.to_lowercase();
    let endpoint_lower = asset.endpoint_or_path.to_lowercase();
    let env_lower = asset.environment.as_ref().map(|s| s.to_lowercase()).unwrap_or_default();

    // Check for PKI/CA
    if name_lower.contains("root") && (name_lower.contains("ca") || name_lower.contains("certificate"))
        || name_lower.contains("rootca")
        || endpoint_lower.contains("rootca")
    {
        return Some("pki_root");
    }

    // Check for code signing
    if name_lower.contains("code") && name_lower.contains("sign")
        || name_lower.contains("signing")
        || name_lower.contains("codesign")
    {
        return Some("code_signing");
    }

    // Check for database
    if name_lower.contains("database") || name_lower.contains("postgres") || name_lower.contains("mysql")
        || name_lower.contains("tde") || endpoint_lower.contains("db")
    {
        return Some("database_encryption");
    }

    // Check for VPN
    if name_lower.contains("vpn") || endpoint_lower.contains("vpn") {
        return Some("vpn_gateway");
    }

    // Check for backup
    if name_lower.contains("backup") || name_lower.contains("snapshot") || name_lower.contains("dump") {
        return Some("backup_encryption");
    }

    // Check for archive
    if name_lower.contains("archive") || env_lower.contains("archive") {
        return Some("document_archive");
    }

    // Check for blockchain
    if name_lower.contains("blockchain") || name_lower.contains("ledger") || name_lower.contains("anchor") {
        return Some("blockchain_ledger");
    }

    // Check for IoT
    if name_lower.contains("iot") || name_lower.contains("device") || name_lower.contains("sensor") {
        return Some("iot_device");
    }

    // Check for SSH
    if name_lower.contains("ssh") || endpoint_lower.contains(":22") {
        return Some("ssh_server");
    }

    // Check for API gateway
    if (name_lower.contains("api") || name_lower.contains("gateway") || name_lower.contains("load"))
        && (name_lower.contains("tls") || name_lower.contains("https"))
    {
        return Some("api_gateway_tls");
    }

    // Check for session/cache
    if name_lower.contains("session") || name_lower.contains("cache") || name_lower.contains("redis") {
        return Some("session_cache");
    }

    // Check for secrets
    if name_lower.contains("secret") || name_lower.contains("vault") || name_lower.contains("config") {
        return Some("config_secret");
    }

    // Default based on crypto usage if set (only if not "Other" which means unknown)
    match asset.crypto_usage {
        CryptoUsage::PkiRoot => Some("pki_root"),
        CryptoUsage::CodeSigning => Some("code_signing"),
        CryptoUsage::Vpn => Some("vpn_gateway"),
        CryptoUsage::Ssh => Some("ssh_server"),
        CryptoUsage::Channel if asset.exposure_level == ExposureLevel::PublicInternet => Some("api_gateway_tls"),
        CryptoUsage::Channel => Some("internal_service_tls"),
        CryptoUsage::DataAtRest if asset.stores_long_lived_data => Some("database_encryption"),
        CryptoUsage::DataAtRest => Some("session_cache"),
        _ => None, // No preset for Other/PkiLeaf - needs user input
    }
}

/// Apply preset to asset, merging with existing data
pub fn apply_preset(asset: &mut Asset, preset_key: &str) {
    let presets = get_asset_presets();
    if let Some(preset) = presets.get(preset_key) {
        preset.apply_to_asset(asset);
    }
}
