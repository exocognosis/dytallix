// Dytallix Transaction Builders
// Canonical transaction payload builders for all transaction types

import type { TxPayload } from '../wallet/types'

export interface TransferParams {
  from: string
  to: string
  amount: string
  denom: string
  memo?: string
}

export interface StakeParams {
  delegator: string
  validator: string
  amount: string
  denom: string
}

export interface UnstakeParams {
  delegator: string
  validator: string
  amount: string
  denom: string
}

export interface ClaimRewardsParams {
  delegator: string
  validator: string
}

export interface GovProposalParams {
  proposer: string
  title: string
  description: string
  deposit: string
  denom: string
}

export interface GovVoteParams {
  voter: string
  proposalId: string
  option: 'yes' | 'no' | 'abstain' | 'no_with_veto'
}

export interface ContractCallParams {
  sender: string
  contract: string
  msg: any
  funds?: Array<{ amount: string; denom: string }>
}

/**
 * Build a transfer transaction payload
 */
export function buildTransfer(params: TransferParams): TxPayload {
  return {
    type: 'transfer',
    body: {
      from: params.from,
      to: params.to,
      amount: params.amount,
      denom: params.denom,
      memo: params.memo || ''
    }
  }
}

/**
 * Build a stake transaction payload
 */
export function buildStake(params: StakeParams): TxPayload {
  return {
    type: 'delegate',
    body: {
      delegator: params.delegator,
      validator: params.validator,
      amount: params.amount,
      denom: params.denom
    }
  }
}

/**
 * Build an unstake transaction payload
 */
export function buildUnstake(params: UnstakeParams): TxPayload {
  return {
    type: 'undelegate',
    body: {
      delegator: params.delegator,
      validator: params.validator,
      amount: params.amount,
      denom: params.denom
    }
  }
}

/**
 * Build a claim rewards transaction payload
 */
export function buildClaim(params: ClaimRewardsParams): TxPayload {
  return {
    type: 'claim_rewards',
    body: {
      delegator: params.delegator,
      validator: params.validator
    }
  }
}

/**
 * Build a governance proposal transaction payload
 */
export function buildGovProposal(params: GovProposalParams): TxPayload {
  return {
    type: 'gov_proposal',
    body: {
      proposer: params.proposer,
      title: params.title,
      description: params.description,
      deposit: params.deposit,
      denom: params.denom
    }
  }
}

/**
 * Build a governance vote transaction payload
 */
export function buildGovVote(params: GovVoteParams): TxPayload {
  return {
    type: 'gov_vote',
    body: {
      voter: params.voter,
      proposal_id: params.proposalId,
      option: params.option
    }
  }
}

/**
 * Build a smart contract call transaction payload
 */
export function buildContractCall(params: ContractCallParams): TxPayload {
  return {
    type: 'contract_call',
    body: {
      sender: params.sender,
      contract: params.contract,
      msg: params.msg,
      funds: params.funds || []
    }
  }
}

/**
 * Validate transaction payload structure
 */
export function validateTxPayload(payload: TxPayload): boolean {
  if (!payload.type || !payload.body) {
    return false
  }
  
  // Basic validation - could be expanded
  switch (payload.type) {
    case 'transfer':
      return !!(payload.body.from && payload.body.to && payload.body.amount && payload.body.denom)
    case 'delegate':
    case 'undelegate':
      return !!(payload.body.delegator && payload.body.validator && payload.body.amount && payload.body.denom)
    case 'claim_rewards':
      return !!(payload.body.delegator && payload.body.validator)
    case 'gov_proposal':
      return !!(payload.body.proposer && payload.body.title && payload.body.description)
    case 'gov_vote':
      return !!(payload.body.voter && payload.body.proposal_id && payload.body.option)
    case 'contract_call':
      return !!(payload.body.sender && payload.body.contract && payload.body.msg)
    default:
      return false
  }
}