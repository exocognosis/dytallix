//! Staking system for DGT holders

pub mod staking_manager;
pub mod reward_distributor;

pub use staking_manager::StakingManager;
pub use reward_distributor::RewardDistributor;