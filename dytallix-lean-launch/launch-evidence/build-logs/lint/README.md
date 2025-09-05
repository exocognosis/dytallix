# Lint / Fix Workflow

This directory contains per-crate lint evidence.

## Scripts
- `scripts/lint_one_crate.sh <PKG> [--max-retries=N]` — Lint a single crate with iterative auto-fix cycles (clippy --fix + fmt + strict verify). Produces:
  - `<stamp>_check.log` — cargo check output
  - `<stamp>_fix.log` — aggregated clippy --fix cycles
  - `<stamp>_fmt.log` — formatting output
  - `<stamp>_final.log` — final strict clippy run (-D warnings)
  - `LATEST.md` — summary (previous version archived as `LATEST_<stamp>.md`)

- `scripts/lint_all_crates.sh [--halt-on-error]` — Discover all workspace crates (via `cargo metadata`, fallback to scanning) and run `lint_one_crate.sh` for each. Produces consolidated `WORKSPACE_SUMMARY.md` table.

## Make Targets
- `make lint-one PKG=<crate>`
- `make lint-all`
- `make lint-report`

## Exit Codes
- Single crate script exits 0 only if final strict clippy passes.
- All crates script overall exit code reflects only its own execution; see per-crate statuses in the summary.

## Notes
- Auto-fix only applies machine-applicable suggestions. Manual review still required for remaining warnings/errors.
- No ANSI colors are emitted in stored artifacts.
- Works without `jq` (fallback parser implemented).
