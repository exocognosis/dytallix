Dytallix Docs Migration
=======================

This /docs package now contains the isolated Docusaurus site so that the app root can remain an ESM ("type": "module") project without breaking Docusaurus SSR expectations.

Structure:
- package.json (CommonJS by default; no "type": "module")
- docusaurus.config.js / sidebars.js (CommonJS)
- docs/ (documentation markdown)
- static/ (static assets)
- src/css/custom.css (theme overrides)

Migration Steps Performed:
1. Created standalone docs workspace under /docs.
2. Replicated config & sidebars from original root setup (converted to CJS).
3. To complete migration, move existing markdown from dytallix-lean-launch/docs/* into this package's docs/ dir and copy static assets.
4. Update root package.json scripts to call into this package, e.g.:
   "docs:dev": "npm --prefix ../docs run start"
   "docs:build": "npm --prefix ../docs run build"
   "docs:serve": "npm --prefix ../docs run serve"
5. (Optional) Remove Docusaurus deps from root package.json after verifying build here.

Build Commands (run from repo root):
  npm install --prefix docs
  npm run docs:dev   # (after updating root scripts) or cd docs && npm start

CI: Use docs/package.json scripts (build, ci) in pipeline.

Syncing OpenAPI Spec
--------------------
The docs reference `../../openapi/openapi.yaml`. For production builds we expose the spec at `/openapi/openapi.yaml` by placing (or generating) a copy under `static/openapi/openapi.yaml`.

Options:
1. Manual copy (current): update `docs/static/openapi/openapi.yaml` whenever the source spec changes.
2. Add a sync script in repo root, e.g.:
   ```bash
   cp dytallix-lean-launch/openapi/openapi.yaml docs/static/openapi/openapi.yaml
   ```
   Then call this in `docs:build` pre-step.
3. Use a symlink (may break on some hosting providers) from `docs/static/openapi/openapi.yaml` to the source file.

Future Improvement: add a CI step before `npm --prefix docs run build` to ensure the snapshot is current, and optionally embed a short hash or date into the copied file header.

