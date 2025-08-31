# Clippy Report — Errors: 7, Warnings: 5

    Checking dytallix-node v0.1.0 (/Users/rickglenn/dytallix/blockchain-core)
warning: unused variable: `runtime`
    --> /Users/rickglenn/dytallix/blockchain-core/src/api/mod.rs:1632:5
     |
1632 |     runtime: Arc<crate::runtime::DytallixRuntime>,
     |     ^^^^^^^ help: if this is intentional, prefix it with an underscore: `_runtime`
     |
     = note: `#[warn(unused_variables)]` on by default

error[E0609]: no field `ai_client` on type `&consensus_engine::ConsensusEngine`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/consensus_engine.rs:227:34
    |
227 |         let health_status = self.ai_client.health_check().await?;
    |                                  ^^^^^^^^^ unknown field
    |
help: a field with a similar name exists
    |
227 |         let health_status = self._ai_client.health_check().await?;
    |                                  +

error[E0609]: no field `ai_client` on type `&consensus_engine::ConsensusEngine`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/consensus_engine.rs:241:29
    |
241 |         let services = self.ai_client.discover_services().await?;
    |                             ^^^^^^^^^ unknown field
    |
help: a field with a similar name exists
    |
241 |         let services = self._ai_client.discover_services().await?;
    |                             +

error[E0609]: no field `ai_client` on type `&consensus_engine::ConsensusEngine`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/consensus_engine.rs:259:14
    |
259 |             .ai_client
    |              ^^^^^^^^^ unknown field
    |
help: a field with a similar name exists
    |
259 |             ._ai_client
    |              +

error[E0609]: no field `ai_client` on type `&consensus_engine::ConsensusEngine`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/consensus_engine.rs:266:38
    |
266 |                 if confidence < self.ai_client.get_config().risk_threshold {
    |                                      ^^^^^^^^^ unknown field
    |
help: a field with a similar name exists
    |
266 |                 if confidence < self._ai_client.get_config().risk_threshold {
    |                                      +

warning: unused variable: `signature_valid`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/enhanced_ai_integration.rs:345:58
    |
345 |     async fn check_auto_slashing(&self, oracle_id: &str, signature_valid: bool, is_accurate: bool) {
    |                                                          ^^^^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_signature_valid`

warning: unused variable: `is_accurate`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/enhanced_ai_integration.rs:345:81
    |
345 |     async fn check_auto_slashing(&self, oracle_id: &str, signature_valid: bool, is_accurate: bool) {
    |                                                                                 ^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_is_accurate`

error[E0382]: borrow of moved value: `processing_decision_clone`
    --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/mod_clean.rs:1408:54
     |
1353 |                     let processing_decision_clone = processing_decision.clone();
     |                         ------------------------- move occurs because `processing_decision_clone` has type `RiskProcessingDecision`, which does not implement the `Copy` trait
...
1386 |                             processing_decision_clone,
     |                             ------------------------- value moved here
...
1408 |                                 processing_decision: processing_decision_clone.clone(),
     |                                                      ^^^^^^^^^^^^^^^^^^^^^^^^^ value borrowed here after move
     |
note: consider changing this parameter type in method `record_ai_decision` to borrow instead if owning the value isn't necessary
    --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/audit_trail.rs:262:24
     |
257  |     pub async fn record_ai_decision(
     |                  ------------------ in this method
...
262  |         risk_decision: RiskProcessingDecision,
     |                        ^^^^^^^^^^^^^^^^^^^^^^ this parameter takes ownership of the value
help: consider cloning the value if the performance cost is acceptable
     |
1386 |                             processing_decision_clone.clone(),
     |                                                      ++++++++

error[E0599]: no method named `is_some` found for struct `std::sync::Arc<ai_oracle_client::AIOracleClient>` in the current scope
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/enhanced_ai_integration.rs:144:24
    |
144 |         self.ai_client.is_some(); // no-op logic placeholder
    |                        ^^^^^^^ method not found in `Arc<AIOracleClient>`

warning: unused variable: `tx`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/transaction_validation.rs:375:41
    |
375 |     fn validate_signature_policy(&self, tx: &Transaction) -> Result<()> {
    |                                         ^^ help: if this is intentional, prefix it with an underscore: `_tx`

Some errors have detailed explanations: E0382, E0599, E0609.
For more information about an error, try `rustc --explain E0382`.
warning: `dytallix-node` (lib) generated 4 warnings
error: could not compile `dytallix-node` (lib) due to 6 previous errors; 4 warnings emitted
