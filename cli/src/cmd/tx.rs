use crate::output::{print_json, print_json_array, OutputFormat};
use crate::{
    batch::{self, BatchMsg},
    keystore,
    rpc::RpcClient,
    tx::{Msg, NonceSpec, SignedTx, Tx},
};
use anyhow::{anyhow, Result};
use clap::Args;
use colored::Colorize; // for algorithm.cyan()

#[derive(Args, Debug, Clone)]
pub struct TransferCmd {
    #[arg(long)]
    pub from: String,
    #[arg(long)]
    pub to: String,
    #[arg(long, help = "Token denom (DGT governance | DRT reward)")]
    pub denom: String,
    #[arg(long)]
    pub amount: u128,
    #[arg(long)]
    pub fee: u128,
    #[arg(long, default_value = "")]
    pub memo: String,
    #[arg(long, help = "Gas limit for transaction")]
    pub gas: Option<u64>,
    #[arg(
        long,
        help = "Gas price in datt (1 DGT = 1_000_000_000 datt)",
        default_value = "1000"
    )]
    pub gas_price: u64,
}

#[derive(Args, Debug, Clone)]
pub struct BatchCmd {
    #[arg(long, help = "Path to batch JSON file or - for STDIN")]
    pub file: String,
    #[arg(long, help = "Gas limit for batch transaction")]
    pub gas: Option<u64>,
    #[arg(long, help = "Gas price in datt", default_value = "1000")]
    pub gas_price: u64,
}

pub async fn handle_transfer(
    rpc_url: &str,
    chain_id: &str,
    _home: &str,
    c: TransferCmd,
    fmt: OutputFormat,
) -> Result<()> {
    keystore::with_secret(&c.from, |u| {
        if u.address != c.to && c.to.len() < 10 {
            return Err(anyhow!("to address looks invalid"));
        }
        Ok(())
    })?;
    let guard_addr;
    let sk_clone;
    let pk_clone;
    {
        let g = keystore::get_unlocked(&c.from).ok_or(anyhow!("key not unlocked or expired"))?;
        guard_addr = g.address.clone();
        sk_clone = g.to_vec();
        pk_clone = g.public_key().to_vec();
    }
    let client = RpcClient::new(rpc_url);
    let nonce = client
        .get_nonce(&guard_addr)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0); // fallback to 0
    let msg = Msg::Send {
        from: guard_addr.clone(),
        to: c.to.clone(),
        denom: c.denom.clone(),
        amount: c.amount,
    };
    let tx = Tx::new(chain_id, nonce, vec![msg], c.fee, c.memo)?;

    // Gas estimation and validation
    let gas_limit = if let Some(gas) = c.gas {
        gas
    } else {
        // Estimate gas limit with safety factor
        estimate_gas_for_transfer(&tx, c.gas_price)?
    };

    // Display gas information to user
    let intrinsic_gas = estimate_intrinsic_gas_for_transfer(&tx)?;
    if fmt.is_json() {
        println!("{{\"intrinsic_gas\": {}, \"gas_limit\": {}, \"gas_price\": {}, \"estimated_fee_datt\": {}}}",
                 intrinsic_gas, gas_limit, c.gas_price, gas_limit * c.gas_price);
    } else {
        println!("Intrinsic gas: {}", intrinsic_gas);
        println!("Gas limit: {}", gas_limit);
        println!("Gas price: {} datt", c.gas_price);
        println!(
            "Estimated fee: {} datt ({:.9} DGT)",
            gas_limit * c.gas_price,
            (gas_limit * c.gas_price) as f64 / 1_000_000_000.0
        );
    }

    let stx = SignedTx::sign(tx, &sk_clone, &pk_clone, gas_limit, c.gas_price)?;
    let br = client.submit(&stx).await?;

    // Get algorithm information from keystore
    let algorithm = keystore::with_secret(&c.from, |u| Ok(u.algorithm.clone()))?;

    if fmt.is_json() {
        print_json(&serde_json::json!({
            "hash": br.hash,
            "status": br.status,
            "algorithm": algorithm,
            "gas_limit": gas_limit,
            "gas_price": c.gas_price
        }))?;
    } else {
        println!(
            "hash={} status={} algorithm={}",
            br.hash,
            br.status,
            algorithm.cyan()
        );
    }
    Ok(())
}

// Gas estimation functions
fn estimate_gas_for_transfer(tx: &Tx, _gas_price: u64) -> Result<u64> {
    let intrinsic = estimate_intrinsic_gas_for_transfer(tx)?;
    // Apply 2x safety factor as per specification
    Ok(intrinsic * 2)
}

fn estimate_intrinsic_gas_for_transfer(tx: &Tx) -> Result<u64> {
    // Estimate transaction size
    let tx_bytes = serde_json::to_vec(tx)?;
    let tx_size = tx_bytes.len();

    // For transfer transactions
    let base_cost = 500u64; // Transfer base cost
    let per_byte_cost = 2u64;
    let size_cost = per_byte_cost * (tx_size as u64);

    Ok(base_cost + size_cost)
}

pub async fn handle_batch(
    rpc_url: &str,
    default_chain_id: &str,
    _home: &str,
    c: BatchCmd,
    fmt: OutputFormat,
) -> Result<()> {
    let b = batch::read_batch(Some(&c.file))?; // path or stdin
                                               // Resolve secret
    let from_name = &b.from;
    let guard_addr;
    let sk_clone;
    let pk_clone;
    {
        let g = keystore::get_unlocked(from_name).ok_or(anyhow!("key not unlocked or expired"))?;
        guard_addr = g.address.clone();
        sk_clone = g.to_vec();
        pk_clone = g.public_key().to_vec();
    }
    // Resolve nonce
    let chain_id = if b.chain_id.is_empty() {
        default_chain_id.to_string()
    } else {
        b.chain_id.clone()
    };
    let client = RpcClient::new(rpc_url);
    let nonce = match b.nonce {
        NonceSpec::Auto => client
            .get_nonce(&guard_addr)
            .await
            .unwrap_or(Some(0))
            .unwrap_or(0),
        NonceSpec::Exact(n) => n,
    };
    // Build messages
    let mut msgs = Vec::new();
    for m in b.messages.iter() {
        match m {
            BatchMsg::Send { to, denom, amount } => {
                msgs.push(Msg::Send {
                    from: guard_addr.clone(),
                    to: to.clone(),
                    denom: denom.clone(),
                    amount: *amount,
                });
            }
        }
    }
    let tx = Tx::new(&chain_id, nonce, msgs, b.fee, &b.memo)?;

    // Gas estimation for batch
    let gas_limit = if let Some(gas) = c.gas {
        gas
    } else {
        estimate_gas_for_batch(&tx, c.gas_price)?
    };

    // Display gas information
    let intrinsic_gas = estimate_intrinsic_gas_for_batch(&tx)?;
    if fmt.is_json() {
        println!("{{\"intrinsic_gas\": {}, \"gas_limit\": {}, \"gas_price\": {}, \"estimated_fee_datt\": {}}}",
                 intrinsic_gas, gas_limit, c.gas_price, gas_limit * c.gas_price);
    } else {
        println!("Batch intrinsic gas: {}", intrinsic_gas);
        println!("Gas limit: {}", gas_limit);
        println!("Gas price: {} datt", c.gas_price);
        println!(
            "Estimated fee: {} datt ({:.9} DGT)",
            gas_limit * c.gas_price,
            (gas_limit * c.gas_price) as f64 / 1_000_000_000.0
        );
    }

    let stx = SignedTx::sign(tx, &sk_clone, &pk_clone, gas_limit, c.gas_price)?;
    if b.broadcast {
        let br = client.submit(&stx).await?;
        if fmt.is_json() {
            print_json_array(&[serde_json::json!({"hash": br.hash, "status": br.status})])?;
        } else {
            println!("hash={} status={}", br.hash, br.status);
        }
    } else {
        if fmt.is_json() {
            print_json_array(&[&stx])?;
        } else {
            println!("signed_tx hash={}", stx.tx_hash()?);
        }
    }
    Ok(())
}

fn estimate_gas_for_batch(tx: &Tx, _gas_price: u64) -> Result<u64> {
    let intrinsic = estimate_intrinsic_gas_for_batch(tx)?;
    // Apply higher safety factor for batch transactions
    Ok(intrinsic * 3)
}

fn estimate_intrinsic_gas_for_batch(tx: &Tx) -> Result<u64> {
    // Estimate transaction size
    let tx_bytes = serde_json::to_vec(tx)?;
    let tx_size = tx_bytes.len();

    // Base cost for batch (higher than single transfer)
    let base_cost = 500u64 + (tx.msgs.len() as u64 - 1) * 200; // Extra cost per additional message
    let per_byte_cost = 2u64;
    let size_cost = per_byte_cost * (tx_size as u64);

    Ok(base_cost + size_cost)
}
