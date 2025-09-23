// Transaction signing command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync, writeFileSync } from 'fs'
import inquirer from 'inquirer'
import { DytClient } from '../lib/client.js'
import { buildSendTx, signTx, txHashHex } from '../lib/tx.js'
import { amountToMicro } from '../lib/amount.js'
import { decryptSecretKey } from '../keystore.js'
import { loadKeystoreRecord } from '../lib/keystore-loader.js'

function validateAddress(addr: string): void {
  if (typeof addr !== 'string' || !addr.startsWith('dyt') || addr.length < 12) {
    throw new Error('Invalid address format; expected dyt* prefix')
  }
}

function normalizeFee(fee?: string | number): string | undefined {
  if (fee === undefined || fee === null) return undefined
  const feeStr = String(fee)
  if (feeStr.includes('.')) {
    return amountToMicro(feeStr)
  }
  if (!/^\d+$/.test(feeStr)) {
    throw new Error('Fee must be a positive integer or decimal value')
  }
  return feeStr
}

type SignPayload = {
  to: string
  amount: string | number
  denom?: string
  memo?: string
  fee?: string | number
}

export const signCommand = new Command('sign')
  .description('Sign a transaction payload with Dilithium')
  .requiredOption('--address <address>', 'Signer address')
  .requiredOption('--payload <file>', 'JSON file containing transaction payload (transfer descriptor)')
  .option('--keystore <fileOrName>', 'Keystore file path or saved keystore name')
  .option('--passphrase <pass>', 'Keystore passphrase (or set DYTX_PASSPHRASE)')
  .option('--out <file>', 'Output file for signed transaction JSON')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()

      validateAddress(options.address)

      const payloadRaw = readFileSync(options.payload, 'utf8')
      const payload = JSON.parse(payloadRaw) as SignPayload

      validateAddress(payload.to)
      const amountMicro = amountToMicro(String(payload.amount))
      const denomInput = (payload.denom || 'udgt').toString().toLowerCase()
      if (!['udgt', 'udrt'].includes(denomInput)) {
        throw new Error('Denomination must be udgt or udrt')
      }
      const denom = denomInput === 'udrt' ? 'DRT' : 'DGT'
      const feeMicro = normalizeFee(payload.fee)

      console.log(chalk.blue('✍️  Signing transaction...'))
      console.log(chalk.gray(`Signer: ${options.address}`))
      console.log(chalk.gray(`Payload file: ${options.payload}`))

      const client = new DytClient(globalOpts.rpc)
      const acct = await client.getAccount(options.address)
      const nonce = Number(acct.nonce || 0)
      const chainId = globalOpts.chainId || (await client.getStats()).chain_id

      const tx = buildSendTx(
        chainId,
        nonce,
        options.address,
        payload.to,
        denom,
        amountMicro,
        payload.memo || '',
        feeMicro
      )

      const { record } = loadKeystoreRecord(options.address, options.keystore)
      const passFromEnv = process.env.DYTX_PASSPHRASE
      const passFromFlag = options.passphrase as string | undefined
      const pass = passFromFlag || passFromEnv || (await inquirer.prompt<{ passphrase: string }>([
        { type: 'password', name: 'passphrase', message: 'Enter keystore passphrase:', mask: '*' }
      ])).passphrase
      const sk = decryptSecretKey(record, pass)
      const pk = Buffer.from(record.pubkey_b64, 'base64')
      const signed = signTx(tx, sk, new Uint8Array(pk))
      const hash = txHashHex(tx)

      if (options.out) {
        writeFileSync(options.out, JSON.stringify(signed, null, 2) + '\n')
        console.log(chalk.blue(`💾 Signed transaction saved to: ${options.out}`))
      }

      if (globalOpts.output === 'json') {
        console.log(JSON.stringify({ signed_tx: signed, hash }, null, 2))
      } else {
        console.log(chalk.green('✅ Transaction signed successfully!'))
        console.log(chalk.bold('Transaction Hash:'), hash)
        console.log(chalk.bold('Algorithm:'), signed.algorithm)
      }

    } catch (error) {
      console.error(chalk.red('Failed to sign transaction:'), (error as Error).message)
      process.exit(1)
    }
  })
