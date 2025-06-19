# Dytallix Frontend & User Experience Interfaces

## Wallet UI (React/TypeScript)
```typescript
interface PQCWallet {
  generateKeypair(algo: string): Keypair;
  signTransaction(tx: Transaction, keypair: Keypair): Signature;
  verifySignature(tx: Transaction, sig: Signature, pubkey: string): boolean;
  getAddress(pubkey: string): string;
}
```

## Explorer & Analytics (TypeScript)
```typescript
interface ExplorerAPI {
  getBlock(hash: string): Promise<Block>;
  getTransaction(hash: string): Promise<Transaction>;
  getAddressInfo(address: string): Promise<AddressInfo>;
  getAuditReport(contract: string): Promise<AuditReport>;
}
```
