// Type definitions for Staking Rewards Dashboard
// This file provides TypeScript interface definitions for the staking rewards system

export interface DelegatorRewards {
  accrued_unclaimed: string;
  total_claimed: string;
  last_index: string;
}

export interface RewardsSummary {
  total_stake: string;
  pending_rewards: string;
  accrued_unclaimed: string;
  total_claimed: string;
}

export interface DelegatorValidatorRewards {
  validator: string;
  stake: string;
  pending: string;
  accrued_unclaimed: string;
  total_claimed: string;
  last_index: string;
}

export interface DelegatorRewardsSummary {
  delegator: string;
  height: number;
  global_reward_index: string;
  summary: RewardsSummary;
  positions: DelegatorValidatorRewards[];
}

export interface ClaimRewardsRequest {
  delegator: string;
  validator?: string; // Optional - if not provided, claims from all validators
}

export interface ClaimRewardsResponse {
  delegator: string;
  claimed: string;
  new_balance: string;
  height: number;
}

export interface StakingRewardsDashboardProps {
  delegatorAddress: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds, default 30000
}

// API endpoint types
export interface StakingAPI {
  getRewards: (delegator: string) => Promise<DelegatorRewardsSummary>;
  claimRewards: (request: ClaimRewardsRequest) => Promise<ClaimRewardsResponse>;
  claimAllRewards: (delegator: string) => Promise<ClaimRewardsResponse>;
}

// Hook types for React integration
export interface UseStakingRewards {
  data: DelegatorRewardsSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  claimAll: () => Promise<void>;
  claimSpecific: (validator: string) => Promise<void>;
  claiming: boolean;
}

// Configuration types
export interface StakingDashboardConfig {
  apiBaseUrl: string;
  defaultRefreshInterval: number;
  enableAutoRefresh: boolean;
  formatters: {
    dgtDecimals: number;
    drtDecimals: number;
    addressLength: {
      start: number;
      end: number;
    };
  };
}

export default StakingRewardsDashboardProps;