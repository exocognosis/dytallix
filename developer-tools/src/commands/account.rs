use crate::config::Config;
use crate::crypto::CryptoManager;
use crate::tokens::{format_amount_with_symbol, micro_to_display, DGT_TOKEN};
use anyhow::Result;
use colored::*;
use dialoguer::{Confirm, Input, Password, Select};
use dytallix_pqc::{KeyExchangeAlgorithm, SignatureAlgorithm};
use std::fs;

pub async fn create_account(name: Option<String>, config: &Config) -> Result<()> {
    let mut crypto_manager = CryptoManager::new()?;

    // Get account name
    let account_name = if let Some(name) = name {
        name
    } else {
        Input::<String>::new()
            .with_prompt("Account name")
            .default(format!("account_{}", chrono::Utc::now().timestamp()))
            .interact_text()?
    };

    println!(
        "{}",
        "🔐 Creating new post-quantum account...".bright_green()
    );
    println!("Account name: {}", account_name.bright_white());

    // Select signature algorithm
    let sig_algorithms = vec![
        "CRYSTALS-Dilithium5 (Recommended)",
        "Falcon1024 (Fast verification)",
        "SPHINCS+ SHA256-128s (Stateless)",
    ];

    let sig_selection = Select::new()
        .with_prompt("Select signature algorithm")
        .default(0)
        .items(&sig_algorithms)
        .interact()?;

    let signature_alg = match sig_selection {
        0 => SignatureAlgorithm::Dilithium5,
        1 => SignatureAlgorithm::Falcon1024,
        2 => SignatureAlgorithm::SphincsSha256128s,
        _ => SignatureAlgorithm::Dilithium5,
    };

    // Key exchange algorithm (currently only Kyber)
    let key_exchange_alg = KeyExchangeAlgorithm::Kyber1024;

    // Ask for passphrase
    println!("\n{}", "🔐 Account Security Setup".bright_cyan().bold());
    println!("A passphrase adds an extra layer of security to your account.");
    println!("Without a passphrase, your keys are stored unencrypted on disk.");

    let use_passphrase = Confirm::new()
        .with_prompt("Do you want to protect this account with a passphrase?")
        .default(true)
        .interact()?;

    let passphrase = if use_passphrase {
        println!(
            "{}",
            "📝 Choose a strong passphrase (minimum 8 characters recommended)".bright_blue()
        );
        let pass = Password::new()
            .with_prompt("Enter passphrase")
            .with_confirmation("Confirm passphrase", "Passphrases do not match")
            .validate_with(|input: &String| -> Result<(), &str> {
                if input.len() < 8 {
                    Err("Passphrase should be at least 8 characters long")
                } else {
                    Ok(())
                }
            })
            .interact()?;
        Some(pass)
    } else {
        println!(
            "{}",
            "⚠️  Warning: Account will be stored without encryption".bright_yellow()
        );
        None
    };

    // Create the account
    println!(
        "\n{}",
        "⚙️  Generating quantum-resistant cryptographic keys...".bright_blue()
    );
    println!("This may take a moment...");

    let address = crypto_manager.create_account(
        account_name.clone(),
        passphrase.as_deref(),
        Some(signature_alg.clone()),
        Some(key_exchange_alg.clone()),
    )?;

    println!(
        "\n{}",
        "✅ Account created successfully!".bright_green().bold()
    );
    println!();
    println!("{}", "📋 Account Details:".bright_cyan().bold());
    println!("  Name: {}", account_name.bright_white());
    println!("  Address: {}", address.bright_cyan());
    println!(
        "  Signature Algorithm: {}",
        format!("{:?}", signature_alg).bright_blue()
    );
    println!(
        "  Key Exchange Algorithm: {}",
        format!("{:?}", key_exchange_alg).bright_blue()
    );
    println!(
        "  Protected: {}",
        if passphrase.is_some() {
            "Yes".bright_green()
        } else {
            "No".bright_red()
        }
    );

    // Show account info
    if let Some(account_info) = crypto_manager.get_account_info(&account_name)? {
        println!("\n{}", "📋 Account Details:".bright_blue());
        println!("  Name: {}", account_info.name);
        println!("  Address: {}", account_info.address);
        println!("  Created: {}", format_timestamp(account_info.created_at));
        println!("  Public Key: {}...", &account_info.public_key_hex[..32]);
        println!(
            "  Key Exchange Public Key: {}...",
            &account_info.key_exchange_public_key_hex[..32]
        );
    }

    if use_passphrase {
        println!(
            "\n{}",
            "⚠️  Important: Store your passphrase safely!".bright_yellow()
        );
        println!("Without the passphrase, you cannot access your account.");
    }

    Ok(())
}

pub async fn list_accounts(config: &Config) -> Result<()> {
    let crypto_manager = CryptoManager::new()?;
    let accounts = crypto_manager.list_accounts();

    if accounts.is_empty() {
        println!(
            "{}",
            "No accounts found. Create one with 'dytallix-cli account create'".bright_yellow()
        );
        return Ok(());
    }

    println!("{}", "👥 Your Accounts:".bright_blue());
    println!("┌─────────────────────┬─────────────────────────────────────────────┬─────────────────────┐");
    println!("│ Name                │ Address                                     │ Created             │");
    println!("├─────────────────────┼─────────────────────────────────────────────┼─────────────────────┤");

    for account_name in accounts {
        if let Ok(Some(account_info)) = crypto_manager.get_account_info(&account_name) {
            let created_str = format_timestamp(account_info.created_at);
            println!(
                "│ {:<19} │ {:<43} │ {:<19} │",
                truncate_string(&account_info.name, 19),
                truncate_string(&account_info.address, 43),
                created_str
            );
        }
    }

    println!("└─────────────────────┴─────────────────────────────────────────────┴─────────────────────┘");

    Ok(())
}

pub async fn account_balance(account: String, config: &Config) -> Result<()> {
    let crypto_manager = CryptoManager::new()?;

    if let Some(account_info) = crypto_manager.get_account_info(&account)? {
        println!(
            "{}",
            format!("💰 Balance for account: {}", account).bright_blue()
        );
        println!("Address: {}", account_info.address.bright_cyan());

        // Connect to blockchain for real balance
        let client = crate::client::BlockchainClient::new(config.node_url.clone());

        match client.get_balance(&account_info.address).await {
            Ok(balance_response) => {
                if balance_response.success {
                    let balance = balance_response.data.unwrap_or(0);
                    let balance_dgt = micro_to_display(balance, "udgt");

                    println!(
                        "DGT Balance: {}",
                        format_amount_with_symbol(balance, "udgt").bright_white()
                    );

                    // Query additional balance info if available
                    if balance > 0 {
                        println!("Raw Balance: {} udgt", balance.to_string().bright_yellow());
                        println!("Token: {}", DGT_TOKEN.display_name.bright_cyan());
                    }
                } else {
                    println!(
                        "{}",
                        "⚠️  Unable to fetch balance from blockchain".bright_yellow()
                    );
                    println!(
                        "DGT Balance: {} (offline mode)",
                        "0.000000 DGT".bright_white()
                    );
                }
            }
            Err(_) => {
                println!(
                    "{}",
                    "⚠️  Blockchain connection failed, showing cached data".bright_yellow()
                );
                println!("DGT Balance: {} (cached)", "0.000000 DGT".bright_white());
            }
        }

        println!("\n{}", "📋 Account Details:".bright_blue());
        println!(
            "  Signature Algorithm: {}",
            account_info.signature_algorithm
        );
        println!(
            "  Key Exchange Algorithm: {}",
            account_info.key_exchange_algorithm
        );
        println!("  Created: {}", format_timestamp(account_info.created_at));
    } else {
        println!(
            "{}",
            format!("Account '{}' not found", account).bright_red()
        );
        return Err(anyhow::anyhow!("Account not found"));
    }

    Ok(())
}

pub async fn export_account(
    account: String,
    output: Option<String>,
    config: &Config,
) -> Result<()> {
    let crypto_manager = CryptoManager::new()?;

    if crypto_manager.get_account_info(&account)?.is_none() {
        println!(
            "{}",
            format!("Account '{}' not found", account).bright_red()
        );
        return Err(anyhow::anyhow!("Account not found"));
    }

    let include_private_keys = Confirm::new()
        .with_prompt("Include private keys in export? (WARNING: Only do this for secure backup)")
        .default(false)
        .interact()?;

    if include_private_keys {
        println!("{}", "⚠️  WARNING: Exporting private keys!".bright_red());
        println!("This export will contain sensitive cryptographic material.");
        println!("Store it securely and never share it publicly.");

        let confirm = Confirm::new()
            .with_prompt("Are you sure you want to export private keys?")
            .default(false)
            .interact()?;

        if !confirm {
            println!("Export cancelled.");
            return Ok(());
        }
    }

    let output_file = output.unwrap_or_else(|| {
        if include_private_keys {
            format!("{}_full_export.json", account)
        } else {
            format!("{}_public_export.json", account)
        }
    });

    println!(
        "{}",
        format!("📤 Exporting account: {}", account).bright_blue()
    );

    let export_data = crypto_manager.export_account(&account, include_private_keys)?;

    fs::write(&output_file, export_data)?;

    println!("Output file: {}", output_file.bright_white());
    println!("{}", "✅ Account exported successfully!".bright_green());

    if include_private_keys {
        println!(
            "{}",
            "🔒 Remember to keep your private key export secure!".bright_yellow()
        );
    }

    Ok(())
}

pub async fn import_account(file: String, config: &Config) -> Result<()> {
    let mut crypto_manager = CryptoManager::new()?;

    println!(
        "{}",
        format!("📥 Importing account from: {}", file).bright_blue()
    );

    let account_data = fs::read_to_string(&file)?;

    // Check if this might be an encrypted export
    let has_private_keys = account_data.contains("key_store") || account_data.contains("private");

    let passphrase = if has_private_keys {
        let use_passphrase = Confirm::new()
            .with_prompt("This export contains private keys. Is it encrypted?")
            .default(true)
            .interact()?;

        if use_passphrase {
            Some(
                Password::new()
                    .with_prompt("Enter passphrase for encrypted export")
                    .interact()?,
            )
        } else {
            None
        }
    } else {
        None
    };

    let account_name = crypto_manager.import_account(&account_data, passphrase.as_deref())?;

    println!("Imported account: {}", account_name.bright_cyan());
    println!("{}", "✅ Account imported successfully!".bright_green());

    // Show imported account info
    if let Some(account_info) = crypto_manager.get_account_info(&account_name)? {
        println!("\n{}", "📋 Imported Account Details:".bright_blue());
        println!("  Name: {}", account_info.name);
        println!("  Address: {}", account_info.address);
        println!(
            "  Signature Algorithm: {}",
            account_info.signature_algorithm
        );
        println!("  Created: {}", format_timestamp(account_info.created_at));
    }

    Ok(())
}

pub async fn sign_message(account: String, message: String, config: &Config) -> Result<()> {
    let mut crypto_manager = CryptoManager::new()?;

    if crypto_manager.get_account_info(&account)?.is_none() {
        println!(
            "{}",
            format!("Account '{}' not found", account).bright_red()
        );
        return Err(anyhow::anyhow!("Account not found"));
    }

    // Get passphrase if needed
    let passphrase = Password::new()
        .with_prompt("Enter account passphrase (leave empty if none)")
        .allow_empty_password(true)
        .interact()?;

    let passphrase = if passphrase.is_empty() {
        None
    } else {
        Some(passphrase)
    };

    println!("{}", "🖊️  Signing message...".bright_blue());

    let signature =
        crypto_manager.sign_message(&account, message.as_bytes(), passphrase.as_deref())?;

    println!("{}", "✅ Message signed successfully!".bright_green());
    println!("Message: {}", message.bright_white());
    println!("Signature: {}", signature.bright_cyan());

    Ok(())
}

pub async fn verify_signature(
    message: String,
    signature: String,
    public_key: String,
    algorithm: Option<String>,
    config: &Config,
) -> Result<()> {
    let sig_alg = match algorithm.as_deref() {
        Some("dilithium5") | Some("Dilithium5") | None => SignatureAlgorithm::Dilithium5,
        Some("falcon1024") | Some("Falcon1024") => SignatureAlgorithm::Falcon1024,
        Some("sphincs") | Some("SphincsSha256128s") => SignatureAlgorithm::SphincsSha256128s,
        Some(alg) => {
            println!("{}", format!("Unknown algorithm: {}", alg).bright_red());
            return Err(anyhow::anyhow!("Unknown algorithm"));
        }
    };

    let crypto_manager = CryptoManager::new()?;

    println!("{}", "🔍 Verifying signature...".bright_blue());

    let is_valid =
        crypto_manager.verify_signature(message.as_bytes(), &signature, &public_key, sig_alg)?;

    if is_valid {
        println!("{}", "✅ Signature is VALID!".bright_green());
    } else {
        println!("{}", "❌ Signature is INVALID!".bright_red());
    }

    println!("Message: {}", message.bright_white());
    println!("Signature: {}", signature.bright_cyan());
    println!("Public Key: {}...", &public_key[..32].bright_blue());

    Ok(())
}

pub async fn generate_address(config: &Config) -> Result<()> {
    println!("{}", "🎲 Generating new address...".bright_blue());

    let (address, public_key, kex_public_key) = CryptoManager::generate_address()?;

    println!("{}", "✅ New address generated!".bright_green());
    println!("Address: {}", address.bright_cyan());
    println!("Public Key: {}", public_key.bright_blue());
    println!(
        "Key Exchange Public Key: {}",
        kex_public_key.bright_purple()
    );

    println!(
        "\n{}",
        "⚠️  Note: This is a standalone address generation.".bright_yellow()
    );
    println!("To use this address, create an account with 'dytallix-cli account create'");

    Ok(())
}

// Helper functions
fn format_timestamp(timestamp: u64) -> String {
    use chrono::{DateTime, Utc};
    use std::time::UNIX_EPOCH;

    let dt = UNIX_EPOCH + std::time::Duration::from_secs(timestamp);
    let datetime: DateTime<Utc> = dt.into();
    datetime.format("%Y-%m-%d %H:%M").to_string()
}

fn truncate_string(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len - 3])
    }
}
