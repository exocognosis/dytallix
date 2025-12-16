# Security Notes (MVP)

## What’s Real

- Real scanning via TLS handshake / HTTP request / Postgres connect.
- Real PQC envelope wrapping:
  - Kyber768 KEM
  - HKDF-SHA256 key derivation
  - ChaCha20-Poly1305 AEAD
- Real chain attestations with tx hashes recorded.

## What’s MVP / Not Production

- Vault runs in dev mode for local compose.
- Keys/tokens are provided via environment variables in compose.
- Access tokens are stored in browser `localStorage` (MVP). For production, prefer httpOnly cookies.

## Recommended Hardening

- Use Vault with AppRole/Kubernetes auth and short-lived tokens.
- Protect EVM signing key in HSM/KMS.
- Add rate limiting and WAF in front of the API.
- Turn on structured audit export + centralized log shipping.
