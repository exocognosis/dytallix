use anyhow::{Result, anyhow};
use clap::Args;
use std::path::PathBuf;
use colored::*;
use crate::{keystore, output::{OutputFormat, print_json}};

#[derive(Args, Debug, Clone)]
pub struct KeysCmd { #[command(subcommand)] pub action: KeyAction }

#[derive(clap::Subcommand, Debug, Clone)]
pub enum KeyAction {
    #[command(name="new")] New { #[arg(long, default_value="default")] name: String, #[arg(long)] password_file: Option<PathBuf> },
    #[command(name="list")] List,
    #[command(name="unlock")] Unlock { name: String, #[arg(long)] password_file: Option<PathBuf> },
    #[command(name="change-password")] ChangePassword { name: String, #[arg(long)] old_password_file: Option<PathBuf>, #[arg(long)] new_password_file: Option<PathBuf> },
    #[command(name="export")] Export { name: String },
}

fn read_password(pf: Option<&PathBuf>, prompt: &str) -> Result<String> {
    if let Some(p) = pf { return Ok(std::fs::read_to_string(p)?.trim().to_string()) }
    use rpassword::read_password;
    print!("{}", prompt); use std::io::Write; std::io::stdout().flush().ok();
    let pw = read_password()?; Ok(pw)
}

pub async fn handle(cli_home: &str, fmt: OutputFormat, kc: KeysCmd) -> Result<()> {
    match kc.action {
        KeyAction::New { name, password_file } => {
            let password = read_password(password_file.as_ref(), "Enter password: ")?;
            let ent = keystore::create_new(cli_home, &name, &password)?;
            if fmt.is_json() {
                print_json(&serde_json::json!({"result":"created","name": ent.name, "address": ent.address, "created": ent.created }))?;
            } else {
                println!("Created {} {}", ent.name.green(), ent.address);
            }
        }
        KeyAction::List => {
            let list = keystore::list(cli_home)?;
            if fmt.is_json() {
                let j: Vec<_> = list.into_iter().map(|k| serde_json::json!({"name":k.name, "address":k.address, "created":k.created})).collect();
                print_json(&j)?;
            } else { for k in list { println!("{}\t{}\t{}", k.name, k.address, k.created); } }
        }
        KeyAction::Unlock { name, password_file } => {
            let password = read_password(password_file.as_ref(), "Password: ")?;
            let u = keystore::unlock(cli_home, &name, &password)?;
            if fmt.is_json() { print_json(&serde_json::json!({"result":"unlocked","name":u.name,"address":u.address}))?; } else { println!("Unlocked {} {}", u.name.green(), u.address); }
        }
        KeyAction::ChangePassword { name, old_password_file, new_password_file } => {
            let oldp = read_password(old_password_file.as_ref(), "Old password: ")?;
            let newp = read_password(new_password_file.as_ref(), "New password: ")?;
            keystore::change_password(cli_home, &name, &oldp, &newp)?;
            if fmt.is_json() { print_json(&serde_json::json!({"result":"password_changed","name":name}))?; } else { println!("Password changed for {}", name); }
        }
        KeyAction::Export { name } => {
            let ks = keystore::list(cli_home)?; let k = ks.into_iter().find(|x| x.name==name).ok_or(anyhow!("not found"))?;
            if fmt.is_json() { print_json(&serde_json::json!({"name": k.name, "address": k.address, "pk": k.pk}))?; } else { println!("{}", serde_json::to_string_pretty(&serde_json::json!({"name": k.name, "address": k.address, "pk": k.pk}))?); }
        }
    }
    Ok(())
}
