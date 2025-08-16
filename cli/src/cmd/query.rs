use anyhow::{Result, anyhow};
use clap::Args;
use crate::{rpc::RpcClient, output::{OutputFormat, print_json}};

#[derive(Args, Debug, Clone)]
pub struct QueryCmd { #[command(subcommand)] pub what: QueryWhat }

#[derive(clap::Subcommand, Debug, Clone)]
pub enum QueryWhat { Balance { address: String }, Tx { hash: String }, Block { id: String }, Validators, Proposals, Emission, Stats }

pub async fn run(rpc: &str, fmt: OutputFormat, cmd: QueryCmd) -> Result<()> {
    let client = RpcClient::new(rpc);
    match cmd.what {
        QueryWhat::Balance { address } => {
            let url = format!("{}/balance/{}", client.base, address);
            let res = reqwest::get(url).await?; if !res.status().is_success() { return Err(anyhow!("balance query failed")); }
            let v: serde_json::Value = res.json().await?; if fmt.is_json() { print_json(&v)?; } else { println!("{}", v); }
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
