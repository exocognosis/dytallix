# Dytallix Wallet & PQC Keygen Interfaces

## Rust Traits
```rust
pub trait Wallet {
    fn generate_keypair(&self, algo: PQCAlgorithm) -> PQCKeyPair;
    fn sign_transaction(&self, tx: &Transaction, keypair: &PQCKeyPair) -> Signature;
    fn verify_signature(&self, tx: &Transaction, sig: &Signature, pubkey: &PQCKey) -> bool;
    fn get_address(&self, pubkey: &PQCKey) -> String;
}
```

## CLI Skeleton (Python)
```python
import click

@click.group()
def cli():
    pass

@cli.command()
def keygen():
    """Generate a new PQC keypair."""
    pass

@cli.command()
def sign():
    """Sign a transaction."""
    pass

@cli.command()
def verify():
    """Verify a transaction signature."""
    pass

if __name__ == "__main__":
    cli()
```
