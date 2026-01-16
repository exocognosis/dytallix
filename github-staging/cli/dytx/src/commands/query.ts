import { Command } from 'commander'
import chalk from 'chalk'
import { DytClient } from '../lib/client.js'

export const queryCommand = new Command('query')
  .description('Query modules')
  .addCommand(new Command('bank')
    .description('Bank queries')
    .addCommand(new Command('balance')
      .description('Query balance by address')
      .argument('<address>', 'Account address')
      .action(async (address: string, command) => {
        const { rpc, output } = command.parent.parent.opts()
        const client = new DytClient(rpc)
        const res = await client.getBalance(address)
        if (output === 'json') console.log(JSON.stringify(res, null, 2))
        else {
          console.log(chalk.green('✅ Balance query successful'))
          console.log(res)
        }
      })))
  .addCommand(new Command('gov')
    .description('Governance queries')
    .addCommand(new Command('params')
      .description('Query governance params')
      .action(async (_opts, command) => {
        const { rpc, output } = command.parent.parent.opts()
        const client = new DytClient(rpc)
        const res = await client.getGovParams()
        if (output === 'json') console.log(JSON.stringify(res, null, 2))
        else {
          console.log(chalk.green('✅ Governance params'))
          console.log(res)
        }
      })))
