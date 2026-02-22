# QuantumVault Smart Contracts

Solidity contracts for on-chain asset registration and verification.

## DytallixRegistry

Simple, gas-efficient registry for anchoring asset hashes on-chain.

### Features

- **Register assets** - Store BLAKE3 hash and URI on-chain
- **Update URIs** - Owner can update storage location
- **Hash lookups** - Find asset by BLAKE3 hash
- **Owner queries** - Get all assets owned by address
- **Verification** - Verify hash matches on-chain record

### Functions

#### registerAsset(bytes32 blake3, string uri) → uint256
Register a new asset. Returns asset ID.

**Requirements:**
- `blake3` must not be zero
- `uri` must not be empty
- Hash must not already be registered

**Emits:** `Registered(id, owner, blake3, uri)`

#### updateUri(uint256 id, string newUri)
Update storage URI for an asset.

**Requirements:**
- Asset must exist
- Caller must be asset owner
- `newUri` must not be empty

**Emits:** `UriUpdated(id, oldUri, newUri)`

#### getAssetByHash(bytes32 blake3) → (id, owner, uri, createdAt)
Look up asset by BLAKE3 hash.

Returns `(0, 0x0, "", 0)` if not found.

#### getAssetsByOwner(address owner) → uint256[]
Get all asset IDs owned by an address.

#### verifyAsset(uint256 id, bytes32 blake3) → bool
Verify if a hash matches the on-chain record.

### Events

```solidity
event Registered(uint256 indexed id, address indexed owner, bytes32 blake3, string uri);
event UriUpdated(uint256 indexed id, string oldUri, string newUri);
```

### Storage

```solidity
struct Asset {
    address owner;      // Asset owner
    bytes32 blake3;     // BLAKE3 hash (32 bytes)
    string uri;         // Storage URI
    uint64 createdAt;   // Block timestamp
}
```

### Gas Estimates

- `registerAsset`: ~100k gas
- `updateUri`: ~50k gas
- `getAssetByHash`: view (free)
- `verifyAsset`: view (free)

### Deployment

```bash
# Using Hardhat
npx hardhat compile
npx hardhat deploy --network dytallix

# Using Foundry
forge build
forge create DytallixRegistry --rpc-url <RPC_URL> --private-key <KEY>
```

### Testing

```bash
# Hardhat
npx hardhat test

# Foundry
forge test
```

### Security Considerations

1. **Hash uniqueness**: Contract enforces one asset per BLAKE3 hash
2. **Owner-only updates**: Only asset owner can update URI
3. **Immutable hash**: BLAKE3 hash cannot be changed after registration
4. **No deletion**: Assets cannot be deleted (use zero-length URI if needed)
5. **Gas optimization**: Efficient storage layout, minimal SSTORE operations

### Integration Example

```javascript
import { ethers } from 'ethers';

const registryAddress = '0x...';
const registryABI = [...];

const contract = new ethers.Contract(registryAddress, registryABI, signer);

// Register asset
const tx = await contract.registerAsset(
  blake3Hash,  // bytes32
  'ipfs://QmXYZ...'
);
const receipt = await tx.wait();
const assetId = receipt.events[0].args.id;

// Verify asset
const valid = await contract.verifyAsset(assetId, blake3Hash);
console.log('Valid:', valid);
```

## License

MIT
