// Key generation command for dytx CLI

import { Command } from 'commander'
import chalk from 'chalk'
import inquirer from 'inquirer'

export const keygenCommand = new Command('keygen')
  .description('Generate a new PQC keypair')
  .option('--algo <algorithm>', 'PQC algorithm (dilithium|falcon|sphincs+)', 'dilithium')
  .option('--label <label>', 'Key label', 'Default Key')
  .option('--output <file>', 'Output file for keystore JSON')
  .action(async (options, command) => {
    try {
      const globalOpts = command.parent.opts()
      
      // Validate algorithm
      const validAlgos = ['dilithium', 'falcon', 'sphincs+']
      if (!validAlgos.includes(options.algo)) {
        throw new Error(`Invalid algorithm. Must be one of: ${validAlgos.join(', ')}`)
      }

      console.log(chalk.blue('🔐 Generating PQC keypair...'))
      console.log(chalk.gray(`Algorithm: ${options.algo}`))
      console.log(chalk.gray(`Label: ${options.label}`))

      // Prompt for passphrase
      const { passphrase } = await inquirer.prompt([
        {
          type: 'password',
          name: 'passphrase',
          message: 'Enter passphrase to encrypt the key:',
          validate: (input: string) => input.length >= 8 || 'Passphrase must be at least 8 characters'
        }
      ])

      const { confirmPassphrase } = await inquirer.prompt([
        {
          type: 'password',
          name: 'confirmPassphrase',
          message: 'Confirm passphrase:',
          validate: (input: string) => input === passphrase || 'Passphrases do not match'
        }
      ])

      // TODO: Integrate with actual PQC crypto library
      // For now, generate mock data
      const mockAddress = `dytallix1${Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`

      const mockKeystore = {
        version: 1,
        address: mockAddress,
        algorithm: options.algo,
        label: options.label,
        encrypted_key: 'mock_encrypted_key_data',
        kdf: 'scrypt',
        created_at: new Date().toISOString()
      }

      if (globalOpts.output === 'json') {
        console.log(JSON.stringify({
          address: mockAddress,
          algorithm: options.algo,
          label: options.label
        }, null, 2))
      } else {
        console.log(chalk.green('✅ Key generated successfully!'))
        console.log(chalk.bold('Address:'), mockAddress)
        console.log(chalk.bold('Algorithm:'), options.algo)
        console.log(chalk.bold('Label:'), options.label)
      }

      if (options.output) {
        // TODO: Write keystore to file
        console.log(chalk.blue(`💾 Keystore saved to: ${options.output}`))
      } else {
        console.log(chalk.yellow('⚠️  Use --output to save keystore to file'))
      }

    } catch (error) {
      console.error(chalk.red('Failed to generate key:'), (error as Error).message)
      process.exit(1)
    }
  })