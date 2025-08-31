
    Checking tokio v1.47.1
    Checking tracing-subscriber v0.3.19
    Checking tower-http v0.5.2
   Compiling async-stream-impl v0.3.6
    Checking async-stream v0.3.6
    Checking tokio-util v0.7.16
    Checking libp2p-swarm v0.43.7
    Checking if-watch v3.2.1
    Checking tokio-native-tls v0.3.1
    Checking hyper v1.7.0
    Checking trust-dns-proto v0.22.0
    Checking tokio-tungstenite v0.21.0
    Checking tokio-stream v0.1.17
    Checking libp2p-tcp v0.40.1
    Checking tokio-tungstenite v0.24.0
    Checking tower v0.5.2
    Checking tokio-tungstenite v0.20.1
    Checking dytallix-contracts v0.1.0 (/Users/rickglenn/dytallix/smart-contracts)
    Checking tokio-test v0.4.4
    Checking h2 v0.3.27
    Checking hyper-util v0.1.16
    Checking libp2p-allow-block-list v0.2.0
    Checking libp2p-connection-limits v0.2.1
    Checking libp2p-gossipsub v0.45.2
    Checking axum v0.7.9
    Checking libp2p-mdns v0.44.0
    Checking libp2p v0.52.4
    Checking hyper v0.14.32
    Checking hyper-tls v0.5.0
    Checking warp v0.3.7
    Checking reqwest v0.11.27
    Checking dytallix-node v0.1.0 (/Users/rickglenn/dytallix/blockchain-core)
error: the `#[test]` attribute may only be used on a non-associated function
   --> blockchain-core/src/genesis.rs:383:5
    |
383 |     #[test]
    |     ^^^^^^^ the `#[test]` macro causes a function to be run as a test and has no effect on non-functions
    |
help: replace with conditional compilation to make the item only exist when tests are being run
    |
383 -     #[test]
383 +     #[cfg(test)]
    |

error: unused import: `crate::types::TransferTransaction`
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:527:9
    |
527 |     use crate::types::TransferTransaction;
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = note: `-D unused-imports` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(unused_imports)]`

error: redundant field names in struct initialization
    --> blockchain-core/src/staking.rs:1040:13
     |
1040 |             pending: pending,
     |             ^^^^^^^^^^^^^^^^ help: replace it with: `pending`
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#redundant_field_names
     = note: `-D clippy::redundant-field-names` implied by `-D warnings`
     = help: to override `-D warnings` add `#[allow(clippy::redundant_field_names)]`

error: this looks like an `else if` but the `else` is missing
 --> blockchain-core/src/risk/pulseguard/graph/dag.rs:9:460
  |
9 | ...g(),0)); while let Some((n,d))=q.pop_front(){ if d==k { continue;} if let Some(edges)=self.adj.get(&n){ for e in edges { if visited.in...
  |                                                                      ^
  |
  = note: to remove this lint, add the missing `else` or add a new line before the second `if`
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#suspicious_else_formatting
  = note: `-D clippy::suspicious-else-formatting` implied by `-D warnings`
  = help: to override `-D warnings` add `#[allow(clippy::suspicious_else_formatting)]`

error: unused import: `serde_json`
 --> blockchain-core/src/consensus/integration_tests.rs:7:5
  |
7 | use serde_json;
  |     ^^^^^^^^^^

error: unused imports: `AIIntegrationConfig` and `AIIntegrationManager`
  --> blockchain-core/src/consensus/transaction_validation_tests.rs:10:40
   |
10 | use crate::consensus::ai_integration::{AIIntegrationConfig, AIIntegrationManager};
   |                                        ^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^

error: unused import: `dytallix_pqc::Signature`
 --> blockchain-core/src/consensus/performance_test.rs:7:5
  |
7 | use dytallix_pqc::Signature;
  |     ^^^^^^^^^^^^^^^^^^^^^^^

error: unused import: `std::time::Duration`
  --> blockchain-core/src/consensus/mod.rs:81:9
   |
81 |     use std::time::Duration;
   |         ^^^^^^^^^^^^^^^^^^^

error: unused variable: `runtime`
    --> blockchain-core/src/api/mod.rs:1632:5
     |
1632 |     runtime: Arc<crate::runtime::DytallixRuntime>,
     |     ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_runtime`
     |
     = note: `-D unused-variables` implied by `-D warnings`
     = help: to override `-D warnings` add `#[allow(unused_variables)]`

error: unused variable: `signature_valid`
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:347:58
    |
347 |     async fn check_auto_slashing(&self, oracle_id: &str, signature_valid: bool, is_accurate: bool) {
    |                                                          ^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_signature_valid`

error: unused variable: `is_accurate`
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:347:81
    |
347 |     async fn check_auto_slashing(&self, oracle_id: &str, signature_valid: bool, is_accurate: bool) {
    |                                                                                 ^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_is_accurate`

error: struct `BlockchainStats` is never constructed
  --> blockchain-core/src/api/mod.rs:38:8
   |
38 | struct BlockchainStats { // removed underscore - struct is intended for API responses
   |        ^^^^^^^^^^^^^^^
   |
   = note: `-D dead-code` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(dead_code)]`

error: struct `PeerInfo` is never constructed
  --> blockchain-core/src/api/mod.rs:58:8
   |
58 | struct PeerInfo { // removed underscore
   |        ^^^^^^^^

error: struct `SystemStatus` is never constructed
  --> blockchain-core/src/api/mod.rs:68:8
   |
68 | struct SystemStatus { // removed underscore
   |        ^^^^^^^^^^^^

error: associated functions `new_transaction` and `status_update` are never used
   --> blockchain-core/src/api/mod.rs:94:8
    |
85  | impl WebSocketMessage {
    | --------------------- associated functions in this implementation
...
94  |     fn new_transaction(tx: &TransactionDetails) -> Self {
    |        ^^^^^^^^^^^^^^^
...
102 |     fn status_update(status: &SystemStatus) -> Self {
    |        ^^^^^^^^^^^^^

error: struct `TransactionResponse` is never constructed
   --> blockchain-core/src/api/mod.rs:112:8
    |
112 | struct TransactionResponse { // removed underscore
    |        ^^^^^^^^^^^^^^^^^^^

error: struct `TransactionDetails` is never constructed
   --> blockchain-core/src/api/mod.rs:119:8
    |
119 | struct TransactionDetails { // removed underscore
    |        ^^^^^^^^^^^^^^^^^^

error: fields `address`, `consensus_pubkey`, and `commission_rate` are never read
   --> blockchain-core/src/api/mod.rs:141:5
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

error: fields `delegator`, `validator`, and `amount` are never read
   --> blockchain-core/src/api/mod.rs:148:5
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

error: fields `delegator` and `validator` are never read
   --> blockchain-core/src/api/mod.rs:155:5
    |
154 | struct _StakingClaimRequest { // underscore
    |        -------------------- fields in this struct
155 |     delegator: String,
    |     ^^^^^^^^^
156 |     validator: String,
    |     ^^^^^^^^^
    |
    = note: `_StakingClaimRequest` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: associated function `error` is never used
   --> blockchain-core/src/api/mod.rs:192:8
    |
183 | impl<T> ApiResponse<T> {
    | ---------------------- associated function in this implementation
...
192 |     fn error(message: String) -> Self {
    |        ^^^^^

error: fields `runtime` and `pqc_manager` are never read
  --> blockchain-core/src/consensus/consensus_engine.rs:77:5
   |
76 | pub struct ConsensusEngine {
   |            --------------- fields in this struct
77 |     runtime: Arc<DytallixRuntime>,
   |     ^^^^^^^
78 |     pqc_manager: Arc<PQCManager>,
   |     ^^^^^^^^^^^
   |
   = note: `ConsensusEngine` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: field `validators` is never read
   --> blockchain-core/src/consensus/mod_clean.rs:220:5
    |
216 | pub struct ConsensusEngine {
    |            --------------- field in this struct
...
220 |     validators: Arc<RwLock<Vec<String>>>,
    |     ^^^^^^^^^^
    |
    = note: `ConsensusEngine` has a derived impl for the trait `Debug`, but this is intentionally ignored during dead code analysis

error: associated functions `format_transfer_transaction_message` and `validate_transaction_signature_static` are never used
    --> blockchain-core/src/consensus/mod_clean.rs:1205:8
     |
229  | impl ConsensusEngine {
     | -------------------- associated functions in this implementation
...
1205 |     fn format_transfer_transaction_message(tx: &TransferTransaction) -> Vec<u8> {
     |        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
...
1213 |     fn validate_transaction_signature_static(
     |        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error: method `get_vault_path` is never used
   --> blockchain-core/src/secrets/providers.rs:193:8
    |
153 | impl VaultProvider {
    | ------------------ method in this implementation
...
193 |     fn get_vault_path(&self, name: &str) -> String {
    |        ^^^^^^^^^^^^^^

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/api/mod.rs:310:25
    |
310 |                         error!("balance error: {}", e);
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
    = note: `-D clippy::uninlined-format-args` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::uninlined_format_args)]`
help: change this to
    |
310 -                         error!("balance error: {}", e);
310 +                         error!("balance error: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/api/mod.rs:451:49
    |
451 |   ...                   error: Some(format!(
    |  ___________________________________^
452 | | ...                       "invalid_nonce:expected:{}:got:{}",
453 | | ...                       sender_nonce, n
454 | | ...                   )),
    | |_______________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/api/mod.rs:573:21
    |
573 |                     error!("store tx err: {}", e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
573 -                     error!("store tx err: {}", e);
573 +                     error!("store tx err: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/api/mod.rs:606:463
    |
606 | ...http::StatusCode::OK).into_response()) }, Err(e)=> { error!("blocks err: {}", e); Ok(warp::reply::with_status(warp::reply::json(&ApiRe...
    |                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
606 -                 match storage.list_blocks_desc(limit, from).await { Ok(list) => { let out: Vec<_> = list.into_iter().map(|b| serde_json::json!({"number": b.header.number, "hash": b.hash(), "parent_hash": b.header.parent_hash, "timestamp": b.header.timestamp, "tx_count": b.transactions.len()})).collect(); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(out)), warp::http::StatusCode::OK).into_response()) }, Err(e)=> { error!("blocks err: {}", e); Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("internal_error".into()) }), warp::http::StatusCode::INTERNAL_SERVER_ERROR).into_response()) } }
606 +                 match storage.list_blocks_desc(limit, from).await { Ok(list) => { let out: Vec<_> = list.into_iter().map(|b| serde_json::json!({"number": b.header.number, "hash": b.hash(), "parent_hash": b.header.parent_hash, "timestamp": b.header.timestamp, "tx_count": b.transactions.len()})).collect(); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(out)), warp::http::StatusCode::OK).into_response()) }, Err(e)=> { error!("blocks err: {e}"); Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("internal_error".into()) }), warp::http::StatusCode::INTERNAL_SERVER_ERROR).into_response()) } }
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/api/mod.rs:620:639
    |
620 | ...::StatusCode::NOT_FOUND).into_response()), Err(e)=> { error!("block err: {}", e); Ok(warp::reply::with_status(warp::reply::json(&ApiRe...
    |                                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
620 -             match res { Ok(Some(block)) => { let resp = serde_json::json!({"number": block.header.number, "hash": block.hash(), "parent_hash": block.header.parent_hash, "timestamp": block.header.timestamp, "transactions": block.transactions.iter().map(|t| t.hash()).collect::<Vec<_>>()}); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(resp)), warp::http::StatusCode::OK).into_response()) }, Ok(None)=> Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("not_found".into()) }), warp::http::StatusCode::NOT_FOUND).into_response()), Err(e)=> { error!("block err: {}", e); Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("internal_error".into()) }), warp::http::StatusCode::INTERNAL_SERVER_ERROR).into_response()) } }
620 +             match res { Ok(Some(block)) => { let resp = serde_json::json!({"number": block.header.number, "hash": block.hash(), "parent_hash": block.header.parent_hash, "timestamp": block.header.timestamp, "transactions": block.transactions.iter().map(|t| t.hash()).collect::<Vec<_>>()}); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(resp)), warp::http::StatusCode::OK).into_response()) }, Ok(None)=> Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("not_found".into()) }), warp::http::StatusCode::NOT_FOUND).into_response()), Err(e)=> { error!("block err: {e}"); Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("internal_error".into()) }), warp::http::StatusCode::INTERNAL_SERVER_ERROR).into_response()) } }
    |

error: length comparison to one
   --> blockchain-core/src/api/mod.rs:775:32
    |
775 | ...                   if params.len() >= 1 {
    |                          ^^^^^^^^^^^^^^^^^ help: using `!is_empty` is clearer and more explicit: `!params.is_empty()`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#len_zero
    = note: `-D clippy::len-zero` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::len_zero)]`

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/api/mod.rs:1049:29
     |
1049 | ...                   info!("Received WebSocket message: {}", text);
     |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1049 -                             info!("Received WebSocket message: {}", text);
1049 +                             info!("Received WebSocket message: {text}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/api/mod.rs:1067:21
     |
1067 |                     error!("WebSocket error: {}", e);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1067 -                     error!("WebSocket error: {}", e);
1067 +                     error!("WebSocket error: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/api/mod.rs:1079:17
     |
1079 |                 error!("Failed to send WebSocket message: {}", e);
     |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1079 -                 error!("Failed to send WebSocket message: {}", e);
1079 +                 error!("Failed to send WebSocket message: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/api/mod.rs:1469:17
     |
1469 |     let input = format!("{}_{}", code_hash, timestamp);
     |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1469 -     let input = format!("{}_{}", code_hash, timestamp);
1469 +     let input = format!("{code_hash}_{timestamp}");
     |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/config.rs:116:39
    |
116 |                   config.database_url = format!(
    |  _______________________________________^
117 | |                     "postgresql://{}:{}@{}:{}/{}",
118 | |                     db_username, db_password, db_host, db_port, db_name
119 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: this `impl` can be derived
   --> blockchain-core/src/consensus/types/ai_types.rs:196:1
    |
196 | / impl Default for ResponseStatus {
197 | |     fn default() -> Self {
198 | |         ResponseStatus::Success
199 | |     }
200 | | }
    | |_^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#derivable_impls
    = note: `-D clippy::derivable-impls` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::derivable_impls)]`
help: replace the manual implementation with a derive attribute and mark the default variant
    |
37  + #[derive(Default)]
38  ~ pub enum ResponseStatus {
39  ~     #[default]
40  ~     Success,
    |

error: this `impl` can be derived
   --> blockchain-core/src/consensus/types/ai_types.rs:202:1
    |
202 | / impl Default for RequestPriority {
203 | |     fn default() -> Self {
204 | |         RequestPriority::Normal
205 | |     }
206 | | }
    | |_^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#derivable_impls
help: replace the manual implementation with a derive attribute and mark the default variant
    |
28  + #[derive(Default)]
29  ~ pub enum RequestPriority {
30  |     Low,
31  ~     #[default]
32  ~     Normal,
    |

error: manual arithmetic check found
   --> blockchain-core/src/consensus/types/ai_types.rs:381:9
    |
381 | /         if now > self.timestamp {
382 | |             now - self.timestamp
383 | |         } else {
384 | |             0
385 | |         }
    | |_________^ help: replace it with: `now.saturating_sub(self.timestamp)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#implicit_saturating_sub
    = note: `-D clippy::implicit-saturating-sub` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::implicit_saturating_sub)]`

error: you should consider adding a `Default` implementation for `AIRequestMetadata`
   --> blockchain-core/src/consensus/types/ai_types.rs:511:5
    |
511 | /     pub fn new() -> Self {
512 | |         Self {
513 | |             client_version: None,
514 | |             request_source: None,
...   |
519 | |     }
    | |_____^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#new_without_default
    = note: `-D clippy::new-without-default` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::new_without_default)]`
help: try adding this
    |
509 + impl Default for AIRequestMetadata {
510 +     fn default() -> Self {
511 +         Self::new()
512 +     }
513 + }
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/types/error_types.rs:366:17
    |
366 |                 format!("Request timeout after {}ms", timeout_ms),
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
366 -                 format!("Request timeout after {}ms", timeout_ms),
366 +                 format!("Request timeout after {timeout_ms}ms"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/types/error_types.rs:371:38
    |
371 |                 AIResponseError::new(format!("HTTP_{}", status), message, category, retryable)
    |                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
371 -                 AIResponseError::new(format!("HTTP_{}", status), message, category, retryable)
371 +                 AIResponseError::new(format!("HTTP_{status}"), message, category, retryable)
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/types/error_types.rs:405:17
    |
405 |                 format!("Max retries exceeded: {} attempts failed", attempts),
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
405 -                 format!("Max retries exceeded: {} attempts failed", attempts),
405 +                 format!("Max retries exceeded: {attempts} attempts failed"),
    |

error: manual arithmetic check found
   --> blockchain-core/src/consensus/types/oracle_types.rs:204:9
    |
204 | /         if now > self.signature_timestamp {
205 | |             now - self.signature_timestamp
206 | |         } else {
207 | |             0
208 | |         }
    | |_________^ help: replace it with: `now.saturating_sub(self.signature_timestamp)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#implicit_saturating_sub

error: manual arithmetic check found
   --> blockchain-core/src/consensus/types/oracle_types.rs:335:17
    |
335 | /                 if now > last {
336 | |                     now - last
337 | |                 } else {
338 | |                     0
339 | |                 }
    | |_________________^ help: replace it with: `now.saturating_sub(last)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#implicit_saturating_sub

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_oracle_client.rs:128:17
    |
128 |                 warn!("Server error on attempt {}, retrying...", attempts);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
128 -                 warn!("Server error on attempt {}, retrying...", attempts);
128 +                 warn!("Server error on attempt {attempts}, retrying...");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_oracle_client.rs:233:21
    |
233 | /                     warn!(
234 | |                         "AI analysis confidence score below threshold: {}",
235 | |                         confidence
236 | |                     );
    | |_____________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:118:13
    |
118 | /             warn!(
119 | |                 "Failed to process staking rewards for block {}: {}",
120 | |                 block_number, e
121 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:123:13
    |
123 |             info!("Processed staking rewards for block {}", block_number);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
123 -             info!("Processed staking rewards for block {}", block_number);
123 +             info!("Processed staking rewards for block {block_number}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:141:21
    |
141 |                     error!("Transaction validation error: {}", e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
141 -                     error!("Transaction validation error: {}", e);
141 +                     error!("Transaction validation error: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:147:13
    |
147 | /             warn!(
148 | |                 "Rejected {} transactions during block proposal",
149 | |                 rejected_count
150 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:159:9
    |
159 | /         info!(
160 | |             "Block {} validator set hash: {}",
161 | |             block_number, validator_set_hash
162 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:215:30
    |
215 |             result.add_error(format!("Basic block validation failed: {}", e));
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
215 -             result.add_error(format!("Basic block validation failed: {}", e));
215 +             result.add_error(format!("Basic block validation failed: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:238:38
    |
238 |                     result.add_error(format!("Transaction validation error: {}", e));
    |                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
238 -                     result.add_error(format!("Transaction validation error: {}", e));
238 +                     result.add_error(format!("Transaction validation error: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/block_processing.rs:262:40
    |
262 |                     result.add_warning(format!("AI block validation failed: {}", e));
    |                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
262 -                     result.add_warning(format!("AI block validation failed: {}", e));
262 +                     result.add_warning(format!("AI block validation failed: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:112:13
    |
112 |             error!("Failed to initialize key management: {}", e);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
112 -             error!("Failed to initialize key management: {}", e);
112 +             error!("Failed to initialize key management: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:132:17
    |
132 |                 warn!("AI integration not available: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
132 -                 warn!("AI integration not available: {}", e);
132 +                 warn!("AI integration not available: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:164:26
    |
164 |             .map_err(|e| format!("Failed to initialize WASM runtime: {:?}", e))?,
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
164 -             .map_err(|e| format!("Failed to initialize WASM runtime: {:?}", e))?,
164 +             .map_err(|e| format!("Failed to initialize WASM runtime: {e:?}"))?,
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:193:17
    |
193 |                 warn!("Failed to rotate keys: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
193 -                 warn!("Failed to rotate keys: {}", e);
193 +                 warn!("Failed to rotate keys: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:205:13
    |
205 |             warn!("AI service health check failed: {}", e);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
205 -             warn!("AI service health check failed: {}", e);
205 +             warn!("AI service health check failed: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:267:21
    |
267 | /                     warn!(
268 | |                         "AI analysis confidence score below threshold: {}",
269 | |                         confidence
270 | |                     );
    | |_____________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:528:17
    |
528 |                 error!("WASM contract deployment failed: {:?}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
528 -                 error!("WASM contract deployment failed: {:?}", e);
528 +                 error!("WASM contract deployment failed: {e:?}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:529:52
    |
529 |                   return Ok(ExecutionResult::failure(format!(
    |  ____________________________________________________^
530 | |                     "Contract deployment failed: {:?}",
531 | |                     e
532 | |                 )));
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:549:9
    |
549 |         info!("Contract deployed successfully at {}", deployed_address);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
549 -         info!("Contract deployed successfully at {}", deployed_address);
549 +         info!("Contract deployed successfully at {deployed_address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:602:17
    |
602 |                 error!("WASM contract call failed: {:?}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
602 -                 error!("WASM contract call failed: {:?}", e);
602 +                 error!("WASM contract call failed: {e:?}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/consensus_engine.rs:603:52
    |
603 |                   return Ok(ExecutionResult::failure(format!(
    |  ____________________________________________________^
604 | |                     "Contract call failed: {:?}",
605 | |                     e
606 | |                 )));
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: unnecessary use of `to_string`
   --> blockchain-core/src/consensus/consensus_engine.rs:647:33
    |
647 |         Ok(storage.get_contract(&contract_address.to_string()).await?)
    |                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: use: `contract_address`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_to_owned
    = note: `-D clippy::unnecessary-to-owned` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::unnecessary_to_owned)]`

error: unused variable: `consensus`
   --> blockchain-core/src/consensus/transaction_validation_tests.rs:199:9
    |
199 |     let consensus = create_test_consensus_engine().await?;
    |         ^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_consensus`

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/key_management.rs:87:17
   |
87 |                 error!("Error reading key file: {}", e);
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
87 -                 error!("Error reading key file: {}", e);
87 +                 error!("Error reading key file: {e}");
   |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/key_management.rs:238:13
    |
238 |             info!("Backed up PQC keys to {}", backup_path);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
238 -             info!("Backed up PQC keys to {}", backup_path);
238 +             info!("Backed up PQC keys to {backup_path}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/key_management.rs:261:9
    |
261 |         info!("Restored PQC keys from backup: {}", backup_path);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
261 -         info!("Restored PQC keys from backup: {}", backup_path);
261 +         info!("Restored PQC keys from backup: {backup_path}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:143:30
    |
143 |             result.add_error(format!("Basic validation failed: {}", e));
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
143 -             result.add_error(format!("Basic validation failed: {}", e));
143 +             result.add_error(format!("Basic validation failed: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:154:40
    |
154 |                     result.add_warning(format!("AI validation failed: {}", e));
    |                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
154 -                     result.add_warning(format!("AI validation failed: {}", e));
154 +                     result.add_warning(format!("AI validation failed: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:181:36
    |
181 |                 result.add_warning(format!("Failed to add to high-risk queue: {}", e));
    |                                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
181 -                 result.add_warning(format!("Failed to add to high-risk queue: {}", e));
181 +                 result.add_warning(format!("Failed to add to high-risk queue: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:220:32
    |
220 |             result.add_warning(format!("Failed to log to audit trail: {}", e));
    |                                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
220 -             result.add_warning(format!("Failed to log to audit trail: {}", e));
220 +             result.add_warning(format!("Failed to log to audit trail: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:274:13
    |
274 | /             info!(
275 | |                 "Transaction validation completed: risk={:.2}, fraud={:.2}, priority={}",
276 | |                 risk_score, fraud_probability, risk_priority
277 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:301:21
    |
301 |                     warn!("Failed to add high-risk transaction to queue: {}", e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
301 -                     warn!("Failed to add high-risk transaction to queue: {}", e);
301 +                     warn!("Failed to add high-risk transaction to queue: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/transaction_validation.rs:341:30
    |
341 |             result.add_error(format!("Basic validation failed: {}", e));
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
341 -             result.add_error(format!("Basic validation failed: {}", e));
341 +             result.add_error(format!("Basic validation failed: {e}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:325:24
    |
325 |                 error: format!("Replay protection failed: {}", replay_error),
    |                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
325 -                 error: format!("Replay protection failed: {}", replay_error),
325 +                 error: format!("Replay protection failed: {replay_error}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:376:28
    |
376 |                     error: format!("{:?}", verification_error),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
376 -                     error: format!("{:?}", verification_error),
376 +                     error: format!("{verification_error:?}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:456:28
    |
456 |                     error: format!("AI service error: {}", e),
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
456 -                     error: format!("AI service error: {}", e),
456 +                     error: format!("AI service error: {e}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:554:24
    |
554 |                 error: format!("AI verification failed: {}", error),
    |                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
554 -                 error: format!("AI verification failed: {}", error),
554 +                 error: format!("AI verification failed: {error}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:787:29
    |
787 |                     reason: format!("Large transaction amount: {} > {}", amount, threshold),
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
787 -                     reason: format!("Large transaction amount: {} > {}", amount, threshold),
787 +                     reason: format!("Large transaction amount: {amount} > {threshold}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:804:25
    |
804 |                   reason: format!(
    |  _________________________^
805 | |                     "Medium risk score: {:.3} requires manual review",
806 | |                     risk_score
807 | |                 ),
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:840:17
    |
840 | /                 log::warn!(
841 | |                     "Unknown transaction type for risk threshold update: {}",
842 | |                     transaction_type
843 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:876:21
    |
876 | /                     log::info!("RISK_DECISION: AUTO_APPROVE - TX: {} Type: {} Risk: {:.3} Fraud: {:.3} Confidence: {:.3}",
877 | |                               transaction_hash, transaction_type, risk_score, fraud_probability, confidence);
    | |____________________________________________________________________________________________________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:880:21
    |
880 | /                     log::warn!("RISK_DECISION: REQUIRE_REVIEW - TX: {} Type: {} Risk: {:.3} Fraud: {:.3} Confidence: {:.3} Reason: {}",
881 | |                               transaction_hash, transaction_type, risk_score, fraud_probability, confidence, reason);
    | |____________________________________________________________________________________________________________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/ai_integration.rs:884:21
    |
884 | /                     log::error!("RISK_DECISION: AUTO_REJECT - TX: {} Type: {} Risk: {:.3} Fraud: {:.3} Confidence: {:.3} Reason: {}",
885 | |                               transaction_hash, transaction_type, risk_score, fraud_probability, confidence, reason);
    | |____________________________________________________________________________________________________________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: this function has too many arguments (9/7)
   --> blockchain-core/src/consensus/audit_trail.rs:257:5
    |
257 | /     pub async fn record_ai_decision(
258 | |         &self,
259 | |         transaction: &Transaction,
260 | |         transaction_hash: TxHash,
...   |
266 | |         block_number: Option<u64>,
267 | |     ) -> Result<Uuid> {
    | |_____________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#too_many_arguments
    = note: `-D clippy::too-many-arguments` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::too_many_arguments)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/audit_trail.rs:367:9
    |
367 |         info!("Flushed {} audit entries to storage", flush_count);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
367 -         info!("Flushed {} audit entries to storage", flush_count);
367 +         info!("Flushed {flush_count} audit entries to storage");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/audit_trail.rs:538:13
    |
538 |             info!("Archived {} old audit entries", archived_count);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
538 -             info!("Archived {} old audit entries", archived_count);
538 +             info!("Archived {archived_count} old audit entries");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/audit_trail.rs:557:13
    |
557 |             info!("Updated compliance status for audit entry {}", audit_id);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
557 -             info!("Updated compliance status for audit entry {}", audit_id);
557 +             info!("Updated compliance status for audit entry {audit_id}");
    |

error: this function can be simplified using the `async fn` syntax
   --> blockchain-core/src/consensus/audit_trail.rs:566:5
    |
566 |     fn should_flush(&self) -> impl std::future::Future<Output = bool> + '_ {
    |     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_async_fn
    = note: `-D clippy::manual-async-fn` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::manual_async_fn)]`
help: make the function `async` and return the output of the future directly
    |
566 ~     async fn should_flush(&self) -> bool {
567 +         let pending = self.pending_entries.read().await;
568 +         pending.len() >= self.config.batch_write_size
569 +     }
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:159:9
    |
159 |         info!("Generating compliance report with ID: {}", report_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
159 -         info!("Generating compliance report with ID: {}", report_id);
159 +         info!("Generating compliance report with ID: {report_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:168:17
    |
168 |                 error!("Failed to generate compliance report: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
168 -                 error!("Failed to generate compliance report: {}", e);
168 +                 error!("Failed to generate compliance report: {e}");
    |

error: manually reimplementing `div_ceil`
   --> blockchain-core/src/consensus/compliance_api.rs:197:27
    |
197 |         let total_pages = (total_entries + page_size - 1) / page_size;
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.div_ceil()`: `total_entries.div_ceil(page_size)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_div_ceil
    = note: `-D clippy::manual-div-ceil` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::manual_div_ceil)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:273:17
    |
273 |                 error!("Failed to export compliance data: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
273 -                 error!("Failed to export compliance data: {}", e);
273 +                 error!("Failed to export compliance data: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:300:28
    |
300 |         let download_url = format!("/api/compliance/export/download/{}", report_id);
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
300 -         let download_url = format!("/api/compliance/export/download/{}", report_id);
300 +         let download_url = format!("/api/compliance/export/download/{report_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:364:17
    |
364 |                 error!("Failed to update compliance status: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
364 -                 error!("Failed to update compliance status: {}", e);
364 +                 error!("Failed to update compliance status: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:379:9
    |
379 |         info!("Getting audit trail for transaction: {}", transaction_hash);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
379 -         info!("Getting audit trail for transaction: {}", transaction_hash);
379 +         info!("Getting audit trail for transaction: {transaction_hash}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:407:17
    |
407 |                 info!("Successfully archived {} entries", archived_count);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
407 -                 info!("Successfully archived {} entries", archived_count);
407 +                 info!("Successfully archived {archived_count} entries");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/compliance_api.rs:415:17
    |
415 |                 error!("Failed to archive entries: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
415 -                 error!("Failed to archive entries: {}", e);
415 +                 error!("Failed to archive entries: {e}");
    |

error: this function has too many arguments (9/7)
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:151:5
    |
151 | /     pub async fn register_oracle(
152 | |         &self,
153 | |         oracle_address: Address,
154 | |         oracle_name: String,
...   |
160 | |         contact_info: Option<String>,
161 | |     ) -> Result<()> {
    | |___________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#too_many_arguments

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:162:9
    |
162 | /         info!(
163 | |             "Registering oracle {} with stake {}",
164 | |             oracle_address, stake_amount
165 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:181:9
    |
181 |         info!("Oracle {} registered successfully", oracle_address);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
181 -         info!("Oracle {} registered successfully", oracle_address);
181 +         info!("Oracle {oracle_address} registered successfully");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:188:9
    |
188 |         info!("Oracle {} activated", oracle_address);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
188 -         info!("Oracle {} activated", oracle_address);
188 +         info!("Oracle {oracle_address} activated");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:302:17
    |
302 |                 warn!("Oracle {} authorization failed: {}", oracle_id, error);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
302 -                 warn!("Oracle {} authorization failed: {}", oracle_id, error);
302 +                 warn!("Oracle {oracle_id} authorization failed: {error}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:314:17
    |
314 | /                 error!(
315 | |                     "Signature verification failed for oracle {}: {}",
316 | |                     oracle_id, e
317 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:332:13
    |
332 | /             warn!(
333 | |                 "Failed to update reputation for oracle {}: {}",
334 | |                 oracle_id, e
335 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:384:21
    |
384 |                     error!("Failed to slash oracle {}: {}", oracle_id, e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
384 -                     error!("Failed to slash oracle {}: {}", oracle_id, e);
384 +                     error!("Failed to slash oracle {oracle_id}: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:386:21
    |
386 | /                     warn!(
387 | |                         "Auto-slashing initiated for oracle {}: {}",
388 | |                         oracle_id, reason
389 | |                     );
    | |_____________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:501:9
    |
501 |         info!("Oracle {} manually slashed", oracle_address);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
501 -         info!("Oracle {} manually slashed", oracle_address);
501 +         info!("Oracle {oracle_address} manually slashed");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:510:9
    |
510 |         info!("Oracle {} added to whitelist", oracle_address);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
510 -         info!("Oracle {} added to whitelist", oracle_address);
510 +         info!("Oracle {oracle_address} added to whitelist");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/enhanced_ai_integration.rs:519:9
    |
519 |         info!("Oracle {} blacklisted: {}", oracle_address, reason);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
519 -         info!("Oracle {} blacklisted: {}", oracle_address, reason);
519 +         info!("Oracle {oracle_address} blacklisted: {reason}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:303:9
    |
303 | /         info!(
304 | |             "Officer {} started reviewing transaction {}",
305 | |             officer_id, queue_id
306 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:338:9
    |
338 |         info!("Officer {} approved transaction {}", officer_id, queue_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
338 -         info!("Officer {} approved transaction {}", officer_id, queue_id);
338 +         info!("Officer {officer_id} approved transaction {queue_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:368:9
    |
368 |         info!("Officer {} rejected transaction {}", officer_id, queue_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
368 -         info!("Officer {} rejected transaction {}", officer_id, queue_id);
368 +         info!("Officer {officer_id} rejected transaction {queue_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:406:27
    |
406 |                 Err(e) => warn!("Failed to approve transaction {}: {}", queue_id, e),
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
406 -                 Err(e) => warn!("Failed to approve transaction {}: {}", queue_id, e),
406 +                 Err(e) => warn!("Failed to approve transaction {queue_id}: {e}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:433:27
    |
433 |                 Err(e) => warn!("Failed to reject transaction {}: {}", queue_id, e),
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
433 -                 Err(e) => warn!("Failed to reject transaction {}: {}", queue_id, e),
433 +                 Err(e) => warn!("Failed to reject transaction {queue_id}: {e}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:437:9
    |
437 | /         info!(
438 | |             "Officer {} bulk rejected {} transactions",
439 | |             officer_id, rejected_count
440 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:498:13
    |
498 |             info!("Expired {} transactions from queue", expired_count);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
498 -             info!("Expired {} transactions from queue", expired_count);
498 +             info!("Expired {expired_count} transactions from queue");
    |

error: you seem to be trying to use `match` for destructuring a single pattern. Consider using `if let`
   --> blockchain-core/src/consensus/high_risk_queue.rs:538:9
    |
538 | /         match risk_decision {
539 | |             RiskProcessingDecision::RequireReview { reason } => {
540 | |                 tags.push(format!("review-reason:{}", reason));
...   |
543 | |         }
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#single_match
    = note: `-D clippy::single-match` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::single_match)]`
help: try
    |
538 ~         if let RiskProcessingDecision::RequireReview { reason } = risk_decision {
539 +             tags.push(format!("review-reason:{}", reason));
540 +         }
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:540:27
    |
540 |                 tags.push(format!("review-reason:{}", reason));
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
540 -                 tags.push(format!("review-reason:{}", reason));
540 +                 tags.push(format!("review-reason:{reason}"));
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:594:17
    |
594 | /                 warn!(
595 | |                     "🚨 New {:?} priority transaction queued for review: {}",
596 | |                     priority, queue_id
597 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:600:17
    |
600 |                 warn!("⏰ Transaction expired in queue: {}", queue_id);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
600 -                 warn!("⏰ Transaction expired in queue: {}", queue_id);
600 +                 warn!("⏰ Transaction expired in queue: {queue_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:607:17
    |
607 | /                 warn!(
608 | |                     "⏰ Review timeout for transaction {} (officer: {})",
609 | |                     queue_id, officer_id
610 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/high_risk_queue.rs:617:17
    |
617 | /                 warn!(
618 | |                     "⚠️ Queue approaching capacity: {}/{}",
619 | |                     current_size, max_size
620 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:177:13
    |
177 | /             info!(
178 | |                 "Notification {} acknowledged by {}",
179 | |                 notification_id, officer_id
180 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:256:13
    |
256 |             info!("Cleaned up {} old notifications", removed_count);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
256 -             info!("Cleaned up {} old notifications", removed_count);
256 +             info!("Cleaned up {removed_count} old notifications");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:271:29
    |
271 |                 let title = format!("🚨 New {:?} Priority Transaction", tx_priority);
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
271 -                 let title = format!("🚨 New {:?} Priority Transaction", tx_priority);
271 +                 let title = format!("🚨 New {tx_priority:?} Priority Transaction");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:272:31
    |
272 |                   let message = format!(
    |  _______________________________^
273 | |                     "A new {:?} priority transaction has been queued for manual review. Queue ID: {}, Transaction: {}, Risk Score: {:.2}",
274 | |                     tx_priority, queue_id, transaction_hash, risk_score
275 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:290:31
    |
290 |                   let message = format!(
    |  _______________________________^
291 | |                     "Transaction {} (Queue ID: {}) has expired in the review queue without being processed.",
292 | |                     transaction_hash, queue_id
293 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:302:31
    |
302 |                   let message = format!(
    |  _______________________________^
303 | |                     "Transaction {} has exceeded the maximum review time. Officer: {}",
304 | |                     queue_id, officer_id
305 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:314:31
    |
314 |                   let message = format!(
    |  _______________________________^
315 | |                     "The high-risk transaction queue is approaching capacity: {}/{} transactions",
316 | |                     current_size, max_size
317 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:326:31
    |
326 |                   let message = format!(
    |  _______________________________^
327 | |                     "Transaction {} (Queue ID: {}) has been approved by officer {}",
328 | |                     transaction_hash, queue_id, officer_id
329 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:339:31
    |
339 |                   let message = format!(
    |  _______________________________^
340 | |                     "Transaction {} (Queue ID: {}) has been rejected by officer {}. Reason: {}",
341 | |                     transaction_hash, queue_id, officer_id, reason
342 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:351:31
    |
351 |                   let message = format!(
    |  _______________________________^
352 | |                     "Transaction {} (Queue ID: {}) has been assigned to officer {} for manual review",
353 | |                     transaction_hash, queue_id, officer_id
354 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:358:29
    |
358 |                 let title = format!("🚨 System Alert ({:?})", severity);
    |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
358 -                 let title = format!("🚨 System Alert ({:?})", severity);
358 +                 let title = format!("🚨 System Alert ({severity:?})");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:416:21
    |
416 |                     warn!("Failed to send email notification: {}", e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
416 -                     warn!("Failed to send email notification: {}", e);
416 +                     warn!("Failed to send email notification: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:432:21
    |
432 |                     warn!("Failed to send webhook notification: {}", e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
432 -                     warn!("Failed to send webhook notification: {}", e);
432 +                     warn!("Failed to send webhook notification: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:475:13
    |
475 |             info!("🔗 [WEBHOOK PLACEHOLDER] URL: {}", webhook_url);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
475 -             info!("🔗 [WEBHOOK PLACEHOLDER] URL: {}", webhook_url);
475 +             info!("🔗 [WEBHOOK PLACEHOLDER] URL: {webhook_url}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/notification_system.rs:518:17
    |
518 |                 error!("Failed to send notification: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
518 -                 error!("Failed to send notification: {}", e);
518 +                 error!("Failed to send notification: {e}");
    |

error: this `impl` can be derived
   --> blockchain-core/src/consensus/oracle_registry.rs:211:1
    |
211 | / impl Default for OracleAccessControl {
212 | |     fn default() -> Self {
213 | |         Self {
214 | |             whitelist: Vec::new(),
...   |
220 | | }
    | |_^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#derivable_impls
help: replace the manual implementation with a derive attribute
    |
200 + #[derive(Default)]
201 ~ pub struct OracleAccessControl {
    |

error: this function has too many arguments (9/7)
   --> blockchain-core/src/consensus/oracle_registry.rs:288:5
    |
288 | /     pub async fn register_oracle(
289 | |         &self,
290 | |         oracle_address: Address,
291 | |         oracle_name: String,
...   |
297 | |         contact_info: Option<String>,
298 | |     ) -> Result<()> {
    | |___________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#too_many_arguments

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:378:9
    |
378 | /         info!(
379 | |             "Oracle {} registered successfully with stake {}",
380 | |             oracle_address, stake_amount
381 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:399:21
    |
399 |                     info!("Oracle {} activated", oracle_address);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
399 -                     info!("Oracle {} activated", oracle_address);
399 +                     info!("Oracle {oracle_address} activated");
    |

error: clamp-like pattern without using clamp function
   --> blockchain-core/src/consensus/oracle_registry.rs:468:40
    |
468 |             reputation.current_score = new_score.min(1.0).max(0.0);
    |                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: replace with clamp: `new_score.clamp(0.0, 1.0)`
    |
    = note: clamp will panic if max < min, min.is_nan(), or max.is_nan()
    = note: clamp returns NaN if the input is NaN
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_clamp
    = note: `-D clippy::manual-clamp` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::manual_clamp)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:542:17
    |
542 | /                 error!(
543 | |                     "Oracle {} immediately slashed for: {}. Amount: {}",
544 | |                     oracle_address, slash_reason, slash_amount
545 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:553:17
    |
553 | /                 warn!(
554 | |                     "Oracle {} scheduled for slashing after grace period. Reason: {}. Amount: {}",
555 | |                     oracle_address, slash_reason, slash_amount
556 | |                 );
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:594:13
    |
594 |             info!("Processed {} pending slashing operations", slashed_count);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
594 -             info!("Processed {} pending slashing operations", slashed_count);
594 +             info!("Processed {slashed_count} pending slashing operations");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:605:13
    |
605 |             info!("Oracle {} added to whitelist", oracle_address);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
605 -             info!("Oracle {} added to whitelist", oracle_address);
605 +             info!("Oracle {oracle_address} added to whitelist");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:618:13
    |
618 |             info!("Oracle {} added to blacklist: {}", oracle_address, reason);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
618 -             info!("Oracle {} added to blacklist: {}", oracle_address, reason);
618 +             info!("Oracle {oracle_address} added to blacklist: {reason}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/oracle_registry.rs:682:13
    |
682 |             debug!("Applied daily maintenance to oracle {}", address);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
682 -             debug!("Applied daily maintenance to oracle {}", address);
682 +             debug!("Applied daily maintenance to oracle {address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/performance_optimizer.rs:326:9
    |
326 |         debug!("Added transaction to batch queue (merged: {})", merged);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
326 -         debug!("Added transaction to batch queue (merged: {})", merged);
326 +         debug!("Added transaction to batch queue (merged: {merged})");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/performance_optimizer.rs:389:9
    |
389 |         warn!("Activated fallback mode: {:?}", mode);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
389 -         warn!("Activated fallback mode: {:?}", mode);
389 +         warn!("Activated fallback mode: {mode:?}");
    |

error: this `if` has identical blocks
   --> blockchain-core/src/consensus/performance_optimizer.rs:441:44
    |
441 |                   } else if risk_score > 0.6 {
    |  ____________________________________________^
442 | |                     RiskProcessingDecision::AutoApprove
443 | |                 } else {
    | |_________________^
    |
note: same as this
   --> blockchain-core/src/consensus/performance_optimizer.rs:443:24
    |
443 |                   } else {
    |  ________________________^
444 | |                     RiskProcessingDecision::AutoApprove
445 | |                 };
    | |_________________^
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#if_same_then_else
    = note: `-D clippy::if-same-then-else` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::if_same_then_else)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/performance_optimizer.rs:574:13
    |
574 |             info!("Cleaned up {} expired cache entries", removed_count);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
574 -             info!("Cleaned up {} expired cache entries", removed_count);
574 +             info!("Cleaned up {removed_count} expired cache entries");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/performance_optimizer.rs:661:9
    |
661 |         debug!("Evicted {} cache entries", evict_count);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
661 -         debug!("Evicted {} cache entries", evict_count);
661 +         debug!("Evicted {evict_count} cache entries");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:188:17
    |
188 | /                 write!(
189 | |                     f,
190 | |                     "Nonce {} from oracle {} was already used at {}",
191 | |                     nonce, oracle_id, first_used
192 | |                 )
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:198:17
    |
198 | /                 write!(
199 | |                     f,
200 | |                     "Response timestamp {} is older than {} seconds",
201 | |                     timestamp, max_age_seconds
202 | |                 )
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:208:17
    |
208 | /                 write!(
209 | |                     f,
210 | |                     "Response timestamp {} is more than {} seconds in the future",
211 | |                     timestamp, tolerance_seconds
212 | |                 )
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:218:17
    |
218 |                 write!(f, "Cache is full ({}/{})", current_size, max_size)
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
218 -                 write!(f, "Cache is full ({}/{})", current_size, max_size)
218 +                 write!(f, "Cache is full ({current_size}/{max_size})")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:224:17
    |
224 |                 write!(f, "Invalid timestamp '{}': {}", timestamp_str, error)
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
224 -                 write!(f, "Invalid timestamp '{}': {}", timestamp_str, error)
224 +                 write!(f, "Invalid timestamp '{timestamp_str}': {error}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:227:17
    |
227 |                 write!(f, "Hash computation failed: {}", error)
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
227 -                 write!(f, "Hash computation failed: {}", error)
227 +                 write!(f, "Hash computation failed: {error}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:255:9
    |
255 | /         info!(
256 | |             "Initializing replay protection manager with config: {:?}",
257 | |             config
258 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:319:9
    |
319 |         debug!("Nonce {} validated for oracle {}", nonce, oracle_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
319 -         debug!("Nonce {} validated for oracle {}", nonce, oracle_id);
319 +         debug!("Nonce {nonce} validated for oracle {oracle_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:341:13
    |
341 | /             warn!(
342 | |                 "Response timestamp too old: {} from oracle {}",
343 | |                 timestamp, oracle_id
344 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:358:13
    |
358 | /             warn!(
359 | |                 "Response timestamp too far in future: {} from oracle {}",
360 | |                 timestamp, oracle_id
361 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:379:9
    |
379 |         debug!("Timestamp {} validated for oracle {}", timestamp, oracle_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
379 -         debug!("Timestamp {} validated for oracle {}", timestamp, oracle_id);
379 +         debug!("Timestamp {timestamp} validated for oracle {oracle_id}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:389:24
    |
389 |                 error: format!("Failed to serialize request: {}", e),
    |                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
389 -                 error: format!("Failed to serialize request: {}", e),
389 +                 error: format!("Failed to serialize request: {e}"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:422:17
    |
422 |                 debug!("Cache hit for request hash: {}", request_hash);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
422 -                 debug!("Cache hit for request hash: {}", request_hash);
422 +                 debug!("Cache hit for request hash: {request_hash}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:434:17
    |
434 |                 debug!("Cache entry expired for request hash: {}", request_hash);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
434 -                 debug!("Cache entry expired for request hash: {}", request_hash);
434 +                 debug!("Cache entry expired for request hash: {request_hash}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:446:9
    |
446 |         debug!("Cache miss for request hash: {}", request_hash);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
446 -         debug!("Cache miss for request hash: {}", request_hash);
446 +         debug!("Cache miss for request hash: {request_hash}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:497:9
    |
497 | /         debug!(
498 | |             "Cached response for request hash: {} from oracle: {}",
499 | |             request_hash, oracle_id
500 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:533:9
    |
533 |         debug!("Evicted {} oldest cache entries", entries_to_remove);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
533 -         debug!("Evicted {} oldest cache entries", entries_to_remove);
533 +         debug!("Evicted {entries_to_remove} oldest cache entries");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:553:9
    |
553 | /         info!(
554 | |             "Invalidated {} cache entries for oracle: {}",
555 | |             removed_count, oracle_id
556 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:574:9
    |
574 |         info!("Invalidated all {} cache entries", removed_count);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
574 -         info!("Invalidated all {} cache entries", removed_count);
574 +         info!("Invalidated all {removed_count} cache entries");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:596:13
    |
596 |             debug!("Cleaned up {} expired nonces", nonces_removed);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
596 -             debug!("Cleaned up {} expired nonces", nonces_removed);
596 +             debug!("Cleaned up {nonces_removed} expired nonces");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:611:13
    |
611 |             debug!("Cleaned up {} expired cached responses", responses_removed);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
611 -             debug!("Cleaned up {} expired cached responses", responses_removed);
611 +             debug!("Cleaned up {responses_removed} expired cached responses");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:627:13
    |
627 |             debug!("Cleaned up {} old timestamps", timestamps_removed);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
627 -             debug!("Cleaned up {} old timestamps", timestamps_removed);
627 +             debug!("Cleaned up {timestamps_removed} old timestamps");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/replay_protection.rs:647:13
    |
647 | /             info!(
648 | |                 "Cleanup completed: removed {} total expired entries",
649 | |                 total_removed
650 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:148:9
    |
148 |         info!("Transaction {} approved via API", queue_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
148 -         info!("Transaction {} approved via API", queue_id);
148 +         info!("Transaction {queue_id} approved via API");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:161:9
    |
161 |         info!("Transaction {} rejected via API", queue_id);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
161 -         info!("Transaction {} rejected via API", queue_id);
161 +         info!("Transaction {queue_id} rejected via API");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:172:9
    |
172 |         info!("Bulk approved {} transactions via API", count);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
172 -         info!("Bulk approved {} transactions via API", count);
172 +         info!("Bulk approved {count} transactions via API");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:185:9
    |
185 |         info!("Bulk rejected {} transactions via API", count);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
185 -         info!("Bulk rejected {} transactions via API", count);
185 +         info!("Bulk rejected {count} transactions via API");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:268:17
    |
268 |                 format!("Auto-reject: {}", reason)
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
268 -                 format!("Auto-reject: {}", reason)
268 +                 format!("Auto-reject: {reason}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:378:31
    |
378 |                 message: Some(format!("Bulk approved {} transactions", count)),
    |                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
378 -                 message: Some(format!("Bulk approved {} transactions", count)),
378 +                 message: Some(format!("Bulk approved {count} transactions")),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/review_api.rs:399:31
    |
399 |                 message: Some(format!("Bulk rejected {} transactions", count)),
    |                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
399 -                 message: Some(format!("Bulk rejected {} transactions", count)),
399 +                 message: Some(format!("Bulk rejected {count} transactions")),
    |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:50:57
   |
50 |             VerificationError::InvalidSignature(msg) => write!(f, "Invalid signature: {}", msg),
   |                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
50 -             VerificationError::InvalidSignature(msg) => write!(f, "Invalid signature: {}", msg),
50 +             VerificationError::InvalidSignature(msg) => write!(f, "Invalid signature: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:51:55
   |
51 |             VerificationError::OracleNotFound(msg) => write!(f, "Oracle not found: {}", msg),
   |                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
51 -             VerificationError::OracleNotFound(msg) => write!(f, "Oracle not found: {}", msg),
51 +             VerificationError::OracleNotFound(msg) => write!(f, "Oracle not found: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:52:57
   |
52 |             VerificationError::OracleNotTrusted(msg) => write!(f, "Oracle not trusted: {}", msg),
   |                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
52 -             VerificationError::OracleNotTrusted(msg) => write!(f, "Oracle not trusted: {}", msg),
52 +             VerificationError::OracleNotTrusted(msg) => write!(f, "Oracle not trusted: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:53:57
   |
53 |             VerificationError::CertificateError(msg) => write!(f, "Certificate error: {}", msg),
   |                                                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
53 -             VerificationError::CertificateError(msg) => write!(f, "Certificate error: {}", msg),
53 +             VerificationError::CertificateError(msg) => write!(f, "Certificate error: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:54:56
   |
54 |             VerificationError::ResponseExpired(msg) => write!(f, "Response expired: {}", msg),
   |                                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
54 -             VerificationError::ResponseExpired(msg) => write!(f, "Response expired: {}", msg),
54 +             VerificationError::ResponseExpired(msg) => write!(f, "Response expired: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:55:53
   |
55 |             VerificationError::ReplayAttack(msg) => write!(f, "Replay attack: {}", msg),
   |                                                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
55 -             VerificationError::ReplayAttack(msg) => write!(f, "Replay attack: {}", msg),
55 +             VerificationError::ReplayAttack(msg) => write!(f, "Replay attack: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:57:17
   |
57 |                 write!(f, "Signature verification failed: {}", msg)
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
57 -                 write!(f, "Signature verification failed: {}", msg)
57 +                 write!(f, "Signature verification failed: {msg}")
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:60:17
   |
60 |                 write!(f, "Request-response mismatch: {}", msg)
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
60 -                 write!(f, "Request-response mismatch: {}", msg)
60 +                 write!(f, "Request-response mismatch: {msg}")
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:62:55
   |
62 |             VerificationError::TimestampError(msg) => write!(f, "Timestamp error: {}", msg),
   |                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
62 -             VerificationError::TimestampError(msg) => write!(f, "Timestamp error: {}", msg),
62 +             VerificationError::TimestampError(msg) => write!(f, "Timestamp error: {msg}"),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/consensus/signature_verification.rs:63:59
   |
63 |             VerificationError::VerificationFailed(msg) => write!(f, "Verification failed: {}", msg),
   |                                                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
63 -             VerificationError::VerificationFailed(msg) => write!(f, "Verification failed: {}", msg),
63 +             VerificationError::VerificationFailed(msg) => write!(f, "Verification failed: {msg}"),
   |

error: manual arithmetic check found
   --> blockchain-core/src/consensus/signature_verification.rs:306:29
    |
306 |           let signature_age = if now > signed_response.signature.signature_timestamp {
    |  _____________________________^
307 | |             now - signed_response.signature.signature_timestamp
308 | |         } else {
309 | |             0
310 | |         };
    | |_________^ help: replace it with: `now.saturating_sub(signed_response.signature.signature_timestamp)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#implicit_saturating_sub

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/signature_verification.rs:313:58
    |
313 |               return Err(VerificationError::TimestampError(format!(
    |  __________________________________________________________^
314 | |                 "Signature too old: {} seconds",
315 | |                 signature_age
316 | |             )));
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: manual arithmetic check found
   --> blockchain-core/src/consensus/signature_verification.rs:320:28
    |
320 |           let response_age = if now > signed_response.response.timestamp {
    |  ____________________________^
321 | |             now - signed_response.response.timestamp
322 | |         } else {
323 | |             0
324 | |         };
    | |_________^ help: replace it with: `now.saturating_sub(signed_response.response.timestamp)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#implicit_saturating_sub

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/signature_verification.rs:327:58
    |
327 |               return Err(VerificationError::TimestampError(format!(
    |  __________________________________________________________^
328 | |                 "Response too old: {} seconds",
329 | |                 response_age
330 | |             )));
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/signature_verification.rs:420:64
    |
420 |                   return Err(VerificationError::CertificateError(format!(
    |  ________________________________________________________________^
421 | |                     "Certificate {} in chain is not valid at current time",
422 | |                     i
423 | |                 )));
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/signature_verification.rs:428:64
    |
428 |                   return Err(VerificationError::CertificateError(format!(
    |  ________________________________________________________________^
429 | |                     "Certificate {} subject does not match oracle ID",
430 | |                     i
431 | |                 )));
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/signature_verification.rs:466:60
    |
466 |               VerificationError::SignatureVerificationFailed(format!(
    |  ____________________________________________________________^
467 | |                 "Failed to create signable data: {}",
468 | |                 e
469 | |             ))
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/signature_verification.rs:484:64
    |
484 |                   VerificationError::SignatureVerificationFailed(format!(
    |  ________________________________________________________________^
485 | |                     "PQC verification failed: {}",
486 | |                     e
487 | |                 ))
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:274:17
    |
274 |                 warn!("Failed to initialize AI integration: {}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
274 -                 warn!("Failed to initialize AI integration: {}", e);
274 +                 warn!("Failed to initialize AI integration: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:423:17
    |
423 |                 debug!("Validator tick - producing block #{}", block_number);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
423 -                 debug!("Validator tick - producing block #{}", block_number);
423 +                 debug!("Validator tick - producing block #{block_number}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:491:37
    |
491 | ...                   log::error!("Failed to apply block to state: {}", e);
    |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
491 -                                     log::error!("Failed to apply block to state: {}", e);
491 +                                     log::error!("Failed to apply block to state: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:512:25
    |
512 |                         log::error!("Failed to create block proposal: {}", e);
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
512 -                         log::error!("Failed to create block proposal: {}", e);
512 +                         log::error!("Failed to create block proposal: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:813:29
    |
813 | ...                   warn!("AI transaction validation failed: {}", error);
    |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
813 -                             warn!("AI transaction validation failed: {}", error);
813 +                             warn!("AI transaction validation failed: {error}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:834:29
    |
834 | ...                   info!("AI verification skipped: {}", reason);
    |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
834 -                             info!("AI verification skipped: {}", reason);
834 +                             info!("AI verification skipped: {reason}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:840:21
    |
840 |                     warn!("AI analysis error: {}", e);
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
840 -                     warn!("AI analysis error: {}", e);
840 +                     warn!("AI analysis error: {e}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:864:28
    |
864 |                   return Err(format!(
    |  ____________________________^
865 | |                     "Failed to serialize transaction for AI analysis: {}",
866 | |                     e
867 | |                 ));
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/consensus/mod_clean.rs:877:27
    |
877 |             Err(e) => Err(format!("AI validation request failed: {}", e)),
    |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
877 -             Err(e) => Err(format!("AI validation request failed: {}", e)),
877 +             Err(e) => Err(format!("AI validation request failed: {e}")),
    |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1147:40
     |
1147 | ...                   return Err(format!("Contract deployment failed: {}", e));
     |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1147 -                             return Err(format!("Contract deployment failed: {}", e));
1147 +                             return Err(format!("Contract deployment failed: {e}"));
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1184:40
     |
1184 | ...                   return Err(format!("Contract execution failed: {}", e));
     |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1184 -                             return Err(format!("Contract execution failed: {}", e));
1184 +                             return Err(format!("Contract execution failed: {e}"));
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1334:21
     |
1334 |                     warn!("Failed to serialize transaction for AI analysis: {}", e);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1334 -                     warn!("Failed to serialize transaction for AI analysis: {}", e);
1334 +                     warn!("Failed to serialize transaction for AI analysis: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1395:25
     |
1395 |                         warn!("Failed to record audit trail entry: {}", e);
     |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1395 -                         warn!("Failed to record audit trail entry: {}", e);
1395 +                         warn!("Failed to record audit trail entry: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1427:37
     |
1427 | / ...                   info!("Transaction {} queued for manual review (queue ID: {}): {}",
1428 | | ...                         tx_hash, queue_id, reason);
     | |______________________________________________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1433:37
     |
1433 | ...                   warn!("Failed to queue transaction for review: {}", e);
     |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1433 -                                     warn!("Failed to queue transaction for review: {}", e);
1433 +                                     warn!("Failed to queue transaction for review: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1455:21
     |
1455 |                     warn!("AI transaction validation failed: {}", error);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1455 -                     warn!("AI transaction validation failed: {}", error);
1455 +                     warn!("AI transaction validation failed: {error}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1470:41
     |
1470 | ...                   reason: format!("AI validation failed: {}", error),
     |                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1470 -                                 reason: format!("AI validation failed: {}", error),
1470 +                                 reason: format!("AI validation failed: {error}"),
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1480:25
     |
1480 | /                         warn!(
1481 | |                             "Failed to record audit trail entry for failed AI validation: {}",
1482 | |                             e
1483 | |                         );
     | |_________________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1522:25
     |
1522 | /                         warn!(
1523 | |                             "Failed to record audit trail entry for unavailable AI service: {}",
1524 | |                             e
1525 | |                         );
     | |_________________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1535:21
     |
1535 |                     info!("AI verification skipped: {}", reason);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1535 -                     info!("AI verification skipped: {}", reason);
1535 +                     info!("AI verification skipped: {reason}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1556:25
     |
1556 | /                         warn!(
1557 | |                             "Failed to record audit trail entry for skipped AI verification: {}",
1558 | |                             e
1559 | |                         );
     | |_________________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1565:21
     |
1565 |                     warn!("AI analysis error: {}", e);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1565 -                     warn!("AI analysis error: {}", e);
1565 +                     warn!("AI analysis error: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1575:40
     |
1575 | ...                   error: format!("Analysis error: {}", e),
     |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1575 -                                 error: format!("Analysis error: {}", e),
1575 +                                 error: format!("Analysis error: {e}"),
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1580:41
     |
1580 | ...                   reason: format!("AI analysis error: {}", e),
     |                               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1580 -                                 reason: format!("AI analysis error: {}", e),
1580 +                                 reason: format!("AI analysis error: {e}"),
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1590:25
     |
1590 | /                         warn!(
1591 | |                             "Failed to record audit trail entry for AI analysis error: {}",
1592 | |                             e
1593 | |                         );
     | |_________________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1648:30
     |
1648 |                 .map_err(|e| format!("Fallback validation failed: {}", e))?;
     |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1648 -                 .map_err(|e| format!("Fallback validation failed: {}", e))?;
1648 +                 .map_err(|e| format!("Fallback validation failed: {e}"))?;
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1693:25
     |
1693 |                         warn!("Failed to add transaction to batch: {}", e);
     |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1693 -                         warn!("Failed to add transaction to batch: {}", e);
1693 +                         warn!("Failed to add transaction to batch: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1705:26
     |
1705 |             .map_err(|e| format!("Failed to acquire request permit: {}", e))?;
     |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1705 -             .map_err(|e| format!("Failed to acquire request permit: {}", e))?;
1705 +             .map_err(|e| format!("Failed to acquire request permit: {e}"))?;
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1712:21
     |
1712 |                     warn!("Failed to serialize transaction for AI analysis: {}", e);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1712 -                     warn!("Failed to serialize transaction for AI analysis: {}", e);
1712 +                     warn!("Failed to serialize transaction for AI analysis: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1724:29
     |
1724 | / ...                   format!(
1725 | | ...                       "Fallback validation failed after serialization error: {}",
1726 | | ...                       e
1727 | | ...                   )
     | |_______________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1813:34
     |
1813 |                     .map_err(|e| format!("AI validation failed and fallback also failed: {}", e))?;
     |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1813 -                     .map_err(|e| format!("AI validation failed and fallback also failed: {}", e))?;
1813 +                     .map_err(|e| format!("AI validation failed and fallback also failed: {e}"))?;
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1861:33
     |
1861 | / ...                   info!(
1862 | | ...                       "Transaction {} queued for manual review (queue ID: {}): {}",
1863 | | ...                       tx_hash, queue_id, reason
1864 | | ...                   );
     | |_______________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1868:33
     |
1868 | ...                   warn!("Failed to queue transaction for review: {}", e);
     |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1868 -                                 warn!("Failed to queue transaction for review: {}", e);
1868 +                                 warn!("Failed to queue transaction for review: {e}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1984:17
     |
1984 | /                 debug!(
1985 | |                     "Recorded audit trail entry {} for transaction {}",
1986 | |                     audit_id, tx_hash
1987 | |                 );
     | |_________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1991:17
     |
1991 | /                 warn!(
1992 | |                     "Failed to record audit trail for transaction {}: {}",
1993 | |                     tx_hash, e
1994 | |                 );
     | |_________________^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:1995:21
     |
1995 |                 Err(format!("Audit trail recording failed: {}", e))
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1995 -                 Err(format!("Audit trail recording failed: {}", e))
1995 +                 Err(format!("Audit trail recording failed: {e}"))
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:2058:13
     |
2058 |             info!("Processed {} transactions from batches", processed_count);
     |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
2058 -             info!("Processed {} transactions from batches", processed_count);
2058 +             info!("Processed {processed_count} transactions from batches");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:2070:21
     |
2070 |                     info!("Performance optimizer cleaned up {} cache entries", removed);
     |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
2070 -                     info!("Performance optimizer cleaned up {} cache entries", removed);
2070 +                     info!("Performance optimizer cleaned up {removed} cache entries");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/consensus/mod_clean.rs:2074:17
     |
2074 |                 warn!("Failed to cleanup performance optimizer cache: {}", e);
     |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
2074 -                 warn!("Failed to cleanup performance optimizer cache: {}", e);
2074 +                 warn!("Failed to cleanup performance optimizer cache: {e}");
     |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/contracts.rs:33:27
   |
33 |             Err(e) => Err(format!("Failed to create contract runtime: {}", e)),
   |                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
33 -             Err(e) => Err(format!("Failed to create contract runtime: {}", e)),
33 +             Err(e) => Err(format!("Failed to create contract runtime: {e}")),
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/contracts.rs:56:17
   |
56 |                 info!("Contract deployed successfully to address: {}", address);
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
56 -                 info!("Contract deployed successfully to address: {}", address);
56 +                 info!("Contract deployed successfully to address: {address}");
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/contracts.rs:60:17
   |
60 |                 error!("Contract deployment failed: {:?}", e);
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
60 -                 error!("Contract deployment failed: {:?}", e);
60 +                 error!("Contract deployment failed: {e:?}");
   |

error: redundant closure
   --> blockchain-core/src/contracts.rs:110:58
    |
110 |                         "old": sc.old_value.as_ref().map(|v| hex::encode(v)),
    |                                                          ^^^^^^^^^^^^^^^^^^ help: replace the closure with the function itself: `hex::encode`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#redundant_closure
    = note: `-D clippy::redundant-closure` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::redundant_closure)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/contracts.rs:127:17
    |
127 |                 warn!("Contract execution failed: {:?}", e);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
127 -                 warn!("Contract execution failed: {:?}", e);
127 +                 warn!("Contract execution failed: {e:?}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/crypto/mod.rs:122:22
    |
122 |             _ => Err(format!("Unsupported signature algorithm: {}", algorithm).into()),
    |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
122 -             _ => Err(format!("Unsupported signature algorithm: {}", algorithm).into()),
122 +             _ => Err(format!("Unsupported signature algorithm: {algorithm}").into()),
    |

error: casting to the same type is unnecessary (`u64` -> `u64`)
   --> blockchain-core/src/genesis.rs:146:33
    |
146 |             downtime_threshold: self.offline_threshold as u64,
    |                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: try: `self.offline_threshold`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_cast
    = note: `-D clippy::unnecessary-cast` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::unnecessary_cast)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/genesis.rs:333:24
    |
333 |               return Err(format!(
    |  ________________________^
334 | |                 "DGT total supply must be 1 billion, got {}",
335 | |                 total_dgt
336 | |             ));
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/genesis_integration.rs:77:23
   |
77 |                 hash: format!("genesis_mint_{}", index),
   |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
77 -                 hash: format!("genesis_mint_{}", index),
77 +                 hash: format!("genesis_mint_{index}"),
   |

error: very complex type used. Consider factoring parts into `type` definitions
   --> blockchain-core/src/genesis_integration.rs:187:10
    |
187 |     ) -> Result<(Block, HashMap<Address, AccountState>, Vec<ValidatorInfo>), String> {
    |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#type_complexity
    = note: `-D clippy::type-complexity` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::type_complexity)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/genesis_integration.rs:232:32
    |
232 |                       return Err(format!(
    |  ________________________________^
233 | |                         "Genesis transaction {} does not match allocation",
234 | |                         index
235 | |                     ));
    | |_____________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/genesis_integration.rs:238:28
    |
238 |                 return Err(format!("Genesis transaction {} is not a transfer", index));
    |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
238 -                 return Err(format!("Genesis transaction {} is not a transfer", index));
238 +                 return Err(format!("Genesis transaction {index} is not a transfer"));
    |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/policy/signature_policy.rs:29:17
   |
29 |                 write!(f, "Algorithm {:?} is not in the allowed list", alg)
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
29 -                 write!(f, "Algorithm {:?} is not in the allowed list", alg)
29 +                 write!(f, "Algorithm {alg:?} is not in the allowed list")
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/policy/signature_policy.rs:32:17
   |
32 |                 write!(f, "Legacy algorithm {} is explicitly rejected", name)
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
32 -                 write!(f, "Legacy algorithm {} is explicitly rejected", name)
32 +                 write!(f, "Legacy algorithm {name} is explicitly rejected")
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/policy/signature_policy.rs:35:17
   |
35 |                 write!(f, "Unknown algorithm: {}", name)
   |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
35 -                 write!(f, "Unknown algorithm: {}", name)
35 +                 write!(f, "Unknown algorithm: {name}")
   |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/policy/signature_policy.rs:145:24
    |
145 |             .map(|alg| format!("{:?}", alg))
    |                        ^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
145 -             .map(|alg| format!("{:?}", alg))
145 +             .map(|alg| format!("{alg:?}"))
    |

error: method `default` can be confused for the standard trait method `std::default::Default::default`
   --> blockchain-core/src/policy/signature_policy.rs:175:5
    |
175 | /     pub fn default() -> Self {
176 | |         Self::new(SignaturePolicy::default())
177 | |     }
    | |_____^
    |
    = help: consider implementing the trait `std::default::Default` or choosing a less ambiguous method name
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#should_implement_trait
    = note: `-D clippy::should-implement-trait` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::should_implement_trait)]`

error: casting to the same type is unnecessary (`u64` -> `u64`)
  --> blockchain-core/src/runtime/mod.rs:64:53
   |
64 |                 .insert(allocation.address.clone(), allocation.amount as u64);
   |                                                     ^^^^^^^^^^^^^^^^^^^^^^^^ help: try: `allocation.amount`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_cast

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:162:9
    |
162 |         debug!("Set balance for {}: {}", address, amount);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
162 -         debug!("Set balance for {}: {}", address, amount);
162 +         debug!("Set balance for {address}: {amount}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:186:9
    |
186 |         info!("Transfer: {} -> {} amount: {}", from, to, amount);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
186 -         info!("Transfer: {} -> {} amount: {}", from, to, amount);
186 +         info!("Transfer: {from} -> {to} amount: {amount}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:207:9
    |
207 |         info!("Deploying contract at address: {}", address);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
207 -         info!("Deploying contract at address: {}", address);
207 +         info!("Deploying contract at address: {address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:228:26
    |
228 |             .map_err(|e| format!("Contract deployment failed: {}", e))?;
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
228 -             .map_err(|e| format!("Contract deployment failed: {}", e))?;
228 +             .map_err(|e| format!("Contract deployment failed: {e}"))?;
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:234:9
    |
234 | /         info!(
235 | |             "Contract deployed successfully at address: {}",
236 | |             deployed_address
237 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:279:26
    |
279 |             .map_err(|e| format!("Contract execution failed: {}", e))?;
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
279 -             .map_err(|e| format!("Contract execution failed: {}", e))?;
279 +             .map_err(|e| format!("Contract execution failed: {e}"))?;
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:289:17
    |
289 |                 info!("Contract event: {:?}", event);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
289 -                 info!("Contract event: {:?}", event);
289 +                 info!("Contract event: {event:?}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:312:9
    |
312 | /         debug!(
313 | |             "Calling contract method {} at {} from {}",
314 | |             method, address, caller
315 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:334:26
    |
334 |             .map_err(|e| format!("Contract call failed: {}", e))?;
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
334 -             .map_err(|e| format!("Contract call failed: {}", e))?;
334 +             .map_err(|e| format!("Contract call failed: {e}"))?;
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:353:9
    |
353 | /         info!(
354 | |             "Deploying contract at address: {} from deployer: {}",
355 | |             address, deployer
356 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:375:26
    |
375 |             .map_err(|e| format!("Contract deployment failed: {}", e))?;
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
375 -             .map_err(|e| format!("Contract deployment failed: {}", e))?;
375 +             .map_err(|e| format!("Contract deployment failed: {e}"))?;
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:381:9
    |
381 | /         info!(
382 | |             "Contract deployed successfully at address: {}",
383 | |             deployed_address
384 | |         );
    | |_________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:432:9
    |
432 |         debug!("Delegated {} uDGT", amount);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
432 -         debug!("Delegated {} uDGT", amount);
432 +         debug!("Delegated {amount} uDGT");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:460:30
    |
460 |         let delegation_key = format!("{}:{}", delegator, validator);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
460 -         let delegation_key = format!("{}:{}", delegator, validator);
460 +         let delegation_key = format!("{delegator}:{validator}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:496:30
    |
496 |         let delegation_key = format!("{}:{}", delegator, validator);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
496 -         let delegation_key = format!("{}:{}", delegator, validator);
496 +         let delegation_key = format!("{delegator}:{validator}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:520:13
    |
520 |             debug!("Credited {} uDRT rewards to {}", rewards, delegator);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
520 -             debug!("Credited {} uDRT rewards to {}", rewards, delegator);
520 +             debug!("Credited {rewards} uDRT rewards to {delegator}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/runtime/mod.rs:537:13
    |
537 | /             debug!(
538 | |                 "Credited {} uDRT total rewards to {}",
539 | |                 total_rewards, delegator
540 | |             );
    | |_____________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/secrets/cli_integration.rs:88:17
   |
88 |                 println!("{}", value);
   |                 ^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
88 -                 println!("{}", value);
88 +                 println!("{value}");
   |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/secrets/cli_integration.rs:96:21
   |
96 |                     println!("{}", default);
   |                     ^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
96 -                     println!("{}", default);
96 +                     println!("{default}");
   |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:130:17
    |
130 |                 println!("  {}", name);
    |                 ^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
130 -                 println!("  {}", name);
130 +                 println!("  {name}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:133:13
    |
133 |             println!("  {}", name);
    |             ^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
133 -             println!("  {}", name);
133 +             println!("  {name}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:152:9
    |
152 |         println!("  {}: {}", provider, status);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
152 -         println!("  {}: {}", provider, status);
152 +         println!("  {provider}: {status}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:200:9
    |
200 |         println!("\n{}:", provider_name);
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
200 -         println!("\n{}:", provider_name);
200 +         println!("\n{provider_name}:");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:202:13
    |
202 |             println!("  {}: {}", key, value);
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
202 -             println!("  {}: {}", key, value);
202 +             println!("  {key}: {value}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:239:17
    |
239 |                 println!("✓ Secret '{}' found", secret_name);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
239 -                 println!("✓ Secret '{}' found", secret_name);
239 +                 println!("✓ Secret '{secret_name}' found");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/cli_integration.rs:241:17
    |
241 |                 println!("✓ Secret '{}' correctly not found", secret_name);
    |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
241 -                 println!("✓ Secret '{}' correctly not found", secret_name);
241 +                 println!("✓ Secret '{secret_name}' correctly not found");
    |

error: variables can be used directly in the `format!` string
  --> blockchain-core/src/secrets/providers.rs:71:29
   |
71 |             Some(prefix) => format!("{}{}", prefix, name),
   |                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
   |
71 -             Some(prefix) => format!("{}{}", prefix, name),
71 +             Some(prefix) => format!("{prefix}{name}"),
   |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:114:26
    |
114 |                 message: format!("Environment variable {} contains invalid Unicode", key),
    |                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
114 -                 message: format!("Environment variable {} contains invalid Unicode", key),
114 +                 message: format!("Environment variable {key} contains invalid Unicode"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:204:13
    |
204 |             format!("{}/database/host", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
204 -             format!("{}/database/host", base_path),
204 +             format!("{base_path}/database/host"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:208:21
    |
208 |             .insert(format!("{}/database/port", base_path), "5432".to_string());
    |                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
208 -             .insert(format!("{}/database/port", base_path), "5432".to_string());
208 +             .insert(format!("{base_path}/database/port"), "5432".to_string());
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:210:13
    |
210 |             format!("{}/database/username", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
210 -             format!("{}/database/username", base_path),
210 +             format!("{base_path}/database/username"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:214:13
    |
214 |             format!("{}/database/password", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
214 -             format!("{}/database/password", base_path),
214 +             format!("{base_path}/database/password"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:220:13
    |
220 |             format!("{}/api/api_key", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
220 -             format!("{}/api/api_key", base_path),
220 +             format!("{base_path}/api/api_key"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:224:13
    |
224 |             format!("{}/api/jwt_secret", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
224 -             format!("{}/api/jwt_secret", base_path),
224 +             format!("{base_path}/api/jwt_secret"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:230:13
    |
230 |             format!("{}/config/log_level", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
230 -             format!("{}/config/log_level", base_path),
230 +             format!("{base_path}/config/log_level"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/secrets/providers.rs:239:13
    |
239 |             format!("{}/config/debug_mode", base_path),
    |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
239 -             format!("{}/config/debug_mode", base_path),
239 +             format!("{base_path}/config/debug_mode"),
    |

error: this `impl` can be derived
  --> blockchain-core/src/staking.rs:62:1
   |
62 | / impl Default for DelegatorRewards {
63 | |     fn default() -> Self {
64 | |         Self {
65 | |             accrued_unclaimed: 0,
...  |
70 | | }
   | |_^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#derivable_impls
help: replace the manual implementation with a derive attribute
   |
53 + #[derive(Default)]
54 ~ pub struct DelegatorRewards {
   |

error: this `impl` can be derived
   --> blockchain-core/src/staking.rs:149:1
    |
149 | / impl Default for StakingState {
150 | |     fn default() -> Self {
151 | |         Self {
152 | |             validators: HashMap::new(),
...   |
162 | | }
    | |_^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#derivable_impls
help: replace the manual implementation with a derive attribute
    |
129 + #[derive(Default)]
130 ~ pub struct StakingState {
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:324:30
    |
324 |         let delegation_key = format!("{}:{}", delegator, validator);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
324 -         let delegation_key = format!("{}:{}", delegator, validator);
324 +         let delegation_key = format!("{delegator}:{validator}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:494:42
    |
494 |             .filter(|key| key.ends_with(&format!(":{}", validator_address)))
    |                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
494 -             .filter(|key| key.ends_with(&format!(":{}", validator_address)))
494 +             .filter(|key| key.ends_with(&format!(":{validator_address}")))
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:528:25
    |
528 |                 reason: format!("Downtime: {} consecutive missed blocks", missed_blocks),
    |                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
528 -                 reason: format!("Downtime: {} consecutive missed blocks", missed_blocks),
528 +                 reason: format!("Downtime: {missed_blocks} consecutive missed blocks"),
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:718:30
    |
718 |         let delegation_key = format!("{}:{}", delegator, validator_address);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
718 -         let delegation_key = format!("{}:{}", delegator, validator_address);
718 +         let delegation_key = format!("{delegator}:{validator_address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:747:30
    |
747 |         let delegation_key = format!("{}:{}", delegator, validator_address);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
747 -         let delegation_key = format!("{}:{}", delegator, validator_address);
747 +         let delegation_key = format!("{delegator}:{validator_address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:772:30
    |
772 |         let delegation_key = format!("{}:{}", delegator, validator_address);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
772 -         let delegation_key = format!("{}:{}", delegator, validator_address);
772 +         let delegation_key = format!("{delegator}:{validator_address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:793:30
    |
793 |         let delegation_key = format!("{}:{}", delegator, validator_address);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
793 -         let delegation_key = format!("{}:{}", delegator, validator_address);
793 +         let delegation_key = format!("{delegator}:{validator_address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:822:30
    |
822 |         let delegation_key = format!("{}:{}", delegator, validator_address);
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
822 -         let delegation_key = format!("{}:{}", delegator, validator_address);
822 +         let delegation_key = format!("{delegator}:{validator_address}");
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/staking.rs:853:44
    |
853 |             .filter(|key| key.starts_with(&format!("{}:", delegator)))
    |                                            ^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
853 -             .filter(|key| key.starts_with(&format!("{}:", delegator)))
853 +             .filter(|key| key.starts_with(&format!("{delegator}:")))
    |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/staking.rs:1028:30
     |
1028 |         let delegation_key = format!("{}:{}", delegator, validator_address);
     |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1028 -         let delegation_key = format!("{}:{}", delegator, validator_address);
1028 +         let delegation_key = format!("{delegator}:{validator_address}");
     |

error: variables can be used directly in the `format!` string
    --> blockchain-core/src/staking.rs:1057:44
     |
1057 |             if delegation_key.starts_with(&format!("{}:", delegator)) {
     |                                            ^^^^^^^^^^^^^^^^^^^^^^^^^
     |
     = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
     |
1057 -             if delegation_key.starts_with(&format!("{}:", delegator)) {
1057 +             if delegation_key.starts_with(&format!("{delegator}:")) {
     |

error: manually reimplementing `div_ceil`
  --> blockchain-core/src/state_commitment.rs:27:43
   |
27 |         let mut next = Vec::with_capacity((leaves.len() + 1) / 2);
   |                                           ^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.div_ceil()`: `leaves.len().div_ceil(2)`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_div_ceil

Some errors have detailed explanations: E0061, E0063, E0277, E0308, E0369, E0433, E0560, E0599, E0609.
For more information about an error, try `rustc --explain E0061`.
error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:118:32
    |
118 |                       return Err(format!(
    |  ________________________________^
119 | |                         "Chain ID mismatch: existing {} expected {}",
120 | |                         stored_str, expected
121 | |                     )
    | |_____________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args

error: field assignment outside of initializer for an instance created with Default::default()
   --> blockchain-core/src/storage/mod.rs:148:37
    |
148 | ...                   acct.balance = amount;
    |                       ^^^^^^^^^^^^^^^^^^^^^^
    |
note: consider initializing the variable with `types::AccountState { balance: amount, ..Default::default() }` and removing relevant reassignments
   --> blockchain-core/src/storage/mod.rs:147:37
    |
147 | ...                   let mut acct = AccountState::default();
    |                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#field_reassign_with_default
    = note: `-D clippy::field-reassign-with-default` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::field_reassign_with_default)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:191:9
    |
191 |         format!("acct:{}", address)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
191 -         format!("acct:{}", address)
191 +         format!("acct:{address}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:194:9
    |
194 |         format!("blk_hash:{}", hash)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
194 -         format!("blk_hash:{}", hash)
194 +         format!("blk_hash:{hash}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:197:9
    |
197 |         format!("blk_num:{:016x}", num)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
197 -         format!("blk_num:{:016x}", num)
197 +         format!("blk_num:{num:016x}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:200:9
    |
200 |         format!("tx:{}", hash)
    |         ^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
200 -         format!("tx:{}", hash)
200 +         format!("tx:{hash}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:203:9
    |
203 |         format!("rcpt:{}", hash)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
203 -         format!("rcpt:{}", hash)
203 +         format!("rcpt:{hash}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:206:9
    |
206 |         format!("contract:{}", address)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
206 -         format!("contract:{}", address)
206 +         format!("contract:{address}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:209:9
    |
209 |         format!("receipt:{}", hash)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
209 -         format!("receipt:{}", hash)
209 +         format!("receipt:{hash}")
    |

error: very complex type used. Consider factoring parts into `type` definitions
   --> blockchain-core/src/storage/mod.rs:475:34
    |
475 |     pub fn snapshot_kv(&self) -> Result<Vec<(Vec<u8>, Vec<u8>)>, Box<dyn std::error::Error>> {
    |                                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#type_complexity

error: unnecessary `if let` since only the `Ok` variant of the iterator element is used
   --> blockchain-core/src/storage/mod.rs:479:9
    |
479 |           for item in iter {
    |           ^           ---- help: try: `iter.flatten()`
    |  _________|
    | |
480 | |             if let Ok((k, v)) = item {
481 | |                 // Exclude meta & ephemeral prefixes from state commitment
482 | |                 if k.starts_with(b"meta:") {
...   |
496 | |         }
    | |_________^
    |
help: ...and remove the `if let` statement in the for loop
   --> blockchain-core/src/storage/mod.rs:480:13
    |
480 | /             if let Ok((k, v)) = item {
481 | |                 // Exclude meta & ephemeral prefixes from state commitment
482 | |                 if k.starts_with(b"meta:") {
483 | |                     continue;
...   |
494 | |                 out.push((k.to_vec(), v.to_vec()));
495 | |             }
    | |_____________^
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_flatten
    = note: `-D clippy::manual-flatten` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::manual_flatten)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:502:9
    |
502 |         format!("rcpi:{:016x}:{}", height, index)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
502 -         format!("rcpi:{:016x}:{}", height, index)
502 +         format!("rcpi:{height:016x}:{index}")
    |

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/storage/mod.rs:505:9
    |
505 |         format!("rcpx:{}", tx_hash)
    |         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
505 -         format!("rcpx:{}", tx_hash)
505 +         format!("rcpx:{tx_hash}")
    |

error: could not compile `dytallix-node` (lib test) due to 86 previous errors
warning: build failed, waiting for other jobs to finish...
error: match can be simplified with `.unwrap_or_default()`
   --> blockchain-core/src/types.rs:806:17
    |
806 | /                 match pqc_manager.verify(&message, &signature.signature, &signature.public_key) {
807 | |                     Ok(valid) => valid,
808 | |                     Err(_) => false,
809 | |                 }
    | |_________________^ help: ascribe the type bool and replace your expression with: `pqc_manager.verify(&message, &signature.signature, &signature.public_key).unwrap_or_default()`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_unwrap_or_default
    = note: `-D clippy::manual-unwrap-or-default` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::manual_unwrap_or_default)]`

error: variables can be used directly in the `format!` string
   --> blockchain-core/src/types.rs:946:45
    |
946 |             StakeAction::Delegate { to } => format!("Delegate:{}", to),
    |                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#uninlined_format_args
help: change this to
    |
946 -             StakeAction::Delegate { to } => format!("Delegate:{}", to),
946 +             StakeAction::Delegate { to } => format!("Delegate:{to}"),
    |

error: you should consider adding a `Default` implementation for `InMemoryContractStore`
  --> blockchain-core/src/wasm/contract_registry.rs:26:5
   |
26 | /     pub fn new() -> Self {
27 | |         Self {
28 | |             code: HashMap::new(),
29 | |             instances: HashMap::new(),
...  |
32 | |     }
   | |_____^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#new_without_default
help: try adding this
   |
25 + impl Default for InMemoryContractStore {
26 +     fn default() -> Self {
27 +         Self::new()
28 +     }
29 + }
   |

error: unnecessary use of `to_vec`
  --> blockchain-core/src/wasm/contract_registry.rs:50:18
   |
50 |             .get(&hash.to_vec())
   |                  ^^^^^^^^^^^^^^ help: replace it with: `hash.as_slice()`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_to_owned

error: unnecessary use of `to_vec`
  --> blockchain-core/src/wasm/contract_registry.rs:80:18
   |
80 |             .get(&addr.to_vec())
   |                  ^^^^^^^^^^^^^^ help: replace it with: `addr.as_slice()`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_to_owned

error: you should consider adding a `Default` implementation for `WasmEngine`
  --> blockchain-core/src/wasm/engine.rs:41:5
   |
41 | /     pub fn new() -> Self {
42 | |         panic!("Use new_with_env(host_env)");
43 | |     }
   | |_____^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#new_without_default
help: try adding this
   |
17 + impl Default for WasmEngine {
18 +     fn default() -> Self {
19 +         Self::new()
20 +     }
21 + }
   |

error: casting to the same type is unnecessary (`u64` -> `u64`)
  --> blockchain-core/src/wasm/engine.rs:61:34
   |
61 |         store.set_epoch_deadline(gas_limit as u64); // coarse substitute
   |                                  ^^^^^^^^^^^^^^^^ help: try: `gas_limit`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_cast

error: this pattern reimplements `Result::unwrap_or`
   --> blockchain-core/src/wasm/engine.rs:124:17
    |
124 | /                 match (|| -> Result<i32> {
125 | |                     let key = Self::read_mem(&mut caller, key_ptr, key_len)?;
126 | |                     if let Some(val) = env.storage_get(&key) {
127 | |                         let take = std::cmp::min(val.len(), max_len as usize);
...   |
135 | |                     Err(_) => -1,
136 | |                 }
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_unwrap_or
    = note: `-D clippy::manual-unwrap-or` implied by `-D warnings`
    = help: to override `-D warnings` add `#[allow(clippy::manual_unwrap_or)]`
help: replace with
    |
124 ~                 (|| -> Result<i32> {
125 +                     let key = Self::read_mem(&mut caller, key_ptr, key_len)?;
126 +                     if let Some(val) = env.storage_get(&key) {
127 +                         let take = std::cmp::min(val.len(), max_len as usize);
128 +                         Self::write_mem(&mut caller, val_ptr, &val[..take])?;
129 +                         Ok(take as i32)
130 +                     } else {
131 +                         Ok(-1)
132 +                     }
133 +                 })().unwrap_or(-1)
    |

error: manually reimplementing `div_ceil`
   --> blockchain-core/src/wasm/engine.rs:152:55
    |
152 |                     env_set.gas_table().storage_set + ((val_len.max(0) as u64 + 31) / 32) * 5;
    |                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.div_ceil()`: `(val_len.max(0) as u64).div_ceil(32)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_div_ceil

error: this pattern reimplements `Result::unwrap_or`
   --> blockchain-core/src/wasm/engine.rs:154:17
    |
154 | /                 match (|| -> Result<i32> {
155 | |                     let key = Self::read_mem(&mut caller, key_ptr, key_len)?;
156 | |                     let val = Self::read_mem(&mut caller, val_ptr, val_len)?;
157 | |                     env_set.storage_set(key, val);
...   |
161 | |                     Err(_) => 1,
162 | |                 }
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_unwrap_or
help: replace with
    |
154 ~                 (|| -> Result<i32> {
155 +                     let key = Self::read_mem(&mut caller, key_ptr, key_len)?;
156 +                     let val = Self::read_mem(&mut caller, val_ptr, val_len)?;
157 +                     env_set.storage_set(key, val);
158 +                     Ok(0)
159 +                 })().unwrap_or(1)
    |

error: this pattern reimplements `Result::unwrap_or`
   --> blockchain-core/src/wasm/engine.rs:174:17
    |
174 | /                 match (|| -> Result<i32> {
175 | |                     let key = Self::read_mem(&mut caller, key_ptr, key_len)?;
176 | |                     Ok(if env_del.storage_delete(&key) { 1 } else { 0 })
177 | |                 })() {
178 | |                     Ok(r) => r,
179 | |                     Err(_) => -1,
180 | |                 }
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_unwrap_or
help: replace with
    |
174 ~                 (|| -> Result<i32> {
175 +                     let key = Self::read_mem(&mut caller, key_ptr, key_len)?;
176 +                     Ok(if env_del.storage_delete(&key) { 1 } else { 0 })
177 +                 })().unwrap_or(-1)
    |

error: manually reimplementing `div_ceil`
   --> blockchain-core/src/wasm/engine.rs:190:30
    |
190 |                 let chunks = (data_len.max(0) as u64 + 31) / 32;
    |                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.div_ceil()`: `(data_len.max(0) as u64).div_ceil(32)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_div_ceil

error: this pattern reimplements `Result::unwrap_or`
   --> blockchain-core/src/wasm/engine.rs:194:17
    |
194 | /                 match (|| -> Result<i32> {
195 | |                     let data = Self::read_mem(&mut caller, data_ptr, data_len)?;
196 | |                     let hash = env_hash.blake3_hash(&data);
197 | |                     Self::write_mem(&mut caller, out_ptr, &hash)?;
...   |
201 | |                     Err(_) => 1,
202 | |                 }
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_unwrap_or
help: replace with
    |
194 ~                 (|| -> Result<i32> {
195 +                     let data = Self::read_mem(&mut caller, data_ptr, data_len)?;
196 +                     let hash = env_hash.blake3_hash(&data);
197 +                     Self::write_mem(&mut caller, out_ptr, &hash)?;
198 +                     Ok(0)
199 +                 })().unwrap_or(1)
    |

error: match can be simplified with `.unwrap_or_default()`
   --> blockchain-core/src/wasm/engine.rs:223:17
    |
223 | /                 match (|| -> Result<i32> {
224 | |                     let sig = Self::read_mem(&mut caller, sig_ptr, sig_len)?;
225 | |                     let msg = Self::read_mem(&mut caller, msg_ptr, msg_len)?;
226 | |                     let pk = Self::read_mem(&mut caller, pub_ptr, pub_len)?;
...   |
236 | |                     Err(_) => 0,
237 | |                 }
    | |_________________^
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_unwrap_or_default
help: ascribe the type i32 and replace your expression with
    |
223 ~                 (|| -> Result<i32> {
224 +                     let sig = Self::read_mem(&mut caller, sig_ptr, sig_len)?;
225 +                     let msg = Self::read_mem(&mut caller, msg_ptr, msg_len)?;
226 +                     let pk = Self::read_mem(&mut caller, pub_ptr, pub_len)?;
227 +                     let algo = Self::read_mem(&mut caller, algo_ptr, algo_len)?;
228 +                     let algo_str = String::from_utf8_lossy(&algo).to_string();
229 +                     Ok(if env_verify.pqc_verify(&msg, &sig, &algo_str, &pk) {
230 +                         1
231 +                     } else {
232 +                         0
233 +                     })
234 +                 })().unwrap_or_default()
    |

error: manually reimplementing `div_ceil`
   --> blockchain-core/src/wasm/engine.rs:282:58
    |
282 |                 let gas_cost = env_log.gas_table().log + ((msg_len.max(0) as u64 + 63) / 64) * 5;
    |                                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: consider using `.div_ceil()`: `(msg_len.max(0) as u64).div_ceil(64)`
    |
    = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#manual_div_ceil

error: you should consider adding a `Default` implementation for `HostEnv`
  --> blockchain-core/src/wasm/host_env.rs:66:5
   |
66 | /     pub fn new() -> Self {
67 | |         panic!("HostEnv::new() without PQCManager removed. Use HostEnv::with_pqc(pqc_manager)");
68 | |     }
   | |_____^
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#new_without_default
help: try adding this
   |
65 + impl Default for HostEnv {
66 +     fn default() -> Self {
67 +         Self::new()
68 +     }
69 + }
   |

error: you should consider adding a `Default` implementation for `TemporalWindowEngine`
 --> blockchain-core/src/risk/pulseguard/features/temporal.rs:5:29
  |
5 | ...wEngine { pub fn new() -> Self { Self { one_min: VecDeque::new(), five_min: VecDeque::new(), sixty_min: VecDeque::new() } } pub fn ing...
  |              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  |
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#new_without_default
help: try adding this
  |
5 + impl Default for TemporalWindowEngine {
6 +     fn default() -> Self {
7 +         Self::new()
8 +     }
9 + }
  |

error: casting to the same type is unnecessary (`u64` -> `u64`)
 --> blockchain-core/src/risk/pulseguard/features/temporal.rs:5:534
  |
5 | ...UNIX_EPOCH).unwrap().as_secs() - front.timestamp; if age as u64 > window.as_secs() { dq.pop_front(); } else { break; } } }; trim(&mut ...
  |                                                         ^^^^^^^^^^ help: try: `age`
  |
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#unnecessary_cast

error: you should consider adding a `Default` implementation for `Ensemble`
 --> blockchain-core/src/risk/pulseguard/models/ensemble.rs:4:17
  |
4 | impl Ensemble { pub fn new() -> Self { Self { gbm: GbmModel::load_stub(), anomaly: AnomalyModel::new() } } pub fn infer(&self, fv: &Featu...
  |                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  |
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#new_without_default
help: try adding this
  |
4 + impl Default for Ensemble {
5 +     fn default() -> Self {
6 +         Self::new()
7 +     }
8 + }
  |

error: the borrowed expression implements the required traits
  --> blockchain-core/src/risk/pulseguard/pqc/signer.rs:50:24
   |
50 |             agg.update(&digest);
   |                        ^^^^^^^ help: change this to: `digest`
   |
   = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#needless_borrows_for_generic_args
   = note: `-D clippy::needless-borrows-for-generic-args` implied by `-D warnings`
   = help: to override `-D warnings` add `#[allow(clippy::needless_borrows_for_generic_args)]`

error: unnecessary map of the identity function
 --> blockchain-core/src/risk/pulseguard/pqc/manifest.rs:7:60
  |
7 |     let pairs: Vec<(&str, Vec<u8>)> = collected.into_iter().map(|(p,b)| (p, b)).collect();
  |                                                            ^^^^^^^^^^^^^^^^^^^^ help: remove the call to `map`
  |
  = help: for further information visit https://rust-lang.github.io/rust-clippy/master/index.html#map_identity
  = note: `-D clippy::map-identity` implied by `-D warnings`
  = help: to override `-D warnings` add `#[allow(clippy::map_identity)]`

error: could not compile `dytallix-node` (lib) due to 340 previous errors
