use wasmtime::{Engine, Store, Module, Linker, Instance};
use anyhow::Result;

pub struct WasmEngine {
    engine: Engine,
}

impl WasmEngine {
    pub fn new() -> Self {
        let engine = Engine::default(); // TODO: configure for determinism / limits
        Self { engine }
    }

    pub fn instantiate_with_fuel(&self, code: &[u8], gas_limit: u64) -> Result<(Store<()>, Instance)> {
        let module = Module::new(&self.engine, code)?;
        let mut store = Store::new(&self.engine, ());
        store.add_fuel(gas_limit)?;
        let mut linker = Linker::new(&self.engine);
        // TODO: host functions (env, storage, crypto) register here.
        let instance = linker.instantiate(&mut store, &module)?;
        Ok((store, instance))
    }
}