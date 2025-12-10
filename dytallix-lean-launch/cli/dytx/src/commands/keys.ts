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
  .addCommand(new Command('rotate')
    .description('Rotate PQC keypair (generates new key, backs up old one)')
    .option('--name <name>', 'Key name to rotate', 'default')
    .option('--algo <algo>', 'Algorithm for new key', 'dilithium')
    .option('--passphrase <pass>', 'Keystore passphrase')
    .action(async (opts) => {
      const path = await import('path')
      const fs = await import('fs')
      
      const envPass = process.env.DYTX_PASSPHRASE
      let passphrase = opts.passphrase as string | undefined
      if (!passphrase) {
        if (envPass && envPass.length >= 8) {
          passphrase = envPass
        } else {
          passphrase = (await inquirer.prompt<{ passphrase: string }>([
            { type: 'password', name: 'passphrase', message: 'Enter passphrase:', mask: '*' }
          ])).passphrase
        }
      }

      // Load existing keystore
      const keystoreFile = path.join(defaultKeystoreDir(), `${opts.name}.json`)  
      if (!fs.existsSync(keystoreFile)) {
        throw new Error(`Keystore not found: ${keystoreFile}`)
      }

      const oldKeystore = JSON.parse(fs.readFileSync(keystoreFile, 'utf8'))
      
      // Create backup of old key
      const backupId = `rotation_${new Date().toISOString().replace(/[:.]/g, '-')}`
      const backupFile = path.join(defaultKeystoreDir(), `${opts.name}_backup_${backupId}.json`)
      fs.writeFileSync(backupFile, JSON.stringify(oldKeystore, null, 2))
      console.log(chalk.yellow('📦 Old key backed up to:'), backupFile)

      // Generate new keypair
      if (opts.algo !== 'dilithium') {
        throw new Error('Only dilithium algorithm is supported')
      }
      
      const { sk, pk } = generateDilithiumKeypair()
      const newKeystore = encryptSecretKey(opts.name, sk, pk, passphrase!, DILITHIUM_ALGO)
      
      // Update keystore metadata
      newKeystore.rotation_history = oldKeystore.rotation_history || []
      newKeystore.rotation_history.push({
        timestamp: new Date().toISOString(),
        previous_address: oldKeystore.address,
        backup_file: backupFile,
        reason: 'manual_rotation'
      })

      fs.writeFileSync(keystoreFile, JSON.stringify(newKeystore, null, 2))
      
      console.log(chalk.green('🔄 Key rotation completed'))
      console.log(chalk.gray('Previous address:'), oldKeystore.address)
      console.log(chalk.gray('New address:'), newKeystore.address)
      console.log(chalk.gray('Backup location:'), backupFile)
    }))
  .addCommand(new Command('export')
    .description('Export public key in PEM format')
    .option('--name <name>', 'Key name to export', 'default')
    .option('--format <format>', 'Export format (pem, json)', 'pem')
    .action(async (opts) => {
      const path = await import('path')
      const fs = await import('fs')
      
      const keystoreFile = path.join(defaultKeystoreDir(), `${opts.name}.json`)
      if (!fs.existsSync(keystoreFile)) {
        throw new Error(`Keystore not found: ${keystoreFile}`)
      }

      const keystore = JSON.parse(fs.readFileSync(keystoreFile, 'utf8'))
      
      if (opts.format === 'pem') {
        const keyData = Buffer.from(keystore.public_key, 'hex').toString('base64')
        const algorithmName = keystore.algo.toUpperCase()
        
        const pemKey = [
          `-----BEGIN ${algorithmName} PUBLIC KEY-----`,
          keyData,
          `-----END ${algorithmName} PUBLIC KEY-----`
        ].join('\n')
        
        console.log(pemKey)
      } else if (opts.format === 'json') {
        const exportData = {
          name: keystore.name,
          address: keystore.address,
          public_key: keystore.public_key,
          algorithm: keystore.algo,
          created_at: keystore.created_at,
          exported_at: new Date().toISOString()
        }
        console.log(JSON.stringify(exportData, null, 2))
      } else {
        throw new Error('Supported formats: pem, json')
      }
    }))
  .addCommand(new Command('restore')
    .description('Restore from a backup keystore')
    .argument('<backup-file>', 'Path to backup keystore file')
    .option('--name <name>', 'Name to restore as (defaults to original name)')
    .action(async (backupFile, opts) => {
      const path = await import('path')
      const fs = await import('fs')
      
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`)
      }

      const backupKeystore = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
      const restoreName = opts.name || backupKeystore.name
      
      // Add restoration metadata
      backupKeystore.restored_at = new Date().toISOString()
      backupKeystore.restored_from = backupFile
      backupKeystore.name = restoreName

      const targetFile = path.join(defaultKeystoreDir(), `${restoreName}.json`)
      
      // Check if target exists
      if (fs.existsSync(targetFile)) {
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          { type: 'confirm', name: 'overwrite', message: `Keystore ${restoreName} already exists. Overwrite?`, default: false }
        ])
        if (!overwrite) {
          console.log('Restoration cancelled')
          return
        }
      }

      fs.writeFileSync(targetFile, JSON.stringify(backupKeystore, null, 2))
      
      console.log(chalk.green('✅ Key restored'))
      console.log(chalk.gray('Restored to:'), targetFile) 
      console.log(chalk.gray('Address:'), backupKeystore.address)
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
    .option('--verbose', 'Show detailed information including rotation history')
    .action((opts) => {
      const fs = require('fs') as typeof import('fs')
      const path = require('path') as typeof import('path')
      const dir = defaultKeystoreDir()
      const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json') && !f.includes('_backup_'))
      if (!files.length) { console.log('No keys found in', dir); return }
      
      for (const f of files) {
        try {
          const rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
          const keyName = f.replace(/\.json$/, '')
          
          if (opts.verbose) {
            console.log(chalk.cyan(`\n=== ${keyName} ===`))
            console.log(`Address:     ${rec.address}`)
            console.log(`Algorithm:   ${rec.algo}`)
            console.log(`Created:     ${rec.created_at || 'unknown'}`)
            
            if (rec.rotation_history && rec.rotation_history.length > 0) {
              console.log(`Rotations:   ${rec.rotation_history.length}`)
              rec.rotation_history.forEach((rotation: any, i: number) => {
                console.log(`  ${i + 1}. ${rotation.timestamp} (${rotation.reason})`)
              })
            }
            
            if (rec.restored_at) {
              console.log(`Restored:    ${rec.restored_at}`)
            }
          } else {
            const rotationCount = rec.rotation_history?.length || 0
            const rotationInfo = rotationCount > 0 ? ` (rotated ${rotationCount}x)` : ''
            console.log(`${keyName}\t${rec.address}${rotationInfo}`)
          }
        } catch {}
      }
    }))
