//! PQC key management commands

use anyhow::{Result, anyhow};
use colored::*;
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use dirs::home_dir;

// Import PQC functionality
use dytallix_pqc::{SignatureAlgorithm, KeyPair};
use sha3::{Digest, Sha3_256};
use base64::{engine::general_purpose::STANDARD as B64, Engine};

// Direct PQC imports for keypair generation
use pqcrypto_traits::sign::{PublicKey, SecretKey};

/// Keystore entry structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeystoreEntry {
    pub address: String,
    pub algorithm: String,
    pub public_key_b64: String,
    #[serde(skip_serializing)] // Don't accidentally serialize secret key in logs
    pub secret_key_b64: String, // TODO: Add encryption at rest
    pub created: DateTime<Utc>,
    pub label: Option<String>,
}

/// Generate PQC keypair and save to keystore
pub async fn generate_pqc_keys(
    algo: String,
    keystore_path: Option<String>,
    label: Option<String>,
) -> Result<()> {
    println!("{}", "🔐 Generating PQC keypair...".bright_green());

    // Parse algorithm
    let algorithm = match algo.as_str() {
        "dilithium" => SignatureAlgorithm::Dilithium5,
        "falcon" => SignatureAlgorithm::Falcon1024,
        "sphincs" => SignatureAlgorithm::SphincsSha256128s,
        _ => return Err(anyhow!("Unsupported algorithm: {}. Use dilithium, falcon, or sphincs", algo)),
    };

    // Generate keypair directly using the lower-level functions
    let keypair = generate_signature_keypair(&algorithm)?;

    // Derive address from public key (SHA3-256(pk) first 20 bytes, prefixed with dyt1)
    let address = derive_address(&keypair.public_key);

    // Determine keystore path
    let keystore_path = match keystore_path {
        Some(path) => PathBuf::from(path),
        None => {
            let home = home_dir().ok_or_else(|| anyhow!("Cannot determine home directory"))?;
            home.join(".dyt").join("keystore")
        }
    };

    // Create keystore directory if it doesn't exist
    tokio::fs::create_dir_all(&keystore_path).await?;

    // Create keystore entry
    let entry = KeystoreEntry {
        address: address.clone(),
        algorithm: format!("{:?}", algorithm),
        public_key_b64: B64.encode(&keypair.public_key),
        secret_key_b64: B64.encode(&keypair.secret_key),
        created: Utc::now(),
        label: label.clone(),
    };

    // Generate filename
    let filename = format!("{}-{}.json", 
        address, 
        entry.created.format("%Y%m%d-%H%M%S")
    );
    let file_path = keystore_path.join(&filename);

    // Save to file
    let json = serde_json::to_string_pretty(&entry)?;
    tokio::fs::write(&file_path, json).await?;

    // Print results
    println!("{}", "✅ PQC keypair generated successfully!".bright_green());
    println!("{}     {}", "Algorithm:".bold(), algo);
    println!("{}      {}", "Address:".bold(), address.bright_blue());
    println!("{}   {}", "Public Key:".bold(), entry.public_key_b64);
    if let Some(label) = &label {
        println!("{}        {}", "Label:".bold(), label);
    }
    println!("{}    {}", "Keystore:".bold(), file_path.display());
    println!();
    println!("{}", "⚠️  WARNING: Secret key is stored unencrypted!".bright_yellow());
    println!("{}", "TODO: Implement encryption at rest for production use.".yellow());

    Ok(())
}

/// Generate signature keypair for the specified algorithm
fn generate_signature_keypair(algorithm: &SignatureAlgorithm) -> Result<KeyPair, anyhow::Error> {
    match algorithm {
        SignatureAlgorithm::Dilithium5 => {
            use pqcrypto_dilithium::dilithium5;
            use pqcrypto_traits::sign::{PublicKey, SecretKey};
            
            let (pk, sk) = dilithium5::keypair();
            Ok(KeyPair {
                public_key: pk.as_bytes().to_vec(),
                secret_key: sk.as_bytes().to_vec(),
                algorithm: algorithm.clone(),
            })
        }
        SignatureAlgorithm::Falcon1024 => {
            use pqcrypto_falcon::falcon1024;
            use pqcrypto_traits::sign::{PublicKey, SecretKey};
            
            let (pk, sk) = falcon1024::keypair();
            Ok(KeyPair {
                public_key: pk.as_bytes().to_vec(),
                secret_key: sk.as_bytes().to_vec(),
                algorithm: algorithm.clone(),
            })
        }
        SignatureAlgorithm::SphincsSha256128s => {
            use pqcrypto_sphincsplus::sphincssha2128ssimple;
            use pqcrypto_traits::sign::{PublicKey, SecretKey};
            
            let (pk, sk) = sphincssha2128ssimple::keypair();
            Ok(KeyPair {
                public_key: pk.as_bytes().to_vec(),
                secret_key: sk.as_bytes().to_vec(),
                algorithm: algorithm.clone(),
            })
        }
    }
}

/// Derive Dytallix address from public key
/// Uses SHA3-256(pk) first 20 bytes, prefixed with "dyt1"
fn derive_address(public_key: &[u8]) -> String {
    let mut hasher = Sha3_256::new();
    hasher.update(public_key);
    let hash = hasher.finalize();
    
    // Take first 20 bytes and encode as hex
    let addr_bytes = &hash[..20];
    let hex_addr = hex::encode(addr_bytes);
    
    format!("dyt1{}", hex_addr)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_address_derivation() {
        // Test address derivation with a known public key
        let test_pubkey = b"test_public_key_for_address_derivation_testing_123456789012345678901234567890";
        let address = derive_address(test_pubkey);
        
        // Address should start with dyt1 and be 44 characters total (dyt1 + 40 hex chars)
        assert!(address.starts_with("dyt1"), "Address should start with dyt1");
        assert_eq!(address.len(), 44, "Address should be 44 characters long");
        
        // Should be consistent
        let address2 = derive_address(test_pubkey);
        assert_eq!(address, address2, "Address derivation should be deterministic");
        
        println!("Test address: {}", address);
    }

    #[test] 
    fn test_keystore_entry_serialization() {
        let entry = KeystoreEntry {
            address: "dyt1test123456789012345678901234567890ab".to_string(),
            algorithm: "Dilithium5".to_string(),
            public_key_b64: "dGVzdF9wdWJsaWNfa2V5".to_string(),
            secret_key_b64: "dGVzdF9zZWNyZXRfa2V5".to_string(),
            created: chrono::Utc::now(),
            label: Some("test-key".to_string()),
        };

        // Test serialization
        let json = serde_json::to_string_pretty(&entry).unwrap();
        assert!(json.contains("dyt1test123"));
        assert!(json.contains("Dilithium5"));
        assert!(json.contains("test-key"));
        
        // Test deserialization
        let parsed: KeystoreEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.address, entry.address);
        assert_eq!(parsed.algorithm, entry.algorithm);
        
        println!("Keystore entry JSON:\n{}", json);
    }
}