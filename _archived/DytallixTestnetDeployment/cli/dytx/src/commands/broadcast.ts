// Transaction broadcast command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { DytClient } from '../lib/client.js'
import { txHashHex } from '../lib/tx.js'

export const broadcastCommand = new Command('broadcast')
  .description('Broadcast a signed transaction')
  .option('--file <file>', 'JSON file containing signed transaction')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()
      
      if (!options.file) {
        throw new Error('--file is required')
      }

      // Load signed transaction
      const signedTx = JSON.parse(readFileSync(options.file, 'utf8'))

      console.log(chalk.blue('📡 Broadcasting transaction...'))
      console.log(chalk.gray(`File: ${options.file}`))
      console.log(chalk.gray(`RPC: ${globalOpts.rpc}`))

      const client = new DytClient(globalOpts.rpc)
      const result = await client.submitSignedTx(signedTx)
      const hash = result.hash || (signedTx.tx ? txHashHex(signedTx.tx) : undefined)

      if (globalOpts.output === 'json') {
        console.log(JSON.stringify({ ...result, hash }, null, 2))
      } else {
        console.log(chalk.green('✅ Transaction broadcast successfully!'))
        if (hash) console.log(chalk.bold('Transaction Hash:'), hash)
        console.log(chalk.bold('Status:'), result.status)
      }

    } catch (error) {
      console.error(chalk.red('Failed to broadcast transaction:'), (error as Error).message)
      process.exit(1)
    }
  })
