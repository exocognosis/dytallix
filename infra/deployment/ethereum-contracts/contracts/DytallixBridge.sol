// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DytallixBridge
 * @dev Cross-chain bridge contract for Dytallix ecosystem
 * Supports asset locking/unlocking and cross-chain transfers
 */
contract DytallixBridge is 
    Initializable,
    PausableUpgradeable, 
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Bridge configuration
    uint256 public validatorThreshold;
    uint256 public bridgeFeeBps; // Fee in basis points (100 = 1%)
    uint256 public nonce;
    
    // Asset management
    mapping(address => bool) public supportedAssets;
    mapping(address => uint256) public lockedBalances;
    mapping(bytes32 => bool) public processedTransactions;
    
    // Cross-chain transactions
    struct BridgeTransaction {
        address asset;
        uint256 amount;
        address recipient;
        string destinationChain;
        uint256 nonce;
        bool processed;
    }
    
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    mapping(bytes32 => uint256) public validatorSignatures;
    
    // Events
    event AssetLocked(
        address indexed asset,
        address indexed sender,
        uint256 amount,
        string destinationChain,
        address recipient,
        uint256 nonce
    );
    
    event AssetUnlocked(
        address indexed asset,
        address indexed recipient,
        uint256 amount,
        bytes32 indexed transactionId
    );
    
    event AssetAdded(address indexed asset);
    event AssetRemoved(address indexed asset);
    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event BridgeConfigUpdated(uint256 threshold, uint256 feeBps);
    
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

    modifier onlyValidator() {
        require(hasRole(VALIDATOR_ROLE, msg.sender), "Not a validator");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "Not an operator");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        uint256 _validatorThreshold,
        uint256 _bridgeFeeBps
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        validatorThreshold = _validatorThreshold;
        bridgeFeeBps = _bridgeFeeBps;
        nonce = 1;
    }

    /**
     * @dev Lock assets for cross-chain transfer
     */
    function lockAsset(
        address asset,
        uint256 amount,
        string calldata destinationChain,
        address recipient
    ) external nonReentrant whenNotPaused {
        uint256 gasStart = gasleft();
        uint256 startTime = block.timestamp;
        
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");

        // Calculate fee
        uint256 fee = (amount * bridgeFeeBps) / 10000;
        uint256 netAmount = amount - fee;

        // Transfer tokens to bridge
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update locked balance
        lockedBalances[asset] += netAmount;
        
        // Increment nonce
        uint256 currentNonce = nonce++;
        
        emit AssetLocked(
            asset,
            msg.sender,
            netAmount,
            destinationChain,
            recipient,
            currentNonce
        );
        
        // Performance metrics
        uint256 gasUsed = gasStart - gasleft();
        uint256 executionTime = block.timestamp - startTime;
        
        emit GasUsageReport("lockAsset", gasStart, gasleft(), gasUsed);
        emit PerformanceMetric("lockAsset", gasUsed, executionTime, msg.sender, keccak256(abi.encodePacked(asset, amount, currentNonce)));
    }

    /**
     * @dev Unlock assets after cross-chain transfer validation
     */
    function unlockAsset(
        bytes32 transactionId,
        address asset,
        address recipient,
        uint256 amount,
        bytes[] calldata signatures
    ) external onlyValidator nonReentrant whenNotPaused {
        uint256 gasStart = gasleft();
        uint256 startTime = block.timestamp;
        
        require(!processedTransactions[transactionId], "Transaction already processed");
        require(supportedAssets[asset], "Asset not supported");
        require(signatures.length >= validatorThreshold, "Insufficient signatures");
        
        // Verify signatures (simplified - in production would verify actual signatures)
        require(_verifySignatures(transactionId, signatures), "Invalid signatures");
        
        // Mark as processed
        processedTransactions[transactionId] = true;
        
        // Update locked balance
        require(lockedBalances[asset] >= amount, "Insufficient locked balance");
        lockedBalances[asset] -= amount;
        
        // Transfer tokens to recipient
        IERC20(asset).safeTransfer(recipient, amount);
        
        emit AssetUnlocked(asset, recipient, amount, transactionId);
        
        // Performance metrics
        uint256 gasUsed = gasStart - gasleft();
        uint256 executionTime = block.timestamp - startTime;
        
        emit GasUsageReport("unlockAsset", gasStart, gasleft(), gasUsed);
        emit PerformanceMetric("unlockAsset", gasUsed, executionTime, msg.sender, transactionId);
    }

    /**
     * @dev Add supported asset
     */
    function addSupportedAsset(address asset) external onlyOperator {
        require(asset != address(0), "Invalid asset address");
        supportedAssets[asset] = true;
        emit AssetAdded(asset);
    }

    /**
     * @dev Remove supported asset
     */
    function removeSupportedAsset(address asset) external onlyOperator {
        supportedAssets[asset] = false;
        emit AssetRemoved(asset);
    }

    /**
     * @dev Add validator
     */
    function addValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VALIDATOR_ROLE, validator);
        emit ValidatorAdded(validator);
    }

    /**
     * @dev Remove validator
     */
    function removeValidator(address validator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VALIDATOR_ROLE, validator);
        emit ValidatorRemoved(validator);
    }

    /**
     * @dev Update bridge configuration
     */
    function updateBridgeConfig(
        uint256 _validatorThreshold,
        uint256 _bridgeFeeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_validatorThreshold > 0, "Invalid threshold");
        require(_bridgeFeeBps <= 1000, "Fee too high"); // Max 10%
        
        validatorThreshold = _validatorThreshold;
        bridgeFeeBps = _bridgeFeeBps;
        
        emit BridgeConfigUpdated(_validatorThreshold, _bridgeFeeBps);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Verify validator signatures (simplified implementation)
     */
    function _verifySignatures(
        bytes32 transactionId,
        bytes[] calldata signatures
    ) internal view returns (bool) {
        // Simplified verification - in production would verify actual ECDSA signatures
        // For now, just check if we have enough signatures from validators
        uint256 validSignatures = 0;
        
        for (uint256 i = 0; i < signatures.length; i++) {
            if (signatures[i].length == 65) { // Standard ECDSA signature length
                validSignatures++;
            }
        }
        
        return validSignatures >= validatorThreshold;
    }

    /**
     * @dev Get locked balance for asset
     */
    function getLockedBalance(address asset) external view returns (uint256) {
        return lockedBalances[asset];
    }

    /**
     * @dev Check if transaction is processed
     */
    function isTransactionProcessed(bytes32 transactionId) external view returns (bool) {
        return processedTransactions[transactionId];
    }

    /**
     * @dev Get bridge configuration
     */
    function getBridgeConfig() external view returns (uint256, uint256, uint256) {
        return (validatorThreshold, bridgeFeeBps, nonce);
    }
}
