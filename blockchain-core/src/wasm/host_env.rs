// Host environment for WASM contracts
// This module provides scaffolding for future host functions (storage, crypto)
// For now methods operate only on internal static state for the demo contract.

use crate::crypto::PQCManager;
use anyhow::Result;
use blake3;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use wasmtime::{Caller, Engine, Linker};

#[derive(Clone, Debug, Default)]
pub struct HostExecutionContext {
    pub block_height: u64,
    pub block_time: i64,
    pub caller: String,
    pub deployer: String,
}

#[derive(Clone)]
pub struct HostEnv {
    inner: Arc<HostEnvInner>,
}

#[derive(Debug)]
struct HostEnvInner {
    ctx: Mutex<HostExecutionContext>,
    kv: Mutex<HashMap<Vec<u8>, Vec<u8>>>, // simple deterministic in-memory storage
    logs: Mutex<Vec<String>>,             // structured logs captured per execution
    gas_table: GasTable,
    pqc: Arc<PQCManager>,
}

#[derive(Debug, Clone, Copy)]
pub struct GasTable {
    pub storage_get: u64,
    pub storage_set: u64,
    pub storage_delete: u64,
    pub crypto_hash: u64,
    pub crypto_verify: u64,
    pub env_read: u64,
    pub log: u64,
}

impl Default for GasTable {
    fn default() -> Self {
        Self {
            storage_get: 40,
            storage_set: 80,
            storage_delete: 50,
            crypto_hash: 15, // per 32-byte chunk charged additionally inside host fn
            crypto_verify: 5000, // PQ signature verification baseline
            env_read: 5,
            log: 30,
        }
    }
}

impl HostEnv {
    pub fn new() -> Self {
        panic!("HostEnv::new() without PQCManager removed. Use HostEnv::with_pqc(pqc_manager)");
    }
    pub fn with_pqc(pqc: Arc<PQCManager>) -> Self {
        Self {
            inner: Arc::new(HostEnvInner {
                ctx: Mutex::new(HostExecutionContext::default()),
                kv: Mutex::new(HashMap::new()),
                logs: Mutex::new(Vec::new()),
                gas_table: GasTable::default(),
                pqc,
            }),
        }
    }

    pub fn set_context(&self, ctx: HostExecutionContext) {
        if let Ok(mut guard) = self.inner.ctx.lock() {
            *guard = ctx;
        }
    }

    pub fn context(&self) -> HostExecutionContext {
        self.inner.ctx.lock().cloned().unwrap_or_default()
    }

    pub fn gas_table(&self) -> GasTable {
        self.inner.gas_table
    }

    // Internal helpers used by host functions
    pub fn storage_get(&self, key: &[u8]) -> Option<Vec<u8>> {
        self.inner.kv.lock().unwrap().get(key).cloned()
    }
    pub fn storage_set(&self, key: Vec<u8>, value: Vec<u8>) {
        self.inner.kv.lock().unwrap().insert(key, value);
    }
    pub fn storage_delete(&self, key: &[u8]) -> bool {
        self.inner.kv.lock().unwrap().remove(key).is_some()
    }
    pub fn push_log(&self, msg: String) {
        self.inner.logs.lock().unwrap().push(msg);
    }
    pub fn take_logs(&self) -> Vec<String> {
        self.inner.logs.lock().unwrap().drain(..).collect()
    }

    pub fn blake3_hash(&self, data: &[u8]) -> [u8; 32] {
        *blake3::hash(data).as_bytes()
    }

    pub fn pqc_verify(&self, msg: &[u8], sig: &[u8], algo: &str, pubkey: &[u8]) -> bool {
        // Wrap raw pieces into PQCSignature struct for existing manager verify
        let signature = crate::crypto::PQCSignature {
            signature: sig.to_vec(),
            algorithm: algo.to_string(),
            nonce: 0,
            timestamp: 0,
        };
        self.inner
            .pqc
            .verify_signature(msg, &signature, pubkey)
            .unwrap_or(false)
    }

    pub fn register_host_functions<T>(&self, linker: &mut Linker<T>) -> Result<()> {
        // Placeholder for future host function registration
        // Examples of future functions:
        // - storage_get/storage_set for persistent key-value storage
        // - crypto_hash for cryptographic operations
        // - emit_event for contract events
        // - block_info for accessing blockchain state

        Ok(())
    }
}
