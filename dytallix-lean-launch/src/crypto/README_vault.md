Vault schema and lock behavior

Vault schema (EncryptedVault v1):
- v: 1
- cipher: "AES-GCM"
- kdf: "argon2id"
- kdfParams:
  - memLimit: number (bytes)
  - opsLimit: number
  - parallelism: number
  - saltB64: base64 string
- nonceB64: base64 string (12 bytes IV)
- ctB64: base64 string (ciphertext)

Keystore JSON (KeystoreV1):
- v: 1
- encVault: EncryptedVault
- meta:
  - createdAt: ISO string
  - address: bech32-like application address
  - algo: pqc algorithm id
  - publicKey?: base64 public key
  - note?: string

Lock behavior:
- Unlock UI provides password strength meter (zxcvbn) and supports create/unlock modes.
- Auto-lock after 5 minutes of inactivity and immediately when document visibility changes to hidden.
- Secrets are zeroized from memory on lock, on decryption/encryption finalization, and best-effort after use.
