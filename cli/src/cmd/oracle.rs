use anyhow::Result;
use clap::{Args, Subcommand};
use serde_json::{json, Value};

use crate::{
    output::OutputFormat,
    rpc::RpcClient,
};

#[derive(Args, Debug, Clone)]
pub struct OracleCmd {
    #[command(subcommand)]
    pub action: OracleAction,
}

#[derive(Subcommand, Debug, Clone)]
pub enum OracleAction {
    /// Submit a single AI risk score
    Submit {
        /// Transaction hash (hex format)
        #[arg(long)]
        tx_hash: String,
        
        /// AI model identifier
        #[arg(long)]
        model_id: String,
        
        /// Risk score (0.0 to 1.0)
        #[arg(long)]
        risk_score: f32,
        
        /// Confidence level (0.0 to 1.0, optional)
        #[arg(long)]
        confidence: Option<f32>,
        
        /// Base64-encoded signature (optional)
        #[arg(long)]
        signature: Option<String>,
    },
    
    /// Submit multiple AI risk scores in batch
    SubmitBatch {
        /// JSON file containing array of risk records
        #[arg(long)]
        file: String,
    },
    
    /// Query AI risk score for a transaction
    Query {
        /// Transaction hash (hex format)
        tx_hash: String,
    },
}

pub async fn run(rpc_url: &str, output_format: OutputFormat, cmd: OracleCmd) -> Result<()> {
    let client = RpcClient::new(rpc_url);
    
    match cmd.action {
        OracleAction::Submit {
            tx_hash,
            model_id,
            risk_score,
            confidence,
            signature,
        } => {
            submit_single(&client, &tx_hash, &model_id, risk_score, confidence, signature, output_format).await
        }
        
        OracleAction::SubmitBatch { file } => {
            submit_batch(&client, &file, output_format).await
        }
        
        OracleAction::Query { tx_hash } => {
            query_risk(&client, &tx_hash, output_format).await
        }
    }
}

async fn submit_single(
    client: &RpcClient,
    tx_hash: &str,
    model_id: &str,
    risk_score: f32,
    confidence: Option<f32>,
    signature: Option<String>,
    output_format: OutputFormat,
) -> Result<()> {
    // Validate inputs
    if !(0.0..=1.0).contains(&risk_score) {
        return Err(anyhow::anyhow!("risk_score must be between 0.0 and 1.0"));
    }
    
    if let Some(conf) = confidence {
        if !(0.0..=1.0).contains(&conf) {
            return Err(anyhow::anyhow!("confidence must be between 0.0 and 1.0"));
        }
    }
    
    if !tx_hash.starts_with("0x") {
        return Err(anyhow::anyhow!("tx_hash must be in hex format starting with 0x"));
    }
    
    if model_id.trim().is_empty() {
        return Err(anyhow::anyhow!("model_id cannot be empty"));
    }

    let payload = json!({
        "tx_hash": tx_hash,
        "model_id": model_id,
        "risk_score": risk_score,
        "confidence": confidence,
        "signature": signature
    });

    let response = client.post("/oracle/ai_risk", &payload).await?;
    
    if output_format.is_json() {
        println!("{}", serde_json::to_string_pretty(&response)?);
    } else {
        if response["ok"].as_bool().unwrap_or(false) {
            println!("✅ Successfully submitted AI risk score for {}", tx_hash);
            println!("   Model: {}", model_id);
            println!("   Risk Score: {:.3}", risk_score);
            if let Some(conf) = confidence {
                println!("   Confidence: {:.3}", conf);
            }
        } else {
            println!("❌ Failed to submit AI risk score");
            if let Some(error) = response.get("error") {
                println!("   Error: {}", error);
            }
        }
    }
    
    Ok(())
}

async fn submit_batch(
    client: &RpcClient,
    file_path: &str,
    output_format: OutputFormat,
) -> Result<()> {
    // Read and parse the JSON file
    let file_content = std::fs::read_to_string(file_path)?;
    let records: Vec<Value> = serde_json::from_str(&file_content)?;
    
    // Validate batch structure
    for (idx, record) in records.iter().enumerate() {
        if !record.is_object() {
            return Err(anyhow::anyhow!("Record {} is not a valid object", idx));
        }
        
        let tx_hash = record.get("tx_hash")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Record {}: missing tx_hash", idx))?;
            
        let model_id = record.get("model_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Record {}: missing model_id", idx))?;
            
        let risk_score = record.get("risk_score")
            .and_then(|v| v.as_f64())
            .ok_or_else(|| anyhow::anyhow!("Record {}: missing or invalid risk_score", idx))? as f32;
        
        // Validate values
        if !tx_hash.starts_with("0x") {
            return Err(anyhow::anyhow!("Record {}: tx_hash must start with 0x", idx));
        }
        
        if model_id.trim().is_empty() {
            return Err(anyhow::anyhow!("Record {}: model_id cannot be empty", idx));
        }
        
        if !(0.0..=1.0).contains(&risk_score) {
            return Err(anyhow::anyhow!("Record {}: risk_score must be between 0.0 and 1.0", idx));
        }
        
        if let Some(confidence) = record.get("confidence").and_then(|v| v.as_f64()) {
            if !(0.0..=1.0).contains(&confidence) {
                return Err(anyhow::anyhow!("Record {}: confidence must be between 0.0 and 1.0", idx));
            }
        }
    }

    let payload = json!({
        "records": records
    });

    let response = client.post("/oracle/ai_risk_batch", &payload).await?;
    
    if output_format.is_json() {
        println!("{}", serde_json::to_string_pretty(&response)?);
    } else {
        let processed = response["processed"].as_u64().unwrap_or(0);
        let failed = response["failed"].as_u64().unwrap_or(0);
        
        println!("📊 Batch submission complete:");
        println!("   ✅ Successfully processed: {}", processed);
        println!("   ❌ Failed: {}", failed);
        
        if let Some(failed_hashes) = response["failed_hashes"].as_array() {
            if !failed_hashes.is_empty() {
                println!("   Failed transaction hashes:");
                for hash in failed_hashes {
                    if let Some(hash_str) = hash.as_str() {
                        println!("     - {}", hash_str);
                    }
                }
            }
        }
        
        if let Some(validation_errors) = response["validation_errors"].as_array() {
            if !validation_errors.is_empty() {
                println!("   Validation errors:");
                for error in validation_errors {
                    if let Some(error_str) = error.as_str() {
                        println!("     - {}", error_str);
                    }
                }
            }
        }
    }
    
    Ok(())
}

async fn query_risk(
    client: &RpcClient,
    tx_hash: &str,
    output_format: OutputFormat,
) -> Result<()> {
    if !tx_hash.starts_with("0x") {
        return Err(anyhow::anyhow!("tx_hash must be in hex format starting with 0x"));
    }

    let url = format!("/tx/{}", tx_hash);
    let response = client.get(&url).await?;
    
    if output_format.is_json() {
        println!("{}", serde_json::to_string_pretty(&response)?);
    } else {
        if let Some(ai_risk_score) = response.get("ai_risk_score") {
            println!("🎯 AI Risk Assessment for {}", tx_hash);
            println!("   Risk Score: {:.3}", ai_risk_score.as_f64().unwrap_or(0.0));
            
            if let Some(model_id) = response.get("ai_model_id").and_then(|v| v.as_str()) {
                println!("   Model ID: {}", model_id);
            }
            
            if let Some(confidence) = response.get("ai_confidence").and_then(|v| v.as_f64()) {
                println!("   Confidence: {:.3}", confidence);
            }
            
            // Show transaction status if available
            if let Some(status) = response.get("status").and_then(|v| v.as_str()) {
                println!("   Transaction Status: {}", status);
            }
        } else {
            println!("ℹ️  No AI risk score found for transaction {}", tx_hash);
            
            // Check if transaction exists
            if response.get("hash").is_some() {
                println!("   (Transaction exists but no risk assessment available)");
            } else {
                println!("   (Transaction not found)");
            }
        }
    }
    
    Ok(())
}