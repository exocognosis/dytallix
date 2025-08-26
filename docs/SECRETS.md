# Secrets & Vault Integration

## Overview
Validator private keys and the faucet private key are **never** stored in this repository. They are provisioned at runtime via HashiCorp Vault Agent Sidecar injection.

## Vault Structure (KV v2)
```
kv/
  dytallix/
    validators/
      0    -> { private_key="validator0privkey..." }
      1    -> { private_key="validator1privkey..." }
      2    -> { private_key="validator2privkey..." }
    faucet -> { private_key="faucetprivkey..." }
```

## Policies
Example Vault policy (validators + faucet read-only):
```hcl
path "kv/data/dytallix/validators/*" {
  capabilities = ["read"]
}
path "kv/data/dytallix/faucet" {
  capabilities = ["read"]
}
```

Bind to role `dytallix-app` used in Helm annotations:
```
vault write auth/kubernetes/role/dytallix-app \
  bound_service_account_names='dytallix' \
  bound_service_account_namespaces='default' \
  policies='dytallix-policy' \
  ttl='24h'
```

## Injector Annotations
Applied in the chart:
```
vault.hashicorp.com/agent-inject: "true"
vault.hashicorp.com/agent-inject-secret-validator_key: "kv/dytallix/validators/$(POD_ORDINAL)"
```

Templates ensure only the private key string is written into `/vault/secrets/validator_key`.

## Validating No Plaintext Secrets
Run:
```
bash scripts/preflight_secrets.sh
```
CI enforces this step.

## Rotating a Validator Key
1. Stop the specific validator replica (scale statefulset by -1 or delete pod).
2. Rotate value in Vault: `vault kv put kv/dytallix/validators/1 private_key=newkey`
3. Delete pod `...-validators-1`; Vault sidecar re-injects updated secret.

## Local Development (Kind/Minikube)
Deploy Vault via Helm:
```
helm repo add hashicorp https://helm.releases.hashicorp.com
helm upgrade --install vault hashicorp/vault --set "server.dev.enabled=true"
```

Then write test secrets:
```
vault kv put kv/dytallix/validators/0 private_key=devkey0
vault kv put kv/dytallix/validators/1 private_key=devkey1
vault kv put kv/dytallix/validators/2 private_key=devkey2
vault kv put kv/dytallix/faucet private_key=devfaucet
```

## Security Notes
- No secrets in container images (validated via Trivy FS scan).
- Keys loaded at runtime; rotation is immediate upon pod restart.
- Avoid logging secret file contents. Application code should read key file path and keep in-memory only.