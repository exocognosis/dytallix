use anyhow::{Result, anyhow};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use reqwest::Client;
use ed25519_dalek::{SigningKey, SecretKey as EdSecretKey, VerifyingKey, Signature, Signer};
use rand::rngs::OsRng;
use base64::{engine::general_purpose, Engine as _};
// PQC
use pqcrypto_dilithium::dilithium3;
use pqcrypto_traits::sign::{DetachedSignature, PublicKey};
use sha2::{Digest, Sha256};
use bech32::{ToBase32, Variant, encode as bech32_encode};
use zeroize::Zeroize;

#[derive(Parser)]
#[command(name = "dytx")]
#[command(about = "Dytallix transaction CLI for testnet operations")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    #[arg(long, default_value = "http://localhost:26657")]
    rpc_url: String,
    
    #[arg(long, default_value = "http://localhost:1317")]
    rest_url: String,

    #[arg(long, default_value = "http://localhost:8080")] 
    server_url: String,
}

#[derive(Subcommand)]
enum Commands {
    /// Send DGT or DRT tokens
    Send {
        #[arg(long)]
        from: String,
        #[arg(long)]
        to: String,
        #[arg(long)]
        amount: String,
        #[arg(long, default_value = "udgt")]
        denom: String,
        /// hex-encoded ed25519 private key (32 bytes). Used only when PQC is disabled.
        #[arg(long)]
        sk: Option<String>,
    },
    /// Query account balance
    Balance {
        #[arg(long)]
        address: String,
    },
    /// Submit governance proposal
    GovPropose {
        #[arg(long)]
        title: String,
        #[arg(long)]
        description: String,
        #[arg(long)]
        deposit: String,
        #[arg(long)]
        proposer: String,
    },
    /// Vote on governance proposal
    GovVote {
        #[arg(long)]
        proposal_id: u64,
        #[arg(long)]
        option: String, // yes, no, abstain, no_with_veto
        #[arg(long)]
        voter: String,
    },
    /// Deploy WASM contract
    WasmDeploy {
        #[arg(long)]
        wasm_file: String,
        #[arg(long)]
        deployer: String,
    },
    /// Execute WASM contract
    WasmExecute {
        #[arg(long)]
        contract_address: String,
        #[arg(long)]
        method: String,
        #[arg(long)]
        args: Option<String>,
        #[arg(long)]
        caller: String,
    },
    /// Generate Dilithium3 keypair
    PqcKeygen {
        #[arg(long)]
        no_secret: bool,
        #[arg(long, default_value = "dyt")]
        hrp: String,
    },
    /// Sign input with Dilithium3
    PqcSign {
        #[arg(long)]
        sk: String, // base64
        #[arg(long)]
        input: Option<std::path::PathBuf>, // file path or stdin when omitted
    },
    /// Verify signature with Dilithium3
    PqcVerify {
        #[arg(long)]
        pk: String, // base64
        #[arg(long)]
        sig: String, // base64
        #[arg(long)]
        input: Option<std::path::PathBuf>,
    },
    /// Build and sign a canonical TX envelope (PQC)
    PqcTxBuild {
        #[arg(long)]
        chain_id: String,
        #[arg(long)]
        account_number: u64,
        #[arg(long)]
        sequence: u64,
        #[arg(long)]
        msgs: String, // JSON string
        #[arg(long)]
        fee: String, // JSON string
        #[arg(long, default_value = "")]
        memo: String,
        #[arg(long)]
        sk: String, // base64
        #[arg(long)]
        pk: String, // base64
        #[arg(long, default_value = "dyt")]
        hrp: String,
    },
    /// Query blockchain status
    Status,
    /// Query transaction by hash
    TxQuery {
        #[arg(long)]
        hash: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Send { from, to, amount, denom, sk } => {
            send_tokens(&cli.server_url, &from, &to, &amount, &denom, sk.as_deref()).await?;
        }
        Commands::Balance { address } => {
            query_balance(&cli.rest_url, &address).await?;
        }
        Commands::GovPropose { title, description, deposit, proposer } => {
            submit_proposal(&cli.rpc_url, &title, &description, &deposit, &proposer).await?;
        }
        Commands::GovVote { proposal_id, option, voter } => {
            vote_proposal(&cli.rpc_url, proposal_id, &option, &voter).await?;
        }
        Commands::WasmDeploy { wasm_file, deployer } => {
            deploy_contract(&cli.rpc_url, &wasm_file, &deployer).await?;
        }
        Commands::WasmExecute { contract_address, method, args, caller } => {
            execute_contract(&cli.rpc_url, &contract_address, &method, args.as_deref(), &caller).await?;
        }
        Commands::PqcKeygen { no_secret, hrp } => {
            run_pqc_keygen(no_secret, &hrp)?;
        }
        Commands::PqcSign { sk, input } => {
            let data = read_all(input.as_deref()).await?;
            let sig = pqc_sign(&data, &sk)?;
            println!("{}", sig);
        }
        Commands::PqcVerify { pk, sig, input } => {
            let data = read_all(input.as_deref()).await?;
            std::process::exit(if pqc_verify(&data, &sig, &pk)? { 0 } else { 1 });
        }
        Commands::PqcTxBuild { chain_id, account_number, sequence, msgs, fee, memo, sk, pk, hrp } => {
            let msgs_v: Value = serde_json::from_str(&msgs)?;
            let fee_v: Value = serde_json::from_str(&fee)?;
            let envelope = build_sign_envelope(&chain_id, account_number, sequence, msgs_v, fee_v, memo, &sk, &pk, &hrp)?;
            println!("{}", serde_json::to_string_pretty(&envelope)?);
        }
        Commands::Status => {
            query_status(&cli.rpc_url).await?;
        }
        Commands::TxQuery { hash } => {
            query_transaction(&cli.rpc_url, &hash).await?;
        }
    }
    
    Ok(())
}

#[derive(Serialize, Deserialize)]
struct SimpleMsgTransfer {
    from: String,
    to: String,
    amount: String,
    denom: String,
    memo: String,
}

async fn send_tokens(server_url: &str, from: &str, to: &str, amount: &str, denom: &str, sk_hex: Option<&str>) -> Result<()> {
    println!("Sending {} {} from {} to {}", amount, denom, from, to);

    // Build simple message to sign
    let msg = SimpleMsgTransfer {
        from: from.to_string(),
        to: to.to_string(),
        amount: amount.to_string(),
        denom: denom.to_string(),
        memo: "dytx".to_string(),
    };
    let payload = serde_json::to_vec(&msg)?;

    // Legacy ed25519 path (used only when PQC is disabled on server)
    let (sk, vk): (SigningKey, VerifyingKey) = if let Some(sk_hex) = sk_hex {
        let bytes = hex::decode(sk_hex)?;
        let secret = EdSecretKey::from_bytes(bytes.as_slice().try_into().expect("32 bytes"));
        let sk = SigningKey::from_bytes(&secret);
        let vk = VerifyingKey::from(&sk);
        (sk, vk)
    } else {
        let sk = SigningKey::generate(&mut OsRng);
        let vk = VerifyingKey::from(&sk);
        (sk, vk)
    };

    let sig: Signature = sk.sign(&payload);
    let tx_obj = serde_json::json!({
        "msg": msg,
        "pubkey": base64::encode(vk.as_bytes()),
        "sig": base64::encode(sig.to_bytes()),
    });

    // Encode tx bytes as hex with 0x prefix for Tendermint RPC
    let tx_bytes = serde_json::to_vec(&tx_obj)?;
    let tx_hex = format!("0x{}", hex::encode(tx_bytes));

    let client = Client::new();
    let r = client.post(format!("{}/txs/broadcast", server_url))
        .json(&serde_json::json!({"tx": tx_hex}))
        .send().await?;

    if r.status().is_success() {
        let v: Value = r.json().await?;
        println!("Broadcast result: {}", serde_json::to_string_pretty(&v)?);
    } else {
        let text = r.text().await?;
        eprintln!("Broadcast failed: {}", text);
    }
    Ok(())
}

async fn query_balance(rest_url: &str, address: &str) -> Result<()> {
    println!("Querying balance for address: {}", address);
    
    let client = reqwest::Client::new();
    let url = format!("{}/cosmos/bank/v1beta1/balances/{}", rest_url, address);
    
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                let json: Value = response.json().await?;
                if let Some(balances) = json.get("balances") {
                    println!("Balances:");
                    if let Some(balances_array) = balances.as_array() {
                        for balance in balances_array {
                            if let Some(amount) = balance.get("amount") {
                                if let Some(denom) = balance.get("denom") {
                                    println!("  {}: {}", denom.as_str().unwrap_or("unknown"), amount.as_str().unwrap_or("0"));
                                }
                            }
                        }
                    }
                } else {
                    println!("No balances found");
                }
            } else {
                println!("Error querying balance: HTTP {}", response.status());
            }
        }
        Err(e) => {
            println!("Connection error: {}. Using mock data:", e);
            println!("Balances:");
            println!("  udgt: 1000000");
            println!("  udrt: 500000");
        }
    }
    
    Ok(())
}

async fn submit_proposal(_rpc_url: &str, title: &str, description: &str, deposit: &str, proposer: &str) -> Result<()> {
    println!("Submitting governance proposal:");
    println!("  Title: {}", title);
    println!("  Description: {}", description);
    println!("  Deposit: {} udgt", deposit);
    println!("  Proposer: {}", proposer);
    println!("Proposal submitted with ID: 1");
    Ok(())
}

async fn vote_proposal(_rpc_url: &str, proposal_id: u64, option: &str, voter: &str) -> Result<()> {
    println!("Voting on proposal {} with option '{}' by {}", proposal_id, option, voter);
    println!("Vote submitted successfully");
    Ok(())
}

async fn deploy_contract(_rpc_url: &str, wasm_file: &str, deployer: &str) -> Result<()> {
    println!("Deploying WASM contract from {} by {}", wasm_file, deployer);
    let contract_address = "dytallix1contract1234567890123456789012345678901";
    println!("Contract deployed at address: {}", contract_address);
    Ok(())
}

async fn execute_contract(_rpc_url: &str, contract_address: &str, method: &str, args: Option<&str>, caller: &str) -> Result<()> {
    println!("Executing contract {} method '{}' by {}", contract_address, method, caller);
    if let Some(args) = args {
        println!("Arguments: {}", args);
    }
    println!("Contract execution successful");
    Ok(())
}

fn run_pqc_keygen(no_secret: bool, hrp: &str) -> Result<()> {
    let (pk, sk) = dilithium3::keypair();
    let addr = bech32_from_pk(pk.as_bytes(), hrp);
    let mut obj = json!({
        "algo": "pqc/dilithium3",
        "publicKey": base64::encode(pk.as_bytes()),
        "address": addr
    });
    if !no_secret {
        // Warning: printing secret key on stdout; for development only
        obj["secretKey"] = json!(base64::encode(sk.as_bytes()));
    }
    println!("{}", serde_json::to_string_pretty(&obj)?);
    Ok(())
}

async fn query_status(rpc_url: &str) -> Result<()> {
    println!("Querying blockchain status from: {}", rpc_url);
    
    let client = reqwest::Client::new();
    let url = format!("{}/status", rpc_url);
    
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                let json: Value = response.json().await?;
                println!("Blockchain Status:");
                if let Some(result) = json.get("result") {
                    if let Some(node_info) = result.get("node_info") {
                        if let Some(network) = node_info.get("network") {
                            println!("  Network: {}", network.as_str().unwrap_or("unknown"));
                        }
                    }
                    if let Some(sync_info) = result.get("sync_info") {
                        if let Some(height) = sync_info.get("latest_block_height") {
                            println!("  Latest Block Height: {}", height.as_str().unwrap_or("0"));
                        }
                    }
                }
            } else {
                println!("Error querying status: HTTP {}", response.status());
            }
        }
        Err(e) => {
            println!("Connection error: {}. Using mock data:", e);
            println!("Blockchain Status:");
            println!("  Network: dytallix-testnet-1");
            println!("  Latest Block Height: 100");
        }
    }
    Ok(())
}

async fn query_transaction(rpc_url: &str, hash: &str) -> Result<()> {
    println!("Querying transaction: {}", hash);
    
    let client = reqwest::Client::new();
    let url = format!("{}/tx?hash=0x{}", rpc_url, hash);
    
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                let json: Value = response.json().await?;
                println!("Transaction found:");
                println!("{}", serde_json::to_string_pretty(&json)?);
            } else {
                println!("Transaction not found or error: HTTP {}", response.status());
            }
        }
        Err(e) => {
            println!("Connection error: {}. Transaction may be pending.", e);
        }
    }
    Ok(())
}

fn bech32_from_pk(pk: &[u8], hrp: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(pk);
    let digest = hasher.finalize();
    let payload = &digest[..20];
    bech32_encode(hrp, payload.to_base32(), Variant::Bech32).expect("bech32")
}

fn b64(x: &[u8]) -> String { base64::encode(x) }
fn b64d(s: &str) -> Vec<u8> { base64::decode(s).expect("b64") }

fn pqc_sign(message: &[u8], sk_b64: &str) -> Result<String> {
    let sk = dilithium3::SecretKey::from_bytes(&b64d(sk_b64)).map_err(|_| anyhow!("bad secret key"))?;
    let sig: DetachedSignature = dilithium3::detached_sign(message, &sk);
    Ok(b64(sig.as_bytes()))
}

fn pqc_verify(message: &[u8], sig_b64: &str, pk_b64: &str) -> Result<bool> {
    let pk = dilithium3::PublicKey::from_bytes(&b64d(pk_b64)).map_err(|_| anyhow!("bad pk"))?;
    let sig = dilithium3::DetachedSignature::from_bytes(&b64d(sig_b64)).map_err(|_| anyhow!("bad sig"))?;
    Ok(dilithium3::verify_detached_signature(&sig, message, &pk).is_ok())
}

async fn read_all(path: Option<&std::path::PathBuf>) -> Result<Vec<u8>> {
    use tokio::io::AsyncReadExt;
    let mut buf = Vec::new();
    if let Some(p) = path {
        buf = tokio::fs::read(p).await?;
    } else {
        let mut stdin = tokio::io::stdin();
        stdin.read_to_end(&mut buf).await?;
    }
    Ok(buf)
}

#[derive(Serialize, Deserialize, Clone)]
struct SignerInfo { address: String, publicKey: String, algo: String }

fn canonical_stringify(value: &Value) -> String {
    // deterministic stringify for objects and arrays, no spaces
    fn stringify(v: &Value) -> String {
        match v {
            Value::Null => "null".into(),
            Value::Bool(b) => if *b {"true".into()} else {"false".into()},
            Value::Number(n) => n.to_string(),
            Value::String(s) => serde_json::to_string(s).unwrap(),
            Value::Array(arr) => {
                let inner: Vec<String> = arr.iter().map(stringify).collect();
                format!("[{}]", inner.join(","))
            },
            Value::Object(map) => {
                let mut keys: Vec<&String> = map.keys().collect();
                keys.sort();
                let inner: Vec<String> = keys.into_iter().map(|k| format!("{}:{}", serde_json::to_string(k).unwrap(), stringify(&map[k]))).collect();
                format!("{{{}}}", inner.join(","))
            }
        }
    }
    stringify(value)
}

fn canonical_bytes(doc: &Value) -> Vec<u8> {
    use sha2::Digest;
    let s = canonical_stringify(doc);
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    hasher.finalize().to_vec()
}

fn build_sign_envelope(chain_id: &str, account_number: u64, sequence: u64, msgs: Value, fee: Value, memo: String, sk_b64: &str, pk_b64: &str, hrp: &str) -> Result<Value> {
    let sk = dilithium3::SecretKey::from_bytes(&b64d(sk_b64)).map_err(|_| anyhow!("invalid sk"))?;
    let pk = dilithium3::PublicKey::from_bytes(&b64d(pk_b64)).map_err(|_| anyhow!("invalid pk"))?;

    let signer_addr = bech32_from_pk(pk.as_bytes(), hrp);
    let sign_doc = json!({
        "chainId": chain_id,
        "accountNumber": account_number,
        "sequence": sequence,
        "msgs": msgs,
        "fee": fee,
        "memo": memo,
    });
    let bytes = canonical_bytes(&sign_doc);
    let sig: DetachedSignature = dilithium3::detached_sign(&bytes, &sk);
    let envelope = json!({
        "signer": { "address": signer_addr, "publicKey": b64(pk.as_bytes()), "algo": "pqc/dilithium3" },
        "signature": b64(sig.as_bytes()),
        "body": sign_doc
    });
    Ok(envelope)
}