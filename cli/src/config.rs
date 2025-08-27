use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tracing::warn;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CliConfig {
    pub rpc: String,
    pub chain_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security: Option<Security>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Security {
    pub passphrase_max_retries: u8,
    pub passphrase_backoff_ms: u64,
    pub ci_no_confirm: bool,
}

impl Default for Security {
    fn default() -> Self {
        Self {
            passphrase_max_retries: 3,
            passphrase_backoff_ms: 400,
            ci_no_confirm: false,
        }
    }
}

impl Default for CliConfig {
    fn default() -> Self {
        Self {
            rpc: "http://127.0.0.1:3030".into(),
            chain_id: "dyt-localnet".into(),
            security: Some(Security::default()),
        }
    }
}

fn path() -> PathBuf {
    let home = shellexpand::tilde("~/.dcli").to_string();
    PathBuf::from(home).join("config.json")
}

pub fn load() -> Result<CliConfig> {
    let p = path();
    if !p.exists() {
        return Ok(apply_env(CliConfig::default()));
    }
    let data = std::fs::read(&p)?;
    let cfg: CliConfig = serde_json::from_slice(&data)?;
    Ok(apply_env(cfg))
}

fn apply_env(mut cfg: CliConfig) -> CliConfig {
    let mut sec = cfg.security.clone().unwrap_or_default();
    // New env vars (preferred)
    if let Ok(v) = std::env::var("DX_PASSPHRASE_MAX_RETRIES") {
        if let Ok(n) = v.parse() {
            sec.passphrase_max_retries = n;
        }
    }
    if let Ok(v) = std::env::var("DX_PASSPHRASE_BACKOFF_MS") {
        if let Ok(n) = v.parse() {
            sec.passphrase_backoff_ms = n;
        }
    }
    if let Ok(v) = std::env::var("DX_CI_NO_CONFIRM") {
        if v == "1" || v.to_lowercase() == "true" {
            sec.ci_no_confirm = true;
        }
    }
    // Backward compatibility (deprecated)
    if let Ok(v) = std::env::var("DYT_PASSPHRASE_MAX_RETRIES") {
        warn!("env=DYT_PASSPHRASE_MAX_RETRIES deprecated; use DX_PASSPHRASE_MAX_RETRIES");
        if let Ok(n) = v.parse() {
            sec.passphrase_max_retries = n;
        }
    }
    if let Ok(v) = std::env::var("DYT_PASSPHRASE_BACKOFF_MS") {
        warn!("env=DYT_PASSPHRASE_BACKOFF_MS deprecated; use DX_PASSPHRASE_BACKOFF_MS");
        if let Ok(n) = v.parse() {
            sec.passphrase_backoff_ms = n;
        }
    }
    if let Ok(v) = std::env::var("DYT_CI_NO_CONFIRM") {
        warn!("env=DYT_CI_NO_CONFIRM deprecated; use DX_CI_NO_CONFIRM");
        if v == "1" || v.to_lowercase() == "true" {
            sec.ci_no_confirm = true;
        }
    }
    cfg.security = Some(sec);
    cfg
}

pub fn save(cfg: &CliConfig) -> Result<()> {
    let p = path();
    std::fs::create_dir_all(p.parent().unwrap())?;
    std::fs::write(p, serde_json::to_vec_pretty(cfg)?)?;
    Ok(())
}

pub fn set(key: &str, value: &str) -> Result<CliConfig> {
    let mut cfg = load()?;
    match key {
        "rpc" => cfg.rpc = value.into(),
        "chain-id" => cfg.chain_id = value.into(),
        _ => return Err(anyhow!("unknown key")),
    };
    save(&cfg)?;
    Ok(cfg)
}

impl CliConfig {
    pub fn security(&self) -> Security {
        self.security.clone().unwrap_or_default()
    }
}
