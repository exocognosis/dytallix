# Dytallix Interoperability & Bridging Interfaces

## PQC Bridge (Rust)
```rust
pub trait PQCBridge {
    fn lock_asset(&self, asset: Asset, dest_chain: &str) -> BridgeTxId;
    fn mint_wrapped(&self, asset: Asset, origin_chain: &str) -> Result<WrappedAsset, BridgeError>;
    fn verify_cross_chain(&self, tx: &BridgeTx) -> bool;
}
```

## IBC Protocol (Rust)
```rust
pub trait IBCModule {
    fn send_packet(&self, packet: IBCPacket) -> Result<(), IBCError>;
    fn receive_packet(&self, packet: IBCPacket) -> Result<(), IBCError>;
}
```
