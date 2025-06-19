# Dytallix Blockchain Node & Consensus Interfaces

## Node Trait (Rust)
```rust
pub trait DytallixNode {
    fn start(&self) -> Result<(), NodeError>;
    fn stop(&self);
    fn submit_transaction(&self, tx: Transaction) -> Result<TxReceipt, NodeError>;
    fn get_block(&self, hash: &str) -> Option<Block>;
    fn get_status(&self) -> NodeStatus;
}
```

## Consensus Trait (Rust)
```rust
pub trait ConsensusEngine {
    fn propose_block(&self, txs: Vec<Transaction>) -> Block;
    fn validate_block(&self, block: &Block) -> bool;
    fn sign_block(&self, block: &Block, keypair: &PQCKeyPair) -> Signature;
    fn verify_signature(&self, block: &Block, sig: &Signature) -> bool;
}
```

## PQC Key Management (Rust)
```rust
pub trait PQCKeyManager {
    fn generate_keypair(&self, algo: PQCAlgorithm) -> PQCKeyPair;
    fn sign(&self, message: &[u8], keypair: &PQCKeyPair) -> Signature;
    fn verify(&self, message: &[u8], sig: &Signature, pubkey: &PQCKey) -> bool;
}
```

## PQC Algorithm Traits (Rust)
```rust
pub trait Dilithium {
    fn generate_keypair() -> PQCKeyPair;
    fn sign(message: &[u8], keypair: &PQCKeyPair) -> Signature;
    fn verify(message: &[u8], sig: &Signature, pubkey: &PQCKey) -> bool;
}

pub trait Falcon {
    fn generate_keypair() -> PQCKeyPair;
    fn sign(message: &[u8], keypair: &PQCKeyPair) -> Signature;
    fn verify(message: &[u8], sig: &Signature, pubkey: &PQCKey) -> bool;
}

pub trait SphincsPlus {
    fn generate_keypair() -> PQCKeyPair;
    fn sign(message: &[u8], keypair: &PQCKeyPair) -> Signature;
    fn verify(message: &[u8], sig: &Signature, pubkey: &PQCKey) -> bool;
}
```

## Crypto-Agility Abstraction Layer
```rust
pub enum PQCAlgorithm {
    Dilithium,
    Falcon,
    SphincsPlus,
}

pub trait CryptoAgilityManager {
    fn set_active_algorithm(&mut self, algo: PQCAlgorithm);
    fn get_active_algorithm(&self) -> PQCAlgorithm;
    fn migrate_keys(&self, from: PQCAlgorithm, to: PQCAlgorithm) -> Result<PQCKeyPair, CryptoAgilityError>;
}
```
