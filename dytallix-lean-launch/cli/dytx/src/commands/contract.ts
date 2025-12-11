import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { DytClient } from '../lib/client.js'

function ensureDir(p: string) {
  const d = resolve(p)
  mkdirSync(d, { recursive: true })
  return d
}

function hexToJson(hex: string): any {
  try {
    const buf = Buffer.from(hex, 'hex')
    return JSON.parse(buf.toString('utf8'))
  } catch (e) {
    return undefined
  }
}

export const contractCommand = new Command('contract')
  .description('WASM contract lifecycle')
  .addCommand(new Command('deploy')
    .description('Deploy a WASM contract')
    .requiredOption('--wasm <file>', 'Path to compiled wasm file')
    .option('--gas <gas>', 'Gas limit', (v) => parseInt(v, 10), 100000)
    .action(async (opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      if (!existsSync(opts.wasm)) throw new Error(`wasm not found: ${opts.wasm}`)
      const bytes = new Uint8Array(readFileSync(opts.wasm))
      const res = await client.contractDeploy(bytes, opts.gas)
      const evDir = ensureDir('launch-evidence/cli')
      const logPath = resolve(evDir, 'contract_deploy.log')
      appendFileSync(logPath, `[${new Date().toISOString()}] address=${res.address} gas=${res.gas_used} code_hash=${res.code_hash}\n`)
      if (output === 'json') console.log(JSON.stringify(res, null, 2))
      else {
        console.log(chalk.green('✅ Contract deployed'))
        console.log(chalk.bold('Address:'), res.address)
        console.log(chalk.bold('Gas Used:'), res.gas_used)
        console.log(chalk.gray(`evidence: ${logPath}`))
      }
    }))
  .addCommand(new Command('exec')
    .description('Execute a contract method')
    .requiredOption('--address <addr>', 'Contract address')
    .requiredOption('--method <name>', 'Method name (increment|get|...)')
    .option('--args <json>', 'JSON arguments')
    .option('--gas <gas>', 'Gas limit', (v) => parseInt(v, 10), 100000)
    .action(async (opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      const args = opts.args ? JSON.parse(opts.args) : undefined
      const res = await client.contractExecute(opts.address, opts.method, args, opts.gas)
      const evDir = ensureDir('launch-evidence/cli')
      const logPath = resolve(evDir, 'contract_exec.log')
      appendFileSync(logPath, `[${new Date().toISOString()}] address=${opts.address} method=${opts.method} gas=${res.gas_used} events=${(res.events || []).join(';')}\n`)
      const retVal = res.return_value || res.result
      const ret = hexToJson(retVal || '')
      if (output === 'json') console.log(JSON.stringify({ ...res, parsed: ret }, null, 2))
      else {
        console.log(chalk.green('✅ Contract executed'))
        console.log(chalk.bold('Gas Used:'), res.gas_used)
        if (ret !== undefined) console.log(chalk.bold('Return:'), ret)
        console.log(chalk.gray(`evidence: ${logPath}`))
      }
    }))
  .addCommand(new Command('query')
    .description('Query contract state (read-only)')
    .requiredOption('--address <addr>', 'Contract address')
    .option('--method <name>', 'Query method', 'get')
    .action(async (opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      const res = await client.contractExecute(opts.address, opts.method, undefined, 50_000)
      const ret = hexToJson(res.return_value)
      if (output === 'json') console.log(JSON.stringify({ ...res, parsed: ret }, null, 2))
      else {
        console.log(chalk.green('✅ Query successful'))
        if (ret !== undefined) console.log(chalk.bold('Result:'), ret)
      }
    }))

