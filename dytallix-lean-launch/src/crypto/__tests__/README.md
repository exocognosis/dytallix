This folder contains unit tests for the crypto vault. Tests ensure:
- Good password decrypts correctly
- Bad password throws
- Tamper detection via AES-GCM tag failure
- Zeroization best-effort of inputs/keys
