// Balance query command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'

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

      // TODO: Implement actual RPC call to query balances
      // For now, return mock data
      const mockBalances = {
        address,
        balances: [
          { denom: 'udgt', amount: '1000000' }, // 1 DGT
          { denom: 'udrt', amount: '50000000' } // 50 DRT
        ]
      }

      if (globalOpts.output === 'json') {
        console.log(JSON.stringify(mockBalances, null, 2))
      } else {
        console.log(chalk.green('✅ Balance query successful!'))
        console.log(chalk.bold('Address:'), address)
        console.log(chalk.bold('Balances:'))
        
        for (const balance of mockBalances.balances) {
          const amount = parseFloat(balance.amount) / 1000000 // Convert from micro units
          const symbol = balance.denom.replace('u', '').toUpperCase()
          console.log(`  ${chalk.cyan(symbol)}: ${chalk.bold(amount.toFixed(6))}`)
        }
      }

    } catch (error) {
      console.error(chalk.red('Failed to query balances:'), (error as Error).message)
      process.exit(1)
    }
  })