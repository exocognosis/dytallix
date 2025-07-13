// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./WrappedDytallix.sol";

/**
 * @title WrappedTokenFactory
 * @dev Factory contract for deploying wrapped tokens
 */
contract WrappedTokenFactory is Ownable {
    // Mapping of asset ID to wrapped token address
    mapping(string => address) public wrappedTokens;
    
    // Array of all deployed wrapped tokens
    address[] public allWrappedTokens;
    
    // Bridge contract address
    address public bridge;

    event WrappedTokenCreated(
        string indexed assetId,
        address indexed tokenAddress,
        string name,
        string symbol,
        string originalChain,
        address originalAsset
    );

    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    constructor(address _bridge) {
        bridge = _bridge;
    }

    /**
     * @dev Create a new wrapped token
     */
    function createWrappedToken(
        string calldata assetId,
        string calldata name,
        string calldata symbol,
        string calldata originalChain,
        address originalAsset
    ) external onlyOwner returns (address) {
        require(wrappedTokens[assetId] == address(0), "Token already exists");
        require(bytes(assetId).length > 0, "Invalid asset ID");
        require(bytes(name).length > 0, "Invalid name");
        require(bytes(symbol).length > 0, "Invalid symbol");

        // Deploy new wrapped token
        WrappedDytallix wrappedToken = new WrappedDytallix(
            name,
            symbol,
            owner(),
            bridge,
            originalChain,
            originalAsset
        );

        address tokenAddress = address(wrappedToken);
        
        // Store mapping
        wrappedTokens[assetId] = tokenAddress;
        allWrappedTokens.push(tokenAddress);

        emit WrappedTokenCreated(
            assetId,
            tokenAddress,
            name,
            symbol,
            originalChain,
            originalAsset
        );

        return tokenAddress;
    }

    /**
     * @dev Update bridge contract for all wrapped tokens
     */
    function updateBridge(address newBridge) external onlyOwner {
        require(newBridge != address(0), "Invalid bridge address");
        
        address oldBridge = bridge;
        bridge = newBridge;

        // Update bridge for all wrapped tokens
        for (uint256 i = 0; i < allWrappedTokens.length; i++) {
            WrappedDytallix(allWrappedTokens[i]).updateBridge(newBridge);
        }

        emit BridgeUpdated(oldBridge, newBridge);
    }

    /**
     * @dev Get wrapped token address by asset ID
     */
    function getWrappedToken(string calldata assetId) external view returns (address) {
        return wrappedTokens[assetId];
    }

    /**
     * @dev Get all wrapped token addresses
     */
    function getAllWrappedTokens() external view returns (address[] memory) {
        return allWrappedTokens;
    }

    /**
     * @dev Get number of deployed wrapped tokens
     */
    function getWrappedTokenCount() external view returns (uint256) {
        return allWrappedTokens.length;
    }
}
