// Tokenomics types for DGT and DRT tokens
export interface TokenBalance {
  dgt: number
  drt: number
}

export interface TokenomicsMetrics {
  dgtTotalSupply: number
  drtTotalSupply: number
  drtTotalBurned: number
  currentEmissionRate: number
  validatorRewards: number
  stakerRewards: number
  treasuryBalance: number
}

export interface GovernanceVotingPower {
  address: string
  dgtBalance: number
  votingPower: number
  votingPercentage: number
}

export interface EmissionProposal {
  id: string
  title: string
  description: string
  newEmissionRate: number
  proposer: string
  votesFor: number
  votesAgainst: number
  votingDeadline: number
  status: 'active' | 'passed' | 'rejected' | 'executed'
}

export interface RewardClaim {
  type: 'validator' | 'staker'
  amount: number
  claimableAt: number
  claimed: boolean
}

export interface TokenTransferRequest {
  tokenType: 'DGT' | 'DRT'
  to: string
  amount: string
  gasLimit?: string
}

export interface TokenMintRequest {
  to: string
  amount: string
  gasLimit?: string
}

export interface TokenBurnRequest {
  amount: string
  gasLimit?: string
}
