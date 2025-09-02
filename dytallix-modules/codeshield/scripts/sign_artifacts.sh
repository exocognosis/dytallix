#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-v0.1.0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/<org>/dytallix-codeshield}"
IMAGE_TAG="$VERSION"
IMAGE="$IMAGE_REPO:$IMAGE_TAG"

if ! command -v cosign >/dev/null 2>&1; then
  echo "cosign not found, skipping signing"
  exit 0
fi

echo "[cosign] Signing image $IMAGE"
cosign sign --yes "$IMAGE" || echo "[warn] image signing failed"

CHART_TGZ=$(ls -1 "$RELEASE_DIR"/*.tgz 2>/dev/null | head -n1 || true)
if [[ -n "${CHART_TGZ}" ]]; then
  echo "[cosign] Attaching signature to chart $CHART_TGZ"
  cosign attach signature --yes --artifact "$CHART_TGZ" || echo "[warn] chart signature failed"
fi

SBOM_JSON="$RELEASE_DIR/SBOM.cyclonedx.json"
if [[ -f "$SBOM_JSON" ]]; then
  echo "[cosign] Attaching SBOM attestation"
  cosign attest --yes --predicate "$SBOM_JSON" --type cyclonedx "$IMAGE" || echo "[warn] sbom attestation failed"
fi

echo "[done] Signing/attestation complete"

