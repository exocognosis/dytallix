use crate::{
    keystore,
    output::{print_json, OutputFormat},
};
use anyhow::{anyhow, Result};
use clap::Args;
use colored::*;
use std::path::PathBuf;
use tracing::{info, warn};

#[derive(Args, Debug, Clone)]
pub struct KeysCmd {
    #[command(subcommand)]
    pub action: KeyAction,
}

#[derive(clap::Subcommand, Debug, Clone)]
pub enum KeyAction {
    #[command(name = "new")]
    New {
        #[arg(long, default_value = "default")]
        name: String,
        #[arg(long)]
        password_file: Option<PathBuf>,
        #[arg(long, help = "Use legacy secp256k1 algorithm (deprecated)")]
        legacy_secp: bool,
        #[arg(long, value_enum, default_value = "pqc")]
        algo: AlgorithmChoice,
    },
    #[command(name = "list")]
    List,
    #[command(name = "unlock")]
    Unlock {
        name: String,
        #[arg(long)]
        password_file: Option<PathBuf>,
    },
    #[command(name = "change-password")]
    ChangePassword {
        name: String,
        #[arg(long)]
        old_password_file: Option<PathBuf>,
        #[arg(long)]
        new_password_file: Option<PathBuf>,
    },
    #[command(name = "export")]
    Export { name: String },
}

#[derive(clap::ValueEnum, Debug, Clone)]
pub enum AlgorithmChoice {
    /// Use Post-Quantum Cryptography (default: Dilithium5)
    Pqc,
    /// Use Dilithium5 algorithm specifically
    Dilithium5,
    /// Use Falcon1024 algorithm specifically
    Falcon1024,
    /// Use SPHINCS+ algorithm specifically
    SphincsSha256128s,
    #[clap(hide = true)] // Hide legacy option but still allow it
    Secp256k1,
}

fn read_password(pf: Option<&PathBuf>, prompt: &str) -> Result<String> {
    if let Some(p) = pf {
        return Ok(std::fs::read_to_string(p)?.trim().to_string());
    }
    use rpassword::read_password;
    print!("{}", prompt);
    use std::io::Write;
    std::io::stdout().flush().ok();
    let pw = read_password()?;
    Ok(pw)
}

pub async fn handle(cli_home: &str, fmt: OutputFormat, kc: KeysCmd) -> Result<()> {
    match kc.action {
        KeyAction::New {
            name,
            password_file,
            legacy_secp,
            algo,
        } => {
            let password = read_password(password_file.as_ref(), "Enter password: ")?;

            // Determine algorithm - legacy_secp flag overrides algo parameter
            let (algorithm, use_legacy_address) = if legacy_secp {
                warn!("Using deprecated legacy secp256k1 algorithm");
                ("secp256k1", true)
            } else {
                match algo {
                    AlgorithmChoice::Pqc => ("dilithium5", false), // Default PQC to Dilithium5
                    AlgorithmChoice::Dilithium5 => ("dilithium5", false),
                    AlgorithmChoice::Falcon1024 => ("falcon1024", false),
                    AlgorithmChoice::SphincsSha256128s => ("sphincssha256128s", false),
                    AlgorithmChoice::Secp256k1 => {
                        warn!("Using deprecated secp256k1 algorithm");
                        ("secp256k1", true)
                    }
                }
            };

            let ent = keystore::create_new_with_algorithm(
                cli_home,
                &name,
                &password,
                algorithm,
                use_legacy_address,
            )?;
            info!(
                "event=key_created name={} algorithm={}",
                ent.name, ent.algorithm
            );

            if fmt.is_json() {
                print_json(&serde_json::json!({
                    "result":"created",
                    "name": ent.name,
                    "address": ent.address,
                    "algorithm": ent.algorithm,
                    "created": ent.created
                }))?;
            } else {
                println!(
                    "Created {} {} ({})",
                    ent.name.green(),
                    ent.address,
                    ent.algorithm
                );
            }
        }
        KeyAction::List => {
            let list = keystore::list(cli_home)?;
            if fmt.is_json() {
                let j: Vec<_> = list
                    .into_iter()
                    .map(|k| {
                        serde_json::json!({
                            "name":k.name,
                            "address":k.address,
                            "algorithm":k.algorithm,
                            "created":k.created
                        })
                    })
                    .collect();
                print_json(&j)?;
            } else {
                for k in list {
                    println!("{}\t{}\t{}\t{}", k.name, k.address, k.algorithm, k.created);
                }
            }
        }
        KeyAction::Unlock {
            name,
            password_file,
        } => {
            let password = read_password(password_file.as_ref(), "Password: ")?;
            match keystore::unlock(cli_home, &name, &password) {
                Ok(u) => {
                    info!("event=key_unlocked name={}", u.name);
                    if fmt.is_json() {
                        print_json(
                            &serde_json::json!({"result":"unlocked","name":u.name,"address":u.address}),
                        )?;
                    } else {
                        println!("Unlocked {} {}", u.name.green(), u.address);
                    }
                }
                Err(e) => {
                    warn!("event=unlock_error name={} error={}", name, e);
                    return Err(e);
                }
            }
        }
        KeyAction::ChangePassword {
            name,
            old_password_file,
            new_password_file,
        } => {
            let oldp = read_password(old_password_file.as_ref(), "Old password: ")?;
            let newp = read_password(new_password_file.as_ref(), "New password: ")?;
            keystore::change_password(cli_home, &name, &oldp, &newp)?;
            info!("event=key_password_changed name={}", name);
            if fmt.is_json() {
                print_json(&serde_json::json!({"result":"password_changed","name":name}))?;
            } else {
                println!("Password changed for {}", name);
            }
        }
        KeyAction::Export { name } => {
            let ks = keystore::list(cli_home)?;
            let k = ks
                .into_iter()
                .find(|x| x.name == name)
                .ok_or(anyhow!("not found"))?;
            if fmt.is_json() {
                print_json(&serde_json::json!({"name": k.name, "address": k.address, "pk": k.pk}))?;
            } else {
                println!(
                    "{}",
                    serde_json::to_string_pretty(
                        &serde_json::json!({"name": k.name, "address": k.address, "pk": k.pk})
                    )?
                );
            }
        }
    }
    Ok(())
}
