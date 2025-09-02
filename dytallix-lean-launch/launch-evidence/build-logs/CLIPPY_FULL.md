# Clippy Report — Errors: 83, Warnings: 16

warning: struct `BlockchainStats` is never constructed
  --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:38:8
   |
38 | struct BlockchainStats { // removed underscore - struct is intended for API responses
   |        ^^^^^^^^^^^^^^^
   |
   = note: `#[warn(dead_code)]` on by default

warning: struct `PeerInfo` is never constructed
  --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:58:8
   |
58 | struct PeerInfo { // removed underscore
   |        ^^^^^^^^

warning: struct `SystemStatus` is never constructed
  --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:68:8
   |
68 | struct SystemStatus { // removed underscore
   |        ^^^^^^^^^^^^

warning: associated functions `new_transaction` and `status_update` are never used
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:94:8
    |
85  | impl WebSocketMessage {
    | --------------------- associated functions in this implementation
...
94  |     fn new_transaction(tx: &TransactionDetails) -> Self {
    |        ^^^^^^^^^^^^^^^
...
102 |     fn status_update(status: &SystemStatus) -> Self {
    |        ^^^^^^^^^^^^^

warning: struct `TransactionResponse` is never constructed
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:112:8
    |
112 | struct TransactionResponse { // removed underscore
    |        ^^^^^^^^^^^^^^^^^^^

warning: struct `TransactionDetails` is never constructed
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:119:8
    |
119 | struct TransactionDetails { // removed underscore
    |        ^^^^^^^^^^^^^^^^^^

warning: fields `address`, `consensus_pubkey`, and `commission_rate` are never read
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:141:5
    |
140 | struct _StakingRegisterRequest { // underscore
    |        ----------------------- fields in this struct
141 |     address: String,
    |     ^^^^^^^
142 |     consensus_pubkey: String,
    |     ^^^^^^^^^^^^^^^^
143 |     commission_rate: u16,
    |     ^^^^^^^^^^^^^^^
    |
    = note: `_StakingRegisterRequest` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: fields `delegator`, `validator`, and `amount` are never read
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:148:5
    |
147 | struct _StakingDelegateRequest { // underscore
    |        ----------------------- fields in this struct
148 |     delegator: String,
    |     ^^^^^^^^^
149 |     validator: String,
    |     ^^^^^^^^^
150 |     amount: u128,
    |     ^^^^^^
    |
    = note: `_StakingDelegateRequest` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: fields `delegator` and `validator` are never read
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:155:5
    |
154 | struct _StakingClaimRequest { // underscore
    |        -------------------- fields in this struct
155 |     delegator: String,
    |     ^^^^^^^^^
156 |     validator: String,
    |     ^^^^^^^^^
    |
    = note: `_StakingClaimRequest` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: associated function `error` is never used
   --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:192:8
    |
183 | impl<T> ApiResponse<T> {
    | ---------------------- associated function in this implementation
...
192 |     fn error(message: String) -> Self {
    |        ^^^^^

warning: fields `runtime` and `pqc_manager` are never read
  --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/consensus_engine.rs:77:5
   |
76 | pub struct ConsensusEngine {
   |            --------------- fields in this struct
77 |     runtime: Arc<DytallixRuntime>,
   |     ^^^^^^^
78 |     pqc_manager: Arc<PQCManager>,
   |     ^^^^^^^^^^^
   |
   = note: `ConsensusEngine` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: field `validators` is never read
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/mod_clean.rs:220:5
    |
216 | pub struct ConsensusEngine {
    |            --------------- field in this struct
...
220 |     validators: Arc<RwLock<Vec<String>>>,
    |     ^^^^^^^^^^
    |
    = note: `ConsensusEngine` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

warning: associated functions `format_transfer_transaction_message` and `validate_transaction_signature_static` are never used
    --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/mod_clean.rs:1205:8
     |
229  | impl ConsensusEngine {
     | -------------------- associated functions in this implementation
...
1205 |     fn format_transfer_transaction_message(tx: &TransferTransaction) -> Vec<u8> {
     |        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
1213 |     fn validate_transaction_signature_static(
     |        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

warning: method `get_vault_path` is never used
   --> /Users/rickglenn/dytallix/blockchain-core/src/secrets/providers.rs:193:8
    |
153 | impl VaultProvider {
    | ------------------ method in this implementation
...
193 |     fn get_vault_path(&self, name: &str) -> String {
    |        ^^^^^^^^^^^^^^

warning: `dytallix-node` (lib) generated 14 warnings
    Checking dytallix-lean-node v0.1.0 (/Users/rickglenn/dytallix/dytallix-lean-launch/node)
error[E0616]: field `registry` of struct `dytallix_lean_node::metrics::Metrics` is private
   --> node/tests/dyt_metrics_comprehensive.rs:132:35
    |
132 |     let metric_families = metrics.registry.gather();
    |                                   ^^^^^^^^ private field

error: variables can be used directly in the `format!` string
  --> node/tests/bridge_unit.rs:35:36
   |
35 |         let (v, k) = mk_validator(&format!("v{}", i));
   |                                    ^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
   = note: `-D clippy::uninlined-format-args` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::uninlined_format_args)]`
help: change this to
   |
35 -         let (v, k) = mk_validator(&format!("v{}", i));
35 +         let (v, k) = mk_validator(&format!("v{i}"));
   |

error: variables can be used directly in the `format!` string
  --> node/tests/bridge_unit.rs:51:26
   |
51 |         msg.signers.push(format!("v{}", i));
   |                          ^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
51 -         msg.signers.push(format!("v{}", i));
51 +         msg.signers.push(format!("v{i}"));
   |

error: variables can be used directly in the `format!` string
  --> node/tests/bridge_unit.rs:68:36
   |
68 |         let (v, k) = mk_validator(&format!("v{}", i));
   |                                    ^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
68 -         let (v, k) = mk_validator(&format!("v{}", i));
68 +         let (v, k) = mk_validator(&format!("v{i}"));
   |

error: could not compile `dytallix-lean-node` (test "bridge_unit") due to 3 previous errors
warning: build failed, waiting for other jobs to finish...
error: variables can be used directly in the `format!` string
  --> node/tests/emission_schedule_tests.rs:39:13
   |
39 | /             assert_eq!(
40 | |                 pool_sum, event.total_emitted,
41 | |                 "Distribution sum must equal total emission at height {}",
42 | |                 height
43 | |             );
   | |_____________^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
   = note: `-D clippy::uninlined-format-args` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::uninlined_format_args)]`

error: unused variable: `server`
   --> node/tests/dyt_metrics_comprehensive.rs:183:10
    |
183 |     let (server, metrics) = MetricsServer::new(config).expect("Failed to create metrics server");
    |          ^^^^^^ help: if this is intentional, prefix it with an underscore: `_server`
    |
    = note: `-D unused-variables` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(unused_variables)]`

For more information about this error, try `rustc --explain E0616`.
error: variables can be used directly in the `format!` string
   --> node/tests/emission_schedule_tests.rs:152:5
    |
152 | /     assert!(
153 | |         error < TOLERANCE,
154 | |         "Precision error {} exceeds tolerance {}",
155 | |         error,
156 | |         TOLERANCE
157 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: could not compile `dytallix-lean-node` (test "dyt_metrics_comprehensive") due to 2 previous errors
error: variable does not need to be mutable
  --> node/tests/mempool_perf_determinism.rs:63:9
   |
63 |     let mut tx_set1 = transactions.clone();
   |         ----^^^^^^^
   |         |
   |         help: remove this `mut`
   |
   = note: `-D unused-mut` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(unused_mut)]`

error: could not compile `dytallix-lean-node` (test "emission_schedule_tests") due to 2 previous errors
error: this function has too many arguments (8/7)
  --> node/tests/mempool_perf_determinism.rs:11:1
   |
11 | / fn create_test_transaction(
12 | |     hash: &str,
13 | |     from: &str,
14 | |     to: &str,
...  |
19 | |     gas_price: u64,
20 | | ) -> Transaction {
   | |________________^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#too_many_arguments
   = note: `-D clippy::too-many-arguments` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::too_many_arguments)]`

error: variables can be used directly in the `format!` string
  --> node/tests/mempool_perf_determinism.rs:31:42
   |
31 |         let mut acc = state.get_account(&format!("sender{}", i));
   |                                          ^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
   = note: `-D clippy::uninlined-format-args` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::uninlined_format_args)]`
help: change this to
   |
31 -         let mut acc = state.get_account(&format!("sender{}", i));
31 +         let mut acc = state.get_account(&format!("sender{i}"));
   |

error: variables can be used directly in the `format!` string
  --> node/tests/mempool_perf_determinism.rs:33:31
   |
33 |         state.accounts.insert(format!("sender{}", i), acc);
   |                               ^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
33 -         state.accounts.insert(format!("sender{}", i), acc);
33 +         state.accounts.insert(format!("sender{i}"), acc);
   |

error: variables can be used directly in the `format!` string
  --> node/tests/mempool_perf_determinism.rs:50:14
   |
50 |             &format!("hash{}", i),
   |              ^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
50 -             &format!("hash{}", i),
50 +             &format!("hash{i}"),
   |

error: casting to the same type is unnecessary (`u64` -> `u64`)
  --> node/tests/mempool_perf_determinism.rs:57:20
   |
57 |             1000 + (i % 5) as u64 * 500, // Gas prices: 1000, 1500, 2000, 2500, 3000
   |                    ^^^^^^^^^^^^^^ help: try: `(i % 5)`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_cast
   = note: `-D clippy::unnecessary-cast` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::unnecessary_cast)]`

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:114:14
    |
114 |             &format!("hash{}", i),
    |              ^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
114 -             &format!("hash{}", i),
114 +             &format!("hash{i}"),
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:115:14
    |
115 |             &format!("sender{}", i), // Each transaction from different sender
    |              ^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
115 -             &format!("sender{}", i), // Each transaction from different sender
115 +             &format!("sender{i}"), // Each transaction from different sender
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:132:5
    |
132 | /     assert!(
133 | |         admission_duration < Duration::from_secs(1),
134 | |         "Admission took too long: {:?}",
135 | |         admission_duration
136 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:138:5
    |
138 | /     println!(
139 | |         "✅ Performance test passed: {} transactions admitted in {:?}",
140 | |         successful_admissions, admission_duration
141 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:149:5
    |
149 | /     assert!(
150 | |         snapshot_duration < Duration::from_millis(10),
151 | |         "Snapshot took too long: {:?}",
152 | |         snapshot_duration
153 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:177:14
    |
177 |             &format!("hash{}", i),
    |              ^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
177 -             &format!("hash{}", i),
177 +             &format!("hash{i}"),
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:178:14
    |
178 |             &format!("sender{}", i),
    |              ^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
178 -             &format!("sender{}", i),
178 +             &format!("sender{i}"),
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:202:5
    |
202 | /     println!(
203 | |         "Minimum gas price in pool after evictions: {}",
204 | |         min_gas_price
205 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:231:5
    |
231 | /     println!(
232 | |         "✅ Deterministic eviction verified: {} high-priority, {} low-priority retained",
233 | |         high_priority_count, low_priority_count
234 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:281:14
    |
281 |             &format!("hash{}", i),
    |              ^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
281 -             &format!("hash{}", i),
281 +             &format!("hash{i}"),
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:282:14
    |
282 |             &format!("sender{}", i),
    |              ^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
282 -             &format!("sender{}", i),
282 +             &format!("sender{i}"),
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:312:18
    |
312 |                 &format!("new_hash_{}_{}", round, i),
    |                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
312 -                 &format!("new_hash_{}_{}", round, i),
312 +                 &format!("new_hash_{round}_{i}"),
    |

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:329:5
    |
329 | /     assert!(
330 | |         bulk_duration < Duration::from_millis(500),
331 | |         "Bulk addition took too long: {:?}",
332 | |         bulk_duration
333 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> node/tests/mempool_perf_determinism.rs:335:5
    |
335 | /     assert!(
336 | |         interleaved_duration < Duration::from_millis(100),
337 | |         "Interleaved operations took too long: {:?}",
338 | |         interleaved_duration
339 | |     );
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: could not compile `dytallix-lean-node` (test "mempool_perf_determinism") due to 20 previous errors
error: unused import: `Tx`
 --> node/src/types/mod.rs:3:29
  |
3 | pub use tx::{Msg, SignedTx, Tx, ValidationError};
  |                             ^^
  |
  = note: `-D unused-imports` implied by `-D warnings`
  = help: to override `-D warnings` add `#[allow(unused_imports)]`

error: constant `TX_INVALID_SIG` is never used
  --> node/src/mempool/mod.rs:25:11
   |
25 | pub const TX_INVALID_SIG: &str = "TX_INVALID_SIG";
   |           ^^^^^^^^^^^^^^
   |
   = note: `-D dead-code` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(dead_code)]`

error: method `to_metric_label` is never used
  --> node/src/mempool/mod.rs:42:12
   |
40 | impl RejectionReason {
   | -------------------- method in this implementation
41 |     /// Convert to metric label
42 |     pub fn to_metric_label(&self) -> &'static str {
   |            ^^^^^^^^^^^^^^^

error: field `received_at` is never read
   --> node/src/mempool/mod.rs:113:9
    |
111 | pub struct PendingTx {
    |            --------- field in this struct
112 |     pub tx: Transaction,
113 |     pub received_at: u64,
    |         ^^^^^^^^^^^
    |
    = note: `PendingTx` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during dead code analysis

error: methods `is_empty`, `total_bytes`, `current_min_gas_price`, `config`, and `push` are never used
   --> node/src/mempool/mod.rs:348:12
    |
180 | impl Mempool {
    | ------------ methods in this implementation
...
348 |     pub fn is_empty(&self) -> bool { self.len() == 0 }
    |            ^^^^^^^^
349 |
350 |     pub fn total_bytes(&self) -> usize {
    |            ^^^^^^^^^^^
...
359 |     pub fn current_min_gas_price(&self) -> u64 {
    |            ^^^^^^^^^^^^^^^^^^^^^
...
370 |     pub fn config(&self) -> &MempoolConfig {
    |            ^^^^^^
...
375 |     pub fn push(&mut self, tx: Transaction) -> Result<(), RejectionReason> {
    |            ^^^^

error: variant `Full` is never constructed
   --> node/src/mempool/mod.rs:384:5
    |
382 | pub enum MempoolError {
    |          ------------ variant in this enum
383 |     Duplicate,
384 |     Full,
    |     ^^^^
    |
    = note: `MempoolError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: function `get_transaction_receipt` is never used
   --> node/src/rpc/mod.rs:284:14
    |
284 | pub async fn get_transaction_receipt(
    |              ^^^^^^^^^^^^^^^^^^^^^^^

error: function `staking_delegate` is never used
   --> node/src/rpc/mod.rs:924:14
    |
924 | pub async fn staking_delegate(
    |              ^^^^^^^^^^^^^^^^

error: function `staking_undelegate` is never used
   --> node/src/rpc/mod.rs:954:14
    |
954 | pub async fn staking_undelegate(
    |              ^^^^^^^^^^^^^^^^^^

error: function `contract_deploy` is never used
   --> node/src/rpc/mod.rs:984:14
    |
984 | pub async fn contract_deploy(
    |              ^^^^^^^^^^^^^^^

error: function `contract_call` is never used
    --> node/src/rpc/mod.rs:1011:14
     |
1011 | pub async fn contract_call(
     |              ^^^^^^^^^^^^^

error: function `ai_risk_score` is never used
    --> node/src/rpc/mod.rs:1038:14
     |
1038 | pub async fn ai_risk_score(
     |              ^^^^^^^^^^^^^

error: function `ai_risk_get` is never used
    --> node/src/rpc/mod.rs:1064:14
     |
1064 | pub async fn ai_risk_get(
     |              ^^^^^^^^^^^

error: variant `MempoolFull` is never constructed
  --> node/src/rpc/errors.rs:16:5
   |
11 | pub enum ApiError {
   |          -------- variant in this enum
...
16 |     MempoolFull,
   |     ^^^^^^^^^^^
   |
   = note: `ApiError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: method `is_valid` is never used
  --> node/src/runtime/emission.rs:64:12
   |
63 | impl EmissionBreakdown {
   | ---------------------- method in this implementation
64 |     pub fn is_valid(&self) -> bool {
   |            ^^^^^^^^

error: associated function `new_with_config` is never used
   --> node/src/runtime/emission.rs:114:12
    |
81  | impl EmissionEngine {
    | ------------------- associated function in this implementation
...
114 |     pub fn new_with_config(
    |            ^^^^^^^^^^^^^^^

error: associated items `new_with_config`, `get_events`, and `clear_events` are never used
   --> node/src/runtime/governance.rs:179:12
    |
163 | impl GovernanceModule {
    | --------------------- associated items in this implementation
...
179 |     pub fn new_with_config(
    |            ^^^^^^^^^^^^^^^
...
612 |     pub fn get_events(&self) -> &[GovernanceEvent] {
    |            ^^^^^^^^^^
...
617 |     pub fn clear_events(&mut self) {
    |            ^^^^^^^^^^^^

error: constant `GAS_SUBMIT_PROPOSAL` is never used
   --> node/src/runtime/governance.rs:836:11
    |
836 | pub const GAS_SUBMIT_PROPOSAL: u64 = 50_000;
    |           ^^^^^^^^^^^^^^^^^^^

error: constant `GAS_DEPOSIT` is never used
   --> node/src/runtime/governance.rs:837:11
    |
837 | pub const GAS_DEPOSIT: u64 = 30_000;
    |           ^^^^^^^^^^^

error: constant `GAS_VOTE` is never used
   --> node/src/runtime/governance.rs:838:11
    |
838 | pub const GAS_VOTE: u64 = 20_000;
    |           ^^^^^^^^

error: constant `GAS_TALLY` is never used
   --> node/src/runtime/governance.rs:839:11
    |
839 | pub const GAS_TALLY: u64 = 10_000;
    |           ^^^^^^^^^

error: field `confidence` is never read
  --> node/src/runtime/oracle/mod.rs:16:9
   |
12 | pub struct OracleAiRiskInput {
   |            ----------------- field in this struct
...
16 |     pub confidence: Option<f32>,
   |         ^^^^^^^^^^

error: function `get_oracle_risk` is never used
   --> node/src/runtime/oracle/mod.rs:115:8
    |
115 | pub fn get_oracle_risk(store: &OracleStore, tx_hash: &str) -> Option<AiRiskRecord> {
    |        ^^^^^^^^^^^^^^^

error: methods `set_total_stake`, `update_delegator_stake`, `save_total_stake`, `delegate`, `undelegate`, and `process_unbonding` are never used
   --> node/src/runtime/staking.rs:93:12
    |
31  | impl StakingModule {
    | ------------------ methods in this implementation
...
93  |     pub fn set_total_stake(&mut self, stake: u128) {
    |            ^^^^^^^^^^^^^^^
...
138 |     pub fn update_delegator_stake(&mut self, address: &str, new_stake: u128) {
    |            ^^^^^^^^^^^^^^^^^^^^^^
...
213 |     fn save_total_stake(&self) {
    |        ^^^^^^^^^^^^^^^^
...
235 |     pub fn delegate(
    |            ^^^^^^^^
...
270 |     pub fn undelegate(
    |            ^^^^^^^^^^
...
309 |     pub fn process_unbonding(&mut self, current_height: u64) -> Vec<(String, u128)> {
    |            ^^^^^^^^^^^^^^^^^

error: variants `InsufficientFunds` and `State` are never constructed
  --> node/src/execution.rs:17:5
   |
15 | pub enum ExecutionError {
   |          -------------- variants in this enum
16 |     #[error("Insufficient funds: required {required}, available {available}")]
17 |     InsufficientFunds { required: u128, available: u128 },
   |     ^^^^^^^^^^^^^^^^^
...
29 |     State(String),
   |     ^^^^^
   |
   = note: `ExecutionError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: field `events` is never read
  --> node/src/execution.rs:39:9
   |
34 | pub struct ExecutionContext {
   |            ---------------- field in this struct
...
39 |     pub events: Vec<String>, // Simplified events for now
   |         ^^^^^^
   |
   = note: `ExecutionContext` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during dead code analysis

error: field `new_balance` is never read
  --> node/src/execution.rs:48:9
   |
44 | pub struct StateChange {
   |            ----------- field in this struct
...
48 |     pub new_balance: u128,
   |         ^^^^^^^^^^^
   |
   = note: `StateChange` has derived impls for the traits `Clone` and `Debug`, but these are intentionally ignored during dead code analysis

error: field `state_changes` is never read
  --> node/src/execution.rs:55:9
   |
53 | pub struct ExecutionResult {
   |            --------------- field in this struct
54 |     pub receipt: TxReceipt,
55 |     pub state_changes: Vec<StateChange>,
   |         ^^^^^^^^^^^^^
   |
   = note: `ExecutionResult` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: constant `GAS_TABLE_VERSION` is never used
  --> node/src/gas.rs:13:11
   |
13 | pub const GAS_TABLE_VERSION: u32 = 1;
   |           ^^^^^^^^^^^^^^^^^

error: constant `RECEIPT_FORMAT_VERSION` is never used
  --> node/src/gas.rs:14:11
   |
14 | pub const RECEIPT_FORMAT_VERSION: u32 = 1;
   |           ^^^^^^^^^^^^^^^^^^^^^^

error: variants `InvalidGasPrice` and `Overflow` are never constructed
  --> node/src/gas.rs:46:5
   |
38 | pub enum GasError {
   |          -------- variants in this enum
...
46 |     InvalidGasPrice(String),
   |     ^^^^^^^^^^^^^^^
...
49 |     Overflow,
   |     ^^^^^^^^
   |
   = note: `GasError` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: methods `gas_limit` and `operations` are never used
   --> node/src/gas.rs:157:12
    |
124 | impl GasMeter {
    | ------------- methods in this implementation
...
157 |     pub fn gas_limit(&self) -> Gas {
    |            ^^^^^^^^^
...
161 |     pub fn operations(&self) -> &HashMap<String, Gas> {
    |            ^^^^^^^^^^

error: function `estimate_gas_limit` is never used
   --> node/src/gas.rs:205:8
    |
205 | pub fn estimate_gas_limit(
    |        ^^^^^^^^^^^^^^^^^^

error: multiple fields are never read
   --> node/src/metrics.rs:139:9
    |
135 | pub struct Metrics {
    |            ------- fields in this struct
...
139 |     pub dyt_block_height: IntGauge,
    |         ^^^^^^^^^^^^^^^^
140 |     pub dyt_blocks_produced_total: prometheus::IntCounterVec,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^
141 |     pub dyt_blocks_per_second: Gauge,
    |         ^^^^^^^^^^^^^^^^^^^^^
142 |     pub dyt_transactions_in_block: Histogram,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^
143 |     pub dyt_tps: Gauge,
    |         ^^^^^^^
144 |     pub dyt_block_time_seconds: Histogram,
    |         ^^^^^^^^^^^^^^^^^^^^^^
145 |     pub dyt_block_last_time_seconds: Gauge,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
146 |     pub dyt_txs_processed_total: IntCounter,
    |         ^^^^^^^^^^^^^^^^^^^^^^^
...
158 |     pub dyt_mempool_size: IntGauge,
    |         ^^^^^^^^^^^^^^^^
...
162 |     pub mempool_bytes: IntGauge,
    |         ^^^^^^^^^^^^^
163 |     pub mempool_admitted_total: IntCounter,
    |         ^^^^^^^^^^^^^^^^^^^^^^
164 |     pub mempool_rejected_total: prometheus::IntCounterVec,
    |         ^^^^^^^^^^^^^^^^^^^^^^
165 |     pub mempool_evicted_total: prometheus::IntCounterVec,
    |         ^^^^^^^^^^^^^^^^^^^^^
166 |     pub mempool_current_min_gas_price: IntGauge,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
167 |     pub mempool_gossip_duplicates_total: IntCounter,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
170 |     pub dyt_gas_used_per_block: Histogram,
    |         ^^^^^^^^^^^^^^^^^^^^^^
...
177 |     pub dyt_oracle_update_latency_seconds: Histogram,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
178 |     pub dyt_oracle_request_latency_seconds: Histogram,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
189 |     pub dyt_emission_pool_amount: prometheus::GaugeVec,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^
190 |     pub dyt_emission_pool_balance: prometheus::GaugeVec,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^
...
193 |     pub dyt_validator_missed_blocks_total: prometheus::IntCounterVec,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
194 |     pub dyt_validator_voting_power: prometheus::GaugeVec,
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^
...
200 |     pub build_info: IntGauge,
    |         ^^^^^^^^^^

error: methods `update_mempool_bytes`, `record_mempool_admission`, `record_mempool_rejection`, `record_mempool_eviction`, `update_mempool_min_gas_price`, and `record_gossip_duplicate` are never used
   --> node/src/metrics.rs:530:12
    |
204 | impl Metrics {
    | ------------ methods in this implementation
...
530 |     pub fn update_mempool_bytes(&self, bytes: usize) {
    |            ^^^^^^^^^^^^^^^^^^^^
...
535 |     pub fn record_mempool_admission(&self) {
    |            ^^^^^^^^^^^^^^^^^^^^^^^^
...
540 |     pub fn record_mempool_rejection(&self, reason: &str) {
    |            ^^^^^^^^^^^^^^^^^^^^^^^^
...
547 |     pub fn record_mempool_eviction(&self, reason: &str) {
    |            ^^^^^^^^^^^^^^^^^^^^^^^
...
554 |     pub fn update_mempool_min_gas_price(&self, gas_price: u64) {
    |            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
559 |     pub fn record_gossip_duplicate(&self) {
    |            ^^^^^^^^^^^^^^^^^^^^^^^

error: associated functions `keypair` and `sign` are never used
 --> node/src/crypto/mod.rs:2:8
  |
1 | pub trait PQC {
  |           --- associated functions in this trait
2 |     fn keypair() -> (Vec<u8>, Vec<u8>); // (sk, pk)
  |        ^^^^^^^
3 |     fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8>;
  |        ^^^^

error: methods `apply_transfer`, `apply_transfer_legacy`, and `credit_legacy` are never used
   --> node/src/state/mod.rs:121:12
    |
65  | impl State {
    | ---------- methods in this implementation
...
121 |     pub fn apply_transfer(
    |            ^^^^^^^^^^^^^^
...
154 |     pub fn apply_transfer_legacy(&mut self, from: &str, to: &str, amount: u128, fee: u128) {
    |            ^^^^^^^^^^^^^^^^^^^^^
...
168 |     pub fn credit_legacy(&mut self, addr: &str, amount: u128) {
    |            ^^^^^^^^^^^^^

error: method `put_ai_risks_batch` is never used
  --> node/src/storage/oracle.rs:29:12
   |
19 | impl<'a> OracleStore<'a> {
   | ------------------------ method in this implementation
...
29 |     pub fn put_ai_risks_batch(&self, records: &[AiRiskRecord]) -> anyhow::Result<Vec<String>> {
   |            ^^^^^^^^^^^^^^^^^^

error: associated items `success`, `failed`, and `fee_charged_datt` are never used
   --> node/src/storage/receipts.rs:87:12
    |
64  | impl TxReceipt {
    | -------------- associated items in this implementation
...
87  |     pub fn success(
    |            ^^^^^^^
...
116 |     pub fn failed(
    |            ^^^^^^
...
147 |     pub fn fee_charged_datt(&self) -> u64 {
    |            ^^^^^^^^^^^^^^^^

error: methods `get_balance_db` and `set_balance_db` are never used
   --> node/src/storage/state.rs:128:12
    |
13  | impl Storage {
    | ------------ methods in this implementation
...
128 |     pub fn get_balance_db(&self, addr: &str) -> u128 {
    |            ^^^^^^^^^^^^^^
...
143 |     pub fn set_balance_db(&self, addr: &str, bal: u128) -> anyhow::Result<()> {
    |            ^^^^^^^^^^^^^^

error: methods `with_signature`, `with_gas`, and `with_pqc` are never used
  --> node/src/storage/tx.rs:68:12
   |
28 | impl Transaction {
   | ---------------- methods in this implementation
...
68 |     pub fn with_signature(mut self, signature: impl Into<String>) -> Self {
   |            ^^^^^^^^^^^^^^
...
73 |     pub fn with_gas(mut self, gas_limit: u64, gas_price: u64) -> Self {
   |            ^^^^^^^^
...
79 |     pub fn with_pqc(
   |            ^^^^^^^^

error: associated function `new` is never used
  --> node/src/types/tx.rs:75:12
   |
74 | impl Tx {
   | ------- associated function in this implementation
75 |     pub fn new(
   |            ^^^

error: associated function `sign` is never used
   --> node/src/types/tx.rs:145:12
    |
144 | impl SignedTx {
    | ------------- associated function in this implementation
145 |     pub fn sign(tx: Tx, sk: &[u8], pk: &[u8]) -> Result<Self> {
    |            ^^^^

error: function `blake3_tx_hash` is never used
 --> node/src/util/hash.rs:3:8
  |
3 | pub fn blake3_tx_hash(data: &[u8]) -> String {
  |        ^^^^^^^^^^^^^^

error: name `PQC` contains a capitalized acronym
 --> node/src/crypto/mod.rs:1:11
  |
1 | pub trait PQC {
  |           ^^^ help: consider making the acronym lowercase, except the initial letter: `Pqc`
  |
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#upper_case_acronyms
  = note: `-D clippy::upper-case-acronyms` implied by `-D warnings`
  = help: to override `-D warnings` add `#[allow(clippy::upper_case_acronyms)]`

error: methods called `from_*` usually take no `self`
  --> node/src/types/tx.rs:57:25
   |
57 |     pub fn from_address(&self) -> &str {
   |                         ^^^^^
   |
   = help: consider choosing a less ambiguous name
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#wrong_self_convention
   = note: `-D clippy::wrong-self-convention` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::wrong_self_convention)]`

error: variables can be used directly in the `format!` string
  --> node/src/main.rs:72:56
   |
72 |       let storage = Arc::new(Storage::open(PathBuf::from(format!(
   |  ________________________________________________________^
73 | |         "{}/node.db",
74 | |         data_dir
75 | |     )))?);
   | |_____^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
   = note: `-D clippy::uninlined-format-args` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::uninlined_format_args)]`

error: variables can be used directly in the `format!` string
  --> node/src/main.rs:79:13
   |
79 |             eprintln!("Chain ID mismatch stored={} env={}", stored, chain_id);
   |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
79 -             eprintln!("Chain ID mismatch stored={} env={}", stored, chain_id);
79 +             eprintln!("Chain ID mismatch stored={stored} env={chain_id}");
   |

error: variables can be used directly in the `format!` string
   --> node/src/main.rs:265:17
    |
265 |                 eprintln!("Governance end_block error at height {}: {}", height, e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
265 -                 eprintln!("Governance end_block error at height {}: {}", height, e);
265 +                 eprintln!("Governance end_block error at height {height}: {e}");
    |

error: variables can be used directly in the `format!` string
   --> node/src/main.rs:350:17
    |
350 |                 eprintln!("Metrics server error: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
350 -                 eprintln!("Metrics server error: {}", e);
350 +                 eprintln!("Metrics server error: {e}");
    |

error: variables can be used directly in the `format!` string
   --> node/src/main.rs:363:17
    |
363 |                 eprintln!("Alerts engine error: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
363 -                 eprintln!("Alerts engine error: {}", e);
363 +                 eprintln!("Alerts engine error: {e}");
    |

error: could not compile `dytallix-lean-node` (bin "dytallix-lean-node") due to 51 previous errors
