use crate::storage::state::Storage;
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use std::collections::HashMap;

/// Fixed-point scale for reward calculations (1e12 for precision)
pub const REWARD_SCALE: u128 = 1_000_000_000_000;

/// Simplified staking state for lean-launch node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakingModule {
    pub storage: Arc<Storage>,
    /// Total stake across all validators (in uDGT)
    pub total_stake: u128,
    /// Global reward index (scaled by REWARD_SCALE)
    pub reward_index: u128,
    /// Pending staking emission when no stake exists
    pub pending_staking_emission: u128,
}

impl StakingModule {
    pub fn new(storage: Arc<Storage>) -> Self {
        // Load existing state from storage
        let total_stake = storage
            .db
            .get("staking:total_stake")
            .ok()
            .flatten()
            .and_then(|v| bincode::deserialize::<u128>(&v).ok())
            .unwrap_or(0);

        let reward_index = storage
            .db
            .get("staking:reward_index")
            .ok()
            .flatten()
            .and_then(|v| bincode::deserialize::<u128>(&v).ok())
            .unwrap_or(0);

        let pending_staking_emission = storage
            .db
            .get("staking:pending_emission")
            .ok()
            .flatten()
            .and_then(|v| bincode::deserialize::<u128>(&v).ok())
            .unwrap_or(0);

        Self {
            storage,
            total_stake,
            reward_index,
            pending_staking_emission,
        }
    }

    /// Apply external emission from emission engine
    /// If total_stake > 0, update reward_index proportionally
    /// If total_stake == 0, accumulate in pending_staking_emission
    pub fn apply_external_emission(&mut self, amount: u128) {
        if self.total_stake > 0 {
            // Update reward index proportionally
            let reward_per_unit = (amount * REWARD_SCALE) / self.total_stake;
            self.reward_index = self.reward_index.saturating_add(reward_per_unit);
            
            // Apply any pending emission too
            if self.pending_staking_emission > 0 {
                let pending_reward_per_unit = (self.pending_staking_emission * REWARD_SCALE) / self.total_stake;
                self.reward_index = self.reward_index.saturating_add(pending_reward_per_unit);
                self.pending_staking_emission = 0;
                self.save_pending_emission();
            }
            
            self.save_reward_index();
        } else {
            // No stake yet, accumulate for later distribution
            self.pending_staking_emission = self.pending_staking_emission.saturating_add(amount);
            self.save_pending_emission();
        }
    }

    /// Set total stake (called when validators register/delegate)
    pub fn set_total_stake(&mut self, stake: u128) {
        self.total_stake = stake;
        self.save_total_stake();

        // If stake becomes > 0 and we have pending emission, apply it
        if stake > 0 && self.pending_staking_emission > 0 {
            let pending_reward_per_unit = (self.pending_staking_emission * REWARD_SCALE) / stake;
            self.reward_index = self.reward_index.saturating_add(pending_reward_per_unit);
            self.pending_staking_emission = 0;
            self.save_reward_index();
            self.save_pending_emission();
        }
    }

    /// Get current reward statistics
    pub fn get_stats(&self) -> (u128, u128, u128) {
        (self.total_stake, self.reward_index, self.pending_staking_emission)
    }

    // Private storage methods
    fn save_total_stake(&self) {
        let _ = self.storage.db.put("staking:total_stake", bincode::serialize(&self.total_stake).unwrap());
    }

    fn save_reward_index(&self) {
        let _ = self.storage.db.put("staking:reward_index", bincode::serialize(&self.reward_index).unwrap());
    }

    fn save_pending_emission(&self) {
        let _ = self.storage.db.put("staking:pending_emission", bincode::serialize(&self.pending_staking_emission).unwrap());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_no_stake_accumulates_pending() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(Storage::open(dir.path().join("test.db")).unwrap());
        let mut staking = StakingModule::new(storage);

        // No stake, should accumulate in pending
        staking.apply_external_emission(1000);
        assert_eq!(staking.pending_staking_emission, 1000);
        assert_eq!(staking.reward_index, 0);

        // Add more emission
        staking.apply_external_emission(500);
        assert_eq!(staking.pending_staking_emission, 1500);
        assert_eq!(staking.reward_index, 0);
    }

    #[test]
    fn test_stake_applies_pending_and_current() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(Storage::open(dir.path().join("test.db")).unwrap());
        let mut staking = StakingModule::new(storage);

        // Accumulate pending emission
        staking.apply_external_emission(1000);
        assert_eq!(staking.pending_staking_emission, 1000);

        // Set stake - should apply pending
        staking.set_total_stake(1_000_000); // 1M uDGT
        assert_eq!(staking.pending_staking_emission, 0);
        let expected_reward_index = (1000 * REWARD_SCALE) / 1_000_000;
        assert_eq!(staking.reward_index, expected_reward_index);

        // Add new emission with stake
        staking.apply_external_emission(2000);
        let additional_reward = (2000 * REWARD_SCALE) / 1_000_000;
        assert_eq!(staking.reward_index, expected_reward_index + additional_reward);
    }

    #[test]
    fn test_reward_index_precision() {
        let dir = tempdir().unwrap();
        let storage = Arc::new(Storage::open(dir.path().join("test.db")).unwrap());
        let mut staking = StakingModule::new(storage);

        staking.set_total_stake(1_000_000_000_000); // 1M DGT in uDGT
        staking.apply_external_emission(1_000_000); // 1 DRT in uDRT

        let expected_reward_index = (1_000_000 * REWARD_SCALE) / 1_000_000_000_000;
        assert_eq!(staking.reward_index, expected_reward_index);
        assert_eq!(expected_reward_index, 1_000_000); // Should be 1e6 (1 DRT per 1M DGT)
    }
}