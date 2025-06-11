use anyhow::Result;
use dytallix_pqc::{AccountManager, SignatureAlgorithm, KeyExchangeAlgorithm};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use dirs::home_dir;

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
    account_manager: AccountManager,
}

impl CryptoManager {
    pub fn new() -> Result<Self> {
        let config = PQCConfig::default();
        let account_manager = AccountManager::new(&config.data_dir)
            .map_err(|e| anyhow::anyhow!("Failed to initialize account manager: {}", e))?;
        
        Ok(Self {
            config,
            account_manager,
        })
    }
    
    pub fn new_with_config(config: PQCConfig) -> Result<Self> {
        let account_manager = AccountManager::new(&config.data_dir)
            .map_err(|e| anyhow::anyhow!("Failed to initialize account manager: {}", e))?;
        
        Ok(Self {
            config,
            account_manager,
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
        let sig_alg = signature_alg.unwrap_or(self.config.default_signature_algorithm.clone());
        let kex_alg = key_exchange_alg.unwrap_or(self.config.default_key_exchange_algorithm.clone());
        
        let account = self.account_manager.create_account(name, sig_alg, kex_alg, passphrase)
            .map_err(|e| anyhow::anyhow!("Failed to create account: {}", e))?;
        
        Ok(account.address)
    }
    
    /// List all accounts
    pub fn list_accounts(&self) -> Vec<String> {
        self.account_manager.list_accounts()
    }
    
    /// Get account information
    pub fn get_account_info(&self, name: &str) -> Result<Option<AccountInfo>> {
        if let Some(account) = self.account_manager.get_account(name) {
            Ok(Some(AccountInfo {
                name: account.name.clone(),
                address: account.address.clone(),
                signature_algorithm: format!("{:?}", account.signature_algorithm),
                key_exchange_algorithm: format!("{:?}", account.key_exchange_algorithm),
                created_at: account.created_at,
                public_key_hex: hex::encode(&account.public_key),
                key_exchange_public_key_hex: hex::encode(&account.key_exchange_public_key),
            }))
        } else {
            Ok(None)
        }
    }
    
    /// Sign a message with an account
    pub fn sign_message(
        &mut self,
        account_name: &str,
        message: &[u8],
        passphrase: Option<&str>,
    ) -> Result<String> {
        let pqc_manager = self.account_manager.get_pqc_manager(account_name, passphrase)
            .map_err(|e| anyhow::anyhow!("Failed to get PQC manager: {}", e))?;
        
        let signature = pqc_manager.sign(message)
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
        let export_data = self.account_manager.export_account(name, include_private_keys)
            .map_err(|e| anyhow::anyhow!("Failed to export account: {}", e))?;
        
        serde_json::to_string_pretty(&export_data)
            .map_err(|e| anyhow::anyhow!("Failed to serialize export data: {}", e))
    }
    
    /// Import an account
    pub fn import_account(&mut self, account_data: &str, passphrase: Option<&str>) -> Result<String> {
        self.account_manager.import_account(account_data, passphrase)
            .map_err(|e| anyhow::anyhow!("Failed to import account: {}", e))
    }
    
    /// Generate a new address (without storing the account)
    pub fn generate_address() -> Result<(String, String, String)> {
        use dytallix_pqc::PQCManager;
        
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