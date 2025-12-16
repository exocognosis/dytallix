# Operations

## Run Locally

```bash
cd QuantumVaultMVP/infra
docker compose up --build
```

UI: https://localhost:8443

## Logs

```bash
cd QuantumVaultMVP/infra
docker compose logs -f backend
```

## Resetting Local State

This removes Postgres/Vault/Caddy state:

```bash
cd QuantumVaultMVP/infra
docker compose down -v
```

## Important MVP Defaults

- Vault runs in **dev mode** with a static root token in compose.
- JWT secret in compose is **not production safe**.
- EVM is a local dev chain.

## Production Notes

For production deployments:
- Use a managed Postgres.
- Use a real Vault cluster (or other HSM-backed KMS) and rotate tokens.
- Use a managed EVM endpoint and a hardware-protected signing key.
- Deploy via Helm (see `infra/helm`).
