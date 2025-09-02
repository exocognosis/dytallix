#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-v0.1.0}"
EXTRA_FLAG="${2:-}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
CHART_DIR="$ROOT_DIR/deploy/helm/pulseguard"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/<org>/dytallix-pulseguard}"
IMAGE_TAG="$VERSION"
IMAGE="$IMAGE_REPO:$IMAGE_TAG"

mkdir -p "$RELEASE_DIR"

if [[ "$EXTRA_FLAG" == "--sbom-only" ]]; then
  :
elif [[ "$EXTRA_FLAG" == "--checksums-only" ]]; then
  :
else
  echo "[build] Building Docker image: $IMAGE"
  docker build -t "$IMAGE" "$ROOT_DIR"

  echo "[helm] Packaging chart"
  if command -v helm >/dev/null 2>&1; then
    helm lint "$CHART_DIR" || true
    helm package "$CHART_DIR" -d "$RELEASE_DIR" --version "${VERSION#v}"
  else
    echo "helm not found, creating tarball fallback"
    tar -C "$ROOT_DIR/deploy/helm" -czf "$RELEASE_DIR/pulseguard-${VERSION#v}.tgz" pulseguard
  fi
fi

SBOM_PATH="$RELEASE_DIR/SBOM.cyclonedx.json"
echo "[sbom] Generating SBOM at $SBOM_PATH"
if command -v syft >/dev/null 2>&1; then
  syft packages dir:$ROOT_DIR -o cyclonedx-json > "$SBOM_PATH" || echo '{"bomFormat":"CycloneDX","specVersion":"1.4","version":1}' > "$SBOM_PATH"
else
  echo '{"bomFormat":"CycloneDX","specVersion":"1.4","version":1}' > "$SBOM_PATH"
fi

echo "[checksums] Updating SHA256SUMS"
pushd "$RELEASE_DIR" >/dev/null
  rm -f SHA256SUMS
  shasum -a 256 *.tgz SBOM.cyclonedx.json 2>/dev/null | tee SHA256SUMS || true
  if docker image inspect "$IMAGE" >/dev/null 2>&1; then
    IMG_ID=$(docker image inspect "$IMAGE" --format '{{.Id}}')
    echo "$IMG_ID  ${IMAGE}" >> SHA256SUMS
  fi
popd >/dev/null

echo "[done] Image: $IMAGE; chart + SBOM under $RELEASE_DIR"

