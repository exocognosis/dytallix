#!/usr/bin/env bash
set -euo pipefail

OUTDIR="dytallix-lean-launch/launch-evidence/build-logs"
mkdir -p "$OUTDIR"

FULL_LOG="$OUTDIR/clippy.full.log"
SHORT_LOG="$OUTDIR/clippy.short.log"
FILE_COUNTS="$OUTDIR/clippy.file_counts.log"
SUMMARY_MD="$OUTDIR/CLIPPY_SUMMARY.md"
STAMP="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

echo "==> Running cargo clippy (default format; spans preserved)"
# Do NOT use --message-format=short here
if ! cargo clippy --workspace --all-targets --all-features -- -D warnings >"$FULL_LOG" 2>&1; then
  echo "Clippy finished with diagnostics (expected for summary)."
fi
echo "Full log:   $FULL_LOG"

# Build short log (diagnostics + spans)
grep -E '^(error\[|warning:|help:|note:| *--> )' "$FULL_LOG" >"$SHORT_LOG" || true
echo "Short log:  $SHORT_LOG"

# Count issues per file using span lines
awk '/ --> /{print $2}' "$SHORT_LOG" \
  | sed -E 's/:.*$//' | grep -E '\.rs$' \
  | sort | uniq -c | sort -nr >"$FILE_COUNTS" || true
echo "File counts:$FILE_COUNTS"

# Fallback: if no spans found (rare), approximate by scraping .rs paths anywhere
if [ ! -s "$FILE_COUNTS" ]; then
  echo "No span lines detected; using fallback file extraction."
  grep -Eo '/[^ :"]+\.rs' "$FULL_LOG" \
    | sort | uniq -c | sort -nr >"$FILE_COUNTS" || true
fi

# Build Markdown summary
{
  echo "# Clippy File-Centric Summary"
  echo
  echo "_Generated: $STAMP"
  echo
  echo "## Top files by issue count"
  echo
  if [ -s "$FILE_COUNTS" ]; then
    nl -ba "$FILE_COUNTS" | sed 's/^/    /'
  else
    echo "No files detected. (Clippy may have passed cleanly or output format changed.)"
  fi
  echo
  echo "---"
  echo
  echo "## Per-file previews (up to 8 findings per file)"
  echo
} >"$SUMMARY_MD"

# Append previews only if we have files and spans
if grep -q ' --> ' "$SHORT_LOG" && [ -s "$FILE_COUNTS" ]; then
  while read -r COUNT FILE; do
    [ -z "$FILE" ] && continue
    echo "### $FILE ($COUNT issues)" >>"$SUMMARY_MD"
    awk -v f="$FILE" '
      BEGIN { c=0; last="" }
      /^[a-z]+:/ { last=$0; next }     # diagnostic line
      /^ *--> / {
        if (index($2, f) == 1 && c < 8) {
          if (last != "") print last;
          print $0 "\n";
          c++;
        }
      }
    ' "$SHORT_LOG" >>"$SUMMARY_MD"
  done <"$FILE_COUNTS"
fi

echo "==> Summary written to $SUMMARY_MD"