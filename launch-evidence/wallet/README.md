# Wallet & PQC Evidence Collection

This directory contains scripts for collecting wallet functionality and Post-Quantum Cryptography (PQC) evidence including key generation, faucet claiming, and transaction broadcasting.

## Overview

The wallet evidence collection demonstrates:

1. **PQC Key Generation**: Creating quantum-resistant key pairs
2. **Faucet Integration**: Automated token claiming from faucet service
3. **Transaction Broadcasting**: Signed transaction submission and confirmation
4. **Address Derivation**: PQC address generation and validation

## Files

- `README.md` - This documentation
- `pqc_keygen.sh` - PQC key generation script
- `faucet_claim.sh` - Faucet token claiming script  
- `send_tx.sh` - Transaction broadcasting script
- `.keep` - Directory tracking placeholder

## Generated Artifacts

After successful execution:

- `keygen_log.txt` - Key generation process logs and output
- `faucet_tx.json` - Faucet claim transaction details
- `broadcast_tx.json` - Signed transaction broadcast confirmation

## Configuration

### Environment Variables

```bash
# Chain binary and endpoints
export DY_BINARY="dytallixd"          # Chain binary name
export DY_LCD="http://localhost:1317" # LCD/REST endpoint
export DY_RPC="http://localhost:26657" # RPC endpoint

# Base denomination  
export DY_DENOM="uDRT"                # Token denomination

# Faucet configuration
export CURL_FAUCET_URL="http://localhost:8080/faucet"  # Faucet endpoint
export FAUCET_AMOUNT="1000000uDRT"    # Amount to request from faucet

# PQC configuration
export PQC_ALGORITHM="dilithium3"     # PQC algorithm (dilithium3, falcon512, etc.)
export KEY_NAME="pqc_test_key"        # Name for generated key
export KEYRING_BACKEND="test"         # Keyring backend (test, file, os)

# Transaction configuration  
export RECIPIENT_ADDRESS=""           # Target address for send transaction
export SEND_AMOUNT="1000uDRT"         # Amount to send in test transaction
```

## Prerequisites

### Chain Requirements

- Dytallix chain with PQC support enabled
- Chain binary accessible in PATH
- Keyring backend configured

### Faucet Service

- Faucet service running and accessible
- Faucet configured to accept requests
- Rate limiting considerations for testing

## Usage

### Complete Workflow

```bash
cd wallet/

# 1. Generate PQC key
./pqc_keygen.sh

# 2. Claim tokens from faucet  
./faucet_claim.sh

# 3. Send test transaction
export RECIPIENT_ADDRESS="dy1recipientaddress..."
./send_tx.sh
```

### Individual Scripts

```bash
# Generate key with custom algorithm
export PQC_ALGORITHM="falcon512"
./pqc_keygen.sh

# Claim specific amount from faucet
export FAUCET_AMOUNT="5000000uDRT"
./faucet_claim.sh

# Send to specific recipient
export RECIPIENT_ADDRESS="dy1target..."
export SEND_AMOUNT="2000uDRT"
./send_tx.sh
```

## Script Details

### PQC Key Generation (`pqc_keygen.sh`)

**Functionality:**
- Generates new PQC key pair using specified algorithm
- Stores key in configured keyring backend
- Derives and displays address
- Logs all output for evidence collection

**Supported Algorithms:**
- `dilithium3` - NIST PQC standard (recommended)
- `falcon512` - Alternative PQC algorithm
- `sphincs` - Hash-based PQC signatures

**Output:**
- Key name and address information
- Algorithm and parameters used
- Success/failure status
- Complete command output in `keygen_log.txt`

### Faucet Claiming (`faucet_claim.sh`)

**Functionality:**
- Requests tokens from configured faucet service
- Validates faucet response and transaction
- Waits for transaction confirmation
- Records transaction details

**Faucet Integration:**
- HTTP POST request to faucet endpoint
- Handles rate limiting and errors
- Validates response format
- Monitors transaction confirmation

**Output:**
- Transaction hash and confirmation
- Amount received and final balance
- Faucet response details in `faucet_tx.json`

### Transaction Broadcasting (`send_tx.sh`)

**Functionality:**
- Creates and signs transaction using PQC key
- Broadcasts transaction to network
- Monitors confirmation and finality
- Records transaction evidence

**Transaction Types:**
- Basic token send transactions
- Fee calculation and optimization
- Gas estimation and limits
- Error handling and retry logic

**Output:**
- Transaction hash and block height
- Gas usage and fee information
- Transaction details in `broadcast_tx.json`

## PQC Implementation Notes

### Current Status

The PQC implementation in Dytallix may be in development. The scripts include:

- **Fallback Handling**: Graceful degradation if PQC not yet available
- **Placeholder Commands**: Expected future CLI interface
- **Documentation**: Planned PQC features and usage

### Expected CLI Interface

```bash
# Future PQC key generation (when implemented)
$DY_BINARY keys add my-pqc-key --algo dilithium3

# Current fallback (documents expected interface)
$DY_BINARY keys add my-key --help  # Check for --algo support
```

### Algorithm Support

The scripts are prepared for:

1. **Dilithium** - NIST standardized lattice-based signatures
2. **Falcon** - NTRU-based compact signatures  
3. **SPHINCS+** - Hash-based stateless signatures

## Security Considerations

### Key Management

- Keys generated for testing only
- Use secure keyring backends in production
- Implement proper key backup and recovery
- Monitor for key compromise

### Network Security

- Validate all network endpoints
- Use secure connections (HTTPS/TLS)
- Implement request signing for faucet
- Monitor for replay attacks

### Transaction Security

- Validate recipient addresses
- Check transaction amounts and fees
- Implement transaction confirmation requirements
- Monitor for double-spending

## Troubleshooting

### Common Issues

1. **PQC Not Available**
   - Check if chain binary supports `--algo` flag
   - Verify PQC modules are enabled in chain config
   - Review documentation for PQC readiness

2. **Faucet Connection Failed**
   - Verify faucet URL and service status
   - Check network connectivity
   - Review rate limiting policies

3. **Transaction Failures**
   - Verify sufficient balance for fees
   - Check recipient address format
   - Ensure key is properly unlocked

4. **Key Generation Errors**
   - Verify keyring backend permissions
   - Check algorithm name spelling
   - Review binary version compatibility

### Manual Verification

```bash
# Check PQC support
$DY_BINARY keys add --help | grep -i algo

# Verify key was created
$DY_BINARY keys list

# Check address balance
$DY_BINARY query bank balance $(DY_BINARY keys show $KEY_NAME -a) $DY_DENOM --node $DY_RPC

# Verify transaction
$DY_BINARY query tx $TX_HASH --node $DY_RPC
```

### Logging and Debugging

- All scripts include verbose logging
- Error messages saved to log files
- Network requests/responses captured
- Transaction details preserved for analysis

## Performance Metrics

Target performance for PQC operations:

- **Key Generation**: < 5 seconds
- **Signature Creation**: < 2 seconds  
- **Signature Verification**: < 1 second
- **Transaction Broadcast**: < 10 seconds confirmation

---

**Note**: This evidence collection is designed for testnet validation. Production deployment requires additional security reviews and operational procedures.