Placeholder WASM artifacts for PQC (Dilithium, Falcon, SPHINCS+).

Replace these with real audited builds (e.g., PQClean/liboqs compiled to WASM) and then:

1. Compute SHA-256 hashes:
   shasum -a 256 dilithium.wasm falcon.wasm sphincs.wasm
2. Update src/crypto/pqc/manifest.json with exact lowercase hex digests.
3. Commit artifacts + manifest together.
4. (Optional) Sign artifacts and add signature verification layer.

Do NOT ship placeholder artifacts to production.
