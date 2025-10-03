use wasm_bindgen_test::*;
use pqc_wasm::version;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn version_contains_crate_name() {
    let v = version();
    assert!(v.contains("pqc-wasm"));
}
