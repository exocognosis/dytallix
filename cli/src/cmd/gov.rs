use anyhow::Result;
use clap::Args;
use crate::output::OutputFormat;

#[derive(Args, Debug, Clone)]
pub struct GovCmd { #[command(subcommand)] pub action: GovAction }

#[derive(clap::Subcommand, Debug, Clone)]
pub enum GovAction { Propose { #[arg(long)] from: String, #[arg(long)] title: String, #[arg(long)] description: String }, Vote { #[arg(long)] from: String, #[arg(long)] proposal: u64, #[arg(long)] option: String }, Show { #[arg(long)] proposal: u64 } }

pub async fn run(_rpc: &str, fmt: OutputFormat, cmd: GovCmd) -> Result<()> {
    match cmd.action {
        GovAction::Propose { .. } => emit(fmt, "TODO governance propose"),
        GovAction::Vote { .. } => emit(fmt, "TODO governance vote"),
        GovAction::Show { proposal } => emit(fmt, format!("TODO governance show {}", proposal).as_str()),
    }
    Ok(())
}

fn emit(fmt: OutputFormat, msg: &str) {
    if fmt.is_json() { println!("{{\"todo\":\"{}\"}}", msg); } else { println!("{}", msg); }
}
