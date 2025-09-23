# Dytallix CLI (dytx) Reference

## Overview

The `dytx` CLI provides command-line access to Dytallix PQC wallet operations. Built with TypeScript and designed for both development and production use. All signing flows now use **Dilithium5** by default with no legacy fallback paths; omitting any signing algorithm flag will automatically use the post-quantum implementation that the chain enforces.

## Installation

```bash
cd dytallix-lean-launch/cli/dytx
npm install
npm run build
```

## Global Options

| Option | Description | Default |
|--------|-------------|---------|
| `--rpc <url>` | RPC endpoint URL | `https://rpc-testnet.dytallix.com` |
| `--chain-id <id>` | Chain identifier | `dytallix-testnet-1` |
| `--output <format>` | Output format (`json`\|`text`) | `text` |

Environment variables:
- `DYTALLIX_RPC_URL` - Override default RPC URL
- `DYTALLIX_CHAIN_ID` - Override default chain ID

## Commands

### Key Generation

Generate a new PQC keypair:

```bash
dytx keygen [options]
```

**Options:**
- `--algo <algorithm>` - PQC algorithm (`dilithium`) [default: `dilithium`]
- `--label <label>` - Human-readable key label [default: `"Default Key"`]
- `--output <file>` - Save keystore to file

**Example:**
```bash
dytx keygen --label "My Dilithium Key" --output my-key.json
```

**Output:**
```
🔐 Generating PQC keypair...
Algorithm: dilithium5
Label: My Dilithium Key
✅ Key generated successfully!
Address: dytallix1abc123def456...
Algorithm: dilithium5
Label: My Dilithium Key
💾 Keystore saved to: my-key.json
```

### Balance Queries

Query account balances:

```bash
dytx balances <address>
```

**Arguments:**
- `<address>` - Dytallix address to query (dytallix1...)

**Example:**
```bash
dytx balances dytallix1abc123def456789012345678901234567890
```

**Output:**
```
💰 Querying balances...
Address: dytallix1abc123def456789012345678901234567890
✅ Balance query successful!
Address: dytallix1abc123def456789012345678901234567890
Balances:
  DGT: 1.000000
  DRT: 50.000000
```

### Transaction Signing

Sign a transaction payload:

```bash
dytx sign [options]
```

- `--address <address>` - Signer address (required)
- `--payload <file>` - JSON file with transaction payload (required)
- `--keystore <file>` - Keystore file containing private key
- `--out <file>` - Output file for signed transaction

**Example:**
```bash
dytx sign \
  --address dytallix1abc123... \
  --payload examples/transfer.json \
  --keystore my-key.json \
  --out signed-tx.json
```

**Output:**
```
✍️  Signing transaction...
Address: dytallix1abc123...
Payload: examples/transfer.json
✅ Transaction signed successfully!
Transaction Hash: 0xdef456...
Algorithm: dilithium5
Signature: <base64 Dilithium signature>
💾 Signed transaction saved to: signed-tx.json
```

### Transaction Broadcasting

Broadcast a signed transaction:

```bash
dytx broadcast --file <file>
```

**Options:**
- `--file <file>` - JSON file containing signed transaction (required)

**Example:**
```bash
dytx broadcast --file signed-tx.json
```

**Output:**
```
📡 Broadcasting transaction...
File: signed-tx.json
✅ Transaction broadcast successfully!
Transaction Hash: 0xdef456...
Block Height: 123456
Gas Used: 50000
Gas Wanted: 60000
```

### Direct Transfer

Send tokens directly (combines build + sign + broadcast):

```bash
dytx transfer [options]
```

**Options:**
- `--from <address>` - Sender address (required)
- `--to <address>` - Recipient address (required)
- `--amount <amount>` - Amount to send (required)
- `--denom <denom>` - Token denomination (`udgt`\|`udrt`) [default: `udgt`]
- `--memo <memo>` - Transaction memo [default: `""`]
- `--keystore <file>` - Keystore file

**Example:**
```bash
dytx transfer \
  --from dytallix1sender123... \
  --to dytallix1recipient456... \
  --amount 2.5 \
  --denom udgt \
  --memo "Payment for services" \
  --keystore sender-key.json
```

**Output:**
```
💸 Preparing transfer...
From: dytallix1sender123...
To: dytallix1recipient456...
Amount: 2.5 UDGT
Memo: Payment for services
✅ Transfer completed successfully!
Transaction Hash: 0xabc789...
Block Height: 123457
Transfer: 2.5 UDGT from dytallix1sender123... to dytallix1recipient456...
```

## Transaction Payload Examples

### Transfer
```json
{
  "type": "transfer",
  "body": {
    "from": "dytallix1sender123456789012345678901234567890",
    "to": "dytallix1recipient123456789012345678901234567890",
    "amount": "1000000",
    "denom": "udgt",
    "memo": "Test transfer"
  }
}
```

### Staking Delegation
```json
{
  "type": "delegate",
  "body": {
    "delegator": "dytallix1delegator123456789012345678901234567890",
    "validator": "dytallixvaloper1validator123456789012345678901234567890",
    "amount": "10000000",
    "denom": "udgt"
  }
}
```

### Governance Proposal
```json
{
  "type": "gov_proposal",
  "body": {
    "proposer": "dytallix1proposer123456789012345678901234567890",
    "title": "Protocol Upgrade",
    "description": "Upgrade to version 2.0",
    "deposit": "1000000000",
    "denom": "udgt"
  }
}
```

### Governance Vote
```json
{
  "type": "gov_vote",
  "body": {
    "voter": "dytallix1voter123456789012345678901234567890",
    "proposal_id": "1",
    "option": "yes"
  }
}
```

### Smart Contract Call
```json
{
  "type": "contract_call",
  "body": {
    "sender": "dytallix1sender123456789012345678901234567890",
    "contract": "dytallix1contract123456789012345678901234567890",
    "msg": {
      "execute": {
        "action": "transfer",
        "recipient": "dytallix1recipient123456789012345678901234567890",
        "amount": "1000000"
      }
    },
    "funds": [
      {
        "amount": "100000",
        "denom": "udrt"
      }
    ]
  }
}
```

## JSON Output

Use `--output json` for machine-readable output:

```bash
dytx balances dytallix1abc123... --output json
```

```json
{
  "address": "dytallix1abc123...",
  "balances": [
    { "denom": "udgt", "amount": "1000000" },
    { "denom": "udrt", "amount": "50000000" }
  ]
}
```

## Error Handling

Common error scenarios:

**Invalid address format:**
```
Error: Invalid address format. Must start with "dytallix1"
```

**Missing required options:**
```
Error: --address is required
```

**Network connection issues:**
```
Error: Failed to connect to RPC endpoint
```

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev -- keygen --algo dilithium
```

### Adding New Commands

1. Create command file in `src/commands/`
2. Export command from the file
3. Import and add to `src/index.ts`

Example command structure:
```typescript
import { Command } from 'commander'
import chalk from 'chalk'

export const myCommand = new Command('mycommand')
  .description('My custom command')
  .option('--option <value>', 'My option')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()
      // Command implementation
      console.log(chalk.green('✅ Success!'))
    } catch (error) {
      console.error(chalk.red('Error:'), error.message)
      process.exit(1)
    }
  })
```

## Future Enhancements

- Mnemonic phrase support for key import/export
- Hardware wallet integration
- Batch transaction processing
- Transaction templating system
- Multi-signature support