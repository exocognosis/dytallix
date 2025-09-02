use anyhow::Result;
use clap::{Args, Parser, Subcommand, ValueEnum};
use tracing::info;

use dcli::{
    cmd::{contract, gov, keys, oracle, pqc, query, stake, tx as txcmd},
    config,
    output::OutputFormat,
    secure,
};

#[derive(Parser, Debug)]
#[command(name="dcli", version, about="Dytallix Unified CLI (dual-token DGT/DRT)", long_about=None)]
struct Cli {
    #[arg(long, global = true)]
    rpc: Option<String>,
    #[arg(long, global = true)]
    chain_id: Option<String>,
    #[arg(long, global = true, env = "DX_HOME", default_value = "~/.dcli")]
    home: String, // old: DYT_HOME ~/.dyt
    #[arg(long, global = true, value_enum, default_value = "text")]
    output: OutputArg,
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Copy, Clone, Debug, ValueEnum)]
enum OutputArg {
    Text,
    Json,
}
impl From<OutputArg> for OutputFormat {
    fn from(o: OutputArg) -> Self {
        match o {
            OutputArg::Text => OutputFormat::Text,
            OutputArg::Json => OutputFormat::Json,
        }
    }
}

#[derive(Subcommand, Debug, Clone)]
enum Commands {
    Keys(keys::KeysCmd),
    Tx(TxGroup),
    Transfer(txcmd::TransferCmd),
    Batch(txcmd::BatchCmd),
    Config(ConfigCmd),
    Query(query::QueryCmd),
    Gov(gov::GovCmd),
    Stake(stake::StakeCmd),
    Contract(contract::ContractArgs),
    Oracle(oracle::OracleCmd),
    Pqc(pqc::PQCCmd),
}

#[derive(Args, Debug, Clone)]
struct TxGroup {
    #[command(subcommand)]
    action: TxAction,
}
#[derive(clap::Subcommand, Debug, Clone)]
enum TxAction {
    Transfer(txcmd::TransferCmd),
    Batch(txcmd::BatchCmd),
}

#[derive(Args, Debug, Clone)]
struct ConfigCmd {
    #[command(subcommand)]
    action: ConfigAction,
}
#[derive(clap::Subcommand, Debug, Clone)]
enum ConfigAction {
    Show,
    Set { key: String, value: String },
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing subscriber once (env RUST_LOG controls level, default info)
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .try_init();

    let cli = Cli::parse();
    secure::install_signal_handlers();
    let mut cfg = config::load()?;
    if let Some(r) = cli.rpc.as_ref() {
        cfg.rpc = r.clone();
    }
    if let Some(c) = cli.chain_id.as_ref() {
        cfg.chain_id = c.clone();
    }
    let fmt: OutputFormat = cli.output.into();

    info!(command=?cli.cmd, "starting CLI command");

    match cli.cmd.clone() {
        Commands::Config(cc) => match cc.action {
            ConfigAction::Show => {
                if fmt.is_json() {
                    println!("{}", serde_json::to_string_pretty(&cfg)?);
                } else {
                    println!("rpc=\n{}\nchain-id=\n{}", cfg.rpc, cfg.chain_id);
                }
            }
            ConfigAction::Set { key, value } => {
                cfg = config::set(&key, &value)?;
                if fmt.is_json() {
                    println!("{}", serde_json::to_string_pretty(&cfg)?);
                } else {
                    println!("Updated {key}");
                }
            }
        },
        Commands::Keys(k) => keys::handle(&cli.home, fmt, k).await?,
        Commands::Tx(tg) => match tg.action {
            TxAction::Transfer(c) => {
                txcmd::handle_transfer(&cfg.rpc, &cfg.chain_id, &cli.home, c, fmt).await?
            }
            TxAction::Batch(bc) => {
                txcmd::handle_batch(&cfg.rpc, &cfg.chain_id, &cli.home, bc, fmt).await?
            }
        },
        Commands::Transfer(c) => {
            txcmd::handle_transfer(&cfg.rpc, &cfg.chain_id, &cli.home, c, fmt).await?
        }
        Commands::Batch(bc) => {
            txcmd::handle_batch(&cfg.rpc, &cfg.chain_id, &cli.home, bc, fmt).await?
        }
        Commands::Query(qc) => query::run(&cfg.rpc, fmt, qc).await?,
        Commands::Gov(gc) => gov::run(&cfg.rpc, fmt, gc).await?,
        Commands::Stake(sc) => stake::run(&cfg.rpc, fmt, sc).await?,
        Commands::Contract(cc) => {
            let rpc_client = dcli::rpc::RpcClient::new(&cfg.rpc);
            cc.run(&rpc_client).await?;
        }
        Commands::Oracle(oc) => oracle::run(&cfg.rpc, fmt, oc).await?,
        Commands::Pqc(pc) => pqc::handle_pqc(fmt, pc).await?,
    }
    Ok(())
}
