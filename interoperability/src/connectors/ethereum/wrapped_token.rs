//! Wrapped Token Contract Integration
//!
//! Manages wrapped tokens on Ethereum for cross-chain assets from other networks.

use crate::{Asset, BridgeError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// ERC-20 wrapped token contract for Dytallix bridge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WrappedTokenContract {
    pub contract_address: String,
    pub original_asset_id: String,
    pub original_chain: String,
    pub decimals: u8,
    pub total_supply: u64,
    pub name: String,
    pub symbol: String,
}

impl WrappedTokenContract {
    pub fn new(
        contract_address: String,
        original_asset_id: String,
        original_chain: String,
        decimals: u8,
        name: String,
        symbol: String,
    ) -> Self {
        Self {
            contract_address,
            original_asset_id,
            original_chain,
            decimals,
            total_supply: 0,
            name,
            symbol,
        }
    }

    /// Prepare mint transaction data
    pub fn prepare_mint_call(&self, recipient: &str, amount: u64) -> WrappedTokenCall {
        WrappedTokenCall {
            function_name: "mint".to_string(),
            parameters: vec![
                WrappedTokenParam::Address(recipient.to_string()),
                WrappedTokenParam::Uint256(amount.to_string()),
            ],
            gas_limit: 100000,
            gas_price: 20_000_000_000,
        }
    }

    /// Prepare burn transaction data
    pub fn prepare_burn_call(&self, amount: u64) -> WrappedTokenCall {
        WrappedTokenCall {
            function_name: "burn".to_string(),
            parameters: vec![WrappedTokenParam::Uint256(amount.to_string())],
            gas_limit: 80000,
            gas_price: 20_000_000_000,
        }
    }

    /// Prepare burn from transaction data (for bridge burns)
    pub fn prepare_burn_from_call(&self, account: &str, amount: u64) -> WrappedTokenCall {
        WrappedTokenCall {
            function_name: "burnFrom".to_string(),
            parameters: vec![
                WrappedTokenParam::Address(account.to_string()),
                WrappedTokenParam::Uint256(amount.to_string()),
            ],
            gas_limit: 100000,
            gas_price: 20_000_000_000,
        }
    }

    /// Get token balance for an address
    pub async fn get_balance(&self, address: &str) -> Result<u64, BridgeError> {
        // In production, this would call balanceOf(address) on the contract
        println!(
            "📊 Getting balance for {} on wrapped token {}",
            address, self.contract_address
        );

        // Mock balance - in production would use RPC call
        Ok(0)
    }

    /// Get total supply of wrapped tokens
    pub async fn get_total_supply(&self) -> Result<u64, BridgeError> {
        // In production, this would call totalSupply() on the contract
        println!(
            "📈 Getting total supply for wrapped token {}",
            self.contract_address
        );

        Ok(self.total_supply)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WrappedTokenCall {
    pub function_name: String,
    pub parameters: Vec<WrappedTokenParam>,
    pub gas_limit: u64,
    pub gas_price: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WrappedTokenParam {
    Address(String),
    Uint256(String),
    String(String),
    Bool(bool),
}

/// Registry for managing wrapped token contracts
#[derive(Debug, Clone)]
pub struct WrappedTokenRegistry {
    contracts: HashMap<String, WrappedTokenContract>, // asset_id -> contract
    deployment_config: WrappedTokenDeploymentConfig,
}

impl WrappedTokenRegistry {
    pub fn new(deployment_config: WrappedTokenDeploymentConfig) -> Self {
        Self {
            contracts: HashMap::new(),
            deployment_config,
        }
    }

    /// Register a wrapped token contract
    pub fn register_wrapped_token(&mut self, asset_id: String, contract: WrappedTokenContract) {
        self.contracts.insert(asset_id, contract);
    }

    /// Get wrapped token contract for an asset
    pub fn get_wrapped_contract(&self, asset_id: &str) -> Option<&WrappedTokenContract> {
        self.contracts.get(asset_id)
    }

    /// Deploy a new wrapped token contract
    pub async fn deploy_wrapped_token(
        &mut self,
        asset: &Asset,
        original_chain: &str,
    ) -> Result<WrappedTokenContract, BridgeError> {
        println!(
            "🚀 Deploying wrapped token for {} from {}",
            asset.id, original_chain
        );

        // In production, this would:
        // 1. Compile and deploy ERC-20 contract
        // 2. Set proper name/symbol/decimals
        // 3. Grant bridge contract minting role
        // 4. Return deployed contract address

        let contract_address = format!("0x{:x}", rand::random::<u64>());
        let wrapped_symbol = format!("w{}", asset.metadata.symbol);
        let wrapped_name = format!("Wrapped {}", asset.metadata.name);

        let contract = WrappedTokenContract::new(
            contract_address,
            asset.id.clone(),
            original_chain.to_string(),
            asset.decimals,
            wrapped_name,
            wrapped_symbol,
        );

        self.register_wrapped_token(asset.id.clone(), contract.clone());

        Ok(contract)
    }

    /// Check if a wrapped token exists for an asset
    pub fn has_wrapped_token(&self, asset_id: &str) -> bool {
        self.contracts.contains_key(asset_id)
    }

    /// Get all registered wrapped tokens
    pub fn get_all_wrapped_tokens(&self) -> Vec<&WrappedTokenContract> {
        self.contracts.values().collect()
    }
}

#[derive(Debug, Clone)]
pub struct WrappedTokenDeploymentConfig {
    pub deployer_private_key: String,
    pub gas_limit: u64,
    pub gas_price: u64,
    pub bridge_contract_address: String,
}

impl Default for WrappedTokenDeploymentConfig {
    fn default() -> Self {
        Self {
            deployer_private_key:
                "0x0000000000000000000000000000000000000000000000000000000000000000".to_string(),
            gas_limit: 2000000,
            gas_price: 20_000_000_000,
            bridge_contract_address: "0x0000000000000000000000000000000000000000".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WrappedTokenEvent {
    Transfer {
        from: String,
        to: String,
        amount: u64,
        tx_hash: String,
        block_number: u64,
    },
    Mint {
        to: String,
        amount: u64,
        tx_hash: String,
        block_number: u64,
    },
    Burn {
        from: String,
        amount: u64,
        tx_hash: String,
        block_number: u64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AssetMetadata;

    #[test]
    fn test_wrapped_token_contract_creation() {
        let contract = WrappedTokenContract::new(
            "0x1234567890123456789012345678901234567890".to_string(),
            "BTC".to_string(),
            "bitcoin".to_string(),
            8,
            "Wrapped Bitcoin".to_string(),
            "wBTC".to_string(),
        );

        assert_eq!(contract.original_asset_id, "BTC");
        assert_eq!(contract.decimals, 8);
        assert_eq!(contract.symbol, "wBTC");
    }

    #[test]
    fn test_wrapped_token_registry() {
        let config = WrappedTokenDeploymentConfig::default();
        let mut registry = WrappedTokenRegistry::new(config);

        let contract = WrappedTokenContract::new(
            "0x1234567890123456789012345678901234567890".to_string(),
            "BTC".to_string(),
            "bitcoin".to_string(),
            8,
            "Wrapped Bitcoin".to_string(),
            "wBTC".to_string(),
        );

        registry.register_wrapped_token("BTC".to_string(), contract);

        assert!(registry.has_wrapped_token("BTC"));
        assert!(!registry.has_wrapped_token("ETH"));

        let retrieved = registry.get_wrapped_contract("BTC");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().symbol, "wBTC");
    }

    #[tokio::test]
    async fn test_deploy_wrapped_token() {
        let config = WrappedTokenDeploymentConfig::default();
        let mut registry = WrappedTokenRegistry::new(config);

        let asset = Asset {
            id: "DOT".to_string(),
            amount: 1000000000000, // 1 DOT
            decimals: 10,
            metadata: AssetMetadata {
                name: "Polkadot".to_string(),
                symbol: "DOT".to_string(),
                description: "Polkadot native token".to_string(),
                icon_url: None,
            },
        };

        let contract = registry
            .deploy_wrapped_token(&asset, "polkadot")
            .await
            .unwrap();

        assert_eq!(contract.original_asset_id, "DOT");
        assert_eq!(contract.original_chain, "polkadot");
        assert_eq!(contract.decimals, 10);
        assert!(contract.contract_address.starts_with("0x"));

        assert!(registry.has_wrapped_token("DOT"));
    }

    #[test]
    fn test_mint_call_preparation() {
        let contract = WrappedTokenContract::new(
            "0x1234567890123456789012345678901234567890".to_string(),
            "BTC".to_string(),
            "bitcoin".to_string(),
            8,
            "Wrapped Bitcoin".to_string(),
            "wBTC".to_string(),
        );

        let call = contract.prepare_mint_call("0xRecipient", 100000000); // 1 BTC

        assert_eq!(call.function_name, "mint");
        assert_eq!(call.parameters.len(), 2);
        assert_eq!(call.gas_limit, 100000);
    }
}
