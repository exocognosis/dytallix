# PQC KAT Vectors (Placeholder)

Add official Known Answer Test (KAT) vectors for each algorithm here.
Suggested structure:

- dilithium/
  - kat.txt (or multiple files)
- falcon/
  - kat.txt
- sphincs/
  - kat.txt

Each test vector entry should minimally provide: seed, pk, sk, message, signature.
We'll parse and feed into algorithm-specific validation tests.

Do NOT commit real private key material beyond standardized KAT data.
