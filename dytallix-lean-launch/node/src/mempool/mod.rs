use std::cmp::Ordering;
use std::collections::{BTreeSet, HashMap, HashSet, VecDeque};
use std::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::crypto::{canonical_json, sha3_256, ActivePQC, PQC};
use crate::gas::{intrinsic_gas, validate_gas_limit, GasSchedule, TxKind};
use crate::state::State;
use crate::storage::tx::Transaction;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use dytallix_node::policy::signature_policy::{PolicyError, PolicyManager};

#[cfg(test)]
mod gas_tests;

#[cfg(test)]
mod pqc_tests;

/// Configuration constants - can be overridden by environment variables
pub const DEFAULT_MAX_TX_BYTES: usize = 1024 * 1024; // 1MB
pub const DEFAULT_MIN_GAS_PRICE: u64 = 1000; // 1000 wei
pub const DEFAULT_MEMPOOL_MAX_TXS: usize = 10000;
pub const DEFAULT_MEMPOOL_MAX_BYTES: usize = 100 * 1024 * 1024; // 100MB

/// Error code constants for external API responses
pub const TX_INVALID_SIG: &str = "TX_INVALID_SIG";

/// Rejection reasons for transactions
#[derive(Debug, Clone, PartialEq)]
pub enum RejectionReason {
    InvalidSignature,
    NonceGap { expected: u64, got: u64 },
    InsufficientFunds,
    UnderpricedGas { min: u64, got: u64 },
    OversizedTx { max: usize, got: usize },
    Duplicate(String),
    PolicyViolation(String),
    InternalError(String),
}

impl RejectionReason {
    /// Convert to metric label
    pub fn to_metric_label(&self) -> &'static str {
        match self {
            RejectionReason::InvalidSignature => "invalid_signature",
            RejectionReason::NonceGap { .. } => "nonce_gap",
            RejectionReason::InsufficientFunds => "insufficient_funds",
            RejectionReason::UnderpricedGas { .. } => "underpriced_gas",
            RejectionReason::OversizedTx { .. } => "oversized_tx",
            RejectionReason::Duplicate(_) => "duplicate",
            RejectionReason::PolicyViolation(_) => "policy_violation",
            RejectionReason::InternalError(_) => "internal_error",
        }
    }
}

impl std::fmt::Display for RejectionReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RejectionReason::Duplicate(hash) => write!(f, "duplicate tx {}", hash),
            RejectionReason::InvalidSignature => write!(f, "invalid signature"),
            RejectionReason::NonceGap { expected, got } => {
                write!(f, "nonce gap: expected {}, got {}", expected, got)
            }
            RejectionReason::InsufficientFunds => write!(f, "insufficient funds"),
            RejectionReason::UnderpricedGas { min, got } => {
                write!(f, "underpriced gas: min {}, got {}", min, got)
            }
            RejectionReason::OversizedTx { max, got } => {
                write!(f, "oversized transaction: max {}, got {}", max, got)
            }
            RejectionReason::PolicyViolation(msg) => write!(f, "policy violation: {}", msg),
            RejectionReason::InternalError(msg) => write!(f, "internal error: {}", msg),
        }
    }
}

/// Configuration for mempool
#[derive(Debug, Clone)]
pub struct MempoolConfig {
    pub max_tx_bytes: usize,
    pub min_gas_price: u64,
    pub max_txs: usize,
    pub max_bytes: usize,
}

impl Default for MempoolConfig {
    fn default() -> Self {
        Self {
            max_tx_bytes: std::env::var("DYT_MAX_TX_BYTES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(DEFAULT_MAX_TX_BYTES),
            min_gas_price: std::env::var("DYT_MIN_GAS_PRICE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(DEFAULT_MIN_GAS_PRICE),
            max_txs: std::env::var("DYT_MEMPOOL_MAX_TXS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(DEFAULT_MEMPOOL_MAX_TXS),
            max_bytes: std::env::var("DYT_MEMPOOL_MAX_BYTES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(DEFAULT_MEMPOOL_MAX_BYTES),
        }
    }
}

/// Transaction with priority ordering
#[derive(Debug, Clone)]
pub struct PendingTx {
    pub tx: Transaction,
    pub received_at: u64,
    pub serialized_size: usize,
}

/// Priority key for ordering transactions
/// Primary: gas_price desc, Secondary: nonce asc, Tertiary: tx_hash asc
#[derive(Debug, Clone, PartialEq, Eq)]
struct TxPriorityKey {
    gas_price_neg: i64, // negative for descending order
    nonce: u64,
    hash: String,
}

impl Ord for TxPriorityKey {
    fn cmp(&self, other: &Self) -> Ordering {
        self.gas_price_neg
            .cmp(&other.gas_price_neg)
            .then_with(|| self.nonce.cmp(&other.nonce))
            .then_with(|| self.hash.cmp(&other.hash))
    }
}

impl PartialOrd for TxPriorityKey {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl PendingTx {
    pub fn new(tx: Transaction) -> Self {
        let serialized_size = estimate_tx_size(&tx);
        let received_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            tx,
            received_at,
            serialized_size,
        }
    }

    pub fn priority_key(&self) -> TxPriorityKey {
        TxPriorityKey {
            gas_price_neg: -(self.tx.gas_price as i64), // negative for descending order
            nonce: self.tx.nonce,
            hash: self.tx.hash.clone(),
        }
    }
}

/// Production-grade mempool with admission rules, ordering, and bounded capacity
pub struct Mempool {
    config: MempoolConfig,
    /// Policy manager for signature algorithm enforcement
    policy_manager: PolicyManager,
    /// Priority-ordered transactions (BTreeSet for deterministic ordering)
    ordered_txs: BTreeSet<TxPriorityKey>,
    /// Hash to transaction mapping for O(1) lookup
    tx_lookup: HashMap<String, PendingTx>,
    /// Hash set for O(1) duplicate detection
    tx_hashes: HashSet<String>,
    /// Total size in bytes of all transactions
    total_bytes: usize,
}

impl Mempool {
    pub fn new() -> Self {
        Self::with_config(MempoolConfig::default())
    }

    pub fn with_config(config: MempoolConfig) -> Self {
        Self {
            config,
            ordered_txs: BTreeSet::new(),
            tx_lookup: HashMap::new(),
            tx_hashes: HashSet::new(),
            total_bytes: 0,
            policy_manager: PolicyManager::new(),
        }
    }

    /// Add transaction to mempool with full validation
    pub fn add_transaction(
        &mut self,
        state: &State,
        tx: Transaction,
    ) -> Result<(), RejectionReason> {
        // 1. Signature verification
        if !verify_envelope(&tx) {
            return Err(RejectionReason::InvalidSignature);
        }

        // 1.5. Policy enforcement - validate signature algorithm if policy is configured
        if let Err(policy_error) = self.validate_signature_policy(&tx) {
            return Err(RejectionReason::PolicyViolation(format!(
                "{}",
                policy_error
            )));
        }

        // 2. Duplicate check
        if self.tx_hashes.contains(&tx.hash) {
            return Err(RejectionReason::Duplicate(tx.hash));
        }

        // 3. Size check
        let tx_size = estimate_tx_size(&tx);
        if tx_size > self.config.max_tx_bytes {
            return Err(RejectionReason::OversizedTx {
                max: self.config.max_tx_bytes,
                got: tx_size,
            });
        }

        // 4. Gas price check
        if tx.gas_price < self.config.min_gas_price {
            return Err(RejectionReason::UnderpricedGas {
                min: self.config.min_gas_price,
                got: tx.gas_price,
            });
        }

        // 5. Nonce and balance validation
        self.validate_tx_state(state, &tx)?;

        // 6. Create pending transaction
        let pending_tx = PendingTx::new(tx.clone());
        let priority_key = pending_tx.priority_key();

        // 7. Check capacity and evict if necessary
        self.ensure_capacity(&pending_tx)?;

        // 8. Insert transaction
        self.ordered_txs.insert(priority_key);
        self.tx_hashes.insert(tx.hash.clone());
        self.total_bytes += pending_tx.serialized_size;
        self.tx_lookup.insert(tx.hash.clone(), pending_tx);

        Ok(())
    }

    /// Validate transaction against account state
    fn validate_tx_state(&self, state: &State, tx: &Transaction) -> Result<(), RejectionReason> {
        let mut clone_state = state.clone();
        let from_acc = clone_state.get_account(&tx.from);
        let balance = from_acc.legacy_balance();
        let nonce = from_acc.nonce;

        // Nonce check
        if tx.nonce != nonce {
            return Err(RejectionReason::NonceGap {
                expected: nonce,
                got: tx.nonce,
            });
        }

        // Balance check (fee + transfer amount for send messages)
        let gas_cost = tx.gas_limit * tx.gas_price;
        let total_needed = tx.amount + tx.fee + gas_cost as u128;

        if balance < total_needed {
            return Err(RejectionReason::InsufficientFunds);
        }

        // Gas validation
        if tx.gas_limit > 0 || tx.gas_price > 0 {
            validate_gas(tx).map_err(|e| RejectionReason::InternalError(e))?;
        }

        Ok(())
    }

    /// Ensure capacity by evicting lowest priority transactions if needed
    fn ensure_capacity(&mut self, new_tx: &PendingTx) -> Result<(), RejectionReason> {
        // Check if we need to evict by count
        while self.ordered_txs.len() >= self.config.max_txs {
            self.evict_lowest_priority()?;
        }

        // Check if we need to evict by total bytes
        while self.total_bytes + new_tx.serialized_size > self.config.max_bytes {
            self.evict_lowest_priority()?;
        }

        Ok(())
    }

    /// Evict the lowest priority transaction
    fn evict_lowest_priority(&mut self) -> Result<(), RejectionReason> {
        // BTreeSet is ordered, so last() gives us the lowest priority
        if let Some(lowest_key) = self.ordered_txs.iter().last().cloned() {
            self.ordered_txs.remove(&lowest_key);

            if let Some(tx) = self.tx_lookup.remove(&lowest_key.hash) {
                self.tx_hashes.remove(&lowest_key.hash);
                self.total_bytes = self.total_bytes.saturating_sub(tx.serialized_size);

                // Log eviction for metrics
                log::info!("Evicted transaction {} due to capacity", lowest_key.hash);
            }
        }
        Ok(())
    }

    /// Get up to n highest priority transactions for block creation
    pub fn take_snapshot(&self, n: usize) -> Vec<Transaction> {
        self.ordered_txs
            .iter()
            .take(n)
            .filter_map(|key| self.tx_lookup.get(&key.hash))
            .map(|pending| pending.tx.clone())
            .collect()
    }

    /// Remove transactions by hash (after inclusion in block)
    pub fn drop_hashes(&mut self, hashes: &[String]) {
        for hash in hashes {
            if let Some(pending_tx) = self.tx_lookup.remove(hash) {
                let priority_key = pending_tx.priority_key();
                self.ordered_txs.remove(&priority_key);
                self.tx_hashes.remove(hash);
                self.total_bytes = self.total_bytes.saturating_sub(pending_tx.serialized_size);
            }
        }
    }

    /// Check if transaction exists in mempool
    pub fn contains(&self, hash: &str) -> bool {
        self.tx_hashes.contains(hash)
    }

    /// Get current mempool statistics
    pub fn len(&self) -> usize {
        self.tx_lookup.len()
    }

    pub fn total_bytes(&self) -> usize {
        self.total_bytes
    }

    pub fn is_full(&self) -> bool {
        self.len() >= self.config.max_txs || self.total_bytes >= self.config.max_bytes
    }

    /// Get current minimum gas price in the pool
    pub fn current_min_gas_price(&self) -> u64 {
        // Find the lowest gas price in the pool (last transaction)
        self.ordered_txs
            .iter()
            .last()
            .and_then(|key| self.tx_lookup.get(&key.hash))
            .map(|tx| tx.tx.gas_price)
            .unwrap_or(self.config.min_gas_price)
    }

    /// Get pool configuration
    pub fn config(&self) -> &MempoolConfig {
        &self.config
    }

    /// Push a transaction into the mempool (RPC method)
    pub fn push(&mut self, tx: Transaction) -> Result<(), RejectionReason> {
        self.add_transaction(&State::default(), tx)
    }
}

/// Legacy error type for backward compatibility
#[derive(Debug)]
pub enum MempoolError {
    Duplicate,
    Full,
    Rejection(RejectionReason),
}

impl From<RejectionReason> for MempoolError {
    fn from(reason: RejectionReason) -> Self {
        match reason {
            RejectionReason::Duplicate(_) => MempoolError::Duplicate,
            reason => MempoolError::Rejection(reason),
        }
    }
}

impl std::fmt::Display for MempoolError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MempoolError::Duplicate => write!(f, "duplicate"),
            MempoolError::Full => write!(f, "full"),
            MempoolError::Rejection(reason) => write!(f, "{}", reason),
        }
    }
}

impl std::error::Error for MempoolError {}

/// Verify transaction envelope (signature validation)
fn verify_envelope(tx: &Transaction) -> bool {
    match (&tx.signature, &tx.public_key) {
        (Some(signature), Some(public_key)) => {
            // Perform real PQC signature verification
            match verify_pqc_signature(tx, signature, public_key) {
                Ok(()) => true,
                Err(_) => false,
            }
        }
        _ => false, // No signature or public key provided
    }
}

/// Verify PQC signature for a transaction
fn verify_pqc_signature(tx: &Transaction, signature: &str, public_key: &str) -> Result<(), String> {
    // 1. Decode base64 signature and public key
    let sig_bytes = B64
        .decode(signature)
        .map_err(|e| format!("invalid signature encoding: {}", e))?;
    let pk_bytes = B64
        .decode(public_key)
        .map_err(|e| format!("invalid public key encoding: {}", e))?;

    // 2. Create canonical transaction for signing
    let canonical_tx = tx.canonical_fields();

    // 3. Serialize to canonical JSON
    let tx_bytes = canonical_json(&canonical_tx)
        .map_err(|e| format!("failed to serialize transaction: {}", e))?;

    // 4. Hash with SHA3-256
    let tx_hash = sha3_256(&tx_bytes);

    // 5. Verify signature using ActivePQC
    if !ActivePQC::verify(&pk_bytes, &tx_hash, &sig_bytes) {
        return Err("signature verification failed".to_string());
    }

    Ok(())
}

/// Enhanced validation including gas validation (legacy function for backward compatibility)
pub fn basic_validate(state: &State, tx: &Transaction) -> Result<(), String> {
    let mut mempool = Mempool::new();
    match mempool.validate_tx_state(state, tx) {
        Ok(()) => Ok(()),
        Err(reason) => Err(reason.to_string()),
    }
}

/// Gas validation function with enhanced error reporting
fn validate_gas(tx: &Transaction) -> Result<(), String> {
    let schedule = GasSchedule::default();

    // For now, assume all transactions are transfers
    // This will be extended when we have better transaction type detection
    let tx_kind = TxKind::Transfer;

    // Estimate transaction size (approximation for now)
    let tx_size_bytes = estimate_tx_size(tx);
    let additional_signatures = 0; // Single signature for now

    // Validate gas limit against intrinsic requirements
    validate_gas_limit(
        &tx_kind,
        tx_size_bytes,
        additional_signatures,
        tx.gas_limit,
        &schedule,
    )
    .map_err(|e| format!("GasValidationError: {}", e))?;

    // Check gas price is reasonable (non-zero)
    if tx.gas_price == 0 {
        return Err("GasValidationError: gas price cannot be zero".to_string());
    }

    Ok(())
}

/// Estimate transaction size for gas calculation and size limits
fn estimate_tx_size(tx: &Transaction) -> usize {
    // Rough estimate based on serialized fields
    // This should be more precise in production
    tx.hash.len() +
    tx.from.len() +
    tx.to.len() +
    16 + // amount (u128)
    16 + // fee (u128)
    8 +  // nonce (u64)
    tx.signature.as_ref().map_or(0, |s| s.len()) +
    8 +  // gas_limit (u64)
    8 // gas_price (u64)
}

impl Mempool {
    /// Validate transaction signature algorithm against policy
    fn validate_signature_policy(&self, tx: &Transaction) -> Result<(), PolicyError> {
        // Extract signature algorithm from transaction (legacy tx has no explicit algorithm; accept Dilithium5 default)
        if let Some(alg) = tx.signature_algorithm() {
            if self.policy_manager.policy().should_enforce_at_mempool() {
                self.policy_manager.validate_transaction_algorithm(&alg)?;
            }
        }
        Ok(())
    }
}
