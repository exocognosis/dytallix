#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/infra/.env.runtime.local"
COMPOSE_FILE="${PROJECT_ROOT}/infra/docker-compose.yml"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing ${ENV_FILE}. Run ./scripts/secure/hydrate-local-runtime.js first." >&2
  exit 1
fi

exec docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
