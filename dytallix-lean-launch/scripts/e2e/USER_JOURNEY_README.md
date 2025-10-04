# E2E PQC User Journey Test

## Overview

The `user_journey.sh` script provides a comprehensive end-to-end test for PQC-compliant token transfers on the Dytallix Lean Launch stack. It generates tamper-evident artifacts and validates all critical assertions.

## Features

- **Dynamic Port Discovery**: Automatically finds free ports in configurable ranges
- **Service Health Checking**: Validates Node, API, and PulseGuard are healthy before proceeding
- **PQC Wallet Creation**: Generates Dilithium3 wallets with secure passphrase handling
- **Dual Token Transfers**: Tests both DGT and DRT token transfers
- **Transaction Verification**: Polls for inclusion and validates receipts
- **AI Risk Analysis**: Queries PulseGuard for risk scores (optional)
- **Comprehensive Evidence**: Generates complete artifact pack with logs, JSONs, and summary

## Usage

### Basic Usage

```bash
cd dytallix-lean-launch
./scripts/e2e/user_journey.sh
```

### With Custom Ports

```bash
NODE_PORT=3050 API_PORT=3010 PG_PORT=9095 ./scripts/e2e/user_journey.sh
```

## Port Ranges

The script uses the following port ranges (customizable via environment variables):

- **NODE_PORT**: 3030-3099 (Node RPC)
- **API_PORT**: 3000-3020 (API/Faucet)
- **PG_PORT**: 9090-9100 (PulseGuard)
- **EXPLORER_PORT**: 5173-5199 (Explorer)

## Exit Codes

- **0**: All tests passed successfully
- **2**: One or more assertions failed

## Evidence Structure

All evidence is stored in timestamped directories under:
```
launch-evidence/e2e-user-journey/<YYYYMMDD_HHMMSS_UTC>/
├── SUMMARY.md                     (comprehensive test summary)
├── ports.env                      (service port configuration)
├── logs/
│   ├── stack_bootstrap.log        (service startup logs)
│   ├── submit_cli.log             (transaction submission logs)
│   └── inclusion_poll.log         (transaction confirmation logs)
└── json/
    ├── wallet_A_redacted.json     (Wallet A public info only)
    ├── wallet_B_redacted.json     (Wallet B public info only)
    ├── balances_before_A.json     (initial balance - A)
    ├── balances_before_B.json     (initial balance - B)
    ├── tx_udgt_signed.json        (signed udgt transaction)
    ├── tx_udgt_submit.json        (udgt submission response)
    ├── tx_udgt_receipt.json       (udgt transaction receipt)
    ├── tx_udrt_signed.json        (signed udrt transaction)
    ├── tx_udrt_submit.json        (udrt submission response)
    ├── tx_udrt_receipt.json       (udrt transaction receipt)
    ├── tx_udgt_risk.json          (udgt risk analysis, if available)
    ├── tx_udrt_risk.json          (udrt risk analysis, if available)
    ├── balances_after_A.json      (final balance - A)
    └── balances_after_B.json      (final balance - B)
```

## Test Flow

1. **Port Discovery**: Finds free ports or uses environment overrides
2. **Stack Bootstrap**: Starts or attaches to Node, API, and PulseGuard services
3. **Wallet Creation**: Generates two Dilithium3 PQC wallets (A and B)
4. **Funding**: Uses faucet to fund Wallet A with 1000 udgt and 1000 udrt
5. **Transfer**: Sends 250 udgt and 250 udrt from A to B
6. **Verification**: Confirms transaction inclusion and balance changes
7. **Risk Analysis**: Queries PulseGuard for AI risk scores (if available)
8. **Evidence Generation**: Creates comprehensive artifact pack with summary

## Assertions

The script validates the following:

### Balance Assertions
- Wallet A udgt decreased by at least 250 (allowing for gas)
- Wallet A udrt decreased by at least 250 (allowing for gas)
- Wallet B udgt increased by exactly 250
- Wallet B udrt increased by exactly 250

### Transaction Assertions
- Both transactions have status: included/success/confirmed
- Both transactions recorded gas usage > 0
- Both transactions included in blocks with valid heights

### Risk Analysis (if PulseGuard available)
- Risk score object returned for both transactions
- Latency metrics recorded

## Security

- **No Private Keys in Evidence**: All wallet artifacts are redacted to exclude private keys
- **Secure Passphrase Handling**: Passphrases generated with cryptographic randomness
- **Temporary Storage**: Private keys stored only in temp directories, cleaned on exit

## Testing

Run the unit tests:

```bash
./scripts/e2e/test_user_journey.sh
```

## Requirements

- **bash** (or POSIX-compatible shell)
- **jq** (JSON processing)
- **curl** (HTTP requests)
- **lsof** or **ss** (port detection)
- **node** >= 18 (for dytx CLI)
- **openssl** (for random passphrase generation)

## Troubleshooting

### Port Already in Use

If the default ports are in use, the script will automatically find free alternatives. You can also specify custom ports:

```bash
NODE_PORT=3050 ./scripts/e2e/user_journey.sh
```

### Service Startup Failures

Check the logs in the evidence directory:
- `logs/stack_bootstrap.log` - Service startup logs
- `logs/submit_cli.log` - Transaction submission logs

### Transaction Not Included

If transactions don't get included within 60 seconds, check:
1. Node is running and healthy
2. Faucet successfully funded the sender wallet
3. Network connectivity between services

### PulseGuard Not Available

The script gracefully handles PulseGuard being unavailable. Risk analysis will be marked as "skipped" in the summary, but the test will still pass.

## Integration with CI/CD

The script can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E PQC Test
  run: |
    cd dytallix-lean-launch
    ./scripts/e2e/user_journey.sh
  env:
    NODE_PORT: 3030
    API_PORT: 3000
```

## Related Documentation

- [CLI Documentation](../../cli/dytx/README_CLI.md)
- [PQC Implementation](../../../PQC_IMPLEMENTATION_SUMMARY.md)
- [Launch Checklist](../../LAUNCH-CHECKLIST.md)
