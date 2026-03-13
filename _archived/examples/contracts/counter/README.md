Dytallix demo counter contract

Build:
  rustup target add wasm32-unknown-unknown
  cargo build --target wasm32-unknown-unknown --release

Artifact will be under target/wasm32-unknown-unknown/release/dyt_counter.wasm (name may vary). Copy/rename to examples/counter.wasm for integration script.
