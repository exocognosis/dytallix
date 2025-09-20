use crate::output::OutputFormat;
use crate::rpc::RpcClient;
use anyhow::Result;
use clap::Args;
use serde_json::json;

#[derive(Args, Debug, Clone)]
pub struct StakeCmd {
    #[command(subcommand)]
    pub action: StakeAction,
}

#[derive(clap::Subcommand, Debug, Clone)]
pub enum StakeAction {
    /// Register as a validator and self-delegate
    RegisterValidator {
        #[arg(long)]
        address: String,
        #[arg(long)]
        pubkey: String,
        #[arg(long, default_value = "500")]
        commission: u16,
        #[arg(long)]
        self_stake: u128,
    },
    /// Delegate DGT tokens to a validator
    Delegate {
        #[arg(long)]
        from: String,
        #[arg(long)]
        validator: String,
        #[arg(long)]
        amount: u128,
    },
    /// Undelegate tokens from a validator (placeholder)
    Undelegate {
        #[arg(long)]
        from: String,
        #[arg(long)]
        validator: String,
        #[arg(long)]
        amount: u128,
    },
    /// Show staking information for an address
    Show {
        #[arg(long)]
        address: String,
    },
    /// List all validators
    Validators,
    /// Claim staking rewards
    ClaimRewards {
        #[arg(long)]
        delegator: String,
        #[arg(long)]
        validator: String,
    },
    /// Claim staking rewards (enhanced with all/validator options)
    Claim {
        #[arg(long)]
        delegator: String,
        #[arg(long)]
        validator: Option<String>,
        #[arg(long)]
        all: bool,
    },
    /// Show comprehensive staking rewards for a delegator
    Rewards {
        #[arg(long)]
        delegator: String,
        #[arg(long)]
        json: bool,
    },
    /// Show accrued (unclaimed) staking rewards for an address (legacy)
    ShowRewards {
        #[arg(long)]
        address: String,
    },
    /// Show staking balance (staked, liquid, rewards) for a delegator
    Balance {
        #[arg(long)]
        delegator: String,
    },
    /// Show staking statistics
    Stats,
}

pub async fn run(rpc_url: &str, fmt: OutputFormat, cmd: StakeCmd) -> Result<()> {
    let client = RpcClient::new(rpc_url);

    match cmd.action {
        StakeAction::RegisterValidator {
            address,
            pubkey,
            commission,
            self_stake,
        } => register_validator(&client, fmt, address, pubkey, commission, self_stake).await,
        StakeAction::Delegate {
            from,
            validator,
            amount,
        } => delegate(&client, fmt, from, validator, amount).await,
        StakeAction::Undelegate { .. } => {
            out(fmt, "Undelegate not implemented yet (TODO)");
            Ok(())
        }
        StakeAction::Show { address } => show_stake(&client, fmt, address).await,
        StakeAction::Validators => list_validators(&client, fmt).await,
        StakeAction::ClaimRewards {
            delegator,
            validator,
        } => claim_rewards(&client, fmt, delegator, validator).await,
        StakeAction::Claim {
            delegator,
            validator,
            all,
        } => {
            if all {
                claim_all_rewards(&client, fmt, delegator).await
            } else if let Some(validator) = validator {
                claim_rewards(&client, fmt, delegator, validator).await
            } else {
                if fmt.is_json() {
                    println!(
                        "{}",
                        json!({"status": "error", "message": "Either --validator or --all must be specified"})
                    );
                } else {
                    println!("✗ Either --validator or --all must be specified");
                }
                Ok(())
            }
        }
        StakeAction::Rewards { delegator, json } => {
            let output_fmt = if json { OutputFormat::Json } else { fmt };
            show_comprehensive_rewards(&client, output_fmt, delegator).await
        }
        StakeAction::ShowRewards { address } => show_rewards(&client, fmt, address).await,
        StakeAction::Balance { delegator } => show_balance(&client, fmt, delegator).await,
        StakeAction::Stats => show_stats(&client, fmt).await,
    }
}

async fn register_validator(
    client: &RpcClient,
    fmt: OutputFormat,
    address: String,
    pubkey: String,
    commission: u16,
    self_stake: u128,
) -> Result<()> {
    // First register the validator
    let register_result = client
        .call(
            "staking_register_validator",
            &[json!(address), json!(pubkey), json!(commission)],
        )
        .await;

    match register_result {
        Ok(_) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "success", "message": "Validator registered"})
                );
            } else {
                println!("✓ Validator registered successfully");
            }

            // Then self-delegate
            if self_stake > 0 {
                let delegate_result = client
                    .call(
                        "staking_delegate",
                        &[
                            json!(address),
                            json!(address), // Self-delegation
                            json!(self_stake),
                        ],
                    )
                    .await;

                match delegate_result {
                    Ok(_) => {
                        if fmt.is_json() {
                            println!(
                                "{}",
                                json!({"status": "success", "message": "Self-delegation completed", "amount": self_stake})
                            );
                        } else {
                            println!("✓ Self-delegated {self_stake} uDGT");
                        }
                    }
                    Err(e) => {
                        if fmt.is_json() {
                            println!(
                                "{}",
                                json!({"status": "error", "message": format!("Self-delegation failed: {}", e)})
                            );
                        } else {
                            println!("✗ Self-delegation failed: {e}");
                        }
                    }
                }
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Validator registration failed: {}", e)})
                );
            } else {
                println!("✗ Validator registration failed: {e}");
            }
        }
    }

    Ok(())
}

async fn delegate(
    client: &RpcClient,
    fmt: OutputFormat,
    from: String,
    validator: String,
    amount: u128,
) -> Result<()> {
    let payload = json!({
        "delegator_addr": from,
        "validator_addr": validator,
        "amount_udgt": amount.to_string()
    });

    let result = client.post("/api/staking/delegate", &payload).await;

    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{response}");
            } else {
                println!("✓ Delegated {amount} uDGT from {from} to {validator}");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Delegation failed: {}", e)})
                );
            } else {
                println!("✗ Delegation failed: {e}");
            }
        }
    }

    Ok(())
}

async fn show_stake(client: &RpcClient, fmt: OutputFormat, address: String) -> Result<()> {
    // Get validator info if it's a validator
    let validator_result = client
        .call("staking_get_validator", &[json!(address)])
        .await;

    // Get delegation info (this would need to be implemented as a query for all delegations by address)
    let delegation_result = client
        .call("staking_get_delegations", &[json!(address)])
        .await;

    if fmt.is_json() {
        println!(
            "{}",
            json!({
                "address": address,
                "validator": validator_result.unwrap_or(json!(null)),
                "delegations": delegation_result.unwrap_or(json!([]))
            })
        );
    } else {
        println!("Staking information for: {address}");

        if let Ok(validator) = validator_result {
            if !validator.is_null() {
                println!("  Validator: {validator}");
            }
        }

        if let Ok(delegations) = delegation_result {
            if let Some(arr) = delegations.as_array() {
                if !arr.is_empty() {
                    println!("  Delegations: {delegations}");
                } else {
                    println!("  No delegations found");
                }
            }
        }
    }

    Ok(())
}

async fn list_validators(client: &RpcClient, fmt: OutputFormat) -> Result<()> {
    let result = client.call("staking_get_validators", &[]).await;

    match result {
        Ok(validators) => {
            if fmt.is_json() {
                println!("{validators}");
            } else if let Some(arr) = validators.as_array() {
                println!("Active Validators ({})", arr.len());
                for (i, validator) in arr.iter().enumerate() {
                    println!("  {}. {}", i + 1, validator);
                }
            } else {
                println!("No validators found");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to get validators: {}", e)})
                );
            } else {
                println!("✗ Failed to get validators: {e}");
            }
        }
    }

    Ok(())
}

async fn claim_rewards(
    client: &RpcClient,
    fmt: OutputFormat,
    delegator: String,
    validator: String,
) -> Result<()> {
    let result = client
        .call(
            "staking_claim_rewards",
            &[json!(delegator), json!(validator)],
        )
        .await;

    match result {
        Ok(rewards) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "success", "rewards": rewards}));
            } else {
                println!("✓ Claimed {rewards} uDRT rewards");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to claim rewards: {}", e)})
                );
            } else {
                println!("✗ Failed to claim rewards: {e}");
            }
        }
    }

    Ok(())
}

async fn show_stats(client: &RpcClient, fmt: OutputFormat) -> Result<()> {
    let result = client.call("staking_get_stats", &[]).await;

    match result {
        Ok(stats) => {
            if fmt.is_json() {
                println!("{stats}");
            } else if let (Some(total_stake), Some(total_validators), Some(active_validators)) = (
                stats["total_stake"].as_u64(),
                stats["total_validators"].as_u64(),
                stats["active_validators"].as_u64(),
            ) {
                println!("Staking Statistics:");
                println!("  Total Stake: {total_stake} uDGT");
                println!("  Total Validators: {total_validators}");
                println!("  Active Validators: {active_validators}");
            } else {
                println!("Invalid stats response: {stats}");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to get stats: {}", e)})
                );
            } else {
                println!("✗ Failed to get staking stats: {e}");
            }
        }
    }

    Ok(())
}

/// Claim staking rewards (simplified version using our new endpoint)
#[allow(dead_code)]
async fn claim_simple(client: &RpcClient, fmt: OutputFormat, address: String) -> Result<()> {
    let payload = json!({
        "address": address
    });

    let result = client.post("/api/staking/claim", &payload).await;

    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{response}");
            } else if let (Some(claimed), Some(new_balance)) = (
                response.get("claimed").and_then(|v| v.as_str()),
                response.get("new_balance").and_then(|v| v.as_str()),
            ) {
                println!("✓ Successfully claimed {claimed} uDRT");
                println!("  New DRT balance: {new_balance} uDRT");
            } else {
                println!("✓ Claim successful: {response}");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to claim rewards: {}", e)})
                );
            } else {
                println!("✗ Failed to claim rewards: {e}");
            }
        }
    }

    Ok(())
}

/// Show accrued staking rewards for an address
async fn show_rewards(client: &RpcClient, fmt: OutputFormat, address: String) -> Result<()> {
    let result = client.get(&format!("/api/staking/accrued/{address}")).await;

    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{response}");
            } else if let Some(accrued) = response.get("accrued_rewards").and_then(|v| v.as_str()) {
                println!("Accrued rewards for {address}: {accrued} uDRT");
            } else {
                println!("Accrued rewards: {response}");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to get accrued rewards: {}", e)})
                );
            } else {
                println!("✗ Failed to get accrued rewards: {e}");
            }
        }
    }

    Ok(())
}

/// Claim rewards from all validators for a delegator
async fn claim_all_rewards(client: &RpcClient, fmt: OutputFormat, delegator: String) -> Result<()> {
    let payload = json!({
        "address": delegator
    });

    let result = client.post("/api/staking/claim", &payload).await;

    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{response}");
            } else if let Some(amount) = response.get("claimed").and_then(|v| v.as_str()) {
                println!("✓ Claimed {amount} uDRT total rewards for {delegator}");
            } else {
                println!("✓ All rewards claimed: {response}");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to claim all rewards: {}", e)})
                );
            } else {
                println!("✗ Failed to claim all rewards: {e}");
            }
        }
    }

    Ok(())
}

/// Show comprehensive reward information for a delegator
async fn show_comprehensive_rewards(
    client: &RpcClient,
    fmt: OutputFormat,
    delegator: String,
) -> Result<()> {
    let result = client.get(&format!("/staking/rewards/{delegator}")).await;

    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{response}");
            } else {
                // Pretty print the comprehensive reward information
                if let Some(summary) = response.get("summary") {
                    println!("Rewards Summary for {delegator}:");
                    println!(
                        "  Total Stake: {} uDGT",
                        summary
                            .get("total_stake")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0")
                    );
                    println!(
                        "  Pending Rewards: {} uDRT",
                        summary
                            .get("pending_rewards")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0")
                    );
                    println!(
                        "  Unclaimed Rewards: {} uDRT",
                        summary
                            .get("accrued_unclaimed")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0")
                    );
                    println!(
                        "  Total Claimed: {} uDRT",
                        summary
                            .get("total_claimed")
                            .and_then(|v| v.as_str())
                            .unwrap_or("0")
                    );

                    if let Some(positions) = response.get("positions").and_then(|v| v.as_array()) {
                        println!("\nPositions:");
                        for (i, position) in positions.iter().enumerate() {
                            println!(
                                "  {}. Validator: {}",
                                i + 1,
                                position
                                    .get("validator")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("unknown")
                            );
                            println!(
                                "     Stake: {} uDGT",
                                position
                                    .get("stake")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("0")
                            );
                            println!(
                                "     Pending: {} uDRT",
                                position
                                    .get("pending")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("0")
                            );
                            println!(
                                "     Unclaimed: {} uDRT",
                                position
                                    .get("accrued_unclaimed")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("0")
                            );
                            println!();
                        }
                    }
                } else {
                    println!("Rewards info: {response}");
                }
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to get reward information: {}", e)})
                );
            } else {
                println!("✗ Failed to get reward information: {e}");
            }
        }
    }

    Ok(())
}

/// Show staking balance (staked, liquid, rewards) for a delegator
async fn show_balance(client: &RpcClient, fmt: OutputFormat, delegator: String) -> Result<()> {
    let result = client
        .get(&format!("/api/staking/balance/{delegator}"))
        .await;

    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{response}");
            } else if let (Some(staked), Some(liquid), Some(rewards)) = (
                response.get("staked").and_then(|v| v.as_str()),
                response.get("liquid").and_then(|v| v.as_str()),
                response.get("rewards").and_then(|v| v.as_str()),
            ) {
                println!("Balance for {delegator}:");
                println!("  Staked: {staked} uDGT");
                println!("  Liquid: {liquid} uDGT");
                println!("  Rewards: {rewards} uDRT");
            } else {
                println!("Balance: {response}");
            }
        }
        Err(e) => {
            if fmt.is_json() {
                println!(
                    "{}",
                    json!({"status": "error", "message": format!("Failed to get balance: {}", e)})
                );
            } else {
                println!("✗ Failed to get balance: {e}");
            }
        }
    }

    Ok(())
}

fn out(fmt: OutputFormat, msg: &str) {
    if fmt.is_json() {
        println!("{{\"message\":\"{msg}\"}}");
    } else {
        println!("{msg}");
    }
}
