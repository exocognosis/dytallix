# PQC Artifacts and Verification Summary

- Artifact: dilithium.wasm
  - SHA256: fee133d67f90501e05d3328a96a5af5baaba7f906471b6e68b09415ec996ddda
  - Size: 51288 bytes
- Artifact: falcon.wasm
  - SHA256: ef4838db28e7fdd59f5694660542f2068b24c759bd2c044f30fa4d54521cea33
  - Size: 115973 bytes
- Artifact: sphincs.wasm
  - SHA256: 42801c880ba3725fe764bbc7bea1036dd58466c0e22c55640ca8651d38814547
  - Size: 29863 bytes

- Manifest: launch-evidence/pqc/manifest.json
- Build Meta: launch-evidence/pqc/build_meta.json

- verify_ok.log: verified:true
- verify_fail_tamper.log: verified:false

Procedure:
1) Generated Dilithium5 keypair (pk.bin, sk.bin)
2) Signed payload.json -> sig.hex
3) Verified OK -> SUCCESS
4) Tampered payload by flipping 1 byte -> verification FAIL
