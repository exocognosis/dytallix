use crate::output::OutputFormat;
use crate::rpc::post_json;
use anyhow::Result;
use clap::Args;
use serde_json::json;

#[derive(Args, Debug, Clone)]
pub struct GovCmd {
    #[command(subcommand)]
    pub action: GovAction,
}

#[derive(clap::Subcommand, Debug, Clone)]
pub enum GovAction {
    Submit {
        #[arg(long)]
        title: Option<String>,
        #[arg(long)]
        description: Option<String>,
        #[arg(long, name = "type")]
        proposal_type: String, // "param-change"
        #[arg(long, name = "key")]
        param_key: String,
        #[arg(long, name = "value")]
        param_value: String,
        #[arg(long)]
        deposit: Option<u128>,
        #[arg(long)]
        from: String,
    },
    Deposit {
        #[arg(long)]
        from: String,
        #[arg(long)]
        proposal: u64,
        #[arg(long)]
        amount: u128,
    },
    Vote {
        #[arg(long)]
        from: String,
        #[arg(long)]
        proposal: u64,
        #[arg(long)]
        option: String, // yes, no, no_with_veto, abstain
    },
    Show {
        #[arg(long)]
        proposal: u64,
    },
    Tally {
        #[arg(long)]
        proposal: u64,
    },
    Proposals, // List all proposals
    Votes {
        #[arg(long)]
        proposal: u64,
    },
    VotingPower {
        #[arg(long)]
        address: String,
    },
    TotalVotingPower,
    Config,
}

pub async fn run(rpc: &str, fmt: OutputFormat, cmd: GovCmd) -> Result<()> {
    match cmd.action {
        GovAction::Submit {
            title,
            description,
            proposal_type,
            param_key,
            param_value,
            deposit,
            from,
        } => {
            // Validate proposal type
            if proposal_type != "param-change" {
                emit(
                    fmt,
                    "Error: Only 'param-change' proposal type is currently supported",
                );
                return Ok(());
            }

            // Use default title and description if not provided
            let final_title = title.unwrap_or_else(|| format!("Parameter Change: {param_key}"));
            let final_description =
                description.unwrap_or_else(|| format!("Change {param_key} to {param_value}"));

            // First submit the proposal
            let submit_payload = json!({
                "title": final_title,
                "description": final_description,
                "key": param_key,
                "value": param_value
            });

            match post_json(rpc, "gov/submit", &submit_payload).await {
                Ok(response) => {
                    emit(fmt, &format!("Proposal submitted: {response}"));

                    // If there's an initial deposit, try to parse the proposal ID and make a deposit
                    if let Some(deposit_amount) = deposit {
                        if deposit_amount > 0 {
                            if let Ok(resp_obj) =
                                serde_json::from_str::<serde_json::Value>(&response)
                            {
                                if let Some(proposal_id) =
                                    resp_obj.get("proposal_id").and_then(|v| v.as_u64())
                                {
                                    let deposit_payload = json!({
                                        "depositor": from,
                                        "proposal_id": proposal_id,
                                        "amount": deposit_amount
                                    });

                                    match post_json(rpc, "gov/deposit", &deposit_payload).await {
                                        Ok(deposit_response) => emit(
                                            fmt,
                                            &format!("Initial deposit made: {deposit_response}"),
                                        ),
                                        Err(e) => emit(
                                            fmt,
                                            &format!(
                                                "Warning: Could not make initial deposit: {e}"
                                            ),
                                        ),
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => emit(fmt, &format!("Error submitting proposal: {e}")),
            }
        }
        GovAction::Deposit {
            from,
            proposal,
            amount,
        } => {
            let payload = json!({
                "depositor": from,
                "proposal_id": proposal,
                "amount": amount
            });

            match post_json(rpc, "gov/deposit", &payload).await {
                Ok(response) => emit(fmt, &format!("Deposit successful: {response}")),
                Err(e) => emit(fmt, &format!("Error making deposit: {e}")),
            }
        }
        GovAction::Vote {
            from,
            proposal,
            option,
        } => {
            let payload = json!({
                "voter": from,
                "proposal_id": proposal,
                "option": option
            });

            match post_json(rpc, "gov/vote", &payload).await {
                Ok(response) => emit(fmt, &format!("Vote cast: {response}")),
                Err(e) => emit(fmt, &format!("Error casting vote: {e}")),
            }
        }
        GovAction::Show { proposal } => {
            match crate::rpc::get_json(rpc, &format!("gov/proposal/{proposal}")).await {
                Ok(response) => emit(fmt, &format!("Proposal details: {response}")),
                Err(e) => emit(fmt, &format!("Error getting proposal: {e}")),
            }
        }
        GovAction::Tally { proposal } => {
            match crate::rpc::get_json(rpc, &format!("gov/tally/{proposal}")).await {
                Ok(response) => emit(fmt, &format!("Vote tally: {response}")),
                Err(e) => emit(fmt, &format!("Error getting tally: {e}")),
            }
        }
        GovAction::Config => match crate::rpc::get_json(rpc, "gov/config").await {
            Ok(response) => emit(fmt, &format!("Governance config: {response}")),
            Err(e) => emit(fmt, &format!("Error getting config: {e}")),
        },
        GovAction::Proposals => match crate::rpc::get_json(rpc, "api/governance/proposals").await {
            Ok(response) => emit(fmt, &format!("All proposals: {response}")),
            Err(e) => emit(fmt, &format!("Error getting proposals: {e}")),
        },
        GovAction::Votes { proposal } => {
            match crate::rpc::get_json(rpc, &format!("api/governance/proposals/{proposal}/votes"))
                .await
            {
                Ok(response) => emit(fmt, &format!("Proposal votes: {response}")),
                Err(e) => emit(fmt, &format!("Error getting votes: {e}")),
            }
        }
        GovAction::VotingPower { address } => {
            match crate::rpc::get_json(rpc, &format!("api/governance/voting-power/{address}")).await
            {
                Ok(response) => emit(fmt, &format!("Voting power: {response}")),
                Err(e) => emit(fmt, &format!("Error getting voting power: {e}")),
            }
        }
        GovAction::TotalVotingPower => {
            match crate::rpc::get_json(rpc, "api/governance/total-voting-power").await {
                Ok(response) => emit(fmt, &format!("Total voting power: {response}")),
                Err(e) => emit(fmt, &format!("Error getting total voting power: {e}")),
            }
        }
    }
    Ok(())
}

fn emit(fmt: OutputFormat, msg: &str) {
    if fmt.is_json() {
        println!("{{\"result\":\"{}\"}}", msg.replace('"', "\\\""));
    } else {
        println!("{msg}");
    }
}
