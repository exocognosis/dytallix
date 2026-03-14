# Secure Runtime Snapshots

This directory is for local-only production/runtime config snapshots.

Rules:
- Do not commit raw secrets anywhere outside this directory.
- Keep files here at `0600` and directories at `0700`.
- Refresh Hetzner production values with:

```bash
./scripts/secure/pull-hetzner-runtime.sh
```

- Hydrate local runtime files from the secure snapshot with:

```bash
./scripts/secure/hydrate-local-runtime.js
```

- Start compose against the hydrated secure env with:

```bash
./scripts/secure/compose-with-runtime-env.sh --profile evm up -d
```

Layout:
- `hetzner-production/env/`: raw env files pulled from the server
- `hetzner-production/server/`: PM2 and nginx config snapshots
- `hetzner-production/inventory/`: checksums and env key inventory without secret values
- `local-runtime-backups/`: backups of overwritten local runtime env files
