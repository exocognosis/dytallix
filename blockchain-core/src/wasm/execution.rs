use super::{
    contract_registry::_ContractStore, engine::WasmEngine, gas_meter::_finalize_gas,
    types::ContractInstance,
};
use anyhow::{anyhow, Result};
use wasmtime::Func;

pub struct _WasmExecutor<'a, S: _ContractStore> {
    pub engine: &'a WasmEngine,
    pub store: &'a mut S,
}

impl<'a, S: _ContractStore> _WasmExecutor<'a, S> {
    pub fn _deploy(
        &mut self,
        creator: [u8; 32],
        code: &[u8],
        height: u64,
        gas_limit: u64,
    ) -> Result<(ContractInstance, u64)> {
        let code_hash = self.store._put_code(code)?;
        let inst = self.store._create_instance(code_hash, creator, height)?;
        // Optionally run an init() if export exists
        let (mut store_ctx, instance) = self.engine.instantiate_with_fuel(code, gas_limit)?;
        if let Some(init) = instance.get_func(&mut store_ctx, "init") {
            let _ = init.call(&mut store_ctx, &[], &mut []);
        }
        // Fuel metering disabled, approximate gas_used as gas_limit (placeholder)
        let gas_out = _finalize_gas(gas_limit, 0);
        let mut updated = inst.clone();
        updated.last_gas_used = gas_out.gas_used;
        self.store._update_instance(&updated)?;
        Ok((updated, gas_out.gas_used))
    }

    pub fn _execute(
        &mut self,
        address: [u8; 32],
        method: &str,
        gas_limit: u64,
    ) -> Result<(i64, u64)> {
        let inst = self.store._get_instance(&address)?;
        let code = self.store._get_code(&inst.code_hash)?;
        let (mut store_ctx, instance) = self.engine.instantiate_with_fuel(&code, gas_limit)?; // Fresh instantiation (no persistent state yet)
        let func: Func = instance
            .get_func(&mut store_ctx, method)
            .ok_or_else(|| anyhow!("method not found"))?;
        // Support zero-arg -> i32/i64 return only for demo
        let mut results = [wasmtime::Val::I64(0)];
        let ty = func.ty(&store_ctx);
        if ty.params().len() != 0 || ty.results().len() > 1 {
            return Err(anyhow!("unsupported signature"));
        }
        func.call(&mut store_ctx, &[], &mut results[..ty.results().len()])?;
        // Fuel disabled; approximate gas
        let gas_out = _finalize_gas(gas_limit, 0);
        let mut updated = inst.clone();
        updated.last_gas_used = gas_out.gas_used;
        self.store._update_instance(&updated)?;
        let ret = match results[0] {
            wasmtime::Val::I32(v) => v as i64,
            wasmtime::Val::I64(v) => v,
            _ => 0,
        };
        Ok((ret, gas_out.gas_used))
    }
}
