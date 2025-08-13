use anyhow::Result;
use crate::config::Config;
use crate::client::{BlockchainClient, TransactionRequest};
use crate::crypto::CryptoManager;
use crate::tokens::{format_amount_with_symbol, micro_to_display, display_to_micro, DGT_TOKEN};
use colored::*;
use dialoguer::{Select, Confirm};

pub async fn send_transaction(to: String, amount: u64, from: Option<String>, config: &Config) -> Result<()> {
    println!("{}", "💸 Sending transaction...".bright_blue());
    println!("To: {}", to.bright_cyan());
    println!("Amount: {}", format_amount_with_symbol(amount, "udgt").bright_white());
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // Create crypto manager
    let mut crypto_manager = CryptoManager::new()?;
    
    // Determine sender address
    let from_address = match from {
        Some(addr) => addr,
        None => {
            // List available accounts and let user choose
            let accounts = crypto_manager.list_accounts();
            
            if accounts.is_empty() {
                println!("{}", "❌ No accounts found. Please create an account first.".bright_red());
                return Err(anyhow::anyhow!("No accounts available"));
            }
            
            println!("\n{}", "Select sender account:".bright_cyan());
            let account_names: Vec<String> = accounts.iter().map(|a| {
                let preview = if a.len() > 16 { &a[..16] } else { a };
                format!("{} ({})", a, preview)
            }).collect();
            
            let selection = Select::new()
                .with_prompt("Choose account")
                .items(&account_names)
                .default(0)
                .interact()?;
            
            accounts[selection].clone()
        }
    };
    
    println!("From: {}", from_address.bright_yellow());
    
    // Validate addresses
    if !validate_address(&to) {
        return Err(anyhow::anyhow!("Invalid recipient address"));
    }
    
    if !validate_address(&from_address) {
        return Err(anyhow::anyhow!("Invalid sender address"));
    }
    
    // Check balance
    println!("Checking balance...");
    match client.get_balance(&from_address).await {
        Ok(response) => {
            if response.success {
                if let Some(balance) = response.data {
                    println!("Current balance: {}", format_amount_with_symbol(balance, "udgt").bright_green());
                    
                    let fee = 1000u64; // Default fee
                    let total_needed = amount + fee;
                    
                    if balance < total_needed {
                        return Err(anyhow::anyhow!("Insufficient balance. Need {}, but only have {}", 
                            format_amount_with_symbol(total_needed, "udgt"), 
                            format_amount_with_symbol(balance, "udgt")));
                    }
                } else {
                    println!("{}", "⚠️  Could not fetch balance".bright_yellow());
                }
            }
        }
        Err(e) => {
            println!("{}", format!("⚠️  Could not check balance: {}", e).bright_yellow());
        }
    }
    
    // Confirm transaction
    let confirmation_msg = format!(
        "Send {} from {} to {}?",
        format_amount_with_symbol(amount, "udgt").bright_white(),
        &from_address[..16],
        &to[..16]
    );
    
    if !Confirm::new()
        .with_prompt(&confirmation_msg)
        .default(false)
        .interact()? {
        println!("{}", "Transaction cancelled.".bright_yellow());
        return Ok(());
    }
    
    // Create transaction request
    let tx_request = TransactionRequest {
        from: from_address.clone(),
        to: to.clone(),
        amount,
        fee: Some(1000), // Default fee
        nonce: None, // Let the node determine the nonce
    };
    
    // Sign transaction (simulate for now)
    println!("Signing transaction...");
    let tx_hash = sign_transaction(&tx_request, &from_address, &mut crypto_manager)?;
    
    // Submit transaction
    println!("Submitting transaction...");
    match client.submit_transaction(tx_request).await {
        Ok(response) => {
            if response.success {
                if let Some(tx_data) = response.data {
                    println!("{}", "✅ Transaction submitted successfully!".bright_green());
                    println!("Transaction Hash: {}", tx_data.hash.bright_cyan());
                    println!("Status: {}", tx_data.status.bright_yellow());
                    if let Some(block_num) = tx_data.block_number {
                        println!("Block Number: {}", block_num.to_string().bright_blue());
                    }
                } else {
                    println!("{}", "✅ Transaction submitted but no details returned".bright_green());
                }
            } else {
                println!("{}", format!("❌ Transaction failed: {}", response.error.unwrap_or_else(|| "Unknown error".to_string())).bright_red());
            }
        }
        Err(e) => {
            println!("{}", format!("❌ Failed to submit transaction: {}", e).bright_red());
        }
    }
    
    Ok(())
}

pub async fn get_transaction(hash: String, config: &Config) -> Result<()> {
    println!("{}", "🔍 Fetching transaction details...".bright_blue());
    println!("Transaction Hash: {}", hash.bright_cyan());
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // Get transaction details
    match client.get_transaction(&hash).await {
        Ok(response) => {
            if response.success {
                if let Some(tx_data) = response.data {
                    println!("{}", "✅ Transaction found!".bright_green());
                    println!("\n{}", "📋 Transaction Details:".bright_cyan().bold());
                    println!("  Hash: {}", tx_data.hash.bright_white());
                    println!("  From: {}", tx_data.from.bright_yellow());
                    println!("  To: {}", tx_data.to.bright_cyan());
                    println!("  Amount: {}", format_amount_with_symbol(tx_data.amount, "udgt").bright_white());
                    println!("  Fee: {}", format_amount_with_symbol(tx_data.fee, "udgt").bright_blue());
                    println!("  Status: {}", format_transaction_status(&tx_data.status));
                    
                    if let Some(block_num) = tx_data.block_number {
                        println!("  Block Number: {}", block_num.to_string().bright_blue());
                    }
                    
                    if let Some(timestamp) = tx_data.timestamp {
                        println!("  Timestamp: {}", format_timestamp(timestamp));
                    }
                    
                    println!("  Nonce: {}", tx_data.nonce.to_string().bright_white());
                    
                    // Show signature info if available
                    if let Some(signature) = tx_data.signature {
                        println!("  Signature: {}...", &signature[..32].bright_green());
                    }
                } else {
                    println!("{}", "❌ Transaction not found".bright_red());
                }
            } else {
                println!("{}", format!("❌ Error fetching transaction: {}", response.error.unwrap_or_else(|| "Unknown error".to_string())).bright_red());
            }
        }
        Err(e) => {
            println!("{}", format!("❌ Failed to fetch transaction: {}", e).bright_red());
        }
    }
    
    Ok(())
}

pub async fn list_transactions(account: Option<String>, limit: u64, config: &Config) -> Result<()> {
    println!("{}", "📜 Listing transactions...".bright_blue());
    
    if let Some(ref acc) = account {
        println!("Account: {}", acc.bright_cyan());
    }
    println!("Limit: {}", limit.to_string().bright_white());
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // List transactions
    match client.list_transactions(account.clone(), limit).await {
        Ok(response) => {
            if response.success {
                if let Some(transactions) = response.data {
                    println!("{}", format!("✅ Found {} transactions", transactions.len()).bright_green());
                    
                    if transactions.is_empty() {
                        println!("{}", "No transactions found.".bright_yellow());
                        return Ok(());
                    }
                    
                    println!("\n{}", "📋 Transaction List:".bright_cyan().bold());
                    println!("{}", "─".repeat(80).bright_blue());
                    
                    for (i, tx) in transactions.iter().enumerate() {
                        println!("\n{} Transaction {}:", "📄".bright_blue(), (i + 1).to_string().bright_white());
                        println!("  Hash: {}", tx.hash.bright_cyan());
                        println!("  From: {} → To: {}", tx.from.bright_yellow(), tx.to.bright_cyan());
                        println!("  Amount: {}", format_amount_with_symbol(tx.amount, "udgt").bright_white());
                        println!("  Status: {}", format_transaction_status(&tx.status));
                        
                        if let Some(block_num) = tx.block_number {
                            println!("  Block: {}", block_num.to_string().bright_blue());
                        }
                        
                        if let Some(timestamp) = tx.timestamp {
                            println!("  Time: {}", format_timestamp(timestamp));
                        }
                    }
                } else {
                    println!("{}", "❌ No transaction data returned".bright_red());
                }
            } else {
                println!("{}", format!("❌ Error listing transactions: {}", response.error.unwrap_or_else(|| "Unknown error".to_string())).bright_red());
            }
        }
        Err(e) => {
            println!("{}", format!("❌ Failed to list transactions: {}", e).bright_red());
        }
    }
    
    Ok(())
}

fn validate_address(address: &str) -> bool {
    // Basic validation for Dytallix addresses
    address.starts_with("dyt1") && address.len() >= 20
}

fn sign_transaction(tx_request: &TransactionRequest, from_address: &str, crypto_manager: &mut CryptoManager) -> Result<String> {
    // Create transaction data for signing
    let tx_data = serde_json::json!({
        "from": tx_request.from,
        "to": tx_request.to,
        "amount": tx_request.amount,
        "fee": tx_request.fee,
        "nonce": tx_request.nonce
    });
    
    let tx_bytes = tx_data.to_string().into_bytes();
    
    // For now, simulate signing by creating a mock signature
    // In real implementation, this would use the crypto manager to sign
    let signature = format!("0x{}", hex::encode(&tx_bytes[..32]));
    
    println!("  Signature: {}...", &signature[..16].bright_green());
    
    Ok(signature)
}

fn format_transaction_status(status: &str) -> colored::ColoredString {
    match status.to_lowercase().as_str() {
        "pending" => status.bright_yellow(),
        "confirmed" => status.bright_green(),
        "failed" => status.bright_red(),
        "rejected" => status.bright_red(),
        _ => status.bright_white(),
    }
}

fn format_timestamp(timestamp: i64) -> String {
    if let Some(dt) = chrono::DateTime::from_timestamp(timestamp, 0) {
        dt.format("%Y-%m-%d %H:%M:%S UTC").to_string()
    } else {
        "Invalid timestamp".to_string()
    }
}