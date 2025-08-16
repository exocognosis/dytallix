use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CliConfig { pub rpc: String, pub chain_id: String }

impl Default for CliConfig { fn default() -> Self { Self { rpc: "http://127.0.0.1:3030".into(), chain_id: "dyt-localnet".into() } } }

fn path() -> PathBuf { let home = shellexpand::tilde("~/.dyt").to_string(); PathBuf::from(home).join("config.json") }

pub fn load() -> Result<CliConfig> { let p = path(); if !p.exists() { return Ok(CliConfig::default()) } let data = std::fs::read(&p)?; Ok(serde_json::from_slice(&data)?) }

pub fn save(cfg: &CliConfig) -> Result<()> { let p = path(); std::fs::create_dir_all(p.parent().unwrap())?; std::fs::write(p, serde_json::to_vec_pretty(cfg)?)?; Ok(()) }

pub fn set(key: &str, value: &str) -> Result<CliConfig> { let mut cfg = load()?; match key { "rpc" => cfg.rpc = value.into(), "chain-id" => cfg.chain_id = value.into(), _ => return Err(anyhow!("unknown key")) }; save(&cfg)?; Ok(cfg) }
