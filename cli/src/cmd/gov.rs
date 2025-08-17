use anyhow::Result;
use clap::Args;
use crate::output::OutputFormat;
use crate::rpc::post_json;
use serde_json::json;

#[derive(Args, Debug, Clone)]
pub struct GovCmd { 
    #[command(subcommand)] 
    pub action: GovAction 
}

#[derive(clap::Subcommand, Debug, Clone)]
pub enum GovAction { 
    Submit { 
        #[arg(long)] 
        from: String, 
        #[arg(long)] 
        title: String, 
        #[arg(long)] 
        description: String,
        #[arg(long)]
        key: String,
        #[arg(long)]
        value: String,
    }, 
    Deposit {
        #[arg(long)]
        from: String,
        #[arg(long)]
        proposal: u64,
        #[arg(long)]
        amount: u64,
    },
    Vote { 
        #[arg(long)] 
        from: String, 
        #[arg(long)] 
        proposal: u64, 
        #[arg(long)] 
        option: String,
    }, 
    Show { 
        #[arg(long)] 
        proposal: u64,
    },
    Tally {
        #[arg(long)]
        proposal: u64,
    },
    Config,
}

pub async fn run(rpc: &str, fmt: OutputFormat, cmd: GovCmd) -> Result<()> {
    match cmd.action {
        GovAction::Submit { from: _, title, description, key, value } => {
            let payload = json!({
                "title": title,
                "description": description,
                "key": key,
                "value": value
            });
            
            match post_json(rpc, "gov/submit", &payload).await {
                Ok(response) => emit(fmt, &format!("Proposal submitted: {}", response)),
                Err(e) => emit(fmt, &format!("Error submitting proposal: {}", e)),
            }
        },
        GovAction::Deposit { from, proposal, amount } => {
            let payload = json!({
                "depositor": from,
                "proposal_id": proposal,
                "amount": amount
            });
            
            match post_json(rpc, "gov/deposit", &payload).await {
                Ok(response) => emit(fmt, &format!("Deposit successful: {}", response)),
                Err(e) => emit(fmt, &format!("Error making deposit: {}", e)),
            }
        },
        GovAction::Vote { from, proposal, option } => {
            let payload = json!({
                "voter": from,
                "proposal_id": proposal,
                "option": option
            });
            
            match post_json(rpc, "gov/vote", &payload).await {
                Ok(response) => emit(fmt, &format!("Vote cast: {}", response)),
                Err(e) => emit(fmt, &format!("Error casting vote: {}", e)),
            }
        },
        GovAction::Show { proposal } => {
            match crate::rpc::get_json(rpc, &format!("gov/proposal/{}", proposal)).await {
                Ok(response) => emit(fmt, &format!("Proposal details: {}", response)),
                Err(e) => emit(fmt, &format!("Error getting proposal: {}", e)),
            }
        },
        GovAction::Tally { proposal } => {
            match crate::rpc::get_json(rpc, &format!("gov/tally/{}", proposal)).await {
                Ok(response) => emit(fmt, &format!("Vote tally: {}", response)),
                Err(e) => emit(fmt, &format!("Error getting tally: {}", e)),
            }
        },
        GovAction::Config => {
            match crate::rpc::get_json(rpc, "gov/config").await {
                Ok(response) => emit(fmt, &format!("Governance config: {}", response)),
                Err(e) => emit(fmt, &format!("Error getting config: {}", e)),
            }
        },
    }
    Ok(())
}

fn emit(fmt: OutputFormat, msg: &str) {
    if fmt.is_json() { 
        println!("{{\"result\":\"{}\"}}", msg.replace('"', "\\\""));
    } else { 
        println!("{}", msg);
    }
}
