#!/usr/bin/env bash
set -euo pipefail

NS="${NS:-dytallix}"
RELEASE="${RELEASE:-dytallix}"
PULSE_RELEASE="${PULSE_RELEASE:-pulsescan}"
ISSUERS_FILE="${ISSUERS_FILE:-dytallix-lean-launch/ops/cert-manager/clusterissuers.yaml}"
SECRETS_DIR="${SECRETS_DIR:-dytallix-lean-launch/ops/k8s/secrets}"
CHART_DIR="${CHART_DIR:-dytallix-lean-launch/helm}"
PULSE_CHART_DIR="${PULSE_CHART_DIR:-dytallix-lean-launch/helm/pulsescan}"
ARTS_ROOT="${ARTS_ROOT:-$(pwd)/dytallix-lean-launch/ops/artifacts/$(date -u +%Y%m%dT%H%M%SZ)}"
ARTS_DIR="$ARTS_ROOT/runbook"
mkdir -p "$ARTS_DIR"

log() { echo "[runbook] $*" | tee -a "$ARTS_DIR/runbook.log"; }
save() { local f="$1"; shift; echo -e "$*" > "$ARTS_DIR/$f"; }

need() { command -v "$1" >/dev/null 2>&1 || { log "Missing '$1' in PATH"; exit 1; }; }
need kubectl; need helm; need curl; need yq

log "Namespace: $NS"
kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"

log "Apply ClusterIssuers (idempotent)"
kubectl apply -f "$ISSUERS_FILE" | tee "$ARTS_DIR/clusterissuers.apply.txt"

log "Apply K8s Secrets (idempotent)"
kubectl apply -n "$NS" -f "$SECRETS_DIR" | tee "$ARTS_DIR/secrets.apply.txt"

log "Install/upgrade umbrella chart: $RELEASE"
helm upgrade --install "$RELEASE" "$CHART_DIR" -n "$NS" --atomic | tee "$ARTS_DIR/helm_umbrella.txt"

log "Install/upgrade pulsescan chart: $PULSE_RELEASE"
helm upgrade --install "$PULSE_RELEASE" "$PULSE_CHART_DIR" -n "$NS" --atomic | tee "$ARTS_DIR/helm_pulsescan.txt"

log "Wait for workloads to be Ready"
set +e
kubectl -n "$NS" rollout status statefulset/dytallix-rpc --timeout=5m | tee -a "$ARTS_DIR/rollout.txt"
kubectl -n "$NS" rollout status deploy/dytallix-explorer --timeout=5m | tee -a "$ARTS_DIR/rollout.txt"
kubectl -n "$NS" rollout status deploy/$(kubectl -n "$NS" get deploy -o name | grep pulsescan.*-api | sed 's#.*/##') --timeout=5m | tee -a "$ARTS_DIR/rollout.txt"
kubectl -n "$NS" rollout status deploy/$(kubectl -n "$NS" get deploy -o name | grep pulsescan.*-inference | sed 's#.*/##') --timeout=5m | tee -a "$ARTS_DIR/rollout.txt"
set -e

log "Capture cluster state"
kubectl -n "$NS" get all,ingress,cm,secret -o wide > "$ARTS_DIR/kubectl-get.txt"
kubectl get clusterissuers -o wide > "$ARTS_DIR/issuers.txt"
helm -n "$NS" ls > "$ARTS_DIR/helm-ls.txt"

log "Wait for TLS secrets (up to 5m)"
RPC_TLS=$(yq -r '.rpc.ingress.tlsSecret' "$CHART_DIR/values.yaml" 2>/dev/null || echo rpc-dytallix-dev-tls)
EXP_TLS=$(yq -r '.explorer.ingress.tlsSecret' "$CHART_DIR/values.yaml" 2>/dev/null || echo explorer-dytallix-dev-tls)
AI_TLS=$(yq -r '.ai.ingress.tlsSecret' "$CHART_DIR/values.yaml" 2>/dev/null || echo ai-dytallix-dev-tls)
for s in "$RPC_TLS" "$EXP_TLS" "$AI_TLS"; do
  for i in {1..150}; do
    kubectl -n "$NS" get secret "$s" >/dev/null 2>&1 && break
    sleep 2
  done
done

log "Run smoke tests"
NS="$NS" bash dytallix-lean-launch/ops/smoke.sh || { log "Smoke failed"; exit 1; }

log "Artifacts saved to: $ARTS_ROOT"
