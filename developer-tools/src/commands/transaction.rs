use anyhow::Result;
use crate::config::Config;
use crate::client::{BlockchainClient, TransactionRequest};
use colored::*;

pub async fn send_transaction(to: String, amount: u64, from: Option<String>, config: &Config) -> Result<()> {
    println!("💸 Sending transaction");
    println!("To: {}", to);
    println!("Amount: {} DYT", amount);
    println!("From: {:?}", from);
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // Determine sender address
    let from_address = match from {
        Some(addr) => addr,
        None => {
            println!("⚠️  No sender address specified, using default");
            "dyt1default".to_string()
        }
    };
    
    // Create transaction request
    let tx_request = TransactionRequest {
        from: from_address,
        to: to.clone(),
        amount,
        fee: Some(1000), // Default fee of 1000 units
        nonce: None, // Let the node determine the nonce
    };
    
    // Submit transaction
    match client.submit_transaction(tx_request).await {
        Ok(response) => {
            if response.success {
                if let Some(tx_data) = response.data {
                    println!("✅ Transaction submitted successfully!");
                    println!("Transaction Hash: {}", tx_data.hash.green());
                    println!("Status: {}", tx_data.status.yellow());
                    if let Some(block_num) = tx_data.block_number {
                        println!("Block Number: {}", block_num.to_string().blue());
                    }
                } else {
                    println!("✅ Transaction submitted but no details returned");
                }
            } else {
                println!("❌ Transaction failed: {}", response.error.unwrap_or("Unknown error".to_string()).red());
            }
        }
        Err(e) => {
            println!("❌ Failed to submit transaction: {}", e.to_string().red());
        }
    }
    
    Ok(())
}

pub async fn get_transaction(hash: String, config: &Config) -> Result<()> {
    println!("🔍 Getting transaction");
    println!("Hash: {}", hash);
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // Retrieve transaction details
    match client.get_transaction(&hash).await {
        Ok(response) => {
            if response.success {
                if let Some(tx_details) = response.data {
                    println!("✅ Transaction found!");
                    println!();
                    println!("📋 Transaction Details:");
                    println!("  Hash: {}", tx_details.hash.green());
                    println!("  From: {}", tx_details.from.blue());
                    println!("  To: {}", tx_details.to.blue());
                    println!("  Amount: {} DYT", tx_details.amount.to_string().yellow());
                    println!("  Fee: {} DYT", tx_details.fee.to_string().yellow());
                    println!("  Nonce: {}", tx_details.nonce);
                    println!("  Status: {}", tx_details.status.cyan());
                    println!("  Timestamp: {}", tx_details.timestamp);
                    println!("  Confirmations: {}", tx_details.confirmations.to_string().green());
                    
                    if let Some(block_num) = tx_details.block_number {
                        println!("  Block Number: {}", block_num.to_string().purple());
                    } else {
                        println!("  Block Number: {}", "Pending".yellow());
                    }
                } else {
                    println!("❌ Transaction not found");
                }
            } else {
                println!("❌ Error retrieving transaction: {}", response.error.unwrap_or("Unknown error".to_string()).red());
            }
        }
        Err(e) => {
            println!("❌ Failed to retrieve transaction: {}", e.to_string().red());
        }
    }
    
    Ok(())
}

pub async fn list_transactions(account: Option<String>, limit: u64, config: &Config) -> Result<()> {
    println!("📜 Listing transactions");
    println!("Account: {:?}", account);
    println!("Limit: {:?}", limit);
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // List transactions
    match client.list_transactions(account.clone(), limit).await {
        Ok(response) => {
            if response.success {
                if let Some(transactions) = response.data {
                    if transactions.is_empty() {
                        println!("📭 No transactions found");
                        if let Some(acc) = account {
                            println!("   for account: {}", acc.blue());
                        }
                    } else {
                        println!("✅ Found {} transactions", transactions.len());
                        println!();
                        
                        // Print table header
                        println!("{:<20} {:<15} {:<15} {:<12} {:<12} {:<10}", 
                                "Hash".bold(), 
                                "From".bold(), 
                                "To".bold(), 
                                "Amount".bold(), 
                                "Status".bold(), 
                                "Block".bold());
                        println!("{}", "-".repeat(94));
                        
                        // Print each transaction
                        for tx in transactions {
                            let short_hash = if tx.hash.len() > 18 {
                                format!("{}...", &tx.hash[..15])
                            } else {
                                tx.hash.clone()
                            };
                            
                            let short_from = if tx.from.len() > 13 {
                                format!("{}...", &tx.from[..10])
                            } else {
                                tx.from.clone()
                            };
                            
                            let short_to = if tx.to.len() > 13 {
                                format!("{}...", &tx.to[..10])
                            } else {
                                tx.to.clone()
                            };
                            
                            let block_display = match tx.block_number {
                                Some(block) => block.to_string(),
                                None => "Pending".to_string(),
                            };
                            
                            println!("{:<20} {:<15} {:<15} {:<12} {:<12} {:<10}", 
                                    short_hash.green(),
                                    short_from.blue(),
                                    short_to.blue(),
                                    format!("{} DYT", tx.amount).yellow(),
                                    tx.status.cyan(),
                                    block_display.purple());
                        }
                    }
                } else {
                    println!("❌ No transaction data returned");
                }
            } else {
                println!("❌ Error listing transactions: {}", response.error.unwrap_or("Unknown error".to_string()).red());
            }
        }
        Err(e) => {
            println!("❌ Failed to list transactions: {}", e.to_string().red());
        }
    }
    
    Ok(())
}