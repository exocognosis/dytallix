This sample documents the environment variables required to use HashiCorp Vault for validator keys. Do not commit real tokens or secrets.

Environment variables (example):
- DYTALLIX_VAULT_URL=https://vault.example.com:8200
- DYTALLIX_VAULT_TOKEN=******** (redacted)
- DYTALLIX_VAULT_KV_MOUNT=secret
- DYTALLIX_VAULT_PATH_BASE=dytallix/validators
- VALIDATOR_ID=val1

Storage layout (KV v2):
- Secret path: <mount>/data/<base>/<validator_id>
- Payload: { "data": { "private_key": base64(private key bytes) } }

CLI reference (kv v2):
vault kv put secret/dytallix/validators/val1 private_key=$(base64 -w0 key.bin)
vault kv get -format=json secret/dytallix/validators/val1 | jq -r .data.data.private_key | base64 -d > key.bin

Note: The application reads/writes only base64-encoded key material; it never writes plaintext to disk in production mode.

