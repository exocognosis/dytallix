import { Command } from 'commander'
import chalk from 'chalk'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'

function runPqcSign(sk: string, input: string): string {
  // Try local built binary first
  const repoRoot = process.cwd()
  const candidates = [
    join(repoRoot, 'target', 'release', 'pqc-sign'),
    join(repoRoot, 'target', 'debug', 'pqc-sign'),
    join(repoRoot, 'target', 'release', 'sign'),
    join(repoRoot, 'target', 'debug', 'sign'),
  ]
  for (const bin of candidates) {
    if (existsSync(bin)) {
      const res = spawnSync(bin, [sk, input], { encoding: 'utf8' })
      if (res.status === 0 && res.stdout.trim()) return res.stdout.trim()
      throw new Error(res.stderr || 'pqc-sign failed')
    }
  }
  // Fallback to cargo run
  // Try both bin names via cargo
  let res = spawnSync('cargo', ['run', '-q', '-p', 'dytallix-pqc', '--bin', 'pqc-sign', '--', sk, input], { encoding: 'utf8' })
  if (!(res.status === 0 && res.stdout.trim())) {
    res = spawnSync('cargo', ['run', '-q', '-p', 'dytallix-pqc', '--bin', 'sign', '--', sk, input], { encoding: 'utf8' })
  }
  if (res.status === 0 && res.stdout.trim()) return res.stdout.trim()
  throw new Error(res.stderr || 'cargo run pqc-sign failed')
}

export const pqcSignCommand = new Command('pqc-sign')
  .description('Sign input file with Dilithium5 secret key')
  .requiredOption('--sk <file>', 'Secret key file (raw bytes)')
  .requiredOption('--in <file>', 'Input file to sign')
  .option('--out <file>', 'Output signature file (hex)')
  .action(async (opts) => {
    try {
      if (!existsSync(opts.sk)) throw new Error(`Secret key file not found: ${opts.sk}`)
      if (!existsSync(opts.in)) throw new Error(`Input file not found: ${opts.in}`)
      const sigHex = runPqcSign(opts.sk, opts.in)
      if (opts.out) {
        writeFileSync(opts.out, sigHex + '\n')
        console.log(chalk.green(`✅ Signature written to ${opts.out}`))
      } else {
        console.log(sigHex)
      }
    } catch (e:any) {
      console.error(chalk.red('pqc-sign error:'), e.message)
      process.exit(1)
    }
  })
