# Prelaunch Validation Script

## Overview

The `scripts/prelaunch_validation.sh` script provides comprehensive end-to-end validation of all critical Dytallix testnet MVP modules before invite-only release. It automates service startup, executes feature proofs across all modules, and generates structured evidence artifacts.

## Purpose

Validate the **85% readiness baseline** by testing:

- ✅ **Post-Quantum Cryptography** - Dilithium3-signed transactions
- ✅ **Dual-Token Economy** - DGT governance & DRT reward transfers
- ✅ **Governance Module** - Full proposal lifecycle (submit → vote → execute)
- ✅ **WASM Contracts** - Smart contract deployment and execution
- ✅ **AI Risk Oracle** - Transaction risk scoring via PulseGuard
- ✅ **Infrastructure** - Service orchestration and health checks

## Usage

### Basic Usage

```bash
# Navigate to the dytallix-lean-launch directory
cd ~/dytallix/dytallix-lean-launch

# Run full validation
./scripts/prelaunch_validation.sh
```

### Mock Mode

For testing the validation flow without starting actual services:

```bash
# Run in mock mode (generates evidence without starting services)
./scripts/prelaunch_validation.sh --mock
```

Mock mode is useful for:
- Testing the validation script itself
- Generating example evidence structures
- Quick validation of the reporting system
- CI/CD pipeline integration

## What It Does

### Step 1: Environment & Port Discovery
- Discovers available ports dynamically (3030-3099 for node, 3000-3020 for API, etc.)
- Saves port configuration to `launch-evidence/prelaunch-final/ports.env`

### Step 2: Bootstrap All Services
- **Node**: Blockchain runtime (tries cargo, pre-built binaries, or mocks)
- **API/Faucet**: Token distribution service
- **PulseGuard**: AI risk oracle service
- **Explorer**: UI (optional, not started in mock mode)

### Step 3: Wallet + Faucet Setup
- Generates Wallet A and Wallet B using dytx CLI (or mocks)
- Funds Wallet A via faucet with DGT and DRT tokens
- Captures initial balance snapshots

### Step 4: PQC Transaction Proof
- Creates DGT transfer from Wallet A → Wallet B
- Creates DRT transfer from Wallet A → Wallet B
- Signs transactions with Dilithium3 algorithm
- Polls for transaction confirmations
- Saves receipts with tx hash, gas used, block height

### Step 5: Governance Proposal Proof
- Submits parameter change proposal (emission_rate: 0.03 → 0.05)
- Casts votes from validators
- Executes proposal
- Verifies parameter update on-chain

### Step 6: WASM Smart Contract Proof
- Deploys example counter contract
- Executes contract method (increment)
- Queries contract state (get_count)
- Saves deployment and execution receipts

### Step 7: AI Oracle (PulseGuard) Proof
- Queries risk score for transaction hash
- Measures latency (target: <1s)
- Saves risk assessment results

### Step 8: Final Balance Check
- Fetches updated balances for Wallet A and B
- Verifies deltas reflect successful transfers
- Saves final balance snapshots

### Step 9: Evidence Packaging
- Generates comprehensive `SUMMARY.md` report
- Creates structured evidence directory
- Produces optional `readiness_out/prelaunch_validation_report.md`

### Step 10: Completion Check
- Validates all evidence artifacts are present
- Runs 8 critical checks
- Exits with code 0 on success, non-zero on failure

## Output

### Evidence Artifacts

All evidence is saved to `launch-evidence/prelaunch-final/`:

```
launch-evidence/prelaunch-final/
├── logs/
│   └── service_bootstrap.log
├── json/
│   ├── wallet_a.json
│   ├── wallet_b.json
│   ├── faucet_response.json
│   ├── balance_before_A.json
│   ├── balance_before_B.json
│   ├── balance_after_A.json
│   ├── balance_after_B.json
│   ├── tx_udgt_submit.json
│   ├── tx_udgt_receipt.json
│   ├── tx_udrt_submit.json
│   └── tx_udrt_receipt.json
├── governance/
│   ├── proposal.json
│   ├── votes.json
│   ├── execution.log
│   └── final_params.json
├── wasm/
│   ├── deploy_receipt.json
│   ├── execute_receipt.json
│   └── query_state.json
├── ai/
│   ├── tx_risk.json
│   └── ai_risk_summary.json
├── ports.env
└── SUMMARY.md
```

### Reports

Two comprehensive reports are generated:

1. **Primary Summary**: `launch-evidence/prelaunch-final/SUMMARY.md`
   - Service configuration table
   - Transaction receipts and hashes
   - Governance proposal details
   - Contract deployment info
   - AI risk scores
   - Evidence completeness checklist
   - Success criteria assessment

2. **Readiness Report**: `readiness_out/prelaunch_validation_report.md`
   - Executive summary
   - Validation coverage
   - Success metrics table
   - Launch recommendation
   - Technical details

## Exit Codes

- **0**: Validation successful, all checks passed
- **1**: Validation failed, check logs and evidence
- **2**: Critical error during execution

## Requirements

### Required Services (for live mode)
- Blockchain node (cargo-based or pre-built binary)
- API/Faucet service (Node.js)
- PulseGuard AI service (Python 3)

### Optional Services
- dytx CLI for wallet operations
- Explorer UI

### Mock Mode Requirements
- None (all services are simulated)

## Environment Variables

The script respects existing environment variables:

- `NODE_PORT` - Override default node port (default: 3030)
- `API_PORT` - Override default API port (default: 3000)
- `PG_PORT` - Override default PulseGuard port (default: 9090)
- `EXPLORER_PORT` - Override default explorer port (default: 5173)

## Example Output

```
╔═══════════════════════════════════════════════════════════════╗
║  Dytallix Final Testnet Prelaunch Validation                 ║
║  Testing all MVP-critical modules for invite-only release    ║
╚═══════════════════════════════════════════════════════════════╝

[14:08:33] 🔹 Step 1: Environment & Port Discovery
[14:08:33] Assigned ports:
[14:08:33]   Node: 3030
[14:08:33]   API: 3000
[14:08:33]   Explorer: 5173
[14:08:33]   PulseGuard: 9090
[14:08:33] ✅ Port configuration saved

[14:08:33] 🔹 Step 2: Bootstrap All Services
[14:08:33] ✅ Service bootstrap complete

[14:08:33] 🔹 Step 3: Wallet + Faucet Setup
[14:08:33] ✅ Wallets setup complete

[14:08:33] 🔹 Step 4: PQC Transaction Proof
[14:08:33] ✅ DGT transaction created: 0x11dd...
[14:08:33] ✅ DRT transaction created: 0x99e9...
[14:08:35] ✅ PQC transactions proof complete

[14:08:35] 🔹 Step 5: Governance Proposal Proof
[14:08:35] ✅ Governance proposal 30 executed

[14:08:35] 🔹 Step 6: WASM Smart Contract Proof
[14:08:35] ✅ WASM contract deployed at dyt1contract...

[14:08:35] 🔹 Step 7: AI Oracle (PulseGuard) Proof
[14:08:35] ✅ AI risk score: 0.15 (latency: 8ms)

[14:08:35] 🔹 Step 8: Final Balance Check
[14:08:35] ✅ Balance verification complete

[14:08:35] 🔹 Step 9: Evidence Packaging & Summary Generation
[14:08:35] ✅ Summary report generated

[14:08:35] 🔹 Step 10: Final Completion Checks
[14:08:35] Validation Results: 8/8 checks passed

╔═══════════════════════════════════════════════════════════════╗
║  ✅ VALIDATION SUCCESSFUL - TESTNET READY FOR LAUNCH         ║
╚═══════════════════════════════════════════════════════════════╝

📊 Full report: launch-evidence/prelaunch-final/SUMMARY.md
📁 Evidence directory: launch-evidence/prelaunch-final
```

## Troubleshooting

### Services Won't Start

If services fail to start in live mode:
1. Check if required binaries are built: `cargo build --release`
2. Verify Node.js and Python 3 are installed
3. Check port availability: `lsof -i :3030`
4. Use mock mode for testing: `./scripts/prelaunch_validation.sh --mock`

### Port Already in Use

The script automatically finds free ports in specified ranges. If all ports are occupied:
1. Stop conflicting services
2. Override ports via environment variables
3. Extend port ranges in the script

### Missing Evidence Files

If evidence generation fails:
1. Check disk space: `df -h`
2. Verify write permissions: `ls -la launch-evidence/`
3. Review bootstrap logs: `cat launch-evidence/prelaunch-final/logs/service_bootstrap.log`

## Integration

### CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
- name: Run Prelaunch Validation
  run: |
    cd dytallix-lean-launch
    ./scripts/prelaunch_validation.sh --mock
    
- name: Upload Evidence
  uses: actions/upload-artifact@v3
  with:
    name: prelaunch-evidence
    path: dytallix-lean-launch/launch-evidence/prelaunch-final/
```

### Scheduled Testing

```bash
# Cron job for nightly validation
0 2 * * * cd ~/dytallix/dytallix-lean-launch && ./scripts/prelaunch_validation.sh --mock >> /var/log/prelaunch-validation.log 2>&1
```

## Related Documentation

- [Launch Checklist](../LAUNCH-CHECKLIST.md) - Overall launch readiness tracking
- [MVP Plan](../DytallixLeanLaunchMVPFinal.md) - MVP feature requirements
- [Evidence README](../launch-evidence/prelaunch-final/README.md) - Evidence structure details

## Maintenance

The script is designed to be idempotent and can be run multiple times. Each run generates fresh evidence with current timestamps.

To update the script:
1. Modify validation logic as needed
2. Test with mock mode first
3. Run full validation to verify changes
4. Update this documentation

## License

Part of the Dytallix project. See repository LICENSE for details.
