// Balance query command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'
import { DytClient } from '../../../../sdk/src/client'

export const balancesCommand = new Command('balances')
  .description('Query account balances')
  .argument('<address>', 'Account address to query')
  .action(async (address, options, command) => {
    try {
      const globalOpts = command.parent.opts()
      
      // Validate address format
      if (!address.startsWith('dytallix1')) {
        throw new Error('Invalid address format. Must start with "dytallix1"')
      }

      console.log(chalk.blue('💰 Querying balances...'))
      console.log(chalk.gray(`Address: ${address}`))
      console.log(chalk.gray(`RPC: ${globalOpts.rpc}`))

      const client = new DytClient(globalOpts.rpc)
      const res = await client.getBalance(address)
      if (globalOpts.output === 'json') {
        console.log(JSON.stringify(res, null, 2))
      } else {
        console.log(chalk.green('✅ Balance query successful!'))
        console.log(chalk.bold('Address:'), address)
        console.log(res)
      }

    } catch (error) {
      console.error(chalk.red('Failed to query balances:'), (error as Error).message)
      process.exit(1)
    }
  })
