use anyhow::{Result, anyhow};
use clap::Args;
use crate::{keystore, tx::{Msg, Tx, SignedTx, NonceSpec}, rpc::RpcClient, batch::{self, BatchMsg}};
use crate::output::{OutputFormat, print_json, print_json_array};

#[derive(Args, Debug, Clone)]
pub struct TransferCmd {
    #[arg(long)] pub from: String,
    #[arg(long)] pub to: String,
    #[arg(long, help="Token denom (DGT governance | DRT reward)")] pub denom: String,
    #[arg(long)] pub amount: u128,
    #[arg(long)] pub fee: u128,
    #[arg(long, default_value="")] pub memo: String,
}

#[derive(Args, Debug, Clone)]
pub struct BatchCmd {
    #[arg(long, help="Path to batch JSON file or - for STDIN")] pub file: String,
}

pub async fn handle_transfer(rpc_url: &str, chain_id: &str, _home: &str, c: TransferCmd, fmt: OutputFormat) -> Result<()> {
    keystore::with_secret(&c.from, |u| {
        if u.address != c.to && c.to.len() < 10 { return Err(anyhow!("to address looks invalid")); }
        Ok(())
    })?;
    let guard_addr;
    let sk_clone; let pk_clone;
    {
        let g = keystore::get_unlocked(&c.from).ok_or(anyhow!("key not unlocked or expired"))?;
        guard_addr = g.address.clone();
        sk_clone = g.to_vec();
        pk_clone = g.public_key().to_vec();
    }
    let client = RpcClient::new(rpc_url);
    let nonce = client.get_nonce(&guard_addr).await.unwrap_or(Some(0)).unwrap_or(0); // fallback to 0
    let msg = Msg::Send { from: guard_addr.clone(), to: c.to.clone(), denom: c.denom.clone(), amount: c.amount };
    let tx = Tx::new(chain_id, nonce, vec![msg], c.fee, c.memo)?;
    let stx = SignedTx::sign(tx, &sk_clone, &pk_clone)?;
    let br = client.submit(&stx).await?;
    if fmt.is_json() { print_json(&serde_json::json!({"hash": br.hash, "status": br.status}))?; } else { println!("hash={} status={}", br.hash, br.status); }
    Ok(())
}

pub async fn handle_batch(rpc_url: &str, default_chain_id: &str, _home: &str, c: BatchCmd, fmt: OutputFormat) -> Result<()> {
    let b = batch::read_batch(Some(&c.file))?; // path or stdin
    // Resolve secret
    let from_name = &b.from;
    let guard_addr;
    let sk_clone; let pk_clone;
    {
        let g = keystore::get_unlocked(from_name).ok_or(anyhow!("key not unlocked or expired"))?;
        guard_addr = g.address.clone();
        sk_clone = g.to_vec();
        pk_clone = g.public_key().to_vec();
    }
    // Resolve nonce
    let chain_id = if b.chain_id.is_empty() { default_chain_id.to_string() } else { b.chain_id.clone() };
    let client = RpcClient::new(rpc_url);
    let nonce = match b.nonce { NonceSpec::Auto => client.get_nonce(&guard_addr).await.unwrap_or(Some(0)).unwrap_or(0), NonceSpec::Exact(n) => n };
    // Build messages
    let mut msgs = Vec::new();
    for m in b.messages.iter() {
        match m {
            BatchMsg::Send { to, denom, amount } => {
                msgs.push(Msg::Send { from: guard_addr.clone(), to: to.clone(), denom: denom.clone(), amount: *amount });
            }
        }
    }
    let tx = Tx::new(&chain_id, nonce, msgs, b.fee, &b.memo)?;
    let stx = SignedTx::sign(tx, &sk_clone, &pk_clone)?;
    if b.broadcast {
        let br = client.submit(&stx).await?;
        if fmt.is_json() { print_json_array(&[serde_json::json!({"hash": br.hash, "status": br.status})])?; } else { println!("hash={} status={}", br.hash, br.status); }
    } else {
        if fmt.is_json() { print_json_array(&[&stx])?; } else { println!("signed_tx hash={}", stx.hash); }
    }
    Ok(())
}
