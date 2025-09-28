// Key generation command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'fs'
import { generateDilithiumKeypair, DILITHIUM_ALGO } from '../lib/pqc.js'
import { encryptSecretKey, saveKeystore } from '../keystore.js'
import { randomBytes } from 'crypto'
import os from 'os'

function ensureDir(path: string): void {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function saveAutoPassphrase(label: string, passphrase: string): string {
  const passDir = resolve(os.homedir(), '.dytx', 'passphrases')
  if (!existsSync(passDir)) {
    mkdirSync(passDir, { recursive: true, mode: 0o700 })
  }
  try { chmodSync(passDir, 0o700) } catch {}
  const passFile = resolve(passDir, `${label}.txt`)
  // Write with restrictive permissions
  writeFileSync(passFile, passphrase + '\n', { mode: 0o600 })
  try { chmodSync(passFile, 0o600) } catch {}
  return passFile
}

export const keygenCommand = new Command('keygen')
  .description('Generate a new Dilithium keypair (encrypted keystore)')
  .option('--algo <algorithm>', 'PQC algorithm (dilithium)', 'dilithium')
  .option('--label <label>', 'Key label', 'default')
  // Use --out for file path to avoid conflict with global --output=json|text
  .option('--out <file>', 'Output file for keystore JSON (defaults to ~/.dytx/keystore/<label>.json)')
  // Optional non-interactive passphrase
  .option('--passphrase <pass>', 'Passphrase for non-interactive usage (or set DYTX_PASSPHRASE)')
  .option('--passphrase-file <file>', 'Read passphrase from a file (first line used)')
  .option('--auto-passphrase', 'Generate a secure passphrase and store it at ~/.dytx/passphrases/<label>.txt (0600)')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()

      if (options.algo !== 'dilithium') {
        throw new Error('Only Dilithium key generation is supported in this CLI')
      }

      // Only print friendly logs in text mode
      if (globalOpts.output !== 'json') {
        console.log(chalk.blue('🔐 Generating Dilithium keypair...'))
        console.log(chalk.gray(`Label: ${options.label}`))
      }

      // Determine passphrase: flag > file > env > auto > prompt
      let passphrase: string
      const envPass = process.env.DYTX_PASSPHRASE
      if (typeof options.passphrase === 'string' && options.passphrase.length >= 8) {
        passphrase = options.passphrase
      } else if (typeof options.passphraseFile === 'string') {
        const fileData = readFileSync(resolve(options.passphraseFile), 'utf8')
        const fromFile = fileData.split(/\r?\n/)[0]
        if (!fromFile || fromFile.length < 8) {
          throw new Error('Passphrase from file must be at least 8 characters')
        }
        passphrase = fromFile
      } else if (envPass && envPass.length >= 8) {
        passphrase = envPass
      } else if (options.autoPassphrase) {
        // 32 bytes -> base64url ~43 chars
        const auto = randomBytes(32).toString('base64url')
        const savedAt = saveAutoPassphrase(options.label, auto)
        if (globalOpts.output !== 'json') {
          console.log(chalk.gray(`Auto-generated passphrase saved to: ${savedAt}`))
        }
        passphrase = auto
      } else {
        const resp = await inquirer.prompt([
          {
            type: 'password',
            name: 'passphrase',
            message: 'Enter passphrase to encrypt the key:',
            mask: '*',
            validate: (input: string) => input.length >= 8 || 'Passphrase must be at least 8 characters'
          },
          {
            type: 'password',
            name: 'confirmPassphrase',
            message: 'Confirm passphrase:',
            mask: '*',
            validate: (input: string, answers: any) => input === (answers as any).passphrase || 'Passphrases do not match'
          }
        ]) as { passphrase: string; confirmPassphrase: string }
        passphrase = resp.passphrase
      }

      const { sk, pk } = generateDilithiumKeypair()
      const rec = encryptSecretKey(options.label, sk, pk, passphrase, DILITHIUM_ALGO)

      let outputPath: string
      if (options.out) {
        const absolute = resolve(options.out)
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
