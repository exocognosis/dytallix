use clap::{Parser, Subcommand};
use anyhow::Result;
use colored::*;
use log::{info, error};

mod commands;
mod config;
mod client;
mod crypto;
mod utils;

use commands::*;

#[derive(Parser)]
#[command(name = "dytallix-cli")]
#[command(about = "Dytallix Blockchain Developer CLI")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// Node URL
    #[arg(long, default_value = "http://localhost:8080")]
    node_url: String,
    
    /// AI services URL  
    #[arg(long, default_value = "http://localhost:8000")]
    ai_url: String,
    
    /// Verbose output
    #[arg(short, long)]
    verbose: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Node management commands
    Node {
        #[command(subcommand)]
        command: NodeCommands,
    },
    /// Account management commands
    Account {
        #[command(subcommand)]
        command: AccountCommands,
    },
    /// Smart contract commands
    Contract {
        #[command(subcommand)]
        command: ContractCommands,
    },
    /// AI services commands
    Ai {
        #[command(subcommand)]
        command: AiCommands,
    },
    /// Transaction commands
    Transaction {
        #[command(subcommand)]
        command: TransactionCommands,
    },
    /// Initialize configuration
    Init,
    /// Show configuration
    Config,
}

#[derive(Subcommand)]
enum NodeCommands {
    /// Start local development node
    Start,
    /// Stop local node
    Stop,
    /// Check node status
    Status,
    /// View node logs
    Logs,
    /// Get node info
    Info,
}

#[derive(Subcommand)]
enum AccountCommands {
    /// Create new account with PQC keys
    Create {
        /// Account name
        #[arg(short, long)]
        name: Option<String>,
    },
    /// List all accounts
    List,
    /// Show account balance and details
    Balance {
        /// Account address or name
        account: String,
    },
    /// Export account keys
    Export {
        /// Account address or name
        account: String,
        /// Output file
        #[arg(short, long)]
        output: Option<String>,
    },
    /// Import account keys
    Import {
        /// Input file
        file: String,
    },
    /// Sign a message with account
    Sign {
        /// Account name
        account: String,
        /// Message to sign
        message: String,
    },
    /// Verify a signature
    Verify {
        /// Message that was signed
        message: String,
        /// Signature to verify (hex)
        signature: String,
        /// Public key (hex)
        public_key: String,
        /// Signature algorithm
        #[arg(short, long)]
        algorithm: Option<String>,
    },
    /// Generate a new address (without storing)
    Generate,
}

#[derive(Subcommand)]
enum ContractCommands {
    /// Deploy smart contract
    Deploy {
        /// Contract WASM file
        contract: String,
        /// Constructor parameters (JSON)
        #[arg(short, long)]
        params: Option<String>,
    },
    /// Call contract method
    Call {
        /// Contract address
        address: String,
        /// Method name
        method: String,
        /// Method parameters (JSON)
        #[arg(short, long)]
        params: Option<String>,
    },
    /// Query contract state
    Query {
        /// Contract address
        address: String,
        /// Query method
        method: String,
        /// Query parameters (JSON)
        #[arg(short, long)]
        params: Option<String>,
    },
    /// List contract events
    Events {
        /// Contract address
        address: String,
        /// Block range start
        #[arg(long)]
        from_block: Option<u64>,
        /// Block range end
        #[arg(long)]
        to_block: Option<u64>,
    },
}

#[derive(Subcommand)]
enum AiCommands {
    /// Analyze transaction for fraud
    AnalyzeFraud {
        /// Transaction hash or JSON data
        input: String,
    },
    /// Calculate risk score
    ScoreRisk {
        /// Transaction data (JSON)
        input: String,
    },
    /// Generate contract from natural language
    GenerateContract {
        /// Contract description
        description: String,
        /// Contract type
        #[arg(short, long, default_value = "escrow")]
        contract_type: String,
    },
    /// Check AI oracle status
    OracleStatus,
    /// Test AI services connection
    Test,
}

#[derive(Subcommand)]
enum TransactionCommands {
    /// Send transaction
    Send {
        /// Recipient address
        to: String,
        /// Amount to send
        amount: u64,
        /// Sender account
        #[arg(short, long)]
        from: Option<String>,
    },
    /// Get transaction details
    Get {
        /// Transaction hash
        hash: String,
    },
    /// List transactions
    List {
        /// Account address
        #[arg(short, long)]
        account: Option<String>,
        /// Limit number of results
        #[arg(short, long, default_value = "10")]
        limit: u64,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize logging
    if cli.verbose {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Debug)
            .init();
    } else {
        env_logger::Builder::from_default_env()
            .filter_level(log::LevelFilter::Info)
            .init();
    }
    
    // Print welcome message
    println!("{}", "🚀 Dytallix Developer CLI".bright_cyan().bold());
    println!("{}", "Post-Quantum AI-Enhanced Cryptocurrency".bright_blue());
    println!();
    
    // Create client configuration
    let config = config::Config {
        node_url: cli.node_url.clone(),
        ai_url: cli.ai_url.clone(),
        verbose: cli.verbose,
    };
    
    // Execute command
    match cli.command {
        Commands::Node { command } => {
            execute_node_command(command, &config).await?;
        }
        Commands::Account { command } => {
            execute_account_command(command, &config).await?;
        }
        Commands::Contract { command } => {
            execute_contract_command(command, &config).await?;
        }
        Commands::Ai { command } => {
            execute_ai_command(command, &config).await?;
        }
        Commands::Transaction { command } => {
            execute_transaction_command(command, &config).await?;
        }
        Commands::Init => {
            initialize_config(&config).await?;
        }
        Commands::Config => {
            show_config(&config).await?;
        }
    }
    
    Ok(())
}

async fn execute_node_command(command: NodeCommands, config: &config::Config) -> Result<()> {
    match command {
        NodeCommands::Start => node::start_node(config).await,
        NodeCommands::Stop => node::stop_node(config).await,
        NodeCommands::Status => node::node_status(config).await,
        NodeCommands::Logs => node::node_logs(config).await,
        NodeCommands::Info => node::node_info(config).await,
    }
}

async fn execute_account_command(command: AccountCommands, config: &config::Config) -> Result<()> {
    match command {
        AccountCommands::Create { name } => account::create_account(name, config).await,
        AccountCommands::List => account::list_accounts(config).await,
        AccountCommands::Balance { account } => account::account_balance(account, config).await,
        AccountCommands::Export { account, output } => account::export_account(account, output, config).await,
        AccountCommands::Import { file } => account::import_account(file, config).await,
        AccountCommands::Sign { account, message } => account::sign_message(account, message, config).await,
        AccountCommands::Verify { message, signature, public_key, algorithm } => {
            account::verify_signature(message, signature, public_key, algorithm, config).await
        }
        AccountCommands::Generate => account::generate_address(config).await,
    }
}

async fn execute_contract_command(command: ContractCommands, config: &config::Config) -> Result<()> {
    match command {
        ContractCommands::Deploy { contract, params } => {
            smart_contract::deploy_contract(contract, params, config).await
        }
        ContractCommands::Call { address, method, params } => {
            smart_contract::call_contract(address, method, params, config).await
        }
        ContractCommands::Query { address, method, params } => {
            smart_contract::query_contract(address, method, params, config).await
        }
        ContractCommands::Events { address, from_block, to_block } => {
            smart_contract::contract_events(address, from_block, to_block, config).await
        }
    }
}

async fn execute_ai_command(command: AiCommands, config: &config::Config) -> Result<()> {
    match command {
        AiCommands::AnalyzeFraud { input } => ai::analyze_fraud(input, config).await,
        AiCommands::ScoreRisk { input } => ai::score_risk(input, config).await,
        AiCommands::GenerateContract { description, contract_type } => {
            ai::generate_contract(description, contract_type, config).await
        }
        AiCommands::OracleStatus => ai::oracle_status(config).await,
        AiCommands::Test => ai::test_ai_services(config).await,
    }
}

async fn execute_transaction_command(command: TransactionCommands, config: &config::Config) -> Result<()> {
    match command {
        TransactionCommands::Send { to, amount, from } => {
            transaction::send_transaction(to, amount, from, config).await
        }
        TransactionCommands::Get { hash } => transaction::get_transaction(hash, config).await,
        TransactionCommands::List { account, limit } => {
            transaction::list_transactions(account, limit, config).await
        }
    }
}

async fn initialize_config(config: &config::Config) -> Result<()> {
    println!("{}", "🔧 Initializing Dytallix CLI configuration...".bright_green());
    
    // Create config directory
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?
        .join("dytallix");
    
    tokio::fs::create_dir_all(&config_dir).await?;
    
    // Create default configuration
    config::create_default_config(&config_dir).await?;
    
    println!("{}", "✅ Configuration initialized successfully!".bright_green());
    println!("Config directory: {}", config_dir.display());
    
    Ok(())
}

async fn show_config(config: &config::Config) -> Result<()> {
    println!("{}", "📋 Current Configuration".bright_cyan().bold());
    println!("Node URL: {}", config.node_url.bright_white());
    println!("AI Services URL: {}", config.ai_url.bright_white());
    println!("Verbose: {}", config.verbose.to_string().bright_white());
    
    Ok(())
}
