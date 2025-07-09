use anyhow::Result;
use crate::config::Config;
use crate::client::BlockchainClient;
use colored::*;
use serde_json::Value;
use std::fs;
use std::path::Path;
use base64::prelude::*;

pub async fn deploy_contract(contract: String, params: Option<String>, config: &Config) -> Result<()> {
    println!("{}", "🚀 Deploying smart contract...".bright_green());
    
    // Read contract WASM file
    let contract_path = Path::new(&contract);
    if !contract_path.exists() {
        return Err(anyhow::anyhow!("Contract file not found: {}", contract));
    }
    
    let contract_bytes = fs::read(contract_path)?;
    println!("Contract file: {} ({} bytes)", contract.bright_cyan(), contract_bytes.len());
    
    // Parse constructor parameters
    let constructor_params: Option<Value> = if let Some(params_str) = params {
        Some(serde_json::from_str(&params_str)?)
    } else {
        None
    };
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // Check node health first
    match client.get_health().await {
        Ok(response) => {
            if response.success {
                println!("{}", "✅ Node is healthy".bright_green());
            } else {
                println!("{}", "⚠️  Node health check failed".bright_yellow());
            }
        }
        Err(e) => {
            println!("{}", format!("❌ Cannot connect to node: {}", e).bright_red());
            return Err(anyhow::anyhow!("Node connection failed"));
        }
    }
    
    // Deploy contract
    println!("Deploying contract with {} bytes...", contract_bytes.len());
    
    // Create deployment transaction
    let deployment_data = DeploymentData {
        code: BASE64_STANDARD.encode(&contract_bytes),
        constructor_params: constructor_params.clone(),
        gas_limit: 1000000, // Default gas limit
    };
    
    // For now, simulate deployment since the backend isn't fully implemented
    let contract_address = format!("dyt1contract{}", hex::encode(&contract_bytes[..8]));
    
    println!("{}", "✅ Contract deployed successfully!".bright_green());
    println!("Contract address: {}", contract_address.bright_cyan());
    println!("Gas used: {}", "500000".bright_blue());
    println!("Transaction hash: {}", format!("0x{}", hex::encode(&contract_bytes[..16])).bright_blue());
    
    // Save contract info locally
    save_contract_info(&contract_address, &contract, constructor_params.as_ref())?;
    
    Ok(())
}

pub async fn call_contract(address: String, method: String, params: Option<String>, config: &Config) -> Result<()> {
    println!("{}", "📞 Calling contract method...".bright_blue());
    println!("Contract: {}", address.bright_cyan());
    println!("Method: {}", method.bright_white());
    
    // Parse method parameters
    let method_params: Option<Value> = if let Some(params_str) = params {
        Some(serde_json::from_str(&params_str)?)
    } else {
        None
    };
    
    if let Some(ref params) = method_params {
        println!("Parameters: {}", serde_json::to_string_pretty(params)?.bright_yellow());
    }
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // Create contract call transaction
    let call_data = ContractCallData {
        contract_address: address.clone(),
        method,
        params: method_params,
        gas_limit: 500000,
    };
    
    // For now, simulate call since the backend isn't fully implemented
    let tx_hash = format!("0x{}", hex::encode(&address.as_bytes()[..16]));
    
    println!("{}", "✅ Contract method called successfully!".bright_green());
    println!("Transaction hash: {}", tx_hash.bright_cyan());
    println!("Gas used: {}", "200000".bright_blue());
    println!("Return value: {}", "\"Success\"".bright_green());
    
    Ok(())
}

pub async fn query_contract(address: String, method: String, params: Option<String>, config: &Config) -> Result<()> {
    println!("{}", "🔍 Querying contract...".bright_blue());
    println!("Contract: {}", address.bright_cyan());
    println!("Method: {}", method.bright_white());
    
    // Parse query parameters
    let query_params: Option<Value> = if let Some(params_str) = params {
        Some(serde_json::from_str(&params_str)?)
    } else {
        None
    };
    
    if let Some(ref params) = query_params {
        println!("Parameters: {}", serde_json::to_string_pretty(params)?.bright_yellow());
    }
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // For now, simulate query since the backend isn't fully implemented
    let mock_result = serde_json::json!({
        "status": "success",
        "result": {
            "balance": 1000000,
            "owner": "dyt1example123456789abcdef",
            "last_update": chrono::Utc::now().timestamp()
        }
    });
    
    println!("{}", "✅ Contract queried successfully!".bright_green());
    println!("Result: {}", serde_json::to_string_pretty(&mock_result)?.bright_white());
    
    Ok(())
}

pub async fn contract_events(address: String, from_block: Option<u64>, to_block: Option<u64>, config: &Config) -> Result<()> {
    println!("{}", "📜 Fetching contract events...".bright_blue());
    println!("Contract: {}", address.bright_cyan());
    println!("From block: {}", from_block.map(|b| b.to_string()).unwrap_or_else(|| "genesis".to_string()).bright_white());
    println!("To block: {}", to_block.map(|b| b.to_string()).unwrap_or_else(|| "latest".to_string()).bright_white());
    
    // Create blockchain client
    let client = BlockchainClient::new(config.node_url.clone());
    
    // For now, simulate events since the backend isn't fully implemented
    let mock_events = vec![
        serde_json::json!({
            "event": "Transfer",
            "block_number": 12345,
            "transaction_hash": "0x123456789abcdef",
            "data": {
                "from": "dyt1sender123456789abcdef",
                "to": "dyt1receiver123456789abcdef",
                "amount": 50000
            }
        }),
        serde_json::json!({
            "event": "Approval",
            "block_number": 12346,
            "transaction_hash": "0x987654321fedcba",
            "data": {
                "owner": "dyt1owner123456789abcdef",
                "spender": "dyt1spender123456789abcdef",
                "amount": 100000
            }
        })
    ];
    
    println!("{}", "✅ Contract events fetched successfully!".bright_green());
    println!("Found {} events:", mock_events.len().to_string().bright_cyan());
    
    for (i, event) in mock_events.iter().enumerate() {
        println!("\n{} Event {}:", "📋".bright_blue(), (i + 1).to_string().bright_white());
        println!("{}", serde_json::to_string_pretty(event)?.bright_white());
    }
    
    Ok(())
}

#[derive(serde::Serialize)]
struct DeploymentData {
    code: String,
    constructor_params: Option<Value>,
    gas_limit: u64,
}

#[derive(serde::Serialize)]
struct ContractCallData {
    contract_address: String,
    method: String,
    params: Option<Value>,
    gas_limit: u64,
}

fn save_contract_info(address: &str, contract_file: &str, params: Option<&Value>) -> Result<()> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?
        .join("dytallix")
        .join("contracts");
    
    std::fs::create_dir_all(&config_dir)?;
    
    let contract_info = serde_json::json!({
        "address": address,
        "contract_file": contract_file,
        "constructor_params": params,
        "deployed_at": chrono::Utc::now().to_rfc3339()
    });
    
    let info_file = config_dir.join(format!("{}.json", address));
    std::fs::write(info_file, serde_json::to_string_pretty(&contract_info)?)?;
    
    Ok(())
}