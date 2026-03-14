#!/usr/bin/env bash
set -euo pipefail

umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REMOTE_HOST="${QV_HETZNER_HOST:-root@178.156.187.81}"
TARGET_ROOT="${QV_SECURE_SNAPSHOT_DIR:-${PROJECT_ROOT}/.secure/hetzner-production}"
SSH_OPTS=(
  -n
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o StrictHostKeyChecking=accept-new
)

mkdir -p "${TARGET_ROOT}/env" "${TARGET_ROOT}/server" "${TARGET_ROOT}/inventory"
chmod 700 "${PROJECT_ROOT}/.secure" "${TARGET_ROOT}" "${TARGET_ROOT}/env" "${TARGET_ROOT}/server" "${TARGET_ROOT}/inventory"

declare -a FILE_MAP=(
  "/opt/quantumvault/.env|env/root.vault.env"
  "/opt/quantumvault/.env.production|env/root.env.production"
  "/opt/quantumvault/backend/.env|env/backend.env"
  "/opt/quantumvault/infra/.env|env/infra.env"
  "/opt/quantumvault/frontend/.env.production|env/frontend.env.production"
  "/opt/quantumvault/main-frontend/.env.production|env/main-frontend.env.production"
  "/opt/quantumvault/ecosystem.config.js|server/ecosystem.config.js"
  "/etc/nginx/sites-enabled/dytallix|server/nginx.dytallix.conf"
  "/etc/nginx/snippets/quantumvault.conf|server/nginx.quantumvault.conf"
)

for mapping in "${FILE_MAP[@]}"; do
  remote_path="${mapping%%|*}"
  relative_target="${mapping#*|}"
  target_path="${TARGET_ROOT}/${relative_target}"
  tmp_path="${target_path}.tmp"

  mkdir -p "$(dirname "${target_path}")"
  ssh "${SSH_OPTS[@]}" "${REMOTE_HOST}" "cat '${remote_path}'" > "${tmp_path}"
  mv "${tmp_path}" "${target_path}"
  chmod 600 "${target_path}"
done

{
  printf '# Pulled from %s at %s\n' "${REMOTE_HOST}" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  for file in "${TARGET_ROOT}/env"/* "${TARGET_ROOT}/server"/*; do
    [ -f "${file}" ] || continue
    checksum="$(shasum -a 256 "${file}" | awk '{print $1}')"
    printf '%s  %s\n' "${checksum}" "${file#${TARGET_ROOT}/}"
  done
} > "${TARGET_ROOT}/inventory/sha256.txt"
chmod 600 "${TARGET_ROOT}/inventory/sha256.txt"

{
  for file in "${TARGET_ROOT}/env"/*; do
    [ -f "${file}" ] || continue
    printf -- '--- %s\n' "${file#${TARGET_ROOT}/}"
    awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{print $1}' "${file}" | sort -u
    printf '\n'
  done
} > "${TARGET_ROOT}/inventory/env-keys.txt"
chmod 600 "${TARGET_ROOT}/inventory/env-keys.txt"

{
  for file in "${TARGET_ROOT}/env"/*; do
    [ -f "${file}" ] || continue
    printf -- '--- %s\n' "${file#${TARGET_ROOT}/}"
    awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/{ if ($1 ~ /(URL|ADDR|HOST|PORT|BASE_PATH|CHAIN_ID|CONTRACT_ADDRESS|AUDIENCE|ISSUER|BUCKET|REGION|BACKEND)$/) print $0 }' "${file}"
    printf '\n'
  done
} > "${TARGET_ROOT}/inventory/runtime-values.txt"
chmod 600 "${TARGET_ROOT}/inventory/runtime-values.txt"

printf 'Secure snapshot updated at %s\n' "${TARGET_ROOT}"
