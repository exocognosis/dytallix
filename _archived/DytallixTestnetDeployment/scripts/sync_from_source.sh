#!/usr/bin/env bash
# Sync deployment-ready assets from dytallix-lean-launch into this package
# Marks all copied items as 🟢➜ in DEPLOYMENT_INVENTORY.md contextually
set -euo pipefail
SRC=${SRC:-"$(cd "$(dirname "$0")/.." && pwd)/../dytallix-lean-launch"}
DST_ROOT=$(cd "$(dirname "$0")/.." && pwd)

require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
require rsync

mkdir -p "$DST_ROOT/node" "$DST_ROOT/node/config" "$DST_ROOT/scripts" \
         "$DST_ROOT/contracts" "$DST_ROOT/artifacts" "$DST_ROOT/server" \
         "$DST_ROOT/faucet" "$DST_ROOT/frontend" "$DST_ROOT/explorer" \
         "$DST_ROOT/helm" "$DST_ROOT/cli/dytx"

# Small files (copy if different)
copy_if() { local s="$1" d="$2"; if [[ -f "$s" ]]; then install -m 0644 "$s" "$d"; fi }

# 1) Node images & compose
copy_if "$SRC/Dockerfile" "$DST_ROOT/node/Dockerfile"
copy_if "$SRC/Dockerfile.node" "$DST_ROOT/node/Dockerfile.node"
copy_if "$SRC/docker-compose.yml" "$DST_ROOT/node/docker-compose.yml"
copy_if "$SRC/genesis.json" "$DST_ROOT/node/genesis.json"
rsync -a --delete --exclude ".git" "$SRC/config/" "$DST_ROOT/node/config/" || true

# 2) Scripts
for f in emissions_cron.sh governance-demo.sh gov_param_change.sh proposal.sh \
         build_pqc_wasm.sh pqc_build_wasm.sh build_counter_wasm.sh deploy_contract.sh \
         pqc_runtime_check.sh gen-pqc-mnemonic.cjs gen-mnemonic.cjs test_ai_oracle.sh ; do
  [[ -e "$SRC/scripts/$f" ]] && install -m 0755 "$SRC/scripts/$f" "$DST_ROOT/scripts/$f" || true
done

# 3) Contracts & artifacts
rsync -a --delete --exclude ".git" "$SRC/contracts/" "$DST_ROOT/contracts/" || true
rsync -a --exclude ".git" "$SRC/artifacts/" "$DST_ROOT/artifacts/" || true

# 4) CLI (dytx)
rsync -a --delete --exclude "node_modules" --exclude "dist" --exclude ".git" \
  "$SRC/cli/dytx/" "$DST_ROOT/cli/dytx/" || true

# 5) Server, Frontend, Explorer
rsync -a --delete --exclude "node_modules" --exclude "dist" --exclude ".git" \
  "$SRC/server/" "$DST_ROOT/server/" || true
rsync -a --delete --exclude "node_modules" --exclude "dist" --exclude ".git" \
  "$SRC/frontend/" "$DST_ROOT/frontend/" || true
rsync -a --delete --exclude "node_modules" --exclude "dist" --exclude ".git" \
  "$SRC/explorer/" "$DST_ROOT/explorer/" || true

# 6) Helm
rsync -a --delete --exclude ".git" "$SRC/helm/" "$DST_ROOT/helm/" || true

# 7) Faucet compose
copy_if "$SRC/docker-compose.faucet.yml" "$DST_ROOT/faucet/docker-compose.faucet.yml"

# 8) Docs
for f in LAUNCH-RUNBOOK.sh LAUNCH-CHECKLIST.md JOIN-TESTNET.md README.md; do
  copy_if "$SRC/$f" "$DST_ROOT/docs/$f"
done

chmod -R u+rwX,go+rX "$DST_ROOT"
echo "Sync complete from $SRC to $DST_ROOT"
