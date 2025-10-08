# Node Differentiation: Fast Launch vs Mainnet

## Overview

The Dytallix project now has two distinct node implementations:

1. **`dytallix-fast-node`** (this directory) - Fast Launch/Testnet Node
2. **`dytallix-node`** (in `/blockchain-core`) - Full Mainnet Node

---

## Fast Launch Node (`dytallix-fast-node`)

**Location**: `/Users/rickglenn/dytallix/dytallix-fast-launch/node/`

**Binary Name**: `dytallix-fast-node`

**Purpose**: Lightweight, rapid deployment testnet node for:
- Quick testing and development
- Lean feature set for fast iteration
- Testnet deployments
- Developer onboarding
- Proof-of-concept demonstrations

**Key Characteristics**:
- ✅ Simplified architecture
- ✅ Fast compilation (~2-5 minutes)
- ✅ Core blockchain functionality
- ✅ WebSocket support
- ✅ Basic PQC integration
- ✅ Axum-based HTTP server
- ✅ RocksDB storage
- ✅ Essential metrics

**Features Enabled by Default**:
```toml
default = ["pqc-real", "metrics", "oracle"]
```

**Optional Features**:
- `pqc-real` - Real PQC cryptography
- `falcon` - Falcon signature scheme
- `sphincs` - SPHINCS+ signature scheme
- `metrics` - Prometheus metrics
- `alerts` - Alert system
- `oracle` - Oracle integration
- `contracts` - Smart contracts
- `ai` - AI modules
- `staking` - Staking functionality
- `full-node` - All features enabled

**Build Command**:
```bash
cd /Users/rickglenn/dytallix/dytallix-fast-launch
cargo build -p dytallix-fast-node
```

**Run Command**:
```bash
cd /Users/rickglenn/dytallix/dytallix-fast-launch
cargo run -p dytallix-fast-node
```

---

## Mainnet Node (`dytallix-node`)

**Location**: `/Users/rickglenn/dytallix/blockchain-core/`

**Binary Name**: `dytallix-node`

**Purpose**: Production-ready, full-featured mainnet node for:
- Mainnet deployment
- Full security hardening
- Complete feature set
- Enterprise operations
- Long-term production use

**Key Characteristics**:
- ✅ Complete architecture
- ✅ Full security implementation
- ✅ All blockchain features
- ✅ Advanced PQC integration
- ✅ Smart contract support
- ✅ AI/ML modules
- ✅ Cross-chain bridge
- ✅ Full governance
- ✅ Advanced staking
- ✅ Comprehensive monitoring

**Build Command**:
```bash
cd /Users/rickglenn/dytallix/blockchain-core
cargo build --release
```

**Run Command**:
```bash
cd /Users/rickglenn/dytallix/blockchain-core
cargo run --release
```

---

## Key Differences

| Aspect | Fast Node | Mainnet Node |
|--------|-----------|--------------|
| **Binary Name** | `dytallix-fast-node` | `dytallix-node` |
| **Location** | `/dytallix-fast-launch/node/` | `/blockchain-core/` |
| **Compile Time** | 2-5 minutes | 10-20 minutes |
| **Size** | Lightweight | Full-featured |
| **Use Case** | Testing, Development | Production |
| **Features** | Core + Optional | All features |
| **Dependencies** | Minimal | Comprehensive |
| **HTTP Server** | Axum | Full stack |
| **Smart Contracts** | Optional | Full support |
| **AI Modules** | Optional | Full support |
| **Bridge** | Not included | Full IBC bridge |
| **Target** | Testnet | Mainnet |

---

## When to Use Which?

### Use Fast Node When:
- 🚀 Rapid testing and iteration
- 👨‍💻 Developer onboarding
- 🧪 Feature experimentation
- 📝 Documentation examples
- 🎯 Proof-of-concept demos
- ⚡ Quick deployment needed
- 🧰 Building tools/SDKs

### Use Mainnet Node When:
- 🏢 Production deployment
- 💰 Real value transactions
- 🔒 Maximum security required
- 🌐 Public network operations
- 🔗 Cross-chain functionality needed
- 🤖 AI/ML features required
- 🏛️ Full governance needed

---

## Running Both Simultaneously

You can run both nodes on the same machine using different ports:

### Fast Node (Testnet)
```bash
cd /Users/rickglenn/dytallix/dytallix-fast-launch
DYT_RPC_PORT=3030 cargo run -p dytallix-fast-node
```

### Mainnet Node
```bash
cd /Users/rickglenn/dytallix/blockchain-core
DYT_RPC_PORT=3031 cargo run --release
```

---

## Migration Path

When ready to move from Fast Node to Mainnet Node:

1. **Test thoroughly** on Fast Node
2. **Build features** using optional flags
3. **Validate** with full test suite
4. **Deploy to Mainnet Node** with all security features
5. **Monitor** production metrics

---

## Orchestrator Support

The Fast Launch orchestrator (`scripts/full-stack-e2e.sh`) automatically:
- ✅ Builds `dytallix-fast-node`
- ✅ Starts the node on port 3030
- ✅ Configures backend and frontend
- ✅ Sets up WebSocket connections
- ✅ Monitors health and status

---

## Update Summary (October 5, 2025)

**What Changed:**
- Renamed `dytallix-lean-node` → `dytallix-fast-node`
- Updated all scripts and documentation
- Clear differentiation from mainnet node
- Better naming convention for clarity

**Why:**
- Avoid confusion between launch versions
- Clear separation of testnet vs mainnet
- Better developer experience
- Consistent naming across project

**Files Updated:**
- ✅ `node/Cargo.toml` - Package name
- ✅ `scripts/full-stack-e2e.sh` - Build/run commands
- ✅ `scripts/prelaunch_validation.sh` - Binary references
- ✅ `FINAL_CHECKLIST.md` - Process kill commands
- ✅ `NODE_DIFFERENCES.md` - This documentation

---

## References

- Fast Node Source: `dytallix-fast-launch/node/src/`
- Mainnet Node Source: `blockchain-core/src/`
- Build Artifacts: `target/debug/dytallix-fast-node`
- Mainnet Artifacts: `target/release/dytallix-node`

---

**Last Updated**: October 5, 2025  
**Version**: Fast Launch v0.1.0
