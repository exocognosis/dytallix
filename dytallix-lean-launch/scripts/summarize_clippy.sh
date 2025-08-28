#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/launch-evidence/build-logs"
OUT_SHORT="${LOG_DIR}/clippy.short.log"
OUT_SUMMARY="${LOG_DIR}/CLIPPY_SUMMARY.md"

mkdir -p "${LOG_DIR}"

echo "==> Running cargo clippy (short format)…"
# --message-format=short prints: path:line:col: level: message
# We capture stderr+stdout and keep going even if it fails.
if ! (cd "${ROOT}" && cargo clippy --workspace --all-targets --message-format=short 2>&1 | tee "${OUT_SHORT}"); then
  echo "==> Clippy returned non-zero (expected when there are lints). Producing summary…"
fi

# If file is empty, bail out cleanly
if [[ ! -s "${OUT_SHORT}" ]]; then
  echo "No clippy output produced. Is the workspace set up correctly?" | tee "${OUT_SUMMARY}"
  exit 0
fi

# Build a file-centric summary:
# Lines look like:
# /path/to/file.rs:123:45: warning: message…
# /path/to/file.rs:12:5: error: message…
awk -F: '
  function trim(s) { sub(/^[ \t\r\n]+/, "", s); sub(/[ \t\r\n]+$/, "", s); return s }
  /:([0-9]+):([0-9]+): (warning|error): / {
    file=$1; line=$2; col=$3; level=$4; msg=$0;
    # Reconstruct message (strip leading file:line:col:)
    sub(/^[^:]*:[0-9]+:[0-9]+: /, "", msg);
    # Track counts
    counts[file]++;
    if (index(msg, "error:") == 1) ec[file]++; else if (index(msg, "warning:") == 1) wc[file]++;
    # Keep up to first 6 messages per file for preview
    if (seen[file] < 6) {
      previews[file]=previews[file] sprintf("- L%s:C%s %s\n", line, col, msg);
      seen[file]++;
    }
    files[file]=1
  }
  END {
    print "# Clippy File-Centric Summary\n" > "'"${OUT_SUMMARY}"'"
    print "_Generated from clippy.short.log. Fix highest-error files first._\n" >> "'"${OUT_SUMMARY}"'"
    # Sort files by (errors desc, total desc, warnings desc) using a temp file
    for (f in files) {
      e=(ec[f] ? ec[f] : 0); w=(wc[f] ? wc[f] : 0); t=(counts[f] ? counts[f] : 0);
      printf("%08d %08d %08d %s\n", 99999999-e, 99999999-t, 99999999-w, f) >> "__clippy_sort.tmp"
    }
    # Read sorted and render
    cmd = "sort __clippy_sort.tmp"
    while ( (cmd | getline line) > 0 ) {
      split(line, a, " ")
      file=a[4]
      e=(ec[file] ? ec[file] : 0); w=(wc[file] ? wc[file] : 0); t=(counts[file] ? counts[file] : 0)
      print "## " file >> "'"${OUT_SUMMARY}"'"
      printf("- Total: %d  |  Errors: %d  |  Warnings: %d\n\n", t, e, w) >> "'"${OUT_SUMMARY}"'"
      if (previews[file] != "") {
        print "Preview:" >> "'"${OUT_SUMMARY}"'"
        print previews[file] >> "'"${OUT_SUMMARY}"'"
      }
    }
    close(cmd)
    system("rm -f __clippy_sort.tmp")
    print "\n---\n**Tip:** For full context, open `launch-evidence/build-logs/clippy.short.log`.\n" >> "'"${OUT_SUMMARY}"'"
  }
' "${OUT_SHORT}"

echo "✅ Wrote ${OUT_SUMMARY}"