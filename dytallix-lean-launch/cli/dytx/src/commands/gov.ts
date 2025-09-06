import { Command } from 'commander'
import chalk from 'chalk'
import { DytClient } from '../../../../sdk/src/client'

export const govCommand = new Command('gov')
  .description('Governance actions')
  .addCommand(new Command('propose')
    .description('Submit a parameter change proposal')
    .requiredOption('--title <title>', 'Proposal title')
    .requiredOption('--description <desc>', 'Proposal description')
    .requiredOption('--key <key>', 'Parameter key (e.g., gas_limit)')
    .requiredOption('--value <value>', 'New value (string)')
    .action(async (opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      const res = await client.govSubmitProposal({ title: opts.title, description: opts.description, key: opts.key, value: opts.value })
      if (output === 'json') console.log(JSON.stringify(res, null, 2))
      else { console.log(chalk.green('✅ Proposal submitted')); console.log(res) }
    }))
  .addCommand(new Command('deposit')
    .description('Deposit on a proposal')
    .requiredOption('--proposal <id>', 'Proposal ID')
    .requiredOption('--from <address>', 'Depositor address')
    .requiredOption('--amount <udgt>', 'Amount in udgt (micro-DGT)')
    .action(async (opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      const res = await client.govDeposit({ depositor: opts.from, proposal_id: Number(opts.proposal), amount: Number(opts.amount) })
      if (output === 'json') console.log(JSON.stringify(res, null, 2))
      else { console.log(chalk.green('✅ Deposit submitted')); console.log(res) }
    }))
  .addCommand(new Command('vote')
    .description('Vote on a proposal')
    .requiredOption('--proposal <id>', 'Proposal ID')
    .requiredOption('--from <address>', 'Voter address')
    .requiredOption('--option <opt>', 'yes|no|abstain|no_with_veto')
    .action(async (opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      const res = await client.govVote({ voter: opts.from, proposal_id: Number(opts.proposal), option: opts.option })
      if (output === 'json') console.log(JSON.stringify(res, null, 2))
      else { console.log(chalk.green('✅ Vote submitted')); console.log(res) }
    }))
  .addCommand(new Command('proposals')
    .description('List proposals')
    .action(async (_opts, command) => {
      const { rpc, output } = command.parent.parent.opts()
      const client = new DytClient(rpc)
      const res = await client.govListProposals()
      if (output === 'json') console.log(JSON.stringify(res, null, 2))
      else { console.log(chalk.green('✅ Proposals')); console.table(res.proposals || []) }
    }))

