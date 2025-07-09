use anyhow::Result;
use dytallix_pqc::{SignatureAlgorithm, KeyExchangeAlgorithm, PQCManager, KeyPair, Signature};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use dirs::home_dir;
use chrono;

/// Configuration for PQC operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PQCConfig {
    pub data_dir: PathBuf,
    pub default_signature_algorithm: SignatureAlgorithm,
    pub default_key_exchange_algorithm: KeyExchangeAlgorithm,
}

impl Default for PQCConfig {
    fn default() -> Self {
        let mut data_dir = home_dir().unwrap_or_else(|| PathBuf::from("."));
        data_dir.push(".dytallix");
        data_dir.push("accounts");
        
        Self {
            data_dir,
            default_signature_algorithm: SignatureAlgorithm::Dilithium5,
            default_key_exchange_algorithm: KeyExchangeAlgorithm::Kyber1024,
        }
    }
}

/// PQC crypto operations manager
pub struct CryptoManager {
    config: PQCConfig,
    pqc_manager: PQCManager,
}

impl CryptoManager {
    pub fn new() -> Result<Self> {
        let config = PQCConfig::default();
        let pqc_manager = PQCManager::new()
            .map_err(|e| anyhow::anyhow!("Failed to initialize PQC manager: {}", e))?;
        
        Ok(Self {
            config,
            pqc_manager,
        })
    }
    
    pub fn new_with_config(config: PQCConfig) -> Result<Self> {
        let pqc_manager = PQCManager::new()
            .map_err(|e| anyhow::anyhow!("Failed to initialize PQC manager: {}", e))?;
        
        Ok(Self {
            config,
            pqc_manager,
        })
    }
    
    /// Create a new PQC account
    pub fn create_account(
        &mut self,
        name: String,
        passphrase: Option<&str>,
        signature_alg: Option<SignatureAlgorithm>,
        key_exchange_alg: Option<KeyExchangeAlgorithm>,
    ) -> Result<String> {
        let _sig_alg = signature_alg.unwrap_or(self.config.default_signature_algorithm.clone());
        let _kex_alg = key_exchange_alg.unwrap_or(self.config.default_key_exchange_algorithm.clone());
        
        // For now, just return a mock account address
        // In a real implementation, this would create and store the account
        Ok(format!("dyt1{}", hex::encode(&name.as_bytes()[..8])))
    }
    
    /// List all accounts
    pub fn list_accounts(&self) -> Vec<String> {
        // For now, return a mock list
        // In a real implementation, this would read from storage
        vec!["dyt1default".to_string()]
    }
    
    /// Get account information
    pub fn get_account_info(&self, name: &str) -> Result<Option<AccountInfo>> {
        // For now, return a mock account info
        // In a real implementation, this would read from storage
        Ok(Some(AccountInfo {
            name: name.to_string(),
            address: format!("dyt1{}", hex::encode(&name.as_bytes()[..8])),
            signature_algorithm: "Dilithium5".to_string(),
            key_exchange_algorithm: "Kyber1024".to_string(),
            created_at: chrono::Utc::now().timestamp() as u64,
            public_key_hex: "deadbeef".to_string(),
            key_exchange_public_key_hex: "deadbeef".to_string(),
        }))
    }
    
    /// Sign a message with an account
    pub fn sign_message(
        &mut self,
        account_name: &str,
        message: &[u8],
        passphrase: Option<&str>,
    ) -> Result<String> {
        // Create a signature using the PQC manager
        let signature = self.pqc_manager.sign(message)
            .map_err(|e| anyhow::anyhow!("Failed to sign message: {}", e))?;
        
        Ok(hex::encode(signature.data))
    }
    
    /// Verify a signature
    pub fn verify_signature(
        &self,
        message: &[u8],
        signature_hex: &str,
        public_key_hex: &str,
        algorithm: SignatureAlgorithm,
    ) -> Result<bool> {
        let signature_data = hex::decode(signature_hex)
            .map_err(|e| anyhow::anyhow!("Invalid signature hex: {}", e))?;
        
        let public_key = hex::decode(public_key_hex)
            .map_err(|e| anyhow::anyhow!("Invalid public key hex: {}", e))?;
        
        let signature = dytallix_pqc::Signature {
            data: signature_data,
            algorithm,
        };
        
        // Create a temporary PQC manager for verification
        let temp_manager = dytallix_pqc::PQCManager::new()
            .map_err(|e| anyhow::anyhow!("Failed to create PQC manager: {}", e))?;
        
        let is_valid = temp_manager.verify(message, &signature, &public_key)
            .map_err(|e| anyhow::anyhow!("Verification failed: {}", e))?;
        
        Ok(is_valid)
    }
    
    /// Export an account
    pub fn export_account(&self, name: &str, include_private_keys: bool) -> Result<String> {
        // For now, return mock export data
        // In a real implementation, this would serialize account data
        let export_data = serde_json::json!({
            "name": name,
            "address": format!("dyt1{}", hex::encode(&name.as_bytes()[..8])),
            "include_private_keys": include_private_keys,
            "mock": true
        });
        
        Ok(export_data.to_string())
    }
    
    /// Import an account
    pub fn import_account(&mut self, account_data: &str, passphrase: Option<&str>) -> Result<String> {
        // For now, return mock import result
        // In a real implementation, this would deserialize and store account data
        Ok("mock_imported_account".to_string())
    }
    
    /// Generate a new address (without storing the account)
    pub fn generate_address() -> Result<(String, String, String)> {
        let pqc_manager = PQCManager::new()
            .map_err(|e| anyhow::anyhow!("Failed to create PQC manager: {}", e))?;
        
        let public_key_hex = hex::encode(pqc_manager.get_signature_public_key());
        let kex_public_key_hex = hex::encode(pqc_manager.get_key_exchange_public_key());
        
        // Generate address from public key
        let address = generate_address_from_public_key(pqc_manager.get_signature_public_key());
        
        Ok((address, public_key_hex, kex_public_key_hex))
    }
}

/// Account information for display
#[derive(Debug, Serialize, Deserialize)]
pub struct AccountInfo {
    pub name: String,
    pub address: String,
    pub signature_algorithm: String,
    pub key_exchange_algorithm: String,
    pub created_at: u64,
    pub public_key_hex: String,
    pub key_exchange_public_key_hex: String,
}

/// Generate Dytallix address from public key
pub fn generate_address_from_public_key(public_key: &[u8]) -> String {
    use sha3::{Sha3_256, Digest};
    
    let mut hasher = Sha3_256::new();
    hasher.update(b"dytallix_address_v1");
    hasher.update(public_key);
    let hash = hasher.finalize();
    
    // Take first 20 bytes and encode with Dytallix prefix
    let address_bytes = &hash[..20];
    format!("dyt1{}", hex::encode(address_bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[test]
    fn test_crypto_manager_creation() {
        let temp_dir = TempDir::new().unwrap();
        let config = PQCConfig {
            data_dir: temp_dir.path().to_path_buf(),
            ..Default::default()
        };
        
        let crypto_manager = CryptoManager::new_with_config(config);
        assert!(crypto_manager.is_ok());
    }
    
    #[test]
    fn test_address_generation() {
        let (address, _, _) = CryptoManager::generate_address().unwrap();
        assert!(address.starts_with("dyt1"));
        assert_eq!(address.len(), 44); // "dyt1" + 40 hex chars
    }
}