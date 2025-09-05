//! Chain Connectors Module
//!
//! Provides integration with various blockchain networks for cross-chain interoperability.

pub mod cosmos;
pub mod ethereum;
pub mod polkadot;

pub use cosmos::{CosmosAddress, CosmosBlock, CosmosConfig, CosmosConnector, CosmosTxHash};
pub use ethereum::{
    EthereumAddress, EthereumBlock, EthereumConfig, EthereumConnector, EthereumTxHash,
};
pub use polkadot::{
    PolkadotAddress, PolkadotBlock, PolkadotChainType, PolkadotConfig, PolkadotConnector,
    PolkadotTxHash,
};

use crate::{BridgeError, BridgeTx, WrappedAsset};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Universal chain connector trait
#[allow(async_fn_in_trait)]
pub trait ChainConnector {
    type Config;
    type Address;
    type TxHash;
    type Block;

    /// Create a new connector instance
    fn new(config: Self::Config) -> Result<Self, BridgeError>
    where
        Self: Sized;

    /// Get current block information
    async fn get_current_block(&self) -> Result<Self::Block, BridgeError>;

    /// Verify transaction confirmation
    async fn verify_transaction(&self, tx_hash: &Self::TxHash) -> Result<bool, BridgeError>;
}

/// Multi-chain connector manager
#[derive(Clone)]
pub struct ConnectorManager {
    ethereum_connectors: HashMap<String, EthereumConnector>,
    cosmos_connectors: HashMap<String, CosmosConnector>,
    polkadot_connectors: HashMap<String, PolkadotConnector>,
}

impl ConnectorManager {
    pub fn new() -> Self {
        Self {
            ethereum_connectors: HashMap::new(),
            cosmos_connectors: HashMap::new(),
            polkadot_connectors: HashMap::new(),
        }
    }

    /// Add Ethereum connector
    pub fn add_ethereum_connector(&mut self, chain_name: String, connector: EthereumConnector) {
        self.ethereum_connectors.insert(chain_name, connector);
    }

    /// Add Cosmos connector
    pub fn add_cosmos_connector(&mut self, chain_name: String, connector: CosmosConnector) {
        self.cosmos_connectors.insert(chain_name, connector);
    }

    /// Add Polkadot connector
    pub fn add_polkadot_connector(&mut self, chain_name: String, connector: PolkadotConnector) {
        self.polkadot_connectors.insert(chain_name, connector);
    }

    /// Get Ethereum connector
    pub fn get_ethereum_connector(&self, chain_name: &str) -> Option<&EthereumConnector> {
        self.ethereum_connectors.get(chain_name)
    }

    /// Get Cosmos connector
    pub fn get_cosmos_connector(&self, chain_name: &str) -> Option<&CosmosConnector> {
        self.cosmos_connectors.get(chain_name)
    }

    /// Get Polkadot connector
    pub fn get_polkadot_connector(&self, chain_name: &str) -> Option<&PolkadotConnector> {
        self.polkadot_connectors.get(chain_name)
    }

    /// Get mutable Ethereum connector
    pub fn get_ethereum_connector_mut(
        &mut self,
        chain_name: &str,
    ) -> Option<&mut EthereumConnector> {
        self.ethereum_connectors.get_mut(chain_name)
    }

    /// Get mutable Cosmos connector
    pub fn get_cosmos_connector_mut(&mut self, chain_name: &str) -> Option<&mut CosmosConnector> {
        self.cosmos_connectors.get_mut(chain_name)
    }

    /// Process cross-chain transfer
    pub async fn process_transfer(
        &mut self,
        source_chain: &str,
        dest_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        println!("🌉 Processing transfer from {source_chain} to {dest_chain}");

        // Determine chain types and execute appropriate transfer logic
        match (
            self.get_chain_type(source_chain),
            self.get_chain_type(dest_chain),
        ) {
            (ChainType::Ethereum, ChainType::Dytallix) => {
                self.ethereum_to_dytallix_transfer(source_chain, bridge_tx)
                    .await
            }
            (ChainType::Cosmos, ChainType::Dytallix) => {
                self.cosmos_to_dytallix_transfer(source_chain, bridge_tx)
                    .await
            }
            (ChainType::Polkadot, ChainType::Dytallix) => {
                self.polkadot_to_dytallix_transfer(source_chain, bridge_tx)
                    .await
            }
            (ChainType::Dytallix, ChainType::Ethereum) => {
                self.dytallix_to_ethereum_transfer(dest_chain, bridge_tx)
                    .await
            }
            (ChainType::Dytallix, ChainType::Cosmos) => {
                self.dytallix_to_cosmos_transfer(dest_chain, bridge_tx)
                    .await
            }
            (ChainType::Dytallix, ChainType::Polkadot) => {
                self.dytallix_to_polkadot_transfer(dest_chain, bridge_tx)
                    .await
            }
            _ => Err(BridgeError::UnsupportedChain(format!(
                "Transfer from {source_chain} to {dest_chain} not supported"
            ))),
        }
    }

    /// Get supported chains
    pub fn get_supported_chains(&self) -> Vec<String> {
        let mut chains = Vec::new();
        chains.extend(self.ethereum_connectors.keys().cloned());
        chains.extend(self.cosmos_connectors.keys().cloned());
        chains.extend(self.polkadot_connectors.keys().cloned());
        chains.push("dytallix".to_string());
        chains
    }

    /// Get chain type
    fn get_chain_type(&self, chain_name: &str) -> ChainType {
        if chain_name == "dytallix" {
            ChainType::Dytallix
        } else if self.ethereum_connectors.contains_key(chain_name) {
            ChainType::Ethereum
        } else if self.cosmos_connectors.contains_key(chain_name) {
            ChainType::Cosmos
        } else if self.polkadot_connectors.contains_key(chain_name) {
            ChainType::Polkadot
        } else {
            ChainType::Unknown
        }
    }

    /// Ethereum to Dytallix transfer
    async fn ethereum_to_dytallix_transfer(
        &self,
        source_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        let connector = self
            .get_ethereum_connector(source_chain)
            .ok_or_else(|| BridgeError::UnsupportedChain(source_chain.to_string()))?;

        let tx_hash = connector
            .lock_asset(&bridge_tx.asset, &bridge_tx.dest_address, bridge_tx)
            .await?;

        Ok(TransferResult {
            source_tx_hash: Some(tx_hash.0),
            dest_tx_hash: None,
            status: TransferStatus::SourceLocked,
        })
    }

    /// Cosmos to Dytallix transfer
    async fn cosmos_to_dytallix_transfer(
        &mut self,
        source_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        let connector = self
            .get_cosmos_connector_mut(source_chain)
            .ok_or_else(|| BridgeError::UnsupportedChain(source_chain.to_string()))?;

        let tx_hash = connector
            .ibc_transfer(&bridge_tx.asset, &bridge_tx.dest_address, bridge_tx)
            .await?;

        Ok(TransferResult {
            source_tx_hash: Some(tx_hash.0),
            dest_tx_hash: None,
            status: TransferStatus::IbcPacketSent,
        })
    }

    /// Polkadot to Dytallix transfer
    async fn polkadot_to_dytallix_transfer(
        &self,
        source_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        let connector = self
            .get_polkadot_connector(source_chain)
            .ok_or_else(|| BridgeError::UnsupportedChain(source_chain.to_string()))?;

        let tx_hash = connector
            .lock_asset(&bridge_tx.asset, &bridge_tx.dest_address, bridge_tx)
            .await?;

        Ok(TransferResult {
            source_tx_hash: Some(tx_hash.0),
            dest_tx_hash: None,
            status: TransferStatus::SourceLocked,
        })
    }

    /// Dytallix to Ethereum transfer
    async fn dytallix_to_ethereum_transfer(
        &mut self,
        dest_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        let connector = self
            .get_ethereum_connector_mut(dest_chain)
            .ok_or_else(|| BridgeError::UnsupportedChain(dest_chain.to_string()))?;

        // Create wrapped asset
        let wrapped_asset = WrappedAsset {
            original_asset_id: bridge_tx.asset.id.clone(),
            original_chain: bridge_tx.source_chain.clone(),
            wrapped_contract: "0x0000000000000000000000000000000000000000".to_string(), // Will be set by mint function
            amount: bridge_tx.asset.amount,
            wrapping_timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let tx_hash = connector
            .mint_wrapped_asset(&wrapped_asset, &bridge_tx.dest_address)
            .await?;

        Ok(TransferResult {
            source_tx_hash: None,
            dest_tx_hash: Some(tx_hash.0),
            status: TransferStatus::DestinationMinted,
        })
    }

    /// Dytallix to Cosmos transfer
    async fn dytallix_to_cosmos_transfer(
        &mut self,
        dest_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        let connector = self
            .get_cosmos_connector_mut(dest_chain)
            .ok_or_else(|| BridgeError::UnsupportedChain(dest_chain.to_string()))?;

        // For now, assume IBC transfer back to original chain
        let tx_hash = connector
            .ibc_transfer(&bridge_tx.asset, &bridge_tx.dest_address, bridge_tx)
            .await?;

        Ok(TransferResult {
            source_tx_hash: None,
            dest_tx_hash: Some(tx_hash.0),
            status: TransferStatus::IbcPacketSent,
        })
    }

    /// Dytallix to Polkadot transfer
    async fn dytallix_to_polkadot_transfer(
        &self,
        dest_chain: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<TransferResult, BridgeError> {
        let connector = self
            .get_polkadot_connector(dest_chain)
            .ok_or_else(|| BridgeError::UnsupportedChain(dest_chain.to_string()))?;

        // Create wrapped asset
        let wrapped_asset = WrappedAsset {
            original_asset_id: bridge_tx.asset.id.clone(),
            original_chain: bridge_tx.source_chain.clone(),
            wrapped_contract: "0".to_string(), // Asset ID for Polkadot
            amount: bridge_tx.asset.amount,
            wrapping_timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let tx_hash = connector
            .mint_wrapped_asset(&wrapped_asset, &bridge_tx.dest_address)
            .await?;

        Ok(TransferResult {
            source_tx_hash: None,
            dest_tx_hash: Some(tx_hash.0),
            status: TransferStatus::DestinationMinted,
        })
    }
}

impl Default for ConnectorManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChainType {
    Ethereum,
    Cosmos,
    Polkadot,
    Dytallix,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferResult {
    pub source_tx_hash: Option<String>,
    pub dest_tx_hash: Option<String>,
    pub status: TransferStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferStatus {
    SourceLocked,
    IbcPacketSent,
    XcmMessageSent,
    DestinationMinted,
    Completed,
    Failed,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_connector_manager_creation() {
        let manager = ConnectorManager::new();

        assert!(manager.ethereum_connectors.is_empty());
        assert!(manager.cosmos_connectors.is_empty());
        assert!(manager.polkadot_connectors.is_empty());
    }

    #[tokio::test]
    async fn test_add_connectors() {
        let mut manager = ConnectorManager::new();

        // Add Ethereum connector
        let eth_config = EthereumConfig::default();
        let eth_connector = EthereumConnector::new(eth_config).unwrap();
        manager.add_ethereum_connector("ethereum".to_string(), eth_connector);

        // Add Cosmos connector
        let cosmos_config = CosmosConfig::default();
        let cosmos_connector = CosmosConnector::new(cosmos_config).await.unwrap();
        manager.add_cosmos_connector("cosmoshub".to_string(), cosmos_connector);

        // Skip Polkadot connector in tests due to async new and network requirements
        // Add Polkadot connector
        // let polkadot_config = PolkadotConfig::default();
        // let polkadot_connector = PolkadotConnector::new(polkadot_config).await.unwrap();
        // manager.add_polkadot_connector("polkadot".to_string(), polkadot_connector);

        assert!(manager.get_ethereum_connector("ethereum").is_some());
        assert!(manager.get_cosmos_connector("cosmoshub").is_some());
        // assert!(manager.get_polkadot_connector("polkadot").is_some());

        let supported_chains = manager.get_supported_chains();
        assert!(supported_chains.contains(&"ethereum".to_string()));
        assert!(supported_chains.contains(&"cosmoshub".to_string()));
        // assert!(supported_chains.contains(&"polkadot".to_string()));
        assert!(supported_chains.contains(&"dytallix".to_string()));
    }

    #[tokio::test]
    async fn test_chain_type_detection() {
        let mut manager = ConnectorManager::new();

        let eth_config = EthereumConfig::default();
        let eth_connector = EthereumConnector::new(eth_config).unwrap();
        manager.add_ethereum_connector("ethereum".to_string(), eth_connector);

        assert_eq!(manager.get_chain_type("ethereum"), ChainType::Ethereum);
        assert_eq!(manager.get_chain_type("dytallix"), ChainType::Dytallix);
        assert_eq!(manager.get_chain_type("unknown"), ChainType::Unknown);
    }
}
