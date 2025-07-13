#!/usr/bin/env cargo run --bin bridge-cli --

//! Dytallix Cross-Chain Bridge CLI Tool
//! 
//! A command-line interface for managing cross-chain bridges and IBC operations.

use std::env;
use std::process;
use dytallix_interoperability::{
    Asset, AssetMetadata, DytallixBridge, DytallixIBC, PQCBridge, IBCModule, 
    IBCPacket, BridgeTxId
};

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        print_usage();
        process::exit(1);
    }
    
    let command = &args[1];
    
    match command.as_str() {
        "bridge" => handle_bridge_commands(&args[2..]).await,
        "ibc" => handle_ibc_commands(&args[2..]).await,
        "status" => handle_status_commands(&args[2..]).await,
        "validators" => handle_validator_commands(&args[2..]).await,
        "help" | "--help" | "-h" => print_usage(),
        _ => {
            println!("Error: Unknown command '{}'", command);
            print_usage();
            process::exit(1);
        }
    }
}

fn print_usage() {
    println!("Dytallix Cross-Chain Bridge CLI v0.9.3");
    println!();
    println!("USAGE:");
    println!("    bridge-cli <COMMAND> [OPTIONS]");
    println!();
    println!("COMMANDS:");
    println!("    bridge      Bridge asset operations");
    println!("    ibc         IBC protocol operations");
    println!("    status      Check bridge status");
    println!("    validators  Manage bridge validators");
    println!("    help        Show this help message");
    println!();
    println!("BRIDGE COMMANDS:");
    println!("    bridge lock <asset-id> <amount> <dest-chain> <dest-address>");
    println!("    bridge mint <asset-id> <amount> <origin-chain> <dest-address>");
    println!("    bridge verify <tx-id>");
    println!("    bridge emergency-halt <reason>");
    println!("    bridge resume");
    println!();
    println!("IBC COMMANDS:");
    println!("    ibc send <source-port> <source-channel> <dest-port> <dest-channel> <data>");
    println!("    ibc receive <packet-json>");
    println!("    ibc create-channel <port> <counterparty-port>");
    println!("    ibc close-channel <channel-id>");
    println!();
    println!("STATUS COMMANDS:");
    println!("    status bridge");
    println!("    status transaction <tx-id>");
    println!("    status chains");
    println!();
    println!("VALIDATOR COMMANDS:");
    println!("    validators list");
    println!("    validators add <id> <public-key> <algorithm> <stake>");
    println!("    validators remove <id>");
    println!();
    println!("EXAMPLES:");
    println!("    bridge-cli bridge lock DYT 1000 ethereum 0x1234...");
    println!("    bridge-cli ibc send transfer channel-0 transfer channel-1 'token transfer data'");
    println!("    bridge-cli status bridge");
    println!("    bridge-cli validators list");
}

async fn handle_bridge_commands(args: &[String]) {
    if args.is_empty() {
        println!("Error: Bridge command required");
        return;
    }
    
    let bridge = DytallixBridge::new();
    
    match args[0].as_str() {
        "lock" => {
            if args.len() != 5 {
                println!("Error: Usage: bridge lock <asset-id> <amount> <dest-chain> <dest-address>");
                return;
            }
            
            let asset_id = &args[1];
            let amount: u64 = match args[2].parse() {
                Ok(a) => a,
                Err(_) => {
                    println!("Error: Invalid amount '{}'", args[2]);
                    return;
                }
            };
            let dest_chain = &args[3];
            let dest_address = &args[4];
            
            let asset = Asset {
                id: asset_id.clone(),
                amount,
                decimals: 18,
                metadata: AssetMetadata {
                    name: format!("{} Token", asset_id.to_uppercase()),
                    symbol: asset_id.to_uppercase(),
                    description: "Dytallix native token".to_string(),
                    icon_url: Some("https://dytallix.io/assets/token-icon.png".to_string()),
                },
            };
            
            match bridge.lock_asset(asset, dest_chain, dest_address) {
                Ok(tx_id) => {
                    println!("✅ Asset locked successfully!");
                    println!("Transaction ID: {}", tx_id.0);
                    println!("Asset: {} {}", amount, asset_id);
                    println!("Destination: {} ({})", dest_chain, dest_address);
                    println!("Status: Pending validator signatures");
                }
                Err(e) => {
                    println!("❌ Failed to lock asset: {:?}", e);
                }
            }
        }
        
        "mint" => {
            if args.len() != 5 {
                println!("Error: Usage: bridge mint <asset-id> <amount> <origin-chain> <dest-address>");
                return;
            }
            
            let asset_id = &args[1];
            let amount: u64 = match args[2].parse() {
                Ok(a) => a,
                Err(_) => {
                    println!("Error: Invalid amount '{}'", args[2]);
                    return;
                }
            };
            let origin_chain = &args[3];
            let dest_address = &args[4];
            
            let asset = Asset {
                id: asset_id.clone(),
                amount,
                decimals: 18,
                metadata: AssetMetadata {
                    name: format!("Wrapped {} Token", asset_id.to_uppercase()),
                    symbol: format!("w{}", asset_id.to_uppercase()),
                    description: format!("Wrapped {} from {}", asset_id, origin_chain),
                    icon_url: Some("https://dytallix.io/assets/wrapped-token-icon.png".to_string()),
                },
            };
            
            match bridge.mint_wrapped(asset, origin_chain, dest_address) {
                Ok(wrapped_asset) => {
                    println!("✅ Wrapped asset minted successfully!");
                    println!("Original Asset: {}", wrapped_asset.original_asset_id);
                    println!("Amount: {}", wrapped_asset.amount);
                    println!("Origin Chain: {}", wrapped_asset.original_chain);
                    println!("Wrapped Contract: {}", wrapped_asset.wrapped_contract);
                    println!("Destination: {}", dest_address);
                }
                Err(e) => {
                    println!("❌ Failed to mint wrapped asset: {:?}", e);
                }
            }
        }
        
        "verify" => {
            if args.len() != 2 {
                println!("Error: Usage: bridge verify <tx-id>");
                return;
            }
            
            let tx_id = BridgeTxId(args[1].clone());
            match bridge.get_bridge_status(&tx_id) {
                Ok(status) => {
                    println!("✅ Transaction Status:");
                    println!("TX ID: {}", tx_id.0);
                    println!("Status: {:?}", status);
                }
                Err(e) => {
                    println!("❌ Failed to verify transaction: {:?}", e);
                }
            }
        }
        
        "emergency-halt" => {
            if args.len() != 2 {
                println!("Error: Usage: bridge emergency-halt <reason>");
                return;
            }
            
            let reason = &args[1];
            match bridge.emergency_halt(reason) {
                Ok(_) => {
                    println!("🚨 EMERGENCY HALT ACTIVATED");
                    println!("Reason: {}", reason);
                    println!("All bridge operations suspended");
                }
                Err(e) => {
                    println!("❌ Failed to halt bridge: {:?}", e);
                }
            }
        }
        
        "resume" => {
            match bridge.resume_bridge() {
                Ok(_) => {
                    println!("✅ Bridge operations resumed");
                }
                Err(e) => {
                    println!("❌ Failed to resume bridge: {:?}", e);
                }
            }
        }
        
        _ => {
            println!("Error: Unknown bridge command '{}'", args[0]);
        }
    }
}

async fn handle_ibc_commands(args: &[String]) {
    if args.is_empty() {
        println!("Error: IBC command required");
        return;
    }
    
    let ibc = DytallixIBC::new();
    
    match args[0].as_str() {
        "send" => {
            if args.len() != 6 {
                println!("Error: Usage: ibc send <source-port> <source-channel> <dest-port> <dest-channel> <data>");
                return;
            }
            
            let packet = IBCPacket {
                sequence: 1,
                source_port: args[1].clone(),
                source_channel: args[2].clone(),
                dest_port: args[3].clone(),
                dest_channel: args[4].clone(),
                data: args[5].as_bytes().to_vec(),
                timeout_height: 0,
                timeout_timestamp: 0,
                pqc_signature: None,
            };
            
            match ibc.send_packet(packet) {
                Ok(_) => {
                    println!("✅ IBC packet sent successfully!");
                    println!("Route: {} ({}) -> {} ({})", args[1], args[2], args[3], args[4]);
                    println!("Data: {}", args[5]);
                }
                Err(e) => {
                    println!("❌ Failed to send IBC packet: {:?}", e);
                }
            }
        }
        
        "create-channel" => {
            if args.len() != 3 {
                println!("Error: Usage: ibc create-channel <port> <counterparty-port>");
                return;
            }
            
            match ibc.create_channel(args[1].clone(), args[2].clone()) {
                Ok(channel) => {
                    println!("✅ IBC channel created successfully!");
                    println!("Channel ID: {}", channel.id);
                    println!("Port: {}", channel.port);
                    println!("Counterparty Port: {}", channel.counterparty_port);
                    println!("State: {:?}", channel.state);
                }
                Err(e) => {
                    println!("❌ Failed to create IBC channel: {:?}", e);
                }
            }
        }
        
        "close-channel" => {
            if args.len() != 2 {
                println!("Error: Usage: ibc close-channel <channel-id>");
                return;
            }
            
            match ibc.close_channel(args[1].clone()) {
                Ok(_) => {
                    println!("✅ IBC channel closed successfully!");
                    println!("Channel ID: {}", args[1]);
                }
                Err(e) => {
                    println!("❌ Failed to close IBC channel: {:?}", e);
                }
            }
        }
        
        _ => {
            println!("Error: Unknown IBC command '{}'", args[0]);
        }
    }
}

async fn handle_status_commands(args: &[String]) {
    if args.is_empty() {
        println!("Error: Status command required");
        return;
    }
    
    let bridge = DytallixBridge::new();
    
    match args[0].as_str() {
        "bridge" => {
            println!("🌉 Dytallix Bridge Status");
            println!("========================");
            println!("Status: Operational");
            println!("Supported Chains: {:?}", bridge.get_supported_chains());
            println!("Active Validators: {}", bridge.get_bridge_validators().len());
            println!("Version: v0.9.3");
            println!("PQC Algorithms: Dilithium, Falcon, SPHINCS+");
        }
        
        "transaction" => {
            if args.len() != 2 {
                println!("Error: Usage: status transaction <tx-id>");
                return;
            }
            
            let tx_id = BridgeTxId(args[1].clone());
            match bridge.get_bridge_status(&tx_id) {
                Ok(status) => {
                    println!("📋 Transaction Status");
                    println!("===================");
                    println!("TX ID: {}", tx_id.0);
                    println!("Status: {:?}", status);
                }
                Err(e) => {
                    println!("❌ Transaction not found: {:?}", e);
                }
            }
        }
        
        "chains" => {
            println!("🔗 Supported Chains");
            println!("==================");
            for chain in bridge.get_supported_chains() {
                println!("• {}", chain);
            }
        }
        
        _ => {
            println!("Error: Unknown status command '{}'", args[0]);
        }
    }
}

async fn handle_validator_commands(args: &[String]) {
    if args.is_empty() {
        println!("Error: Validator command required");
        return;
    }
    
    let bridge = DytallixBridge::new();
    
    match args[0].as_str() {
        "list" => {
            println!("👥 Bridge Validators");
            println!("==================");
            
            let validators = bridge.get_bridge_validators();
            if validators.is_empty() {
                println!("No validators found");
                return;
            }
            
            for validator in validators {
                println!("ID: {}", validator.id);
                println!("Algorithm: {}", validator.algorithm);
                println!("Stake: {} DYT", validator.stake);
                println!("Reputation: {:.2}%", validator.reputation * 100.0);
                println!("Status: {}", if validator.is_active { "Active" } else { "Inactive" });
                println!("---");
            }
        }
        
        "add" => {
            if args.len() != 5 {
                println!("Error: Usage: validators add <id> <public-key> <algorithm> <stake>");
                return;
            }
            
            println!("⚠️  Adding validators requires admin privileges");
            println!("Validator ID: {}", args[1]);
            println!("Algorithm: {}", args[3]);
            println!("Stake: {} DYT", args[4]);
            println!("This would normally require multi-sig approval from existing validators");
        }
        
        "remove" => {
            if args.len() != 2 {
                println!("Error: Usage: validators remove <id>");
                return;
            }
            
            println!("⚠️  Removing validators requires admin privileges");
            println!("Validator ID: {}", args[1]);
            println!("This would normally require multi-sig approval from existing validators");
        }
        
        _ => {
            println!("Error: Unknown validator command '{}'", args[0]);
        }
    }
}
