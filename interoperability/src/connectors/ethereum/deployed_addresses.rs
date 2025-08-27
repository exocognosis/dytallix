//! Deployed Contract Addresses for Ethereum Networks
//!
//! This module contains the deployed contract addresses for different Ethereum networks.
//! These addresses are automatically updated by deployment scripts.

use std::collections::HashMap;

/// Contract addresses for different Ethereum networks
#[derive(Debug, Clone)]
pub struct NetworkAddresses {
    pub bridge_address: &'static str,
    pub factory_address: &'static str,
    pub wrapped_dyt_address: &'static str,
    pub chain_id: u64,
}

/// Sepolia Testnet Addresses
/// Updated: TBD
pub const SEPOLIA_ADDRESSES: NetworkAddresses = NetworkAddresses {
    bridge_address: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    factory_address: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    wrapped_dyt_address: "0x0000000000000000000000000000000000000000", // Will be updated after deployment
    chain_id: 11155111,
};

/// Ethereum Mainnet Addresses
/// Status: Not deployed yet
pub const MAINNET_ADDRESSES: NetworkAddresses = NetworkAddresses {
    bridge_address: "0x0000000000000000000000000000000000000000", // Not deployed
    factory_address: "0x0000000000000000000000000000000000000000", // Not deployed
    wrapped_dyt_address: "0x0000000000000000000000000000000000000000", // Not deployed
    chain_id: 1,
};

/// Get contract addresses for a specific network by chain ID
pub fn get_network_addresses(chain_id: u64) -> Option<&'static NetworkAddresses> {
    match chain_id {
        11155111 => Some(&SEPOLIA_ADDRESSES),
        1 => Some(&MAINNET_ADDRESSES),
        _ => None,
    }
}

/// Get all available network addresses
pub fn get_all_networks() -> HashMap<u64, &'static NetworkAddresses> {
    let mut networks = HashMap::new();
    networks.insert(11155111, &SEPOLIA_ADDRESSES);
    networks.insert(1, &MAINNET_ADDRESSES);
    networks
}

/// Check if a network is supported
pub fn is_network_supported(chain_id: u64) -> bool {
    matches!(chain_id, 11155111 | 1)
}

/// Get network name by chain ID
pub fn get_network_name(chain_id: u64) -> Option<&'static str> {
    match chain_id {
        11155111 => Some("Sepolia Testnet"),
        1 => Some("Ethereum Mainnet"),
        _ => None,
    }
}

/// Validate if addresses are deployed (not zero addresses)
pub fn is_network_deployed(chain_id: u64) -> bool {
    if let Some(addresses) = get_network_addresses(chain_id) {
        addresses.bridge_address != "0x0000000000000000000000000000000000000000"
            && addresses.factory_address != "0x0000000000000000000000000000000000000000"
            && addresses.wrapped_dyt_address != "0x0000000000000000000000000000000000000000"
    } else {
        false
    }
}

/// Deployment information structure
#[derive(Debug, Clone)]
pub struct DeploymentInfo {
    pub network_name: &'static str,
    pub chain_id: u64,
    pub addresses: &'static NetworkAddresses,
    pub is_deployed: bool,
    pub is_testnet: bool,
}

/// Get deployment information for a network
pub fn get_deployment_info(chain_id: u64) -> Option<DeploymentInfo> {
    let addresses = get_network_addresses(chain_id)?;
    let network_name = get_network_name(chain_id)?;
    let is_deployed = is_network_deployed(chain_id);
    let is_testnet = chain_id != 1; // Everything except mainnet is considered testnet

    Some(DeploymentInfo {
        network_name,
        chain_id,
        addresses,
        is_deployed,
        is_testnet,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_network_addresses() {
        // Test Sepolia
        let sepolia = get_network_addresses(11155111);
        assert!(sepolia.is_some());
        assert_eq!(sepolia.unwrap().chain_id, 11155111);

        // Test Mainnet
        let mainnet = get_network_addresses(1);
        assert!(mainnet.is_some());
        assert_eq!(mainnet.unwrap().chain_id, 1);

        // Test unknown network
        let unknown = get_network_addresses(999);
        assert!(unknown.is_none());
    }

    #[test]
    fn test_network_support() {
        assert!(is_network_supported(11155111)); // Sepolia
        assert!(is_network_supported(1)); // Mainnet
        assert!(!is_network_supported(999)); // Unknown
    }

    #[test]
    fn test_network_names() {
        assert_eq!(get_network_name(11155111), Some("Sepolia Testnet"));
        assert_eq!(get_network_name(1), Some("Ethereum Mainnet"));
        assert_eq!(get_network_name(999), None);
    }

    #[test]
    fn test_deployment_status() {
        // Initially, no networks should be deployed (zero addresses)
        assert!(!is_network_deployed(11155111));
        assert!(!is_network_deployed(1));
    }

    #[test]
    fn test_get_all_networks() {
        let networks = get_all_networks();
        assert_eq!(networks.len(), 2);
        assert!(networks.contains_key(&11155111));
        assert!(networks.contains_key(&1));
    }

    #[test]
    fn test_deployment_info() {
        let sepolia_info = get_deployment_info(11155111);
        assert!(sepolia_info.is_some());

        let info = sepolia_info.unwrap();
        assert_eq!(info.network_name, "Sepolia Testnet");
        assert_eq!(info.chain_id, 11155111);
        assert!(info.is_testnet);
        assert!(!info.is_deployed); // Initially not deployed

        let mainnet_info = get_deployment_info(1);
        assert!(mainnet_info.is_some());

        let info = mainnet_info.unwrap();
        assert_eq!(info.network_name, "Ethereum Mainnet");
        assert_eq!(info.chain_id, 1);
        assert!(!info.is_testnet);
        assert!(!info.is_deployed); // Initially not deployed
    }
}
