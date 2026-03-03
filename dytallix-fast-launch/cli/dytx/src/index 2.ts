#!/usr/bin/env node

// Dytallix PQC Wallet CLI (dytx)
// Command-line interface for Dytallix post-quantum wallet operations

import { Command } from 'commander'
import chalk from 'chalk'
import { keygenCommand } from './commands/keygen.js'
import { balancesCommand } from './commands/balances.js'
import { keysCommand } from './commands/keys.js'
import { queryCommand } from './commands/query.js'
import { signCommand } from './commands/sign.js'
import { broadcastCommand } from './commands/broadcast.js'
import { transferCommand } from './commands/transfer.js'
import { govCommand } from './commands/gov.js'
import { contractCommand } from './commands/contract.js'
import { pqcSignCommand } from './commands/pqc-sign.js'
import { pqcVerifyCommand } from './commands/pqc-verify.js'

const program = new Command()

program
  .name('dytx')
  .description('Dytallix PQC Wallet CLI')
  .version('1.0.0')

// Global options
program
  .option('--rpc <url>', 'RPC endpoint URL', process.env.DYTALLIX_RPC_URL || 'http://localhost:3030')
  .option('--chain-id <id>', 'Chain ID (fetched from node if not specified)', process.env.DYTALLIX_CHAIN_ID)
  .option('--output <format>', 'Output format (json|text)', 'text')

// Commands
program.addCommand(keygenCommand)
program.addCommand(keysCommand)
program.addCommand(balancesCommand)
program.addCommand(queryCommand)
program.addCommand(signCommand)
program.addCommand(broadcastCommand)
program.addCommand(transferCommand)
program.addCommand(govCommand)
program.addCommand(contractCommand)
program.addCommand(pqcSignCommand)
program.addCommand(pqcVerifyCommand)

// Error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str))
})

program.exitOverride((err) => {
  if (err.code === 'commander.unknownCommand') {
    console.error(chalk.red(`Unknown command: ${err.message}`))
    console.log(chalk.yellow('Run "dytx --help" to see available commands'))
  }
  process.exit(err.exitCode)
})

// Parse command line arguments
try {
  await program.parseAsync(process.argv)
} catch (error) {
  console.error(chalk.red('Error:'), (error as Error).message)
  process.exit(1)
}
