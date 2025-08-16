#!/usr/bin/env bash
set -euo pipefail

DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

"$DIR/build.sh"
"$DIR/init_chain.sh"
"$DIR/configure.sh"
"$DIR/seed_state.sh"

echo "All steps complete. Start the node with: $DIR/start.sh"
