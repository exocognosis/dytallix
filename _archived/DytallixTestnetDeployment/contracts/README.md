Counter demo contract (WASM)

- This folder contains a minimal counter contract in WASM format for demo/testing.
- The counter exposes two functions:
  - `get` -> returns the current count as u32 (LE-encoded bytes)
  - `increment` -> increases the counter by 1 and returns the new value as u32 (LE)

Build notes
- The WASM is prebuilt and checked in as `counter.wasm`.
- If you wish to rebuild from source later, port any simple Wasm module that exports these 2 funcs and uses linear memory for a u32 cell named `counter`.
