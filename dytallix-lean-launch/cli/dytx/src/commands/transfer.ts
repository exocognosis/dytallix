// Transfer command for dytx CLI (combines building, signing, and broadcasting)

import { Command } from 'commander'
import chalk from 'chalk'
import { DytClient } from '../../../../sdk/src/client'
import { keypair, signTxMock, buildSendTx } from '../../../../sdk/src/index'

export const transferCommand = new Command('transfer')
  .description('Send tokens to another address')
  .option('--from <address>', 'Sender address')
  .option('--to <address>', 'Recipient address')
  .option('--amount <amount>', 'Amount to send')
  .option('--denom <denom>', 'Token denomination (udgt|udrt)', 'udgt')
  .option('--memo <memo>', 'Transaction memo', '')
  .option('--keystore <file>', 'Keystore file')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()
      
      // Validate required options
      const required = ['from', 'to', 'amount']
      for (const field of required) {
        if (!options[field]) {
          throw new Error(`--${field} is required`)
        }
      }

      // Validate addresses
      if (!options.from.startsWith('dytallix1')) {
        throw new Error('Invalid sender address format')
      }
      if (!options.to.startsWith('dytallix1')) {
        throw new Error('Invalid recipient address format')
      }

      // Validate amount
      const amount = parseFloat(options.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Amount must be a positive number')
      }

      // Validate denomination
      if (!['udgt', 'udrt'].includes(options.denom)) {
        throw new Error('Denomination must be udgt or udrt')
      }

      console.log(chalk.blue('💸 Preparing transfer...'))
      console.log(chalk.gray(`From: ${options.from}`))
      console.log(chalk.gray(`To: ${options.to}`))
      console.log(chalk.gray(`Amount: ${options.amount} ${options.denom.toUpperCase()}`))
      
      if (options.memo) {
        console.log(chalk.gray(`Memo: ${options.memo}`))
      }

      const client = new DytClient(globalOpts.rpc)
      // Build tx with nonce 0 (first tx)
      const chainId = globalOpts.chainId
      const amountMicro = Math.round(amount * 1e6).toString()
      const tx = buildSendTx(chainId, 0, options.from, options.to, options.denom.toUpperCase() === 'UDRT' ? 'DRT' : 'DGT', amountMicro, options.memo)
      // Mock signing path (devnet)
      const { sk, pk } = keypair()
      const signed = signTxMock(tx, sk, pk)
      const res = await client.submitSignedTx(signed)

      if (globalOpts.output === 'json') {
        console.log(JSON.stringify(res, null, 2))
      } else {
        console.log(chalk.green('✅ Transfer submitted!'))
        console.log(chalk.bold('Transaction Hash:'), res.hash)
        console.log(chalk.bold('Status:'), res.status)
        console.log(chalk.cyan('Transfer:'), `${options.amount} ${options.denom.toUpperCase()} from ${options.from} to ${options.to}`)
      }

    } catch (error) {
      console.error(chalk.red('Failed to transfer:'), (error as Error).message)
      process.exit(1)
    }
  })
