// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title WrappedDytallix
 * @dev Wrapped DGT token for Ethereum network
 * Represents DGT tokens locked on the Dytallix chain
 */
contract WrappedDytallix is ERC20, ERC20Burnable, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Bridge contract address
    address public bridge;
    
    // Original chain information
    string public originalChain;
    address public originalAsset;

    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);
    event TokensMinted(address indexed to, uint256 amount, bytes32 indexed txHash);
    event TokensBurned(address indexed from, uint256 amount, string destinationChain);
    
    // Performance metrics events
    event PerformanceMetric(
        string indexed metricType,
        uint256 gasUsed,
        uint256 executionTime,
        address indexed caller,
        bytes32 indexed transactionHash
    );
    
    event GasUsageReport(
        string indexed operation,
        uint256 gasStart,
        uint256 gasEnd,
        uint256 gasUsed
    );

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address _bridge,
        string memory _originalChain,
        address _originalAsset
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, _bridge);
        _grantRole(PAUSER_ROLE, admin);
        
        bridge = _bridge;
        originalChain = _originalChain;
        originalAsset = _originalAsset;
    }

    /**
     * @dev Mint wrapped tokens when assets are locked on origin chain
     */
    function mint(
        address to, 
        uint256 amount, 
        bytes32 txHash
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        uint256 gasStart = gasleft();
        uint256 startTime = block.timestamp;
        
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, txHash);
        
        // Performance metrics
        uint256 gasUsed = gasStart - gasleft();
        uint256 executionTime = block.timestamp - startTime;
        
        emit GasUsageReport("mint", gasStart, gasleft(), gasUsed);
        emit PerformanceMetric("mint", gasUsed, executionTime, msg.sender, txHash);
    }

    /**
     * @dev Burn wrapped tokens for cross-chain transfer back to origin
     */
    function burnForBridge(
        uint256 amount,
        string calldata destinationChain
    ) external whenNotPaused {
        uint256 gasStart = gasleft();
        uint256 startTime = block.timestamp;
        
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, destinationChain);
        
        // Performance metrics
        uint256 gasUsed = gasStart - gasleft();
        uint256 executionTime = block.timestamp - startTime;
        bytes32 txHash = keccak256(abi.encodePacked(msg.sender, amount, destinationChain, block.timestamp));
        
        emit GasUsageReport("burnForBridge", gasStart, gasleft(), gasUsed);
        emit PerformanceMetric("burnForBridge", gasUsed, executionTime, msg.sender, txHash);
    }

    /**
     * @dev Update bridge contract (admin only)
     */
    function updateBridge(address newBridge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newBridge != address(0), "Invalid bridge address");
        
        address oldBridge = bridge;
        
        // Revoke minter role from old bridge
        if (oldBridge != address(0)) {
            _revokeRole(MINTER_ROLE, oldBridge);
        }
        
        // Grant minter role to new bridge
        _grantRole(MINTER_ROLE, newBridge);
        bridge = newBridge;
        
        emit BridgeUpdated(oldBridge, newBridge);
    }

    /**
     * @dev Pause token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override transfer to include pause functionality
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Get token information
     */
    function getTokenInfo() external view returns (
        string memory,
        address,
        address,
        uint256
    ) {
        return (originalChain, originalAsset, bridge, totalSupply());
    }
}
