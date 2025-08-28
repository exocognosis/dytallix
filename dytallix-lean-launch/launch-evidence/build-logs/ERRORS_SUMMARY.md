
## clippy FAILED (exit 101)

Last 80 lines of /Users/rickglenn/dytallix/dytallix-lean-launch/launch-evidence/build-logs/clippy.log:
```

error[E0599]: no method named `as_context_mut` found for struct `Caller` in the current scope
   --> /Users/rickglenn/dytallix/blockchain-core/src/wasm/engine.rs:279:58
    |
279 |                 if let Ok(bytes) = Self::read_mem(caller.as_context_mut(), msg_ptr, msg_len) {
    |                                                          ^^^^^^^^^^^^^^
    |
    = help: items from traits can only be used if the trait is in scope
help: trait `AsContextMut` which provides `as_context_mut` is implemented but not in scope; perhaps you want to import it
    |
1   + use wasmtime::AsContextMut;
    |
help: there is a method `as_context` with a similar name
    |
279 -                 if let Ok(bytes) = Self::read_mem(caller.as_context_mut(), msg_ptr, msg_len) {
279 +                 if let Ok(bytes) = Self::read_mem(caller.as_context(), msg_ptr, msg_len) {
    |

error[E0277]: the `?` operator can only be used on `Result`s, not `Option`s, in a method that returns `Result`
  --> /Users/rickglenn/dytallix/blockchain-core/src/wasm/execution.rs:28:51
   |
14 | /     pub fn deploy(
15 | |         &mut self,
16 | |         creator: [u8; 32],
17 | |         code: &[u8],
18 | |         height: u64,
19 | |         gas_limit: u64,
20 | |     ) -> Result<(ContractInstance, u64)> {
   | |________________________________________- this function returns a `Result`
...
28 |           let remaining = store_ctx.fuel_remaining()?;
   |                                                     ^ use `.ok_or(...)?` to provide an error compatible with `std::result::Result<(wasm::types::ContractInstance, u64), anyhow::Error>`

error[E0277]: the `?` operator can only be used on `Result`s, not `Option`s, in a method that returns `Result`
  --> /Users/rickglenn/dytallix/blockchain-core/src/wasm/execution.rs:55:51
   |
36 | /     pub fn execute(
37 | |         &mut self,
38 | |         address: [u8; 32],
39 | |         method: &str,
40 | |         gas_limit: u64,
41 | |     ) -> Result<(i64, u64)> {
   | |___________________________- this function returns a `Result`
...
55 |           let remaining = store_ctx.fuel_remaining()?;
   |                                                     ^ use `.ok_or(...)?` to provide an error compatible with `std::result::Result<(i64, u64), anyhow::Error>`

error[E0599]: no method named `cloned` found for enum `Result<MutexGuard<'_, HostExecutionContext>, PoisonError<...>>` in the current scope
  --> /Users/rickglenn/dytallix/blockchain-core/src/wasm/host_env.rs:82:31
   |
82 |         self.inner.ctx.lock().cloned().unwrap_or_default()
   |                               ^^^^^^ `std::result::Result<std::sync::MutexGuard<'_, HostExecutionContext>, PoisonError<std::sync::MutexGuard<'_, HostExecutionContext>>>` is not an iterator
   |
help: call `.into_iter()` first
   |
82 |         self.inner.ctx.lock().into_iter().cloned().unwrap_or_default()
   |                               ++++++++++++

warning: unused variable: `tx`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/transaction_validation.rs:375:41
    |
375 |     fn validate_signature_policy(&self, tx: &Transaction) -> Result<()> {
    |                                         ^^ help: if this is intentional, prefix it with an underscore: `_tx`

warning: unused variable: `deploy`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/review_api.rs:221:47
    |
221 |             crate::types::Transaction::Deploy(deploy) => ("Deploy".to_string(), None, None, None),
    |                                               ^^^^^^ help: if this is intentional, prefix it with an underscore: `_deploy`

warning: unused variable: `oracle_entry`
   --> /Users/rickglenn/dytallix/blockchain-core/src/consensus/signature_verification.rs:263:13
    |
263 |         let oracle_entry = self.validate_oracle(&signed_response.oracle_identity)?;
    |             ^^^^^^^^^^^^ help: if this is intentional, prefix it with an underscore: `_oracle_entry`

Some errors have detailed explanations: E0277, E0308, E0433, E0592, E0599, E0609.
For more information about an error, try `rustc --explain E0277`.
warning: `dytallix-node` (lib) generated 18 warnings
error: could not compile `dytallix-node` (lib) due to 31 previous errors; 18 warnings emitted
```

