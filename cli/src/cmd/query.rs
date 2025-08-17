use anyhow::{Result, anyhow};
use clap::Args;
use crate::{rpc::RpcClient, output::{OutputFormat, print_json}};

#[derive(Args, Debug, Clone)]
pub struct QueryCmd { #[command(subcommand)] pub what: QueryWhat }

#[derive(clap::Subcommand, Debug, Clone)]
pub enum QueryWhat { 
    Balance { 
        address: String,
        #[arg(long, help="Specific denomination to query (udgt, udrt)")] 
        denom: Option<String>
    }, 
    Tx { hash: String }, 
    Block { id: String }, 
    Validators, 
    Proposals, 
    Emission, 
    Stats 
}

pub async fn run(rpc: &str, fmt: OutputFormat, cmd: QueryCmd) -> Result<()> {
    let client = RpcClient::new(rpc);
    match cmd.what {
        QueryWhat::Balance { address, denom } => {
            let mut url = format!("{}/balance/{}", client.base, address);
            if let Some(d) = denom {
                url = format!("{}?denom={}", url, d);
            }
            let res = reqwest::get(url).await?; 
            if !res.status().is_success() { 
                return Err(anyhow!("balance query failed")); 
            }
            let v: serde_json::Value = res.json().await?; 
            if fmt.is_json() { 
                print_json(&v)?; 
            } else { 
                // Pretty print based on response format
                if let Some(denom_val) = v.get("denom") {
                    // Single denomination response
                    println!("Address: {}", v.get("address").unwrap_or(&serde_json::Value::Null));
                    println!("Denomination: {}", denom_val);
                    println!("Balance: {}", v.get("balance").unwrap_or(&serde_json::Value::Null));
                } else if let Some(balances) = v.get("balances") {
                    // Multi-denomination response
                    println!("Address: {}", v.get("address").unwrap_or(&serde_json::Value::Null));
                    println!("Balances:");
                    if let serde_json::Value::Object(balance_map) = balances {
                        for (denom, info) in balance_map {
                            if let Some(formatted) = info.get("formatted") {
                                println!("  {}: {}", denom, formatted.as_str().unwrap_or("N/A"));
                            } else {
                                println!("  {}: {}", denom, info.get("balance").unwrap_or(&serde_json::Value::Null));
                            }
                        }
                    }
                    if let Some(legacy) = v.get("legacy_balance") {
                        println!("Legacy balance (udgt): {}", legacy);
                    }
                } else {
                    println!("{}", v); 
                }
            }
        }
        QueryWhat::Tx { hash } => {
            let url = format!("{}/tx/{}", client.base, hash);
            let res = reqwest::get(url).await?; if !res.status().is_success() { return Err(anyhow!("tx query failed")); }
            let v: serde_json::Value = res.json().await?; if fmt.is_json() { print_json(&v)?; } else { println!("{}", v); }
        }
        QueryWhat::Block { id } => {
            let url = format!("{}/block/{}", client.base, id);
            let res = reqwest::get(url).await?; if !res.status().is_success() { return Err(anyhow!("block query failed")); }
            let v: serde_json::Value = res.json().await?; if fmt.is_json() { print_json(&v)?; } else { println!("{}", v); }
        }
        QueryWhat::Validators => {
            let url = format!("{}/validators", client.base);
            let res = reqwest::get(url).await?; let v: serde_json::Value = res.json().await?; if fmt.is_json() { print_json(&v)?; } else { println!("{}", v); }
        }
        QueryWhat::Proposals => {
            let url = format!("{}/proposals", client.base);
            let res = reqwest::get(url).await?; let v: serde_json::Value = res.json().await?; if fmt.is_json() { print_json(&v)?; } else { println!("{}", v); }
        }
        QueryWhat::Emission => { println!("TODO emission query"); }
        QueryWhat::Stats => { let url = format!("{}/stats", client.base); let res = reqwest::get(url).await?; let v: serde_json::Value = res.json().await?; if fmt.is_json() { print_json(&v)?; } else { println!("{}", v); } }
    }
    Ok(())
}
