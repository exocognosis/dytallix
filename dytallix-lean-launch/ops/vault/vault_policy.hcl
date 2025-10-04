# Vault policy for Dytallix validator keys
# Path: dytallix/validator/+/signing-key

path "secret/data/dytallix/validator/*/signing-key" {
  capabilities = ["read"]
}

path "secret/metadata/dytallix/validator/*" {
  capabilities = ["list", "read"]
}

# Allow renewal of own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow lookup of own token
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
