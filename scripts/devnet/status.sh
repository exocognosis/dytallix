#!/usr/bin/env bash
set -euo pipefail

# Prints height, peers, last_block_time; exits non-zero if any node stalled >60s.

now_ts() { date +%s; }
get_json() { curl -sf "$1" || echo '{}'; }

check_node() {
  local name="$1"; local base="$2"; local stall_secs=60
  local stats_json block_json
  stats_json=$(get_json "$base/stats")
  block_json=$(get_json "$base/block/latest")

  local height ts peers
  height=$(echo "$stats_json" | jq -r '.height // .data.height // 0' 2>/dev/null || echo 0)
  ts=$(echo "$block_json" | jq -r '.header.timestamp // .data.header.timestamp // 0' 2>/dev/null || echo 0)
  peers=$(get_json "$base/peers" | jq -c '.')
  [ "$peers" = "" ] && peers="[]"

  local now; now=$(now_ts)
  local age=$((now - ${ts:-0}))
  printf "%s: height=%s last_block_ts=%s age=%ss peers=%s\n" "$name" "$height" "$ts" "$age" "$peers"

  if [ "$age" -gt "$stall_secs" ]; then
    echo "STALL: $name last block older than ${stall_secs}s" >&2
    return 1
  fi
  return 0
}

overall=0
check_node node1 http://localhost:3030 || overall=1
check_node node2 http://localhost:3031 || overall=1
check_node node3 http://localhost:3032 || overall=1

exit $overall

