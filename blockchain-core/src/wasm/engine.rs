use crate::wasm::host_env::{HostEnv, HostExecutionContext};
use anyhow::{anyhow, Result};
use std::sync::Arc;
use wasmtime::{Caller, Config, Engine, Instance, Linker, Memory, Module, Store};

pub struct WasmEngine {
    engine: Engine,
    host_env: HostEnv,
}

impl WasmEngine {
    pub fn new_with_env(host_env: HostEnv) -> Self {
        let mut config = Config::new();
        // Deterministic configuration
        config.wasm_multi_memory(false);
        config.wasm_multi_value(true);
        config.wasm_bulk_memory(true);
        config.wasm_simd(false);
        config.wasm_relaxed_simd(false);
        config.wasm_reference_types(true);
        config.wasm_function_references(false);
        config.wasm_threads(false);
        config.wasm_tail_call(false);
        config.consume_fuel(true);
        config.epoch_interruption(true);
        config.memory_guaranteed_dense_image_size(0);
        config.memory_init_cow(false);
        config.allocation_strategy(wasmtime::InstanceAllocationStrategy::OnDemand);
        config.cranelift_nan_canonicalization(false);
        config.max_wasm_stack(512 * 1024);
        config.async_stack_size(2 * 1024 * 1024);
        let engine = Engine::new(&config).expect("Failed to create deterministic WASM engine");
        Self { engine, host_env }
    }
    pub fn new() -> Self {
        panic!("Use new_with_env(host_env)");
    }

    pub fn set_context(&self, ctx: HostExecutionContext) {
        self.host_env.set_context(ctx);
    }
    pub fn env(&self) -> HostEnv {
        self.host_env.clone()
    }

    pub fn instantiate_with_fuel(
        &self,
        code: &[u8],
        gas_limit: u64,
    ) -> Result<(Store<HostEnv>, Instance)> {
        let module = Module::new(&self.engine, code)?;
        let mut store = Store::new(&self.engine, self.host_env.clone());
        store.add_fuel(gas_limit)?; // gas limit
        store.epoch_deadline_async_yield_and_update(10);
        let mut linker = Linker::new(&self.engine);
        self.register_host_functions(&mut linker)?;
        let instance = linker.instantiate(&mut store, &module)?;
        Ok((store, instance))
    }

    fn get_memory<T>(caller: &mut Caller<'_, T>) -> Result<Memory> {
        caller
            .get_export("memory")
            .and_then(|e| e.into_memory())
            .ok_or_else(|| anyhow!("memory export not found"))
    }
    fn read_mem<T>(mut caller: Caller<'_, T>, ptr: i32, len: i32) -> Result<Vec<u8>> {
        if ptr < 0 || len < 0 {
            return Err(anyhow!("negative ptr/len"));
        }
        let mem = Self::get_memory(&mut caller)?;
        let data = mem.data(&caller);
        let start = ptr as usize;
        let end = start + len as usize;
        if end > data.len() {
            return Err(anyhow!("out of bounds read"));
        }
        Ok(data[start..end].to_vec())
    }
    fn write_mem<T>(mut caller: Caller<'_, T>, ptr: i32, bytes: &[u8]) -> Result<()> {
        if ptr < 0 {
            return Err(anyhow!("negative ptr"));
        }
        let mem = Self::get_memory(&mut caller)?;
        let data = mem.data_mut(&mut caller);
        let start = ptr as usize;
        let end = start + bytes.len();
        if end > data.len() {
            return Err(anyhow!("out of bounds write"));
        }
        data[start..end].copy_from_slice(bytes);
        Ok(())
    }

    fn charge_fuel<T>(mut caller: Caller<'_, T>, amount: u64) -> Result<()> {
        if amount == 0 {
            return Ok(());
        }
        caller.consume_fuel(amount)?;
        Ok(())
    }

    fn register_host_functions<T>(&self, linker: &mut Linker<T>) -> Result<()> {
        // Clone env for closures
        let env = self.host_env.clone();

        // storage_get(key_ptr,key_len, val_ptr, max_len) -> i32 (len or -1)
        linker.func_wrap(
            "env",
            "storage_get",
            move |mut caller: Caller<'_, T>,
                  key_ptr: i32,
                  key_len: i32,
                  val_ptr: i32,
                  max_len: i32|
                  -> i32 {
                let gas_cost = env.gas_table().storage_get;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                match (|| -> Result<i32> {
                    let key = Self::read_mem(caller.as_context_mut(), key_ptr, key_len)?;
                    if let Some(val) = env.storage_get(&key) {
                        let take = std::cmp::min(val.len(), max_len as usize);
                        Self::write_mem(caller.as_context_mut(), val_ptr, &val[..take])?;
                        Ok(take as i32)
                    } else {
                        Ok(-1)
                    }
                })() {
                    Ok(r) => r,
                    Err(_) => -1,
                }
            },
        )?;

        // storage_set(key_ptr,key_len,val_ptr,val_len) -> i32 (0 ok)
        let env_set = self.host_env.clone();
        linker.func_wrap(
            "env",
            "storage_set",
            move |mut caller: Caller<'_, T>,
                  key_ptr: i32,
                  key_len: i32,
                  val_ptr: i32,
                  val_len: i32|
                  -> i32 {
                let gas_cost =
                    env_set.gas_table().storage_set + ((val_len.max(0) as u64 + 31) / 32) * 5;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                match (|| -> Result<i32> {
                    let key = Self::read_mem(caller.as_context_mut(), key_ptr, key_len)?;
                    let val = Self::read_mem(caller.as_context_mut(), val_ptr, val_len)?;
                    env_set.storage_set(key, val);
                    Ok(0)
                })() {
                    Ok(r) => r,
                    Err(_) => 1,
                }
            },
        )?;

        // storage_delete(key_ptr,key_len) -> i32 (1 existed,0 absent)
        let env_del = self.host_env.clone();
        linker.func_wrap(
            "env",
            "storage_delete",
            move |mut caller: Caller<'_, T>, key_ptr: i32, key_len: i32| -> i32 {
                let gas_cost = env_del.gas_table().storage_delete;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                match (|| -> Result<i32> {
                    let key = Self::read_mem(caller.as_context_mut(), key_ptr, key_len)?;
                    Ok(if env_del.storage_delete(&key) { 1 } else { 0 })
                })() {
                    Ok(r) => r,
                    Err(_) => -1,
                }
            },
        )?;

        // crypto_hash(data_ptr,data_len,out_ptr) -> i32 (0 ok)
        let env_hash = self.host_env.clone();
        linker.func_wrap(
            "env",
            "crypto_hash",
            move |mut caller: Caller<'_, T>, data_ptr: i32, data_len: i32, out_ptr: i32| -> i32 {
                let chunks = (data_len.max(0) as u64 + 31) / 32;
                let gas_cost =
                    env_hash.gas_table().crypto_hash + chunks * env_hash.gas_table().crypto_hash;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                match (|| -> Result<i32> {
                    let data = Self::read_mem(caller.as_context_mut(), data_ptr, data_len)?;
                    let hash = env_hash.blake3_hash(&data);
                    Self::write_mem(caller.as_context_mut(), out_ptr, &hash)?;
                    Ok(0)
                })() {
                    Ok(r) => r,
                    Err(_) => 1,
                }
            },
        )?;

        // crypto_verify_signature(sig_ptr,sig_len,msg_ptr,msg_len,pub_ptr,pub_len, algo_ptr, algo_len) -> i32 (1 valid,0 invalid)
        let env_verify = self.host_env.clone();
        linker.func_wrap(
            "env",
            "crypto_verify_signature",
            move |mut caller: Caller<'_, T>,
                  sig_ptr: i32,
                  sig_len: i32,
                  msg_ptr: i32,
                  msg_len: i32,
                  pub_ptr: i32,
                  pub_len: i32,
                  algo_ptr: i32,
                  algo_len: i32|
                  -> i32 {
                let gas_cost = env_verify.gas_table().crypto_verify;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                match (|| -> Result<i32> {
                    let sig = Self::read_mem(caller.as_context_mut(), sig_ptr, sig_len)?;
                    let msg = Self::read_mem(caller.as_context_mut(), msg_ptr, msg_len)?;
                    let pk = Self::read_mem(caller.as_context_mut(), pub_ptr, pub_len)?;
                    let algo = Self::read_mem(caller.as_context_mut(), algo_ptr, algo_len)?;
                    let algo_str = String::from_utf8_lossy(&algo).to_string();
                    Ok(if env_verify.pqc_verify(&msg, &sig, &algo_str, &pk) {
                        1
                    } else {
                        0
                    })
                })() {
                    Ok(r) => r,
                    Err(_) => 0,
                }
            },
        )?;

        // get_block_height() -> i64
        let env_h = self.host_env.clone();
        linker.func_wrap(
            "env",
            "get_block_height",
            move |_caller: Caller<'_, T>| -> i64 { env_h.context().block_height as i64 },
        )?;

        // get_block_time() -> i64
        let env_t = self.host_env.clone();
        linker.func_wrap(
            "env",
            "get_block_time",
            move |_caller: Caller<'_, T>| -> i64 { env_t.context().block_time },
        )?;

        // get_caller_address(out_ptr, max_len) -> i32 (len)
        let env_caller = self.host_env.clone();
        linker.func_wrap(
            "env",
            "get_caller_address",
            move |mut caller: Caller<'_, T>, out_ptr: i32, max_len: i32| -> i32 {
                let gas_cost = env_caller.gas_table().env_read;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                let ctx = env_caller.context();
                let addr = ctx.caller.as_bytes();
                let take = std::cmp::min(addr.len(), max_len as usize);
                if Self::write_mem(caller.as_context_mut(), out_ptr, &addr[..take]).is_ok() {
                    take as i32
                } else {
                    -1
                }
            },
        )?;

        // debug_log(msg_ptr,msg_len)
        let env_log = self.host_env.clone();
        linker.func_wrap(
            "env",
            "debug_log",
            move |mut caller: Caller<'_, T>, msg_ptr: i32, msg_len: i32| {
                let gas_cost = env_log.gas_table().log + ((msg_len.max(0) as u64 + 63) / 64) * 5;
                let _ = Self::charge_fuel(caller.as_context_mut(), gas_cost);
                if let Ok(bytes) = Self::read_mem(caller.as_context_mut(), msg_ptr, msg_len) {
                    if let Ok(msg) = String::from_utf8(bytes) {
                        env_log.push_log(msg);
                    }
                }
            },
        )?;

        Ok(())
    }
}
