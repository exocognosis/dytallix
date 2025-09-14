// Transfer command for dytx CLI (combines building, signing, and broadcasting)

import { Command } from 'commander'
import chalk from 'chalk'
import { DytClient } from '../lib/client.js'
import { signTxMock, buildSendTx } from '../lib/tx.js'
import inquirer from 'inquirer'
import { decryptSecretKey, findKeystoreByAddress, loadKeystoreByName } from '../keystore.js'

export const transferCommand = new Command('transfer')
  .description('Send tokens to another address')
  .option('--from <address>', 'Sender address')
  .option('--to <address>', 'Recipient address')
  .option('--amount <amount>', 'Amount to send')
  .option('--denom <denom>', 'Token denomination (udgt|udrt)', 'udgt')
  .option('--memo <memo>', 'Transaction memo', '')
  .option('--keystore <nameOrPath>', 'Keystore name (from keys list) or file path')
  .option('--passphrase <pass>', 'Keystore passphrase (non-interactive; or set DYTX_PASSPHRASE)')
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

      // Validate addresses (lean check; allow dyt* for dev bech32 variations)
      const validAddr = (a: string) => typeof a === 'string' && a.startsWith('dyt') && a.length >= 12
      if (!validAddr(options.from)) throw new Error('Invalid sender address format')
      if (!validAddr(options.to)) throw new Error('Invalid recipient address format')

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
      // Resolve nonce from RPC account endpoint
      const acct = await client.getAccount(options.from)
      const nonce = Number(acct.nonce || 0)
      const chainId = globalOpts.chainId || (await client.getStats()).chain_id
      const amountMicro = Math.round(amount * 1e6).toString()
      const tx = buildSendTx(chainId, nonce, options.from, options.to, options.denom.toUpperCase() === 'UDRT' ? 'DRT' : 'DGT', amountMicro, options.memo)

      // Load keystore (by name or by matching address) and decrypt
      let rec: any
      const fs = await import('fs')
      if (options.keystore) {
        if (fs.existsSync(options.keystore)) {
          rec = JSON.parse(fs.readFileSync(options.keystore, 'utf8'))
        } else {
          // treat as keystore name
          rec = loadKeystoreByName(options.keystore)
        }
      } else {
        const found = findKeystoreByAddress(options.from)
        if (!found) throw new Error('No keystore found for --from address; provide --keystore <nameOrPath>')
        rec = found.rec
      }
      const passFromEnv = process.env.DYTX_PASSPHRASE
      const passFromFlag = options.passphrase as string | undefined
      const pass = passFromFlag || passFromEnv || (await inquirer.prompt<{ passphrase: string }>([
        { type: 'password', name: 'passphrase', message: 'Enter keystore passphrase:', mask: '*' }
      ])).passphrase
      const sk = decryptSecretKey(rec, pass)
      const pk = Buffer.from(rec.pubkey_b64, 'base64')
      const signed = signTxMock(tx, sk, new Uint8Array(pk))
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
