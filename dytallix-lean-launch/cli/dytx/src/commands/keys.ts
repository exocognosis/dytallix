import { Command } from 'commander'
import { keygenCommand } from './keygen.js'

export const keysCommand = new Command('keys')
  .description('Key management commands')
  .addCommand(new Command('add')
    .description('Generate a new PQC keypair (alias of keygen)')
    .allowUnknownOption(true)
    .action((_opts, _cmd) => {
      // Delegate to keygen with the same args
      keygenCommand.parse(process.argv.slice(2), { from: 'user' })
    }))

