// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DytallixRegistry
 * @dev Simple asset registry for QuantumVault
 * Stores BLAKE3 hashes and URIs on-chain for tamper-proof verification
 */
contract DytallixRegistry {
    /// @notice Emitted when a new asset is registered
    event Registered(
        uint256 indexed id,
        address indexed owner,
        bytes32 blake3,
        string uri
    );

    /// @notice Emitted when an asset URI is updated
    event UriUpdated(
        uint256 indexed id,
        string oldUri,
        string newUri
    );

    /// @notice Asset metadata structure
    struct Asset {
        address owner;      // Asset owner (transaction sender)
        bytes32 blake3;     // BLAKE3 hash of original file
        string uri;         // Storage URI (IPFS, S3, etc.)
        uint64 createdAt;   // Block timestamp
    }

    /// @notice Total number of registered assets
    uint256 public total;

    /// @notice Mapping from asset ID to asset metadata
    mapping(uint256 => Asset) public assets;

    /// @notice Mapping from BLAKE3 hash to asset ID (for lookups)
    mapping(bytes32 => uint256) public hashToAssetId;

    /**
     * @notice Register a new asset
     * @param blake3 BLAKE3 hash of the original file (32 bytes)
     * @param uri Storage URI (e.g., "ipfs://..." or "qv://...")
     * @return id The newly assigned asset ID
     */
    function registerAsset(bytes32 blake3, string calldata uri)
        external
        returns (uint256 id)
    {
        require(blake3 != bytes32(0), "Invalid hash: cannot be zero");
        require(bytes(uri).length > 0, "Invalid URI: cannot be empty");
        require(hashToAssetId[blake3] == 0, "Asset already registered");

        // Increment total and use as ID (starts at 1)
        id = ++total;

        // Store asset
        assets[id] = Asset({
            owner: msg.sender,
            blake3: blake3,
            uri: uri,
            createdAt: uint64(block.timestamp)
        });

        // Index by hash for quick lookups
        hashToAssetId[blake3] = id;

        emit Registered(id, msg.sender, blake3, uri);
    }

    /**
     * @notice Update the URI of an existing asset
     * @param id Asset ID
     * @param newUri New storage URI
     */
    function updateUri(uint256 id, string calldata newUri) external {
        require(id > 0 && id <= total, "Asset does not exist");
        Asset storage asset = assets[id];
        require(asset.owner == msg.sender, "Not asset owner");
        require(bytes(newUri).length > 0, "Invalid URI: cannot be empty");

        string memory oldUri = asset.uri;
        asset.uri = newUri;

        emit UriUpdated(id, oldUri, newUri);
    }

    /**
     * @notice Get asset by BLAKE3 hash
     * @param blake3 BLAKE3 hash to look up
     * @return id Asset ID (0 if not found)
     * @return owner Asset owner address
     * @return uri Storage URI
     * @return createdAt Creation timestamp
     */
    function getAssetByHash(bytes32 blake3)
        external
        view
        returns (
            uint256 id,
            address owner,
            string memory uri,
            uint64 createdAt
        )
    {
        id = hashToAssetId[blake3];
        if (id == 0) {
            return (0, address(0), "", 0);
        }

        Asset storage asset = assets[id];
        return (id, asset.owner, asset.uri, asset.createdAt);
    }

    /**
     * @notice Get all assets owned by an address
     * @param owner Address to query
     * @return assetIds Array of asset IDs owned by the address
     */
    function getAssetsByOwner(address owner)
        external
        view
        returns (uint256[] memory assetIds)
    {
        // First pass: count assets owned
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (assets[i].owner == owner) {
                count++;
            }
        }

        // Second pass: collect asset IDs
        assetIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (assets[i].owner == owner) {
                assetIds[index++] = i;
            }
        }
    }

    /**
     * @notice Verify an asset hash matches on-chain record
     * @param id Asset ID
     * @param blake3 BLAKE3 hash to verify
     * @return valid True if hash matches on-chain record
     */
    function verifyAsset(uint256 id, bytes32 blake3)
        external
        view
        returns (bool valid)
    {
        require(id > 0 && id <= total, "Asset does not exist");
        return assets[id].blake3 == blake3;
    }
}
