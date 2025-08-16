use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing_subscriber::{EnvFilter, FmtSubscriber};
use axum::{routing::get, Router};
use std::{net::SocketAddr};
use tokio::signal;

#[derive(Parser, Debug)]
#[command(name = "dytallixd", version, about = "Dytallix Devnet Daemon", long_about=None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Cmd>
}

#[derive(Subcommand, Debug)]
enum Cmd {
    Start {
        #[arg(long, default_value = "/root/.dytallix")] 
        home: String,
    },
    Init {
        moniker: String,
        #[arg(long, default_value = "dyt-devnet")] 
        chain_id: String,
        #[arg(long, default_value = "/root/.dytallix")] 
        home: String,
    }
}

fn ensure_dir(path: &str) -> Result<()> { std::fs::create_dir_all(path)?; Ok(()) }

fn write_dummy_configs(home: &str, moniker: &str, chain_id: &str) -> Result<()> {
    let cfg_dir = format!("{home}/config");
    std::fs::create_dir_all(&cfg_dir)?;
    std::fs::write(format!("{cfg_dir}/app.toml"), format!("moniker = '{moniker}'\n"))?;
    std::fs::write(format!("{cfg_dir}/config.toml"), format!("chain_id = '{chain_id}'\n"))?;
    Ok(())
}

async fn run_node(_home: &str) -> Result<()> {
    // Minimal Tendermint-like status endpoint
    let app = Router::new().route("/status", get(|| async { axum::Json(serde_json::json!({"node_info":{"id":"dummy","moniker":"dev"},"sync_info":{"latest_block_height":0}})) }));
    let addr: SocketAddr = "0.0.0.0:26657".parse().unwrap();
    tracing::info!("starting dytallixd RPC on {addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await?, app)
        .with_graceful_shutdown(async {
            let _ = signal::ctrl_c().await; 
        })
        .await?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let subscriber = FmtSubscriber::builder().with_env_filter(EnvFilter::from_default_env()).finish();
    let _ = tracing::subscriber::set_global_default(subscriber);

    match cli.command.unwrap_or(Cmd::Start { home: "/root/.dytallix".into() }) {
        Cmd::Init { moniker, chain_id, home } => {
            ensure_dir(&home)?; write_dummy_configs(&home, &moniker, &chain_id)?; println!("Initialized {moniker} chain_id={chain_id} home={home}");
        }
        Cmd::Start { home } => { ensure_dir(&home)?; run_node(&home).await?; }
    }
    Ok(())
}
