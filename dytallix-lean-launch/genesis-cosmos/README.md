Dytallix Cosmos Testnet (DGT + DRT)

Quickstart
- ./scripts/run_all.sh
- ./scripts/start.sh

Outputs
- outputs/genesis.json
- outputs/addresses.json
- outputs/node_info.txt

Config files
- params.json
- allocs.json
- vesting.json
- denoms.json

Notes
- Uses either `dytallixd` if present, or `simd` from Cosmos SDK as fallback.
- Emissions are simulated via enable_emissions.sh. For real per-block minting and fee burns, add a custom module.
