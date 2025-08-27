//! Cosmos Chain Connector for Dytallix Bridge
//!
//! Provides integration with Cosmos SDK-based networks using IBC protocol.

use crate::{Asset, BridgeError, BridgeTx};
use serde::{Deserialize, Serialize};

pub mod ibc_client;
pub mod relayer;

pub use ibc_client::{CosmosIbcClient, IBCTransferData, IbcPacket};
pub use relayer::{CosmosRelayer, RelayerConfig};

// Cosmos-specific types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CosmosAddress(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CosmosTxHash(pub String);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CosmosBlock {
    pub height: u64,
    pub hash: String,
    pub timestamp: u64,
    pub chain_id: String,
}

#[derive(Debug, Clone)]
pub struct CosmosConfig {
    pub rpc_url: String,
    pub grpc_url: String,
    pub chain_id: String,
    pub gas_price: String,
    pub gas_limit: u64,
    pub prefix: String, // Address prefix (e.g., "cosmos", "osmo", "juno")
    pub ibc_channel_id: String,
    pub ibc_port_id: String,
}

impl Default for CosmosConfig {
    fn default() -> Self {
        Self {
            rpc_url: "https://rpc.cosmos.network:443".to_string(),
            grpc_url: "https://grpc.cosmos.network:443".to_string(),
            chain_id: "cosmoshub-4".to_string(),
            gas_price: "0.025uatom".to_string(),
            gas_limit: 200000,
            prefix: "cosmos".to_string(),
            ibc_channel_id: "channel-0".to_string(),
            ibc_port_id: "transfer".to_string(),
        }
    }
}

/// Cosmos connector for cross-chain bridge operations using IBC
#[derive(Clone)]
pub struct CosmosConnector {
    config: CosmosConfig,
    ibc_client: CosmosIbcClient,
    relayer: CosmosRelayer,
}

impl CosmosConnector {
    pub async fn new(config: CosmosConfig) -> Result<Self, BridgeError> {
        let mut ibc_client = CosmosIbcClient::new(
            config.rpc_url.clone(),
            config.grpc_url.clone(),
            config.chain_id.clone(),
        )?;

        // Initialize connection
        ibc_client.connect().await?;

        let relayer_config = RelayerConfig {
            source_chain: config.chain_id.clone(),
            dest_chain: "dytallix-1".to_string(),
            channel_id: config.ibc_channel_id.clone(),
            port_id: config.ibc_port_id.clone(),
            gas_limit: config.gas_limit,
            gas_price: config.gas_price.clone(),
        };

        let relayer = CosmosRelayer::new(relayer_config);

        Ok(Self {
            config,
            ibc_client,
            relayer,
        })
    }

    /// Set signing key for transaction operations
    pub fn set_signing_key(&mut self, private_key_hex: &str) -> Result<(), BridgeError> {
        self.ibc_client.set_signing_key(private_key_hex)
    }

    /// Transfer asset via IBC to destination chain
    pub async fn ibc_transfer(
        &mut self,
        asset: &Asset,
        dest_address: &str,
        bridge_tx: &BridgeTx,
    ) -> Result<CosmosTxHash, BridgeError> {
        println!(
            "🚀 Initiating IBC transfer of {} {} to {}",
            asset.amount, asset.id, dest_address
        );

        // Create IBC transfer packet
        let packet = IbcPacket {
            source_port: self.config.ibc_port_id.clone(),
            source_channel: self.config.ibc_channel_id.clone(),
            dest_port: "transfer".to_string(),
            dest_channel: "channel-0".to_string(), // Should be configurable
            data: serde_json::to_vec(&IBCTransferData {
                denom: format!("ibc/{}", asset.id),
                amount: asset.amount.to_string(),
                sender: bridge_tx.source_address.clone(),
                receiver: dest_address.to_string(),
            })
            .map_err(|e| BridgeError::NetworkError(e.to_string()))?,
            timeout_height: 0, // No timeout by height
            timeout_timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos() as u64
                + 3600_000_000_000, // 1 hour timeout
        };

        // Submit IBC transfer transaction
        let tx_hash = self.ibc_client.send_ibc_transfer(packet).await?;

        println!("✅ IBC transfer submitted: {}", tx_hash.0);

        Ok(tx_hash)
    }

    /// Receive and process IBC packets from other chains
    pub async fn receive_ibc_packet(
        &mut self,
        packet: &IbcPacket,
        proof: &[u8],
        proof_height: u64,
    ) -> Result<CosmosTxHash, BridgeError> {
        println!(
            "📦 Receiving IBC packet from {}:{}",
            packet.source_port, packet.source_channel
        );

        // Verify packet proof and execute on destination
        let tx_hash = self
            .ibc_client
            .receive_packet(packet, proof, proof_height)
            .await?;

        println!("✅ IBC packet received: {}", tx_hash.0);

        Ok(tx_hash)
    }

    /// Acknowledge IBC packet receipt
    pub async fn acknowledge_ibc_packet(
        &mut self,
        packet: &IbcPacket,
        acknowledgement: &[u8],
    ) -> Result<CosmosTxHash, BridgeError> {
        println!("✅ Acknowledging IBC packet");

        let tx_hash = self
            .ibc_client
            .acknowledge_packet(packet, acknowledgement)
            .await?;

        Ok(tx_hash)
    }

    /// Monitor IBC events and packets
    pub async fn monitor_ibc_events(&mut self) -> Result<Vec<CosmosIbcEvent>, BridgeError> {
        println!("👀 Monitoring Cosmos IBC events");

        // In production, this would:
        // 1. Subscribe to IBC events via WebSocket
        // 2. Parse packet data and events
        // 3. Return structured events

        Ok(Vec::new())
    }

    /// Get current block information
    pub async fn get_current_block(&mut self) -> Result<CosmosBlock, BridgeError> {
        self.ibc_client.get_latest_block().await
    }

    /// Query account balance
    pub async fn get_balance(&mut self, address: &str, denom: &str) -> Result<u64, BridgeError> {
        self.ibc_client.query_balance(address, denom).await
    }

    /// Verify transaction confirmation
    pub async fn verify_transaction(
        &mut self,
        tx_hash: &CosmosTxHash,
    ) -> Result<bool, BridgeError> {
        println!("✅ Verifying Cosmos transaction: {}", tx_hash.0);

        self.ibc_client.verify_transaction(tx_hash).await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CosmosIbcEvent {
    PacketSent {
        source_port: String,
        source_channel: String,
        dest_port: String,
        dest_channel: String,
        packet_data: Vec<u8>,
        sequence: u64,
        timeout_height: u64,
        timeout_timestamp: u64,
    },
    PacketReceived {
        dest_port: String,
        dest_channel: String,
        packet_data: Vec<u8>,
        sequence: u64,
    },
    PacketAcknowledged {
        source_port: String,
        source_channel: String,
        sequence: u64,
        acknowledgement: Vec<u8>,
    },
    PacketTimedOut {
        source_port: String,
        source_channel: String,
        sequence: u64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{AssetMetadata, BridgeStatus, BridgeTxId};

    #[tokio::test]
    async fn test_cosmos_connector_creation() {
        let config = CosmosConfig::default();
        let connector = CosmosConnector::new(config).await.unwrap();

        assert_eq!(connector.config.chain_id, "cosmoshub-4");
        assert_eq!(connector.config.prefix, "cosmos");
    }

    #[tokio::test]
    async fn test_cosmos_ibc_transfer() {
        let config = CosmosConfig::default();
        let mut connector = CosmosConnector::new(config).await.unwrap();

        let asset = Asset {
            id: "ATOM".to_string(),
            amount: 1000000, // 1 ATOM (6 decimals)
            decimals: 6,
            metadata: AssetMetadata {
                name: "Cosmos Hub".to_string(),
                symbol: "ATOM".to_string(),
                description: "Cosmos Hub native token".to_string(),
                icon_url: None,
            },
        };

        let bridge_tx = BridgeTx {
            id: BridgeTxId("test_ibc_tx_123".to_string()),
            asset: asset.clone(),
            source_chain: "cosmoshub-4".to_string(),
            dest_chain: "dytallix".to_string(),
            source_address: "cosmos1test".to_string(),
            dest_address: "dyt1test".to_string(),
            timestamp: 1234567890,
            validator_signatures: Vec::new(),
            status: BridgeStatus::Pending,
        };

        let result = connector.ibc_transfer(&asset, "dyt1test", &bridge_tx).await;
        assert!(result.is_ok());

        let tx_hash = result.unwrap();
        assert!(!tx_hash.0.is_empty());
        assert!(tx_hash.0.starts_with("COSMOS_TX_"));
    }

    #[tokio::test]
    async fn test_cosmos_current_block() {
        let config = CosmosConfig::default();
        let mut connector = CosmosConnector::new(config).await.unwrap();

        let block = connector.get_current_block().await.unwrap();
        assert!(block.height > 0);
        assert_eq!(block.chain_id, "cosmoshub-4");
    }
}
