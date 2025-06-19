"""
Dytallix Wallet CLI
- PQC keygen, sign, and verify commands
"""
import click

@click.group()
def cli():
    pass

@cli.command()
@click.option('--algo', default='dilithium', help='PQC algorithm')
def keygen(algo):
    """Generate a new PQC keypair."""
    # TODO: Call Rust FFI or dummy Python logic
    click.echo(f"Generated {algo} keypair (dummy)")

@cli.command()
def sign():
    """Sign a transaction."""
    # TODO: Implement signing
    click.echo("Signed transaction (dummy)")

@cli.command()
def verify():
    """Verify a transaction signature."""
    # TODO: Implement verification
    click.echo("Signature verified (dummy)")

if __name__ == "__main__":
    cli()
