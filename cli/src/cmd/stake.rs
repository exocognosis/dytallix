use anyhow::Result;
use clap::Args;
use crate::output::OutputFormat;

#[derive(Args, Debug, Clone)]
pub struct StakeCmd { #[command(subcommand)] pub action: StakeAction }

#[derive(clap::Subcommand, Debug, Clone)]
pub enum StakeAction { Delegate { #[arg(long)] from: String, #[arg(long)] validator: String, #[arg(long)] amount: u128 }, Undelegate { #[arg(long)] from: String, #[arg(long)] validator: String, #[arg(long)] amount: u128 }, Show { #[arg(long)] address: String } }

pub async fn run(_rpc: &str, fmt: OutputFormat, cmd: StakeCmd) -> Result<()> {
    match cmd.action {
        StakeAction::Delegate { .. } => out(fmt, "TODO stake delegate (locks DGT)"),
        StakeAction::Undelegate { .. } => out(fmt, "TODO stake undelegate (releases DGT)"),
        StakeAction::Show { address } => out(fmt, format!("TODO stake show {} (DGT stake)", address).as_str()),
    }
    Ok(())
}

fn out(fmt: OutputFormat, msg: &str) { if fmt.is_json() { println!("{{\"todo\":\"{}\"}}", msg); } else { println!("{}", msg); } }
