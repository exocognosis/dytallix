use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "protection_mode", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ProtectionMode {
    Classical,
    Pqc,
    Hybrid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtectionPolicy {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub kem: String,
    pub signature_scheme: String,
    pub symmetric_algo: String,
    pub mode: ProtectionMode,
    pub rotation_interval_days: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ProtectionPolicy {
    pub fn new(
        name: String,
        description: String,
        kem: String,
        signature_scheme: String,
        symmetric_algo: String,
        mode: ProtectionMode,
        rotation_interval_days: i32,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            name,
            description,
            kem,
            signature_scheme,
            symmetric_algo,
            mode,
            rotation_interval_days,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_compatible_with_asset_type(&self, asset_type: &super::asset::AssetType) -> bool {
        use super::asset::AssetType;
        
        match asset_type {
            AssetType::TlsEndpoint | AssetType::Certificate => {
                !self.kem.is_empty() && !self.signature_scheme.is_empty()
            }
            AssetType::DataStore | AssetType::KeyMaterial => {
                !self.kem.is_empty() && !self.symmetric_algo.is_empty()
            }
            AssetType::ApiEndpoint => true,
            _ => false,
        }
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("Policy name cannot be empty".to_string());
        }
        
        if self.rotation_interval_days < 1 {
            return Err("Rotation interval must be at least 1 day".to_string());
        }

        match self.mode {
            ProtectionMode::Pqc | ProtectionMode::Hybrid => {
                if !["kyber512", "kyber768", "kyber1024"].contains(&self.kem.as_str()) {
                    return Err(format!("Invalid KEM for PQC mode: {}", self.kem));
                }
                if !["dilithium2", "dilithium3", "dilithium5", "falcon512", "falcon1024", "sphincssha2128ssimple"].contains(&self.signature_scheme.as_str()) {
                    return Err(format!("Invalid signature scheme for PQC mode: {}", self.signature_scheme));
                }
            }
            ProtectionMode::Classical => {
                if self.kem != "x25519" && !self.kem.is_empty() {
                    return Err(format!("Invalid KEM for classical mode: {}", self.kem));
                }
                if self.signature_scheme != "ed25519" && !self.signature_scheme.is_empty() {
                    return Err(format!("Invalid signature for classical mode: {}", self.signature_scheme));
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::asset::AssetType;

    #[test]
    fn test_policy_validation() {
        let mut policy = ProtectionPolicy::new(
            "Test Policy".to_string(),
            "Test".to_string(),
            "kyber768".to_string(),
            "dilithium3".to_string(),
            "aes256gcm".to_string(),
            ProtectionMode::Hybrid,
            180,
        );

        assert!(policy.validate().is_ok());

        policy.kem = "invalid_kem".to_string();
        assert!(policy.validate().is_err());
    }

    #[test]
    fn test_asset_compatibility() {
        let policy = ProtectionPolicy::new(
            "Hybrid Policy".to_string(),
            "Hybrid protection".to_string(),
            "kyber768".to_string(),
            "dilithium3".to_string(),
            "aes256gcm".to_string(),
            ProtectionMode::Hybrid,
            180,
        );

        assert!(policy.is_compatible_with_asset_type(&AssetType::TlsEndpoint));
        assert!(policy.is_compatible_with_asset_type(&AssetType::DataStore));
        assert!(policy.is_compatible_with_asset_type(&AssetType::ApiEndpoint));
    }
}
