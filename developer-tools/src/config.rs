use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use anyhow::Result;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub node_url: String,
    pub ai_url: String,
    pub verbose: bool,
    pub network: NetworkConfig,
    pub developer: DeveloperConfig,
    pub ai: AiConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    pub node_url: String,
    pub ai_services_url: String,
    pub network_id: String,
    pub chain_id: String,
    pub timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeveloperConfig {
    pub default_account: String,
    pub verbose: bool,
    pub auto_confirm: bool,
    pub save_history: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub auto_analysis: bool,
    pub fraud_threshold: f64,
    pub risk_threshold: f64,
    pub enable_caching: bool,
    pub cache_ttl: u64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            node_url: "http://localhost:3030".to_string(),
            ai_url: "http://localhost:8000".to_string(),
            verbose: false,
            network: NetworkConfig::default(),
            developer: DeveloperConfig::default(),
            ai: AiConfig::default(),
        }
    }
}

impl Default for NetworkConfig {
    fn default() -> Self {
        Self {
            node_url: "http://localhost:3030".to_string(),
            ai_services_url: "http://localhost:8000".to_string(),
            network_id: "dytallix-dev".to_string(),
            chain_id: "12345".to_string(),
            timeout: 30,
        }
    }
}

impl Default for DeveloperConfig {
    fn default() -> Self {
        Self {
            default_account: String::new(),
            verbose: false,
            auto_confirm: false,
            save_history: true,
        }
    }
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            auto_analysis: true,
            fraud_threshold: 0.7,
            risk_threshold: 0.5,
            enable_caching: true,
            cache_ttl: 300,
        }
    }
}

pub async fn create_default_config(config_dir: &Path) -> Result<()> {
    let config = Config::default();
    
    let config_content = toml::to_string_pretty(&config)?;
    
    let config_file = config_dir.join("config.toml");
    fs::write(config_file, config_content).await?;
    
    println!("Created default configuration file");
    println!("Location: {}", config_dir.join("config.toml").display());
    
    Ok(())
}

pub async fn load_config() -> Result<Config> {
    let config_dir = get_config_dir()?;
    let config_file = config_dir.join("config.toml");
    
    if config_file.exists() {
        let content = fs::read_to_string(&config_file).await?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    } else {
        Ok(Config::default())
    }
}

pub async fn save_config(config: &Config) -> Result<()> {
    let config_dir = get_config_dir()?;
    fs::create_dir_all(&config_dir).await?;
    
    let config_file = config_dir.join("config.toml");
    let content = toml::to_string_pretty(config)?;
    fs::write(config_file, content).await?;
    
    Ok(())
}

pub fn get_config_dir() -> Result<PathBuf> {
    let config_dir = dirs::config_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?
        .join("dytallix");
    
    Ok(config_dir)
}

pub fn get_data_dir() -> Result<PathBuf> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| anyhow::anyhow!("Could not find data directory"))?
        .join("dytallix");
    
    Ok(data_dir)
}
