#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHART_DIR="$ROOT_DIR/deploy/helm/pulseguard"
RELEASE_DIR="$ROOT_DIR/release"

ACTION="${1:-}"

if [[ "$ACTION" == "--template" ]]; then
  helm template pulseguard "$CHART_DIR" --set image.repository=${IMAGE_REPO:-ghcr.io/<org>/dytallix-pulseguard} --set image.tag=${VERSION:-v0.1.0}
  exit 0
fi

if [[ "$ACTION" == "--dry-run" ]]; then
  helm upgrade --install pulseguard "$CHART_DIR" --dry-run --debug \
    --set image.repository=${IMAGE_REPO:-ghcr.io/<org>/dytallix-pulseguard} \
    --set image.tag=${VERSION:-v0.1.0}
  exit 0
fi

if [[ "$ACTION" == "--package" ]]; then
  mkdir -p "$RELEASE_DIR"
  VERS="${VERSION:-v0.1.0}"
  VERS_STRIPPED="${VERS#v}"
  helm package "$CHART_DIR" -d "$RELEASE_DIR" --version "$VERS_STRIPPED"
  exit 0
fi

echo "Usage: $0 [--template | --dry-run | --package]"
exit 1

