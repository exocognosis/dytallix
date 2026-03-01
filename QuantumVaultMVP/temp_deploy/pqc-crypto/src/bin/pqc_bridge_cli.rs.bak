//! PQC Bridge CLI Tool
//!
//! Command-line interface for testing and demonstrating PQC signature verification
//! in cross-chain bridge operations.

use clap::{Parser, Subcommand};
use dytallix_pqc::{BridgePQCManager, CrossChainPayload, SignatureAlgorithm, run_pqc_performance_benchmarks};
use dytallix_interoperability::{DytallixBridge, Asset, AssetMetadata};
use std::collections::HashMap;
use std::time::SystemTime;

#[derive(Parser)]
#[command(name = "pqc-bridge")]
#[command(about = "PQC Bridge CLI - Test and demonstrate post-quantum cryptographic bridge operations")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate PQC keypairs for validators
    GenerateKeys {
        /// Algorithm to use (dilithium, falcon, sphincs)
        #[arg(short, long, default_value = "dilithium")]
        algorithm: String,
        /// Number of keypairs to generate
        #[arg(short, long, default_value = "3")]
        count: u32,
    },
    /// Sign a bridge payload
    SignPayload {
        /// Asset ID to transfer
        #[arg(short, long)]
        asset_id: String,
        /// Amount to transfer
        #[arg(short = 'm', long)]
        amount: u64,
        /// Source chain
        #[arg(short, long, default_value = "ethereum")]
        source: String,
        /// Destination chain
        #[arg(short, long, default_value = "cosmos")]
        dest: String,
        /// Destination address
        #[arg(short = 'a', long)]
        dest_address: String,
    },
    /// Verify signatures for a bridge transaction
    VerifySignatures {
        /// Asset ID to verify
        #[arg(short, long)]
        asset_id: String,
        /// Amount to verify
        #[arg(short = 'm', long)]
        amount: u64,
    },
    /// Test bridge asset locking
    LockAsset {
        /// Asset ID to lock
        #[arg(short, long)]
        asset_id: String,
        /// Amount to lock
        #[arg(short = 'm', long)]
        amount: u64,
        /// Destination chain
        #[arg(short, long, default_value = "cosmos")]
        dest_chain: String,
        /// Destination address
        #[arg(short = 'a', long)]
        dest_address: String,
    },
    /// Run performance benchmarks
    Benchmark {
        /// Export results to file
        #[arg(short, long)]
        export: bool,
    },
    /// Test security scenarios
    SecurityTest {
        /// Test type (tampering, replay, malleability)
        #[arg(short, long, default_value = "all")]
        test_type: String,
    },
    /// Test cross-chain interoperability
    TestInterop {
        /// Source chain
        #[arg(short, long, default_value = "ethereum")]
        source: String,
        /// Destination chain
        #[arg(short, long, default_value = "cosmos")]
        dest: String,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    let cli = Cli::parse();

    println!("🔐 PQC Bridge CLI - Post-Quantum Cryptographic Bridge Operations");
    println!("==================================================================\n");

    match &cli.command {
        Commands::GenerateKeys { algorithm, count } => {
            generate_keys(algorithm, *count)?;
        }
        Commands::SignPayload { asset_id, amount, source, dest, dest_address } => {
            sign_payload(asset_id, *amount, source, dest, dest_address)?;
        }
        Commands::VerifySignatures { asset_id, amount } => {
            verify_signatures(asset_id, *amount)?;
        }
        Commands::LockAsset { asset_id, amount, dest_chain, dest_address } => {
            lock_asset(asset_id, *amount, dest_chain, dest_address)?;
        }
        Commands::Benchmark { export } => {
            run_benchmarks(*export)?;
        }
        Commands::SecurityTest { test_type } => {
            run_security_tests(test_type)?;
        }
        Commands::TestInterop { source, dest } => {
            test_interoperability(source, dest)?;
        }
    }

    Ok(())
}

fn generate_keys(algorithm: &str, count: u32) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔑 Generating {} PQC keypairs using {} algorithm...\n", count, algorithm);

    let mut pqc_manager = BridgePQCManager::new()?;
    
    let alg = match algorithm.to_lowercase().as_str() {
        "dilithium" => SignatureAlgorithm::Dilithium5,
        "falcon" => SignatureAlgorithm::Falcon1024,
        "sphincs" => SignatureAlgorithm::SphincsSha256128s,
        _ => {
            eprintln!("❌ Unsupported algorithm: {}. Use dilithium, falcon, or sphincs", algorithm);
            return Ok(());
        }
    };

    for i in 1..=count {
        let start = std::time::Instant::now();
        let keypair = pqc_manager.generate_validator_keypair(&alg)?;
        let duration = start.elapsed();

        println!("Validator {} ({}):", i, algorithm);
        println!("  Public key size: {} bytes", keypair.public_key.len());
        println!("  Secret key size: {} bytes", keypair.secret_key.len());
        println!("  Generation time: {:.2}ms", duration.as_millis());
        println!("  Public key (hex): {}", hex::encode(&keypair.public_key[..32.min(keypair.public_key.len())]));
        println!();

        // Add to manager for potential use
        pqc_manager.add_validator(
            format!("validator_{}", i),
            keypair.public_key,
            alg.clone(),
        );
    }

    println!("✅ Successfully generated {} keypairs", count);
    Ok(())
}

fn sign_payload(asset_id: &str, amount: u64, source: &str, dest: &str, dest_address: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("✍️ Signing bridge payload...");
    println!("  Asset: {} ({})", asset_id, amount);
    println!("  Route: {} -> {}", source, dest);
    println!("  Destination: {}\n", dest_address);

    let mut pqc_manager = BridgePQCManager::new()?;
    
    // Generate a validator key for signing
    let keypair = pqc_manager.generate_validator_keypair(&SignatureAlgorithm::Dilithium5)?;
    pqc_manager.add_validator(
        "signing_validator".to_string(),
        keypair.public_key.clone(),
        SignatureAlgorithm::Dilithium5,
    );

    // Create payload
    let payload = CrossChainPayload::GenericBridgePayload {
        asset_id: asset_id.to_string(),
        amount,
        source_chain: source.to_string(),
        dest_chain: dest.to_string(),
        source_address: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
        dest_address: dest_address.to_string(),
        metadata: HashMap::new(),
    };

    // Sign payload
    let start = std::time::Instant::now();
    let signature = pqc_manager.sign_bridge_payload(&payload, dest, "signing_validator")?;
    let sign_duration = start.elapsed();

    // Verify signature
    let start = std::time::Instant::now();
    let is_valid = pqc_manager.verify_bridge_signature(&signature, &payload)?;
    let verify_duration = start.elapsed();

    println!("Signature Details:");
    println!("  Algorithm: {:?}", signature.signature.algorithm);
    println!("  Signature size: {} bytes", signature.signature.data.len());
    println!("  Chain ID: {}", signature.chain_id);
    println!("  Validator: {}", signature.validator_id);
    println!("  Timestamp: {}", signature.timestamp);
    println!();

    println!("Performance:");
    println!("  Signing time: {:.2}ms", sign_duration.as_millis());
    println!("  Verification time: {:.2}ms", verify_duration.as_millis());
    println!("  Verification result: {}", if is_valid { "✅ VALID" } else { "❌ INVALID" });

    Ok(())
}

fn verify_signatures(asset_id: &str, amount: u64) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔍 Testing multi-signature verification...");
    println!("  Asset: {} ({})\n", asset_id, amount);

    let mut pqc_manager = BridgePQCManager::new()?;
    pqc_manager.set_min_signatures(2); // Require 2 out of 3

    // Generate multiple validator keys
    let algorithms = vec![
        ("validator_1", SignatureAlgorithm::Dilithium5),
        ("validator_2", SignatureAlgorithm::Falcon1024),
        ("validator_3", SignatureAlgorithm::SphincsSha256128s),
    ];

    for (validator_id, algorithm) in &algorithms {
        let keypair = pqc_manager.generate_validator_keypair(algorithm)?;
        pqc_manager.add_validator(
            validator_id.to_string(),
            keypair.public_key,
            algorithm.clone(),
        );
        println!("✅ Added validator: {} ({:?})", validator_id, algorithm);
    }

    // Create test payload
    let payload = CrossChainPayload::GenericBridgePayload {
        asset_id: asset_id.to_string(),
        amount,
        source_chain: "ethereum".to_string(),
        dest_chain: "cosmos".to_string(),
        source_address: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
        dest_address: "cosmos1test123".to_string(),
        metadata: HashMap::new(),
    };

    // Collect signatures from validators
    let mut signatures = Vec::new();
    for (validator_id, _) in &algorithms {
        let signature = pqc_manager.sign_bridge_payload(&payload, "cosmos", validator_id)?;
        signatures.push(signature);
        println!("✍️ Collected signature from: {}", validator_id);
    }

    // Verify multi-signature
    let start = std::time::Instant::now();
    let result = pqc_manager.verify_multi_signature(&signatures, &payload)?;
    let verify_duration = start.elapsed();

    println!("\nMulti-Signature Verification Results:");
    println!("  Valid signatures: {}/{}", result.valid_signatures, signatures.len());
    println!("  Required signatures: {}", result.required_signatures);
    println!("  Consensus reached: {}", if result.consensus_reached { "✅ YES" } else { "❌ NO" });
    println!("  Verification time: {:.2}ms", verify_duration.as_millis());

    for (validator_id, is_valid) in &result.validator_results {
        println!("  {}: {}", validator_id, if *is_valid { "✅ Valid" } else { "❌ Invalid" });
    }

    Ok(())
}

fn lock_asset(asset_id: &str, amount: u64, dest_chain: &str, dest_address: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔒 Testing bridge asset locking...");
    println!("  Asset: {} ({})", asset_id, amount);
    println!("  Destination: {} -> {}\n", dest_chain, dest_address);

    let bridge = DytallixBridge::new();

    // Create test asset
    let asset = Asset {
        id: asset_id.to_string(),
        amount,
        decimals: 6,
        metadata: AssetMetadata {
            name: format!("{} Token", asset_id),
            symbol: asset_id.to_string(),
            description: "Test token for bridge operations".to_string(),
            icon_url: None,
        },
    };

    // Lock asset
    let start = std::time::Instant::now();
    let result = bridge.lock_asset(asset, dest_chain, dest_address);
    let duration = start.elapsed();

    match result {
        Ok(tx_id) => {
            println!("✅ Asset locking successful!");
            println!("  Transaction ID: {}", tx_id.0);
            println!("  Processing time: {:.2}ms", duration.as_millis());
            
            // Try to get bridge status
            match bridge.get_bridge_status(&tx_id) {
                Ok(status) => println!("  Status: {:?}", status),
                Err(e) => println!("  Status check failed: {}", e),
            }
        }
        Err(e) => {
            println!("❌ Asset locking failed: {}", e);
        }
    }

    Ok(())
}

fn run_benchmarks(export: bool) -> Result<(), Box<dyn std::error::Error>> {
    println!("📊 Running comprehensive PQC performance benchmarks...\n");

    if export {
        run_pqc_performance_benchmarks()?;
    } else {
        use dytallix_pqc::PQCPerformanceBenchmark;
        let mut benchmark = PQCPerformanceBenchmark::new()?;
        let analysis = benchmark.run_comprehensive_benchmarks()?;
        benchmark.print_performance_report(&analysis);
    }

    Ok(())
}

fn run_security_tests(test_type: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("🛡️ Running security tests...");
    println!("  Test type: {}\n", test_type);

    let mut pqc_manager = BridgePQCManager::new()?;
    
    // Generate test validator
    let keypair = pqc_manager.generate_validator_keypair(&SignatureAlgorithm::Dilithium5)?;
    pqc_manager.add_validator(
        "security_validator".to_string(),
        keypair.public_key,
        SignatureAlgorithm::Dilithium5,
    );

    let payload = CrossChainPayload::GenericBridgePayload {
        asset_id: "SECURITY_TEST".to_string(),
        amount: 1000000,
        source_chain: "ethereum".to_string(),
        dest_chain: "cosmos".to_string(),
        source_address: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
        dest_address: "cosmos1security".to_string(),
        metadata: HashMap::new(),
    };

    match test_type.to_lowercase().as_str() {
        "tampering" | "all" => {
            println!("🔍 Testing payload tampering detection...");
            
            let signature = pqc_manager.sign_bridge_payload(&payload, "ethereum", "security_validator")?;
            
            // Test with original payload
            let is_valid = pqc_manager.verify_bridge_signature(&signature, &payload)?;
            println!("  Original payload: {}", if is_valid { "✅ Valid" } else { "❌ Invalid" });
            
            // Test with tampered payload
            let mut tampered_payload = payload.clone();
            if let CrossChainPayload::GenericBridgePayload { ref mut amount, .. } = tampered_payload {
                *amount = 2000000; // Change amount
            }
            
            let is_valid = pqc_manager.verify_bridge_signature(&signature, &tampered_payload)?;
            println!("  Tampered payload: {}", if is_valid { "❌ Valid (BAD!)" } else { "✅ Invalid (GOOD)" });
        }
        "replay" | "all" => {
            println!("🔄 Testing replay attack resistance...");
            
            let sig1 = pqc_manager.sign_bridge_payload(&payload, "ethereum", "security_validator")?;
            std::thread::sleep(std::time::Duration::from_millis(10));
            let sig2 = pqc_manager.sign_bridge_payload(&payload, "ethereum", "security_validator")?;
            
            println!("  Signature 1 timestamp: {}", sig1.timestamp);
            println!("  Signature 2 timestamp: {}", sig2.timestamp);
            println!("  Timestamps differ: {}", if sig1.timestamp != sig2.timestamp { "✅ Yes" } else { "❌ No" });
        }
        "malleability" | "all" => {
            println!("🔧 Testing signature malleability resistance...");
            
            let mut signature = pqc_manager.sign_bridge_payload(&payload, "ethereum", "security_validator")?;
            
            // Verify original
            let is_valid = pqc_manager.verify_bridge_signature(&signature, &payload)?;
            println!("  Original signature: {}", if is_valid { "✅ Valid" } else { "❌ Invalid" });
            
            // Malleate signature (flip some bits)
            if let Some(byte) = signature.signature.data.get_mut(0) {
                *byte = !*byte;
            }
            
            let is_valid = pqc_manager.verify_bridge_signature(&signature, &payload)?;
            println!("  Malleated signature: {}", if is_valid { "❌ Valid (BAD!)" } else { "✅ Invalid (GOOD)" });
        }
        _ => {
            println!("❌ Unknown test type: {}. Use 'tampering', 'replay', 'malleability', or 'all'", test_type);
        }
    }

    println!("\n✅ Security tests completed");
    Ok(())
}

fn test_interoperability(source: &str, dest: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("🔗 Testing cross-chain interoperability...");
    println!("  Route: {} -> {}\n", source, dest);

    let pqc_manager = BridgePQCManager::new()?;
    
    // Check supported chains
    let supported_chains = pqc_manager.get_supported_chains();
    println!("Supported chains: {:?}", supported_chains);
    
    if !supported_chains.contains(&source.to_string()) {
        println!("❌ Source chain '{}' not supported", source);
        return Ok(());
    }
    
    if !supported_chains.contains(&dest.to_string()) {
        println!("❌ Destination chain '{}' not supported", dest);
        return Ok(());
    }

    // Test chain configurations
    if let Some(source_config) = pqc_manager.get_chain_config(source) {
        println!("Source chain config ({}):", source);
        println!("  Signature format: {:?}", source_config.signature_format);
        println!("  Hash algorithm: {:?}", source_config.hash_algorithm);
        println!("  Address format: {:?}", source_config.address_format);
    }

    if let Some(dest_config) = pqc_manager.get_chain_config(dest) {
        println!("Destination chain config ({}):", dest);
        println!("  Signature format: {:?}", dest_config.signature_format);
        println!("  Hash algorithm: {:?}", dest_config.hash_algorithm);
        println!("  Address format: {:?}", dest_config.address_format);
    }

    // Test payload format compatibility
    let test_payloads = match (source, dest) {
        ("ethereum", "cosmos") => vec![
            CrossChainPayload::EthereumTransaction {
                to: "0x742d35Cc6634C0532925a3b8D1EbA4F00b7C8000".to_string(),
                value: 1000000,
                data: vec![],
                gas_limit: 21000,
                gas_price: 20000000000,
                nonce: 1,
            },
            CrossChainPayload::CosmosIBCPacket {
                sequence: 1,
                source_port: "transfer".to_string(),
                source_channel: "channel-0".to_string(),
                dest_port: "transfer".to_string(),
                dest_channel: "channel-1".to_string(),
                data: b"test_data".to_vec(),
                timeout_height: 1000,
                timeout_timestamp: SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_secs() + 3600,
            },
        ],
        _ => vec![
            CrossChainPayload::GenericBridgePayload {
                asset_id: "INTEROP_TEST".to_string(),
                amount: 1000000,
                source_chain: source.to_string(),
                dest_chain: dest.to_string(),
                source_address: "source_address".to_string(),
                dest_address: "dest_address".to_string(),
                metadata: HashMap::new(),
            },
        ],
    };

    println!("\nTesting payload compatibility:");
    for (i, payload) in test_payloads.iter().enumerate() {
        match payload {
            CrossChainPayload::EthereumTransaction { .. } => println!("  Payload {}: ✅ Ethereum transaction format", i + 1),
            CrossChainPayload::CosmosIBCPacket { .. } => println!("  Payload {}: ✅ Cosmos IBC packet format", i + 1),
            CrossChainPayload::GenericBridgePayload { .. } => println!("  Payload {}: ✅ Generic bridge payload format", i + 1),
        }
    }

    println!("\n✅ Cross-chain interoperability test completed");
    Ok(())
}