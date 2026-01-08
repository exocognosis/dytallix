import { Command } from 'commander'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { join } from 'path'

function runPqcVerify(pk: string, input: string, sigHexFile: string): boolean {
  const repoRoot = process.cwd()
  const candidates = [
    join(repoRoot, 'target', 'release', 'pqc-verify'),
    join(repoRoot, 'target', 'debug', 'pqc-verify'),
    join(repoRoot, 'target', 'release', 'verify'),
    join(repoRoot, 'target', 'debug', 'verify'),
  ]
  for (const bin of candidates) {
    if (existsSync(bin)) {
      const res = spawnSync(bin, [pk, input, sigHexFile], { encoding: 'utf8' })
      if (res.status === 0) return true
      return false
    }
  }
  let res = spawnSync('cargo', ['run', '-q', '-p', 'dytallix-pqc', '--bin', 'pqc-verify', '--', pk, input, sigHexFile], { encoding: 'utf8' })
  if (res.status !== 0) {
    res = spawnSync('cargo', ['run', '-q', '-p', 'dytallix-pqc', '--bin', 'verify', '--', pk, input, sigHexFile], { encoding: 'utf8' })
  }
  return res.status === 0
}

export const pqcVerifyCommand = new Command('pqc-verify')
  .description('Verify signature with Dilithium5 public key')
  .requiredOption('--pk <file>', 'Public key file (raw bytes)')
  .requiredOption('--in <file>', 'Input file')
  .requiredOption('--sig <file>', 'Signature file (hex)')
  .action(async (opts) => {
    try {
      if (!existsSync(opts.pk)) throw new Error(`Public key file not found: ${opts.pk}`)
      if (!existsSync(opts.in)) throw new Error(`Input file not found: ${opts.in}`)
      if (!existsSync(opts.sig)) throw new Error(`Signature file not found: ${opts.sig}`)
      const ok = runPqcVerify(opts.pk, opts.in, opts.sig)
      if (ok) {
        console.log(chalk.green('SUCCESS'))
        process.exit(0)
      } else {
        console.log(chalk.red('FAIL'))
        process.exit(2)
      }
    } catch (e:any) {
      console.error(chalk.red('pqc-verify error:'), e.message)
      process.exit(1)
    }
  })
