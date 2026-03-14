#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QV_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUNTIME_DIR="${QV_ROOT}/.secure/local-services"
COMPOSE_ENV="${RUNTIME_DIR}/infra.dytallix.env"
BASE_ENV="${QV_ROOT}/infra/.env.runtime.local"
COMPOSE_FILE="${QV_ROOT}/infra/docker-compose.yml"
API_CONTAINER_NAME="quantumvault-dytallix-api-local"

find_listening_pid() {
  local port="$1"
  lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null | head -n 1 || true
}

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "${pid_file}" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "${pid_file}")"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
    echo "Stopping ${label} (PID ${pid})"
    kill "${pid}" 2>/dev/null || true
    for _ in {1..10}; do
      if ! kill -0 "${pid}" 2>/dev/null; then
        break
      fi
      sleep 1
    done
    if kill -0 "${pid}" 2>/dev/null; then
      kill -9 "${pid}" 2>/dev/null || true
    fi
  fi

  rm -f "${pid_file}"
}

stop_port_owner() {
  local port="$1"
  local label="$2"
  local pid
  pid="$(find_listening_pid "${port}")"
  if [[ -z "${pid}" ]]; then
    return 0
  fi

  echo "Stopping ${label} on port ${port} (PID ${pid})"
  kill "${pid}" 2>/dev/null || true
  for _ in {1..10}; do
    if ! kill -0 "${pid}" 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  kill -9 "${pid}" 2>/dev/null || true
}

ENV_FILE="${BASE_ENV}"
if [[ -f "${COMPOSE_ENV}" ]]; then
  ENV_FILE="${COMPOSE_ENV}"
fi

if [[ -f "${COMPOSE_FILE}" && -f "${ENV_FILE}" ]]; then
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" down >/dev/null 2>&1 || true
fi

docker rm -f "${API_CONTAINER_NAME}" >/dev/null 2>&1 || true
stop_pid_file "${RUNTIME_DIR}/pids/dytallix-node.pid" "Dytallix node"
stop_port_owner "3030" "Dytallix node"
