// Key generation command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { generateDilithiumKeypair, DILITHIUM_ALGO } from '../lib/pqc.js'
import { encryptSecretKey, saveKeystore } from '../keystore.js'

function ensureDir(path: string): void {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export const keygenCommand = new Command('keygen')
  .description('Generate a new Dilithium keypair (encrypted keystore)')
  .option('--algo <algorithm>', 'PQC algorithm (dilithium)', 'dilithium')
  .option('--label <label>', 'Key label', 'default')
  .option('--output <file>', 'Output file for keystore JSON (defaults to ~/.dytx/keystore/<label>.json)')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()

      if (options.algo !== 'dilithium') {
        throw new Error('Only Dilithium key generation is supported in this CLI')
      }

      console.log(chalk.blue('🔐 Generating Dilithium keypair...'))
      console.log(chalk.gray(`Label: ${options.label}`))

      const { passphrase } = await inquirer.prompt([
        {
          type: 'password',
          name: 'passphrase',
          message: 'Enter passphrase to encrypt the key:',
          mask: '*',
          validate: (input: string) => input.length >= 8 || 'Passphrase must be at least 8 characters'
        }
      ])

      const { confirmPassphrase } = await inquirer.prompt([
        {
          type: 'password',
          name: 'confirmPassphrase',
          message: 'Confirm passphrase:',
          mask: '*',
          validate: (input: string) => input === passphrase || 'Passphrases do not match'
        }
      ])

      if (passphrase !== confirmPassphrase) {
        throw new Error('Passphrase confirmation mismatch')
      }

      const { sk, pk } = generateDilithiumKeypair()
      const rec = encryptSecretKey(options.label, sk, pk, passphrase, DILITHIUM_ALGO)

      let outputPath: string
      if (options.output) {
        const absolute = resolve(options.output)
        ensureDir(absolute)
        writeFileSync(absolute, JSON.stringify(rec, null, 2) + '\n')
        outputPath = absolute
      } else {
        outputPath = saveKeystore(rec)
      }

      if (globalOpts.output === 'json') {
        console.log(JSON.stringify({ keystore: outputPath, address: rec.address, algorithm: rec.algo }, null, 2))
      } else {
        console.log(chalk.green('✅ Key generated and stored'))
        console.log(chalk.bold('Address:'), rec.address)
        console.log(chalk.bold('Algorithm:'), rec.algo)
        console.log(chalk.bold('Keystore:'), outputPath)
      }

    } catch (error) {
      console.error(chalk.red('Failed to generate key:'), (error as Error).message)
      process.exit(1)
    }
  })
