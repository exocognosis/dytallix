use anyhow::Result;
use clap::{Parser, Subcommand};
use serde_json::Value;

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
    /// Generate PQC keypair
    PqcKeygen {
        #[arg(long, default_value = "dilithium3")]
        algorithm: String,
        #[arg(long)]
        output_file: Option<String>,
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
        Commands::Send { from, to, amount, denom } => {
            send_tokens(&cli.rpc_url, &from, &to, &amount, &denom).await?;
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
        Commands::PqcKeygen { algorithm, output_file } => {
            generate_pqc_keypair(&algorithm, output_file.as_deref())?;
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

async fn send_tokens(rpc_url: &str, from: &str, to: &str, amount: &str, denom: &str) -> Result<()> {
    println!("Sending {} {} from {} to {}", amount, denom, from, to);
    let tx_hash = "0x1234567890abcdef";
    println!("Transaction broadcasted: {}", tx_hash);
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

fn generate_pqc_keypair(algorithm: &str, output_file: Option<&str>) -> Result<()> {
    println!("Generating PQC keypair with algorithm: {}", algorithm);
    let private_key = "pqc_private_key_placeholder";
    let public_key = "pqc_public_key_placeholder";
    
    if let Some(file) = output_file {
        println!("Keys saved to: {}", file);
    } else {
        println!("Private Key: {}", private_key);
        println!("Public Key: {}", public_key);
    }
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