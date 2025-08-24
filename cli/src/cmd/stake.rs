use anyhow::Result;
use clap::Args;
use crate::output::OutputFormat;
use crate::rpc::RpcClient;
use serde_json::json;

#[derive(Args, Debug, Clone)]
pub struct StakeCmd { 
    #[command(subcommand)] 
    pub action: StakeAction 
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
        amount: u128 
    }, 
    /// Undelegate tokens from a validator (placeholder)
    Undelegate { 
        #[arg(long)] 
        from: String, 
        #[arg(long)] 
        validator: String, 
        #[arg(long)] 
        amount: u128 
    }, 
    /// Show staking information for an address
    Show { 
        #[arg(long)] 
        address: String 
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
    /// Claim staking rewards for an address (simplified version)
    Claim {
        #[arg(long)]
        address: String,
    },
    /// Show accrued (unclaimed) staking rewards for an address
    ShowRewards {
        #[arg(long)]
        address: String,
    },
    /// Show staking statistics
    Stats,
}

pub async fn run(rpc_url: &str, fmt: OutputFormat, cmd: StakeCmd) -> Result<()> {
    let client = RpcClient::new(rpc_url);
    
    match cmd.action {
        StakeAction::RegisterValidator { address, pubkey, commission, self_stake } => {
            register_validator(&client, fmt, address, pubkey, commission, self_stake).await
        },
        StakeAction::Delegate { from, validator, amount } => {
            delegate(&client, fmt, from, validator, amount).await
        },
        StakeAction::Undelegate { .. } => {
            out(fmt, "Undelegate not implemented yet (TODO)");
            Ok(())
        },
        StakeAction::Show { address } => {
            show_stake(&client, fmt, address).await
        },
        StakeAction::Validators => {
            list_validators(&client, fmt).await
        },
        StakeAction::ClaimRewards { delegator, validator } => {
            claim_rewards(&client, fmt, delegator, validator).await
        },
        StakeAction::Claim { address } => {
            claim_simple(&client, fmt, address).await
        },
        StakeAction::ShowRewards { address } => {
            show_rewards(&client, fmt, address).await
        },
        StakeAction::Stats => {
            show_stats(&client, fmt).await
        },
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
    let register_result = client.call("staking_register_validator", &[
        json!(address),
        json!(pubkey),
        json!(commission),
    ]).await;

    match register_result {
        Ok(_) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "success", "message": "Validator registered"}));
            } else {
                println!("✓ Validator registered successfully");
            }
            
            // Then self-delegate
            if self_stake > 0 {
                let delegate_result = client.call("staking_delegate", &[
                    json!(address),
                    json!(address), // Self-delegation
                    json!(self_stake),
                ]).await;

                match delegate_result {
                    Ok(_) => {
                        if fmt.is_json() {
                            println!("{}", json!({"status": "success", "message": "Self-delegation completed", "amount": self_stake}));
                        } else {
                            println!("✓ Self-delegated {} uDGT", self_stake);
                        }
                    },
                    Err(e) => {
                        if fmt.is_json() {
                            println!("{}", json!({"status": "error", "message": format!("Self-delegation failed: {}", e)}));
                        } else {
                            println!("✗ Self-delegation failed: {}", e);
                        }
                    }
                }
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Validator registration failed: {}", e)}));
            } else {
                println!("✗ Validator registration failed: {}", e);
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
    let result = client.call("staking_delegate", &[
        json!(from),
        json!(validator),
        json!(amount),
    ]).await;

    match result {
        Ok(_) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "success", "delegator": from, "validator": validator, "amount": amount}));
            } else {
                println!("✓ Delegated {} uDGT from {} to {}", amount, from, validator);
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Delegation failed: {}", e)}));
            } else {
                println!("✗ Delegation failed: {}", e);
            }
        }
    }
    
    Ok(())
}

async fn show_stake(
    client: &RpcClient,
    fmt: OutputFormat,
    address: String,
) -> Result<()> {
    // Get validator info if it's a validator
    let validator_result = client.call("staking_get_validator", &[json!(address)]).await;
    
    // Get delegation info (this would need to be implemented as a query for all delegations by address)
    let delegation_result = client.call("staking_get_delegations", &[json!(address)]).await;

    if fmt.is_json() {
        println!("{}", json!({
            "address": address,
            "validator": validator_result.unwrap_or(json!(null)),
            "delegations": delegation_result.unwrap_or(json!([]))
        }));
    } else {
        println!("Staking information for: {}", address);
        
        if let Ok(validator) = validator_result {
            if !validator.is_null() {
                println!("  Validator: {}", validator);
            }
        }
        
        if let Ok(delegations) = delegation_result {
            if let Some(arr) = delegations.as_array() {
                if !arr.is_empty() {
                    println!("  Delegations: {}", delegations);
                } else {
                    println!("  No delegations found");
                }
            }
        }
    }
    
    Ok(())
}

async fn list_validators(
    client: &RpcClient,
    fmt: OutputFormat,
) -> Result<()> {
    let result = client.call("staking_get_validators", &[]).await;

    match result {
        Ok(validators) => {
            if fmt.is_json() {
                println!("{}", validators);
            } else {
                if let Some(arr) = validators.as_array() {
                    println!("Active Validators ({})", arr.len());
                    for (i, validator) in arr.iter().enumerate() {
                        println!("  {}. {}", i + 1, validator);
                    }
                } else {
                    println!("No validators found");
                }
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Failed to get validators: {}", e)}));
            } else {
                println!("✗ Failed to get validators: {}", e);
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
    let result = client.call("staking_claim_rewards", &[
        json!(delegator),
        json!(validator),
    ]).await;

    match result {
        Ok(rewards) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "success", "rewards": rewards}));
            } else {
                println!("✓ Claimed {} uDRT rewards", rewards);
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Failed to claim rewards: {}", e)}));
            } else {
                println!("✗ Failed to claim rewards: {}", e);
            }
        }
    }
    
    Ok(())
}

async fn show_stats(
    client: &RpcClient,
    fmt: OutputFormat,
) -> Result<()> {
    let result = client.call("staking_get_stats", &[]).await;

    match result {
        Ok(stats) => {
            if fmt.is_json() {
                println!("{}", stats);
            } else {
                if let (Some(total_stake), Some(total_validators), Some(active_validators)) = (
                    stats["total_stake"].as_u64(),
                    stats["total_validators"].as_u64(),
                    stats["active_validators"].as_u64(),
                ) {
                    println!("Staking Statistics:");
                    println!("  Total Stake: {} uDGT", total_stake);
                    println!("  Total Validators: {}", total_validators);
                    println!("  Active Validators: {}", active_validators);
                } else {
                    println!("Invalid stats response: {}", stats);
                }
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Failed to get stats: {}", e)}));
            } else {
                println!("✗ Failed to get staking stats: {}", e);
            }
        }
    }
    
    Ok(())
}

/// Claim staking rewards (simplified version using our new endpoint)
async fn claim_simple(
    client: &RpcClient,
    fmt: OutputFormat,
    address: String,
) -> Result<()> {
    let payload = json!({
        "address": address
    });
    
    let result = client.post("/api/staking/claim", &payload).await;
    
    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{}", response);
            } else {
                if let (Some(claimed), Some(new_balance)) = (
                    response.get("claimed").and_then(|v| v.as_str()),
                    response.get("new_balance").and_then(|v| v.as_str())
                ) {
                    println!("✓ Successfully claimed {} uDRT", claimed);
                    println!("  New DRT balance: {} uDRT", new_balance);
                } else {
                    println!("✓ Claim successful: {}", response);
                }
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Failed to claim rewards: {}", e)}));
            } else {
                println!("✗ Failed to claim rewards: {}", e);
            }
        }
    }
    
    Ok(())
}

/// Show accrued staking rewards for an address
async fn show_rewards(
    client: &RpcClient,
    fmt: OutputFormat,
    address: String,
) -> Result<()> {
    let result = client.get(&format!("/api/staking/accrued/{}", address)).await;
    
    match result {
        Ok(response) => {
            if fmt.is_json() {
                println!("{}", response);
            } else {
                if let Some(accrued) = response.get("accrued_rewards").and_then(|v| v.as_str()) {
                    println!("Accrued rewards for {}: {} uDRT", address, accrued);
                } else {
                    println!("Accrued rewards: {}", response);
                }
            }
        },
        Err(e) => {
            if fmt.is_json() {
                println!("{}", json!({"status": "error", "message": format!("Failed to get accrued rewards: {}", e)}));
            } else {
                println!("✗ Failed to get accrued rewards: {}", e);
            }
        }
    }
    
    Ok(())
}

fn out(fmt: OutputFormat, msg: &str) { 
    if fmt.is_json() { 
        println!("{{\"message\":\"{}\"}}", msg); 
    } else { 
        println!("{}", msg); 
    } 
}
