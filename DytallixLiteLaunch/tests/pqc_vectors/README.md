This directory is intended for Dilithium3 known-answer tests (KATs).

If pqcrypto-dilithium exposes test vectors, rely on crate tests. Otherwise, include vetted vector files here in JSON form:

[
  {"msg":"...base64...","pk":"...base64...","sk":"...base64...","sig":"...base64..."},
  ...
]

CI will load and verify these in both Rust and TypeScript bindings.
