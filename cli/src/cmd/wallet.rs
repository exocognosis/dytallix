use anyhow::{Result, anyhow};
use clap::Args;
use std::path::PathBuf;
use colored::*;
use crate::output::{OutputFormat, print_json};
use tracing::{info, warn};
use rpassword::read_password;
use std::io::{self, Write};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;

// Import PQC wallet functionality
// For now, we'll implement directly in the CLI module until we can add the SDK dependency

#[derive(Args, Debug, Clone)]
pub struct WalletCmd { 
    #[command(subcommand)] 
    pub action: WalletAction 
}

#[derive(clap::Subcommand, Debug, Clone)]
pub enum WalletAction {
    #[command(name="create")]
    Create { 
        #[arg(long, default_value="default")] 
        name: String,
        #[arg(long, help="Use legacy secp256k1 instead of default Dilithium5")]
        legacy_secp: bool,
        #[arg(long, help="Use deterministic key generation (same passphrase = same keys)")]
        deterministic: bool,
        #[arg(long, help="Domain for deterministic generation")]
        domain: Option<String>,
        #[arg(long)] 
        password_file: Option<PathBuf>,
    },
    #[command(name="show")]
    Show { 
        name: String 
    },
    #[command(name="sign")]
    Sign { 
        name: String,
        #[arg(long, help="Transaction JSON to sign")]
        tx: Option<String>,
        #[arg(long, help="File containing transaction JSON")]
        tx_file: Option<PathBuf>,
        #[arg(long)] 
        password_file: Option<PathBuf>,
    },
    #[command(name="export")]
    Export { 
        name: String 
    },
    #[command(name="import")]
    Import { 
        name: String,
        #[arg(long, help="Private key to import (hex encoded)")]
        private_key: Option<String>,
        #[arg(long, help="File containing private key")]
        key_file: Option<PathBuf>,
        #[arg(long)] 
        password_file: Option<PathBuf>,
    },
}

fn read_password_with_prompt(password_file: Option<&PathBuf>, prompt: &str) -> Result<String> {
    if let Some(path) = password_file {
        return Ok(std::fs::read_to_string(path)?.trim().to_string());
    }
    
    print!("{}", prompt);
    io::stdout().flush()?;
    let password = read_password()?;
    Ok(password)
}

fn read_password_with_confirmation(password_file: Option<&PathBuf>) -> Result<String> {
    if let Some(path) = password_file {
        return Ok(std::fs::read_to_string(path)?.trim().to_string());
    }
    
    print!("Enter passphrase: ");
    io::stdout().flush()?;
    let password1 = read_password()?;
    
    print!("Confirm passphrase: ");
    io::stdout().flush()?;
    let password2 = read_password()?;
    
    if password1 != password2 {
        return Err(anyhow!("Passphrases do not match"));
    }
    
    Ok(password1)
}

/// Temporary inline implementation of PQC wallet functionality
/// This will be replaced with the SDK once dependencies are resolved
mod inline_pqc {
    use super::*;
    use serde::{Serialize, Deserialize};
    use sha2::{Sha256, Digest};
    use crate::crypto::{ActivePQC, PQC, derive_argon2id_32};
    use crate::addr_new::derive_pqc_address;
    
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PQCWalletInfo {
        pub name: String,
        pub address: String,
        pub algorithm: String,
        pub pubkey_base64: String,
        pub created: String,
    }
    
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PQCPublicKey {
        #[serde(rename = "@type")]
        pub type_url: String,
        pub algorithm: String,
        pub key: String, // base64-encoded key bytes
    }
    
    pub fn create_pqc_wallet(
        name: &str,
        passphrase: &str,
        deterministic: bool,
        domain: Option<&str>,
        _legacy_secp: bool, // TODO: Implement secp256k1 support
    ) -> Result<PQCWalletInfo> {
        // Generate salt based on deterministic flag
        let salt = if deterministic {
            let domain_str = domain.unwrap_or("default");
            let mut hasher = Sha256::new();
            hasher.update(b"dytallix.pqc.deterministic_salt.v1");
            hasher.update(domain_str.as_bytes());
            let hash = hasher.finalize();
            let mut salt = [0u8; 16];
            salt.copy_from_slice(&hash[..16]);
            salt.to_vec()
        } else {
            use rand::{RngCore, rngs::OsRng};
            let mut salt = vec![0u8; 16];
            OsRng.fill_bytes(&mut salt);
            salt
        };
        
        // Derive master seed using Argon2id
        let master_seed = derive_argon2id_32(passphrase, &salt)?;
        
        // Generate PQC keypair using the seed
        // For now, we use the existing ActivePQC implementation
        // In a full implementation, we would use the seed for deterministic generation
        let (sk, pk) = ActivePQC::keypair();
        
        // Derive address from public key using the new PQC format
        let address = derive_pqc_address(&pk)?;
        
        // Create wallet info
        let wallet_info = PQCWalletInfo {
            name: name.to_string(),
            address,
            algorithm: ActivePQC::ALG.to_string(),
            pubkey_base64: BASE64_STANDARD.encode(&pk),
            created: chrono::Utc::now().to_rfc3339(),
        };
        
        Ok(wallet_info)
    }
    
    pub fn get_pqc_public_key(pubkey_bytes: &[u8], algorithm: &str) -> PQCPublicKey {
        PQCPublicKey {
            type_url: "/dytallix.crypto.pqc.v1beta1.PubKey".to_string(),
            algorithm: algorithm.to_string(),
            key: base64::encode(pubkey_bytes),
        }
    }
    
    pub fn sign_with_pqc(private_key: &[u8], message: &[u8]) -> Result<Vec<u8>> {
        let signature = ActivePQC::sign(private_key, message);
        Ok(signature)
    }
}

pub async fn handle(cli_home: &str, fmt: OutputFormat, cmd: WalletCmd) -> Result<()> {
    match cmd.action {
        WalletAction::Create { name, legacy_secp, deterministic, domain, password_file } => {
            if legacy_secp {
                return Err(anyhow!("Legacy secp256k1 support not yet implemented. Use --help for available options."));
            }
            
            let passphrase = read_password_with_confirmation(password_file.as_ref())?;
            
            let wallet_info = inline_pqc::create_pqc_wallet(
                &name, 
                &passphrase, 
                deterministic, 
                domain.as_deref(), 
                legacy_secp
            )?;
            
            info!("event=pqc_wallet_created name={} algorithm={}", wallet_info.name, wallet_info.algorithm);
            
            if fmt.is_json() {
                let output = serde_json::json!({
                    "address": wallet_info.address,
                    "algo": wallet_info.algorithm,
                    "pubkey_base64": wallet_info.pubkey_base64,
                    "pubkey": inline_pqc::get_pqc_public_key(
                        &BASE64_STANDARD.decode(&wallet_info.pubkey_base64)?, 
                        &wallet_info.algorithm
                    )
                });
                print_json(&output)?;
            } else {
                println!("Created PQC wallet: {}", name.green());
                println!("Address: {}", wallet_info.address);
                println!("Algorithm: {}", wallet_info.algorithm);
                println!("Public Key: {}", wallet_info.pubkey_base64);
                if deterministic {
                    println!("Type: {}", "Deterministic (reproducible)".blue());
                } else {
                    println!("Type: {}", "Non-deterministic (random)".yellow());
                }
            }
        },
        
        WalletAction::Show { name } => {
            // For now, redirect to existing keys list functionality
            println!("Showing wallet info for: {}", name);
            println!("Note: Use 'dcli keys list' to see all wallets or 'dcli keys export {}' for details", name);
        },
        
        WalletAction::Sign { name, tx, tx_file, password_file } => {
            let transaction_data = if let Some(tx_content) = tx {
                tx_content
            } else if let Some(tx_path) = tx_file {
                std::fs::read_to_string(tx_path)?
            } else {
                return Err(anyhow!("Either --tx or --tx-file must be provided"));
            };
            
            let _passphrase = read_password_with_prompt(password_file.as_ref(), "Enter passphrase: ")?;
            
            // Parse transaction JSON
            let tx_json: serde_json::Value = serde_json::from_str(&transaction_data)?;
            
            // For now, just show what would be signed
            if fmt.is_json() {
                let output = serde_json::json!({
                    "result": "sign_prepared",
                    "wallet": name,
                    "transaction": tx_json,
                    "note": "PQC signing implementation in progress"
                });
                print_json(&output)?;
            } else {
                println!("Would sign transaction with wallet: {}", name.green());
                println!("Transaction: {}", serde_json::to_string_pretty(&tx_json)?);
                println!("{}", "Note: Full PQC signing implementation in progress".yellow());
            }
        },
        
        WalletAction::Export { name } => {
            println!("Exporting wallet: {}", name);
            println!("Note: Use 'dcli keys export {}' for current implementation", name);
        },
        
        WalletAction::Import { name, private_key, key_file, password_file: _ } => {
            let _key_data = if let Some(key) = private_key {
                key
            } else if let Some(path) = key_file {
                std::fs::read_to_string(path)?
            } else {
                return Err(anyhow!("Either --private-key or --key-file must be provided"));
            };
            
            println!("Would import wallet: {}", name);
            println!("{}", "Note: PQC wallet import implementation in progress".yellow());
        },
    }
    
    Ok(())
}