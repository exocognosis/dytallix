use anyhow::{anyhow, Result};
use clap::{Args, Subcommand};
use std::{fs, path::Path};

use crate::crypto::{ActivePQC, PQC};
use crate::output::OutputFormat;

#[derive(Args, Debug, Clone)]
pub struct PQCCmd {
    #[command(subcommand)]
    pub action: PQCAction,
}

#[derive(Subcommand, Debug, Clone)]
pub enum PQCAction {
    /// Generate a new PQC keypair
    Keygen(KeygenCmd),
    /// Sign data with PQC private key
    Sign(SignCmd),
    /// Verify PQC signature
    Verify(VerifyCmd),
}

#[derive(Args, Debug, Clone)]
pub struct KeygenCmd {
    /// Output directory for generated keys
    #[arg(long, default_value = ".")]
    pub output_dir: String,

    /// Force overwrite existing keys
    #[arg(long)]
    pub force: bool,
}

#[derive(Args, Debug, Clone)]
pub struct SignCmd {
    /// Path to private key file
    #[arg(long)]
    pub private_key: String,

    /// Input file to sign
    #[arg(long)]
    pub input: String,

    /// Output signature file
    #[arg(long)]
    pub output: String,
}

#[derive(Args, Debug, Clone)]
pub struct VerifyCmd {
    /// Path to public key file
    #[arg(long)]
    pub public_key: String,

    /// Input file that was signed
    #[arg(long)]
    pub input: String,

    /// Signature file
    #[arg(long)]
    pub signature: String,
}

pub async fn handle_pqc(fmt: OutputFormat, cmd: PQCCmd) -> Result<()> {
    match cmd.action {
        PQCAction::Keygen(keygen_cmd) => handle_keygen(fmt, keygen_cmd).await,
        PQCAction::Sign(sign_cmd) => handle_sign(fmt, sign_cmd).await,
        PQCAction::Verify(verify_cmd) => handle_verify(fmt, verify_cmd).await,
    }
}

async fn handle_keygen(fmt: OutputFormat, cmd: KeygenCmd) -> Result<()> {
    let output_dir = Path::new(&cmd.output_dir);
    let private_key_path = output_dir.join("private.key");
    let public_key_path = output_dir.join("public.key");

    // Check if keys already exist
    if (private_key_path.exists() || public_key_path.exists()) && !cmd.force {
        return Err(anyhow!(
            "Keys already exist in {}. Use --force to overwrite",
            cmd.output_dir
        ));
    }

    // Create output directory if it doesn't exist
    fs::create_dir_all(output_dir)?;

    // Generate keypair
    let (private_key, public_key) = ActivePQC::keypair();

    // Write keys to files
    fs::write(&private_key_path, &private_key)?;
    fs::write(&public_key_path, &public_key)?;

    // Log generation details
    let keygen_log = serde_json::json!({
        "algorithm": ActivePQC::ALG,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "private_key_path": private_key_path.to_string_lossy(),
        "public_key_path": public_key_path.to_string_lossy(),
        "private_key_size_bytes": private_key.len(),
        "public_key_size_bytes": public_key.len()
    });

    if fmt.is_json() {
        println!("{}", serde_json::to_string_pretty(&keygen_log)?);
    } else {
        println!("Generated {} keypair:", ActivePQC::ALG);
        println!("  Private key: {}", private_key_path.display());
        println!("  Public key: {}", public_key_path.display());
        println!("  Private key size: {} bytes", private_key.len());
        println!("  Public key size: {} bytes", public_key.len());
    }

    Ok(())
}

async fn handle_sign(fmt: OutputFormat, cmd: SignCmd) -> Result<()> {
    // Read private key
    let private_key = fs::read(&cmd.private_key)?;

    // Read input data
    let input_data = fs::read(&cmd.input)?;

    // Sign the data
    let signature = ActivePQC::sign(&private_key, &input_data);

    // Create signature file with metadata
    let signature_data = serde_json::json!({
        "algorithm": ActivePQC::ALG,
        "signature": hex::encode(&signature),
        "signed_at": chrono::Utc::now().to_rfc3339(),
        "input_file": cmd.input,
        "input_size_bytes": input_data.len(),
        "signature_size_bytes": signature.len()
    });

    // Write signature to file
    fs::write(&cmd.output, serde_json::to_string_pretty(&signature_data)?)?;

    if fmt.is_json() {
        println!("{}", serde_json::to_string_pretty(&signature_data)?);
    } else {
        println!("Signed {} with {} algorithm", cmd.input, ActivePQC::ALG);
        println!("  Signature saved to: {}", cmd.output);
        println!("  Signature size: {} bytes", signature.len());
    }

    Ok(())
}

async fn handle_verify(fmt: OutputFormat, cmd: VerifyCmd) -> Result<()> {
    // Read public key
    let public_key = fs::read(&cmd.public_key)?;

    // Read input data
    let input_data = fs::read(&cmd.input)?;

    // Read signature file
    let signature_file_content = fs::read_to_string(&cmd.signature)?;
    let signature_data: serde_json::Value = serde_json::from_str(&signature_file_content)?;

    // Extract signature hex
    let signature_hex = signature_data["signature"]
        .as_str()
        .ok_or_else(|| anyhow!("Invalid signature file format"))?;
    let signature = hex::decode(signature_hex)?;

    // Verify signature
    let is_valid = ActivePQC::verify(&public_key, &input_data, &signature);

    let verification_result = serde_json::json!({
        "algorithm": ActivePQC::ALG,
        "verified": is_valid,
        "verified_at": chrono::Utc::now().to_rfc3339(),
        "input_file": cmd.input,
        "signature_file": cmd.signature,
        "public_key_file": cmd.public_key
    });

    if fmt.is_json() {
        println!("{}", serde_json::to_string_pretty(&verification_result)?);
    } else {
        if is_valid {
            println!("✓ Signature verification PASSED");
        } else {
            println!("✗ Signature verification FAILED");
        }
        println!("  Algorithm: {}", ActivePQC::ALG);
        println!("  Input: {}", cmd.input);
        println!("  Signature: {}", cmd.signature);
        println!("  Public key: {}", cmd.public_key);
    }

    if !is_valid {
        return Err(anyhow!("Signature verification failed"));
    }

    Ok(())
}
