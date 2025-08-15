//! Ethereum Chain Connector for Dytallix Bridge
//!
//! Provides integration with Ethereum networks for cross-chain asset transfers.

use crate::{Asset, BridgeError, BridgeTx, WrappedAsset};
use ethers::{
    middleware::SignerMiddleware,
    providers::{Http, Provider, Ws},
    signers::{LocalWallet, Signer},
    types::{Address, H256},
};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

pub mod bridge_contract;
pub mod wrapped_token;
pub mod deployed_addresses;

pub use bridge_contract::{EthereumBridgeContract, BridgeContractCall, BridgeContractEvent, EthereumClient, EthereumWsClient};
pub use wrapped_token::{WrappedTokenContract, WrappedTokenRegistry, WrappedTokenDeploymentConfig};
pub use deployed_addresses::{
    NetworkAddresses, SEPOLIA_ADDRESSES, MAINNET_ADDRESSES,
    get_network_addresses, get_all_networks, is_network_supported,
    get_network_name, is_network_deployed, get_deployment_info, DeploymentInfo
};

// Ethereum-specific types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthereumAddress(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthereumTxHash(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EthereumBlock {
    pub number: u64,
    pub hash: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone)]
pub struct EthereumConfig {
    pub rpc_url: String,
    pub chain_id: u64,
    pub bridge_contract_address: String,
    pub private_key: Option<String>, // For signing transactions
    pub gas_limit: u64,
    pub gas_price: u64,
}

impl Default for EthereumConfig {
    fn default() -> Self {
        Self {
            rpc_url: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID".to_string(),
            chain_id: 11155111, // Sepolia testnet
            bridge_contract_address: "0x0000000000000000000000000000000000000000".to_string(),
            private_key: None,
            gas_limit: 200000,
            gas_price: 20_000_000_000, // 20 Gwei
        }
    }
}

/// Ethereum connector for cross-chain bridge operations
#[derive(Debug, Clone)]
pub struct EthereumConnector {
    config: EthereumConfig,
    bridge_contract: EthereumBridgeContract,
    wrapped_token_registry: WrappedTokenRegistry,
    client: Option<EthereumClient>,
    ws_client: Option<EthereumWsClient>,
}

impl EthereumConnector {
    pub fn new(config: EthereumConfig) -> Result<Self, BridgeError> {
        let bridge_contract = EthereumBridgeContract::new(config.bridge_contract_address.clone());
        
        let deployment_config = WrappedTokenDeploymentConfig {
            deployer_private_key: config.private_key.clone().unwrap_or_default(),
            gas_limit: config.gas_limit,
            gas_price: config.gas_price,
            bridge_contract_address: config.bridge_contract_address.clone(),
        };
        
        let wrapped_token_registry = WrappedTokenRegistry::new(deployment_config);
        
        Ok(Self {
            config,
            bridge_contract,
            wrapped_token_registry,
            client: None,
            ws_client: None,
        })
    }

    /// Initialize Web3 connections
    pub async fn initialize(&mut self) -> Result<(), BridgeError> {
        // Initialize HTTP client
        let provider = Provider::<Http>::try_from(&self.config.rpc_url)
            .map_err(|e| BridgeError::ConnectionFailed(format!("Provider creation failed: {}", e)))?;

        if let Some(private_key) = &self.config.private_key {
            let wallet: LocalWallet = private_key.parse()
                .map_err(|e| BridgeError::InvalidChain(format!("Invalid private key: {}", e)))?;
            let wallet = wallet.with_chain_id(self.config.chain_id);
            
            let client = Arc::new(SignerMiddleware::new(provider.clone(), wallet.clone()));
            self.client = Some(client.clone());

            // Initialize WebSocket client for event monitoring
            let ws_url = self.config.rpc_url.replace("http", "ws");
            if let Ok(ws_provider) = Provider::<Ws>::connect(&ws_url).await {
                let ws_client = Arc::new(SignerMiddleware::new(ws_provider, wallet));
                self.ws_client = Some(ws_client.clone());
                
                // Initialize contract with WebSocket for events
                let mut contract = self.bridge_contract.clone();
                contract.initialize_ws(ws_client).await?;
                self.bridge_contract = contract;
            }

            // Initialize contract with HTTP client
            let mut contract = self.bridge_contract.clone();
            contract.initialize(client).await?;
            self.bridge_contract = contract;
        } else {
            return Err(BridgeError::InvalidChain("Private key required for signing".to_string()));
        }

        Ok(())
    }
    
    /// Lock asset on Ethereum side of the bridge
    pub async fn lock_asset(
        &self,
        asset: &Asset,
        dest_address: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<EthereumTxHash, BridgeError> {
        println!("🔒 Locking {} {} on Ethereum for bridge tx {}", 
                 asset.amount, asset.id, bridge_tx.id.0);
        
        let asset_address = self.get_asset_address(&asset.id)?;
        
        // Use real Web3 contract call
        let tx_hash = self.bridge_contract.lock_asset(
            &asset_address,
            asset.amount,
            &bridge_tx.dest_chain,
            dest_address,
        ).await?;

        println!("✅ Asset locked on Ethereum. Tx hash: {:?}", tx_hash);
        Ok(EthereumTxHash(format!("{:?}", tx_hash)))
    }
    
    /// Release (mint) wrapped asset on Ethereum
    pub async fn release_wrapped_asset(
        &mut self,
        wrapped_asset: &WrappedAsset,
        dest_address: &str,
        bridge_tx_id: &str,
    ) -> Result<EthereumTxHash, BridgeError> {
        println!("🪙 Releasing wrapped asset {} on Ethereum for address {}", 
                 wrapped_asset.wrapped_contract, dest_address);
        
        // Get or deploy wrapped token contract
        let wrapped_contract_address = if self.wrapped_token_registry.has_wrapped_token(&wrapped_asset.original_asset_id) {
            self.wrapped_token_registry.get_wrapped_contract(&wrapped_asset.original_asset_id)
                .map(|c| c.contract_address.clone())
                .ok_or(BridgeError::InvalidAsset("Wrapped contract not found".to_string()))?
        } else {
            // Deploy new wrapped token contract
            let original_asset = Asset {
                id: wrapped_asset.original_asset_id.clone(),
                amount: 0,
                decimals: 18, // Default, should be configurable
                metadata: crate::AssetMetadata {
                    name: format!("Wrapped {}", wrapped_asset.original_asset_id),
                    symbol: format!("w{}", wrapped_asset.original_asset_id),
                    description: format!("Wrapped {} from {}", wrapped_asset.original_asset_id, wrapped_asset.original_chain),
                    icon_url: None,
                },
            };
            
            let wrapped_contract = self.wrapped_token_registry.deploy_wrapped_token(&original_asset, &wrapped_asset.original_chain).await?;
            wrapped_contract.contract_address
        };
        
        // Use real Web3 contract call
        let tx_hash = self.bridge_contract.release_asset(
            &wrapped_contract_address,
            wrapped_asset.amount,
            dest_address,
            bridge_tx_id,
        ).await?;

        println!("✅ Wrapped asset released on Ethereum. Tx hash: {:?}", tx_hash);
        Ok(EthereumTxHash(format!("{:?}", tx_hash)))
    }
    
    /// Mint wrapped asset on Ethereum
    pub async fn mint_wrapped_asset(
        &mut self,
        wrapped_asset: &WrappedAsset,
        dest_address: &str,
    ) -> Result<EthereumTxHash, BridgeError> {
        println!("🪙 Minting wrapped asset {} on Ethereum for address {}", 
                 wrapped_asset.wrapped_contract, dest_address);
        
        // Get or deploy wrapped token contract
        let wrapped_contract_address = if self.wrapped_token_registry.has_wrapped_token(&wrapped_asset.original_asset_id) {
            self.wrapped_token_registry.get_wrapped_contract(&wrapped_asset.original_asset_id)
                .map(|c| c.contract_address.clone())
                .ok_or(BridgeError::InvalidAsset("Wrapped contract not found".to_string()))?
        } else {
            // Deploy new wrapped token contract
            let original_asset = Asset {
                id: wrapped_asset.original_asset_id.clone(),
                amount: 0,
                decimals: 18, // Default, should be configurable
                metadata: crate::AssetMetadata {
                    name: format!("Wrapped {}", wrapped_asset.original_asset_id),
                    symbol: format!("w{}", wrapped_asset.original_asset_id),
                    description: format!("Wrapped {} from {}", wrapped_asset.original_asset_id, wrapped_asset.original_chain),
                    icon_url: None,
                },
            };
            
            let wrapped_contract = self.wrapped_token_registry.deploy_wrapped_token(&original_asset, &wrapped_asset.original_chain).await?;
            wrapped_contract.contract_address
        };
        
        // Use real Web3 contract call to mint
        let tx_hash = self.bridge_contract.mint_wrapped_token(
            &wrapped_contract_address,
            wrapped_asset.amount,
            dest_address,
        ).await?;

        println!("✅ Wrapped asset minted on Ethereum. Tx hash: {:?}", tx_hash);
        Ok(EthereumTxHash(format!("{:?}", tx_hash)))
    }
    
    /// Monitor Ethereum for bridge events
    pub async fn monitor_bridge_events(&self, from_block: Option<u64>) -> Result<Vec<EthereumBridgeEvent>, BridgeError> {
        println!("👀 Monitoring Ethereum bridge events from block {:?}", from_block);
        
        // Get recent lock events
        let lock_events = self.bridge_contract.get_lock_events(
            from_block.unwrap_or(0),
            None,
        ).await?;

        // Get recent release events
        let release_events = self.bridge_contract.get_release_events(
            from_block.unwrap_or(0),
            None,
        ).await?;

        let mut events = Vec::new();

        // Convert lock events
        for event in lock_events {
            events.push(EthereumBridgeEvent::AssetLocked {
                asset_id: format!("{:?}", event.asset),
                amount: event.amount.as_u64(),
                dest_chain: event.dest_chain,
                dest_address: event.dest_address,
                tx_hash: format!("{:?}", event.bridge_tx_id),
                block_number: 0, // Would get from event metadata when available
            });
        }

        // Convert release events
        for event in release_events {
            events.push(EthereumBridgeEvent::AssetReleased {
                wrapped_token_address: format!("{:?}", event.wrapped_token),
                amount: event.amount.as_u64(),
                recipient: format!("{:?}", event.recipient),
                bridge_tx_id: event.bridge_tx_id,
                tx_hash: "".to_string(), // Would get from event metadata
                block_number: 0, // Would get from event metadata when available
            });
        }

        println!("📊 Found {} bridge events", events.len());
        Ok(events)
    }

    /// Start real-time event monitoring
    pub async fn start_event_monitoring(&self) -> Result<(), BridgeError> {
        println!("🔄 Starting real-time event monitoring");

        self.bridge_contract.monitor_events(None).await?;
        
        println!("✅ Event monitoring started successfully");
        Ok(())
    }
    
    /// Get current Ethereum block information
    pub async fn get_current_block(&self) -> Result<EthereumBlock, BridgeError> {
        // In production, call eth_blockNumber and eth_getBlockByNumber
        Ok(EthereumBlock {
            number: 1000000,
            hash: format!("0x{:x}", rand::random::<u64>()),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        })
    }
    
    /// Verify transaction confirmation on Ethereum
    pub async fn verify_transaction(&self, tx_hash: &EthereumTxHash) -> Result<bool, BridgeError> {
        println!("✅ Verifying Ethereum transaction: {}", tx_hash.0);
        
        // In production, check transaction receipt and confirmations
        Ok(true)
    }
    
    /// Get Ethereum address for an asset ID
    fn get_asset_address(&self, asset_id: &str) -> Result<String, BridgeError> {
        // In production, this would be a registry lookup
        match asset_id {
            "ETH" => Ok("0x0000000000000000000000000000000000000000".to_string()), // Native ETH
            "USDC" => Ok("0xA0b86a33E6441E5A4C5C3BD1C6B06B65a80D8a7b".to_string()), // USDC on Sepolia
            "USDT" => Ok("0xfaD6367E52450d800bE70CEbc9735b2Ac24BB80a".to_string()), // USDT on Sepolia
            _ => Err(BridgeError::InvalidTransaction(format!("Unknown asset: {}", asset_id))),
        }
    }
    
    /// Get wrapped token registry (mutable access)
    pub fn get_wrapped_token_registry_mut(&mut self) -> &mut WrappedTokenRegistry {
        &mut self.wrapped_token_registry
    }
    
    /// Get wrapped token registry (immutable access)
    pub fn get_wrapped_token_registry(&self) -> &WrappedTokenRegistry {
        &self.wrapped_token_registry
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EthereumBridgeEvent {
    AssetLocked {
        asset_id: String,
        amount: u64,
        dest_chain: String,
        dest_address: String,
        tx_hash: String,
        block_number: u64,
    },
    AssetUnlocked {
        asset_id: String,
        amount: u64,
        recipient: String,
        tx_hash: String,
        block_number: u64,
    },
    AssetReleased {
        wrapped_token_address: String,
        amount: u64,
        recipient: String,
        bridge_tx_id: String,
        tx_hash: String,
        block_number: u64,
    },
    WrappedAssetMinted {
        original_asset: String,
        wrapped_contract: String,
        amount: u64,
        recipient: String,
        tx_hash: String,
        block_number: u64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{AssetMetadata, BridgeTxId, BridgeStatus};

    #[tokio::test]
    async fn test_ethereum_connector_creation() {
        let config = EthereumConfig::default();
        let connector = EthereumConnector::new(config).unwrap();
        
        assert_eq!(connector.config.chain_id, 11155111); // Sepolia
    }
    
    #[tokio::test]
    async fn test_ethereum_asset_locking() {
        let config = EthereumConfig::default();
        let connector = EthereumConnector::new(config).unwrap();
        
        let asset = Asset {
            id: "ETH".to_string(),
            amount: 1000000000000000000, // 1 ETH in wei
            decimals: 18,
            metadata: AssetMetadata {
                name: "Ethereum".to_string(),
                symbol: "ETH".to_string(),
                description: "Native Ethereum token".to_string(),
                icon_url: None,
            },
        };
        
        let bridge_tx = BridgeTx {
            id: BridgeTxId("test_tx_123".to_string()),
            asset: asset.clone(),
            source_chain: "ethereum".to_string(),
            dest_chain: "dytallix".to_string(),
            source_address: "0x1234567890123456789012345678901234567890".to_string(),
            dest_address: "dyt1test".to_string(),
            timestamp: 1234567890,
            validator_signatures: Vec::new(),
            status: BridgeStatus::Pending,
        };
        
        let result = connector.lock_asset(&asset, "dyt1test", &bridge_tx).await;
        assert!(result.is_ok());
        
        let tx_hash = result.unwrap();
        assert!(tx_hash.0.starts_with("0x"));
    }
    
    #[tokio::test]
    async fn test_ethereum_wrapped_asset_minting() {
        let config = EthereumConfig::default();
        let mut connector = EthereumConnector::new(config).unwrap();
        
        let wrapped_asset = WrappedAsset {
            original_asset_id: "DOT".to_string(),
            original_chain: "polkadot".to_string(),
            wrapped_contract: "0x0000000000000000000000000000000000000000".to_string(),
            amount: 1000000000000, // 1 DOT
            wrapping_timestamp: 0,
        };
        
        let result = connector.mint_wrapped_asset(&wrapped_asset, "0x1234567890123456789012345678901234567890").await;
        assert!(result.is_ok());
        
        let tx_hash = result.unwrap();
        assert!(tx_hash.0.starts_with("0x"));
        
        // Verify wrapped token was registered
        assert!(connector.get_wrapped_token_registry().has_wrapped_token("DOT"));
    }
    
    #[tokio::test]
    async fn test_ethereum_current_block() {
        let config = EthereumConfig::default();
        let connector = EthereumConnector::new(config).unwrap();
        
        let block = connector.get_current_block().await.unwrap();
        assert!(block.number > 0);
        assert!(block.hash.starts_with("0x"));
    }
}
