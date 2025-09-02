//! Ethereum Bridge Contract Integration
//!
//! Provides real Web3 contract interaction for cross-chain asset transfers.

use crate::BridgeError;
use ethers::{
    middleware::SignerMiddleware,
    providers::{Http, Provider, Ws},
    signers::LocalWallet,
    types::{Address, H256, U256},
    utils::parse_ether,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

// Contract ABI types
ethers::contract::abigen!(
    DytallixBridge,
    "./src/connectors/ethereum/bridge_contract_abi.json",
    event_derives(serde::Deserialize, serde::Serialize)
);

pub type EthereumClient = Arc<SignerMiddleware<Provider<Http>, LocalWallet>>;
pub type EthereumWsClient = Arc<SignerMiddleware<Provider<Ws>, LocalWallet>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeContractCall {
    pub function_name: String,
    pub parameters: HashMap<String, String>,
    pub gas_limit: U256,
    pub gas_price: U256,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BridgeContractEvent {
    pub event_name: String,
    pub block_number: u64,
    pub transaction_hash: String,
    pub parameters: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct EthereumBridgeContract {
    contract_address: Address,
    // For now, store the clients directly without contracts to avoid type issues
    http_client: Option<EthereumClient>,
    ws_client: Option<EthereumWsClient>,
}

impl EthereumBridgeContract {
    pub fn new(contract_address: String) -> Self {
        let address: Address = contract_address.parse().unwrap_or_else(|_| Address::zero());

        Self {
            contract_address: address,
            http_client: None,
            ws_client: None,
        }
    }

    /// Initialize the contract with a Web3 client
    pub async fn initialize(&mut self, client: EthereumClient) -> Result<(), BridgeError> {
        self.http_client = Some(client);
        Ok(())
    }

    /// Initialize WebSocket contract for event monitoring
    pub async fn initialize_ws(&mut self, ws_client: EthereumWsClient) -> Result<(), BridgeError> {
        self.ws_client = Some(ws_client);
        Ok(())
    }

    /// Lock an asset on the Ethereum side of the bridge
    pub async fn lock_asset(
        &self,
        asset_address: &str,
        amount: u64,
        dest_chain: &str,
        dest_address: &str,
    ) -> Result<H256, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let asset_addr: Address = asset_address
            .parse()
            .map_err(|_| BridgeError::InvalidAddress(asset_address.to_string()))?;

        let call = contract.lock_asset(
            asset_addr,
            U256::from(amount),
            dest_chain.to_string(),
            dest_address.to_string(),
        );

        let tx = call
            .send()
            .await
            .map_err(|e| BridgeError::TransactionFailed(format!("Lock asset failed: {e}")))?;

        Ok(tx.tx_hash())
    }

    /// Release (mint) wrapped asset on Ethereum
    pub async fn release_asset(
        &self,
        wrapped_token_address: &str,
        amount: u64,
        recipient: &str,
        bridge_tx_id: &str,
    ) -> Result<H256, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let token_addr: Address = wrapped_token_address
            .parse()
            .map_err(|_| BridgeError::InvalidAddress(wrapped_token_address.to_string()))?;

        let recipient_addr: Address = recipient
            .parse()
            .map_err(|_| BridgeError::InvalidAddress(recipient.to_string()))?;

        let call = contract.release_asset(
            token_addr,
            U256::from(amount),
            recipient_addr,
            bridge_tx_id.to_string(),
        );

        let tx = call
            .send()
            .await
            .map_err(|e| BridgeError::TransactionFailed(format!("Release asset failed: {e}")))?;

        Ok(tx.tx_hash())
    }

    /// Mint wrapped tokens to a recipient
    pub async fn mint_wrapped_token(
        &self,
        wrapped_token_address: &str,
        amount: u64,
        recipient: &str,
    ) -> Result<H256, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let token_addr: Address = wrapped_token_address
            .parse()
            .map_err(|_| BridgeError::InvalidAddress(wrapped_token_address.to_string()))?;

        let recipient_addr: Address = recipient
            .parse()
            .map_err(|_| BridgeError::InvalidAddress(recipient.to_string()))?;

        let call = contract.mint_wrapped_token(token_addr, U256::from(amount), recipient_addr);

        let tx = call.send().await.map_err(|e| {
            BridgeError::TransactionFailed(format!("Mint wrapped token failed: {e}"))
        })?;

        Ok(tx.tx_hash())
    }

    /// Monitor bridge events
    pub async fn monitor_events(&self, _from_block: Option<u64>) -> Result<(), BridgeError> {
        let _ws_client = self.ws_client.as_ref().ok_or(BridgeError::InvalidChain(
            "WebSocket client not initialized".to_string(),
        ))?;

        // For now, just validate the WebSocket connection is available
        // In production, this would set up event streaming
        println!(
            "🔄 Event monitoring initialized for contract at {:?}",
            self.contract_address
        );
        Ok(())
    }

    /// Get asset lock event details
    pub async fn get_lock_events(
        &self,
        from_block: u64,
        to_block: Option<u64>,
    ) -> Result<Vec<AssetLockedFilter>, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let filter = contract.asset_locked_filter().from_block(from_block);

        let filter = if let Some(to) = to_block {
            filter.to_block(to)
        } else {
            filter
        };

        let events = filter.query().await.map_err(|e| {
            BridgeError::TransactionFailed(format!("Query lock events failed: {e}"))
        })?;

        Ok(events)
    }

    /// Get asset release event details
    pub async fn get_release_events(
        &self,
        from_block: u64,
        to_block: Option<u64>,
    ) -> Result<Vec<AssetReleasedFilter>, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let filter = contract.asset_released_filter().from_block(from_block);

        let filter = if let Some(to) = to_block {
            filter.to_block(to)
        } else {
            filter
        };

        let events = filter.query().await.map_err(|e| {
            BridgeError::TransactionFailed(format!("Query release events failed: {e}"))
        })?;

        Ok(events)
    }

    /// Get contract balance for a specific asset
    pub async fn get_asset_balance(&self, asset_address: &str) -> Result<U256, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let asset_addr: Address = asset_address
            .parse()
            .map_err(|_| BridgeError::InvalidAddress(asset_address.to_string()))?;

        let balance = contract
            .get_asset_balance(asset_addr)
            .call()
            .await
            .map_err(|e| BridgeError::TransactionFailed(format!("Get balance failed: {e}")))?;

        Ok(balance)
    }

    /// Check if bridge transaction was processed
    pub async fn is_transaction_processed(&self, bridge_tx_id: &str) -> Result<bool, BridgeError> {
        let client = self.http_client.as_ref().ok_or(BridgeError::InvalidChain(
            "Contract not initialized".to_string(),
        ))?;

        let contract = DytallixBridge::new(self.contract_address, client.clone());

        let processed = contract
            .processed_transactions(bridge_tx_id.to_string())
            .call()
            .await
            .map_err(|e| {
                BridgeError::TransactionFailed(format!("Check transaction failed: {e}"))
            })?;

        Ok(processed)
    }

    // Legacy methods for compatibility
    pub fn prepare_lock_asset_call(
        &self,
        asset_address: &str,
        amount: u64,
        dest_chain: &str,
        dest_address: &str,
    ) -> BridgeContractCall {
        let mut parameters = HashMap::new();
        parameters.insert("asset_address".to_string(), asset_address.to_string());
        parameters.insert("amount".to_string(), amount.to_string());
        parameters.insert("dest_chain".to_string(), dest_chain.to_string());
        parameters.insert("dest_address".to_string(), dest_address.to_string());

        BridgeContractCall {
            function_name: "lockAsset".to_string(),
            parameters,
            gas_limit: U256::from(200000),
            gas_price: parse_ether("20").unwrap_or(U256::from(20_000_000_000u64)),
        }
    }

    pub fn prepare_release_asset_call(
        &self,
        wrapped_token_address: &str,
        amount: u64,
        recipient: &str,
        bridge_tx_id: &str,
    ) -> BridgeContractCall {
        let mut parameters = HashMap::new();
        parameters.insert(
            "wrapped_token_address".to_string(),
            wrapped_token_address.to_string(),
        );
        parameters.insert("amount".to_string(), amount.to_string());
        parameters.insert("recipient".to_string(), recipient.to_string());
        parameters.insert("bridge_tx_id".to_string(), bridge_tx_id.to_string());

        BridgeContractCall {
            function_name: "releaseAsset".to_string(),
            parameters,
            gas_limit: U256::from(250000),
            gas_price: parse_ether("20").unwrap_or(U256::from(20_000_000_000u64)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bridge_contract_creation() {
        let contract =
            EthereumBridgeContract::new("0x1234567890123456789012345678901234567890".to_string());

        assert_eq!(
            contract.contract_address,
            "0x1234567890123456789012345678901234567890"
                .parse::<Address>()
                .unwrap()
        );
    }

    #[test]
    fn test_prepare_lock_asset_call() {
        let contract =
            EthereumBridgeContract::new("0x1234567890123456789012345678901234567890".to_string());

        let call = contract.prepare_lock_asset_call(
            "0xA0b86a33E6441E5A4C5C3BD1C6B06B65a80D8a7b",
            1000000000000000000,
            "dytallix",
            "dyt1test",
        );

        assert_eq!(call.function_name, "lockAsset");
        assert_eq!(call.parameters.len(), 4);
        assert_eq!(call.gas_limit, U256::from(200000));
    }
}
