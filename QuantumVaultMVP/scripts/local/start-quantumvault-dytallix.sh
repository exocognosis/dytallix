#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QV_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DYT_ROOT="$(cd "${QV_ROOT}/../dytallix-fast-launch" && pwd)"
RUNTIME_DIR="${QV_ROOT}/.secure/local-services"
PID_DIR="${RUNTIME_DIR}/pids"
LOG_DIR="${RUNTIME_DIR}/logs"
DATA_DIR="${RUNTIME_DIR}/dytallix-node-data"
COMPOSE_ENV="${RUNTIME_DIR}/infra.dytallix.env"
BASE_ENV="${QV_ROOT}/infra/.env.runtime.local"
COMPOSE_FILE="${QV_ROOT}/infra/docker-compose.yml"

NODE_PORT="${DYT_RPC_PORT:-3030}"
API_PORT="${DYTALLIX_API_PORT:-3031}"
CHAIN_ID="${DYT_CHAIN_ID:-dyt-local-1}"
NODE_URL="http://127.0.0.1:${NODE_PORT}"
API_URL="http://127.0.0.1:${API_PORT}"
CONTAINER_API_URL="http://host.docker.internal:${API_PORT}"
CONTAINER_NODE_STATUS_URL="http://host.docker.internal:${NODE_PORT}/status"
API_CONTAINER_NAME="quantumvault-dytallix-api-local"
API_CONTAINER_IMAGE="${DYTALLIX_API_CONTAINER_IMAGE:-node:20-bookworm}"
API_NODE_MODULES_VOLUME="quantumvault_dytallix_api_node_modules"

NODE_PID_FILE="${PID_DIR}/dytallix-node.pid"
NODE_LOG_FILE="${LOG_DIR}/dytallix-node.log"
NODE_BINARY="${DYT_ROOT}/target/release/dytallix-fast-node"

require_file() {
  local path="$1"
  if [[ ! -f "${path}" ]]; then
    echo "Missing required file: ${path}" >&2
    exit 1
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
}

ensure_dir() {
  mkdir -p "$1"
  chmod 700 "$1"
}

is_pid_running() {
  local pid_file="$1"
  if [[ ! -f "${pid_file}" ]]; then
    return 1
  fi
  local pid
  pid="$(cat "${pid_file}")"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

find_listening_pid() {
  local port="$1"
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

ensure_port_available() {
  local port="$1"
  local owner_label="$2"
  if lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port ${port} is already in use; cannot start ${owner_label}." >&2
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >&2 || true
    exit 1
  fi
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-90}"
  local delay="${4:-2}"

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done

  echo "${label} did not become ready at ${url}" >&2
  return 1
}

write_compose_env() {
  require_file "${BASE_ENV}"
  ensure_dir "${RUNTIME_DIR}"

  local tmp_env="${COMPOSE_ENV}.tmp"
  local vault_dev_root_token
  vault_dev_root_token="$(grep '^VAULT_DEV_ROOT_TOKEN_ID=' "${BASE_ENV}" | head -n 1 | cut -d '=' -f 2-)"

  grep -Ev '^(ANCHORING_BACKEND|DYTALLIX_API_URL|DYTALLIX_API_TOKEN|BLOCKCHAIN_STATUS_URL|VAULT_ADDR|VAULT_TOKEN|NODE_ENV)=' "${BASE_ENV}" > "${tmp_env}" || true
  {
    echo "ANCHORING_BACKEND=dytallix"
    echo "DYTALLIX_API_URL=${CONTAINER_API_URL}"
    echo "DYTALLIX_API_TOKEN="
    echo "BLOCKCHAIN_STATUS_URL=${CONTAINER_NODE_STATUS_URL}"
    echo "VAULT_ADDR=http://vault:8200"
    if [[ -n "${vault_dev_root_token}" ]]; then
      echo "VAULT_TOKEN=${vault_dev_root_token}"
    fi
    echo "NODE_ENV=development"
  } >> "${tmp_env}"

  mv "${tmp_env}" "${COMPOSE_ENV}"
  chmod 600 "${COMPOSE_ENV}"
}

start_dytallix_node() {
  if is_pid_running "${NODE_PID_FILE}"; then
    echo "Dytallix node already running with PID $(cat "${NODE_PID_FILE}")"
    return 0
  fi

  rm -f "${NODE_PID_FILE}"
  local existing_pid
  existing_pid="$(find_listening_pid "${NODE_PORT}")"
  if [[ -n "${existing_pid}" ]]; then
    echo "Adopting existing Dytallix node on port ${NODE_PORT} (PID ${existing_pid})"
    echo "${existing_pid}" > "${NODE_PID_FILE}"
    chmod 600 "${NODE_PID_FILE}"
    wait_for_http "${NODE_URL}/health" "Dytallix node"
    return 0
  fi

  if [[ "${REBUILD_DYTALLIX_NODE:-0}" == "1" || ! -x "${NODE_BINARY}" ]]; then
    echo "Building Dytallix node..."
    (
      cd "${DYT_ROOT}/node"
      cargo build --release --bin dytallix-fast-node
    )
  else
    echo "Using existing Dytallix node binary at ${NODE_BINARY}"
  fi

  echo "Starting Dytallix node on ${NODE_URL}"
  nohup bash -lc "
    cd '${DYT_ROOT}/node'
    exec env \
      DYT_RPC_PORT='${NODE_PORT}' \
      DYT_CHAIN_ID='${CHAIN_ID}' \
      DYT_DATA_DIR='${DATA_DIR}' \
      FRONTEND_ORIGIN='http://localhost:3001' \
      '${NODE_BINARY}'
  " >> "${NODE_LOG_FILE}" 2>&1 &
  echo $! > "${NODE_PID_FILE}"
  chmod 600 "${NODE_PID_FILE}"

  wait_for_http "${NODE_URL}/health" "Dytallix node"

  local started_pid
  started_pid="$(cat "${NODE_PID_FILE}")"
  if [[ -z "${started_pid}" ]] || ! kill -0 "${started_pid}" 2>/dev/null; then
    echo "Dytallix node exited before the launcher completed." >&2
    exit 1
  fi
}

start_dytallix_api() {
  if docker ps --format '{{.Names}}' | grep -qx "${API_CONTAINER_NAME}"; then
    echo "Dytallix QuantumVault API container already running"
    return 0
  fi

  docker rm -f "${API_CONTAINER_NAME}" >/dev/null 2>&1 || true
  ensure_port_available "${API_PORT}" "Dytallix QuantumVault API"

  echo "Starting Dytallix QuantumVault API on ${API_URL}"
  docker run -d \
    --name "${API_CONTAINER_NAME}" \
    --add-host host.docker.internal:host-gateway \
    -p "${API_PORT}:${API_PORT}" \
    -e PORT="${API_PORT}" \
    -e QUANTUMVAULT_API_PORT="${API_PORT}" \
    -e BLOCKCHAIN_API_URL="http://host.docker.internal:${NODE_PORT}" \
    -e DYTALLIX_RPC_URL="http://host.docker.internal:${NODE_PORT}" \
    -v "${DYT_ROOT}/services/quantumvault-api:/app" \
    -v "${API_NODE_MODULES_VOLUME}:/app/node_modules" \
    -w /app \
    "${API_CONTAINER_IMAGE}" \
    sh -lc 'if [ ! -f node_modules/.qv-installed ]; then npm install --no-fund --no-audit && touch node_modules/.qv-installed; fi; npm start' \
    >/dev/null

  wait_for_http "${API_URL}/health" "Dytallix QuantumVault API"
}

start_quantumvault() {
  write_compose_env

  local compose_build_flag="--no-build"
  if [[ "${REBUILD_QUANTUMVAULT_IMAGES:-0}" == "1" ]]; then
    compose_build_flag="--build"
  elif ! docker image inspect infra-backend:latest >/dev/null 2>&1; then
    compose_build_flag="--build"
  elif ! docker image inspect infra-frontend:latest >/dev/null 2>&1; then
    compose_build_flag="--build"
  fi

  echo "Starting QuantumVaultMVP against local Dytallix backend"
  docker compose --env-file "${COMPOSE_ENV}" -f "${COMPOSE_FILE}" up -d "${compose_build_flag}"

  wait_for_http "http://127.0.0.1:13000/api/v1/blockchain/status" "QuantumVault backend"
  wait_for_http "http://127.0.0.1:3001/QuantumVaultMVP/login" "QuantumVault frontend"
}

main() {
  require_cmd cargo
  require_cmd npm
  require_cmd docker
  require_cmd curl
  require_file "${COMPOSE_FILE}"

  ensure_dir "${RUNTIME_DIR}"
  ensure_dir "${PID_DIR}"
  ensure_dir "${LOG_DIR}"
  mkdir -p "${DATA_DIR}"

  start_dytallix_node
  start_dytallix_api
  start_quantumvault

  cat <<EOF
QuantumVaultMVP local Dytallix stack is running.

Host services:
- Dytallix node: ${NODE_URL}
- Dytallix QuantumVault API: ${API_URL}

QuantumVault:
- Frontend: http://127.0.0.1:3001/QuantumVaultMVP/login
- Backend:  http://127.0.0.1:13000/api/v1

Logs:
- ${NODE_LOG_FILE}
- docker logs ${API_CONTAINER_NAME}
EOF
}

main "$@"
