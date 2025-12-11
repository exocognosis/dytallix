import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { generateDilithiumKeypair, DILITHIUM_ALGO } from '../lib/pqc.js'
import { defaultKeystoreDir, encryptSecretKey, saveKeystore } from '../keystore.js'

export const keysCommand = new Command('keys')
  .description('Key management commands')
  .addCommand(new Command('add')
    .description('Generate and store a new PQC keypair (encrypted keystore)')
    .option('--name <name>', 'Key name', 'default')
    .option('--algo <algo>', 'Algorithm', 'dilithium')
    .option('--passphrase <pass>', 'Keystore passphrase (non-interactive; or set DYTX_PASSPHRASE)')
    .action(async (opts) => {
      const envPass = process.env.DYTX_PASSPHRASE
      let passphrase = opts.passphrase as string | undefined
      if (!passphrase) {
        if (envPass && envPass.length >= 8) {
          passphrase = envPass
        } else {
          passphrase = (await inquirer.prompt<{ passphrase: string }>([
            { type: 'password', name: 'passphrase', message: 'Enter passphrase to encrypt the key:', mask: '*', validate: (v) => v && v.length >= 8 || 'Min 8 chars' }
          ])).passphrase
        }
      }
      if (opts.algo !== 'dilithium') {
        throw new Error('Only dilithium algorithm is supported for key generation')
      }

      const { sk, pk } = generateDilithiumKeypair()
      const rec = encryptSecretKey(opts.name, sk, pk, passphrase!, DILITHIUM_ALGO)
      const file = saveKeystore(rec)
      console.log(chalk.green('✅ Key stored'))
      console.log(chalk.gray('Keystore:'), file)
      console.log(chalk.gray('Address:'), rec.address)
      console.log(chalk.gray('Algorithm:'), rec.algo)
    }))
  .addCommand(new Command('import')
    .description('Import an existing keystore JSON file')
    .argument('<file>', 'Path to keystore JSON')
    .option('--name <name>', 'Name to save as (defaults to inside file)')
    .action(async (file, opts) => {
      const fs = await import('fs')
      const path = await import('path')
      const raw = fs.readFileSync(file, 'utf8')
      const rec = JSON.parse(raw)
      const name = opts.name || rec.name
      rec.name = name
      const out = path.join(defaultKeystoreDir(), `${name}.json`)
      fs.writeFileSync(out, JSON.stringify(rec, null, 2))
      console.log(chalk.green('✅ Imported'))
      console.log(chalk.gray('Keystore:'), out)
      console.log(chalk.gray('Address:'), rec.address)
    }))
  .addCommand(new Command('list')
    .description('List keys (names and addresses)')
    .action(async () => {
      const fs = await import('fs')
      const path = await import('path')
      const dir = defaultKeystoreDir()
      const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'))
      if (!files.length) { console.log('No keys found in', dir); return }
      for (const f of files) {
        try {
          const rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
          console.log(`${f.replace(/\.json$/, '')}\t${rec.address}`)
        } catch { }
      }
    }))
