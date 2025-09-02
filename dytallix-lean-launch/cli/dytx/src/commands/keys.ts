import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import { keypair } from '../../../../sdk/src/pqcMock.js'
import { defaultKeystoreDir, encryptSecretKey, saveKeystore, findKeystoreByAddress, loadKeystoreByName } from '../keystore.js'

export const keysCommand = new Command('keys')
  .description('Key management commands')
  .addCommand(new Command('add')
    .description('Generate and store a new PQC keypair (encrypted keystore)')
    .option('--name <name>', 'Key name', 'default')
    .option('--algo <algo>', 'Algorithm', 'dilithium')
    .action(async (opts) => {
      const { passphrase } = await inquirer.prompt<{ passphrase: string }>([
        { type: 'password', name: 'passphrase', message: 'Enter passphrase to encrypt the key:', mask: '*', validate: (v) => v && v.length >= 8 || 'Min 8 chars' }
      ])
      const { sk, pk } = keypair()
      const rec = encryptSecretKey(opts.name, sk, pk, passphrase, opts.algo)
      const file = saveKeystore(rec)
      console.log(chalk.green('✅ Key stored'))
      console.log(chalk.gray('Keystore:'), file)
      console.log(chalk.gray('Address:'), rec.address)
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
    .action(() => {
      const fs = require('fs') as typeof import('fs')
      const path = require('path') as typeof import('path')
      const dir = defaultKeystoreDir()
      const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'))
      if (!files.length) { console.log('No keys found in', dir); return }
      for (const f of files) {
        try {
          const rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
          console.log(`${f.replace(/\.json$/, '')}\t${rec.address}`)
        } catch {}
      }
    }))
