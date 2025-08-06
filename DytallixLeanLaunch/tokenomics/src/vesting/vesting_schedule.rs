//! Vesting schedule implementation with cliff and linear vesting

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use crate::{Address, Balance, Timestamp, Result, TokenomicsError};

/// Vesting schedule for token allocations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingSchedule {
    /// Account being vested
    pub account: Address,
    /// Total amount to be vested
    pub total_amount: Balance,
    /// Amount already released
    pub released_amount: Balance,
    /// Vesting start timestamp
    pub start_timestamp: Timestamp,
    /// Cliff period in seconds
    pub cliff_duration: u64,
    /// Total vesting duration in seconds (including cliff)
    pub total_duration: u64,
    /// Whether the schedule is revoked
    pub revoked: bool,
    /// Revocation timestamp (if applicable)
    pub revoked_at: Option<Timestamp>,
}

impl VestingSchedule {
    /// Create a new vesting schedule
    pub fn new(
        account: Address,
        total_amount: Balance,
        start_timestamp: Timestamp,
        cliff_duration: u64,
        total_duration: u64,
    ) -> Result<Self> {
        if total_duration == 0 {
            return Err(TokenomicsError::InvalidConfig {
                details: "Total duration must be greater than 0".to_string(),
            });
        }
        
        if cliff_duration > total_duration {
            return Err(TokenomicsError::InvalidConfig {
                details: "Cliff duration cannot exceed total duration".to_string(),
            });
        }
        
        Ok(Self {
            account,
            total_amount,
            released_amount: 0,
            start_timestamp,
            cliff_duration,
            total_duration,
            revoked: false,
            revoked_at: None,
        })
    }
    
    /// Calculate vested amount at a given timestamp
    pub fn vested_amount(&self, timestamp: Timestamp) -> Balance {
        if self.revoked {
            // If revoked, no additional vesting occurs
            return self.released_amount;
        }
        
        if timestamp < self.start_timestamp {
            return 0;
        }
        
        let elapsed = timestamp - self.start_timestamp;
        
        // Check if cliff period has passed
        if elapsed < self.cliff_duration {
            return 0;
        }
        
        // If fully vested
        if elapsed >= self.total_duration {
            return self.total_amount;
        }
        
        // Linear vesting after cliff
        let vesting_duration = self.total_duration - self.cliff_duration;
        let vesting_elapsed = elapsed - self.cliff_duration;
        
        self.total_amount
            .saturating_mul(vesting_elapsed as u128)
            .saturating_div(vesting_duration as u128)
    }
    
    /// Calculate releasable amount at a given timestamp
    pub fn releasable_amount(&self, timestamp: Timestamp) -> Balance {
        let vested = self.vested_amount(timestamp);
        vested.saturating_sub(self.released_amount)
    }
    
    /// Release vested tokens
    pub fn release(&mut self, timestamp: Timestamp) -> Result<Balance> {
        let releasable = self.releasable_amount(timestamp);
        
        if releasable == 0 {
            return Ok(0);
        }
        
        self.released_amount = self.released_amount.checked_add(releasable)
            .ok_or(TokenomicsError::Overflow)?;
        
        Ok(releasable)
    }
    
    /// Revoke the vesting schedule
    pub fn revoke(&mut self, timestamp: Timestamp) -> Result<()> {
        if self.revoked {
            return Err(TokenomicsError::InvalidConfig {
                details: "Vesting schedule already revoked".to_string(),
            });
        }
        
        self.revoked = true;
        self.revoked_at = Some(timestamp);
        
        Ok(())
    }
    
    /// Check if vesting is complete
    pub fn is_complete(&self, timestamp: Timestamp) -> bool {
        if self.revoked {
            return true;
        }
        
        self.vested_amount(timestamp) == self.total_amount &&
        self.released_amount == self.total_amount
    }
    
    /// Get remaining vesting amount
    pub fn remaining_amount(&self) -> Balance {
        self.total_amount.saturating_sub(self.released_amount)
    }
    
    /// Get vesting progress as a percentage (0-100)
    pub fn progress_percentage(&self, timestamp: Timestamp) -> u8 {
        if self.total_amount == 0 {
            return 100;
        }
        
        let vested = self.vested_amount(timestamp);
        let percentage = (vested * 100) / self.total_amount;
        
        percentage.min(100) as u8
    }
}

/// Vesting schedule manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VestingManager {
    /// All vesting schedules by account
    pub schedules: HashMap<Address, Vec<VestingSchedule>>,
    /// Total amount under vesting
    pub total_vesting: Balance,
    /// Total amount released
    pub total_released: Balance,
}

impl VestingManager {
    /// Create new vesting manager
    pub fn new() -> Self {
        Self {
            schedules: HashMap::new(),
            total_vesting: 0,
            total_released: 0,
        }
    }
    
    /// Add a new vesting schedule
    pub fn add_schedule(&mut self, schedule: VestingSchedule) -> Result<()> {
        self.total_vesting = self.total_vesting.checked_add(schedule.total_amount)
            .ok_or(TokenomicsError::Overflow)?;
        
        self.schedules
            .entry(schedule.account.clone())
            .or_insert_with(Vec::new)
            .push(schedule);
        
        Ok(())
    }
    
    /// Get all schedules for an account
    pub fn get_schedules(&self, account: &Address) -> Option<&Vec<VestingSchedule>> {
        self.schedules.get(account)
    }
    
    /// Get total vested amount for an account
    pub fn total_vested(&self, account: &Address, timestamp: Timestamp) -> Balance {
        self.schedules
            .get(account)
            .map(|schedules| {
                schedules.iter()
                    .map(|schedule| schedule.vested_amount(timestamp))
                    .sum()
            })
            .unwrap_or(0)
    }
    
    /// Get total releasable amount for an account
    pub fn total_releasable(&self, account: &Address, timestamp: Timestamp) -> Balance {
        self.schedules
            .get(account)
            .map(|schedules| {
                schedules.iter()
                    .map(|schedule| schedule.releasable_amount(timestamp))
                    .sum()
            })
            .unwrap_or(0)
    }
    
    /// Release all available tokens for an account
    pub fn release_all(&mut self, account: &Address, timestamp: Timestamp) -> Result<Balance> {
        let schedules = self.schedules.get_mut(account);
        
        if let Some(schedules) = schedules {
            let mut total_released = 0u128;
            
            for schedule in schedules.iter_mut() {
                let released = schedule.release(timestamp)?;
                total_released = total_released.checked_add(released)
                    .ok_or(TokenomicsError::Overflow)?;
            }
            
            self.total_released = self.total_released.checked_add(total_released)
                .ok_or(TokenomicsError::Overflow)?;
            
            Ok(total_released)
        } else {
            Ok(0)
        }
    }
    
    /// Revoke all vesting schedules for an account
    pub fn revoke_all(&mut self, account: &Address, timestamp: Timestamp) -> Result<()> {
        if let Some(schedules) = self.schedules.get_mut(account) {
            for schedule in schedules.iter_mut() {
                schedule.revoke(timestamp)?;
            }
        }
        
        Ok(())
    }
    
    /// Get total amount still under vesting
    pub fn total_unreleased(&self) -> Balance {
        self.total_vesting.saturating_sub(self.total_released)
    }
}

impl Default for VestingManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vesting_schedule_creation() {
        let schedule = VestingSchedule::new(
            "alice".to_string(),
            1000,
            0,
            100, // 100 second cliff
            1000, // 1000 second total duration
        );
        
        assert!(schedule.is_ok());
        let schedule = schedule.unwrap();
        assert_eq!(schedule.total_amount, 1000);
        assert_eq!(schedule.cliff_duration, 100);
    }

    #[test]
    fn test_cliff_period() {
        let schedule = VestingSchedule::new(
            "alice".to_string(),
            1000,
            0,
            100,
            1000,
        ).unwrap();
        
        // Before cliff
        assert_eq!(schedule.vested_amount(50), 0);
        
        // At cliff
        assert_eq!(schedule.vested_amount(100), 0);
        
        // After cliff
        assert!(schedule.vested_amount(150) > 0);
    }

    #[test]
    fn test_linear_vesting() {
        let schedule = VestingSchedule::new(
            "alice".to_string(),
            1000,
            0,
            100, // 100 second cliff
            1000, // 1000 second total
        ).unwrap();
        
        // At 50% of vesting period (550 seconds total: 100 cliff + 450 vesting)
        let vested_at_550 = schedule.vested_amount(550);
        let expected = 500; // 50% of 1000
        assert!((vested_at_550 as i128 - expected as i128).abs() < 10);
        
        // At end
        assert_eq!(schedule.vested_amount(1000), 1000);
        
        // After end
        assert_eq!(schedule.vested_amount(1500), 1000);
    }

    #[test]
    fn test_release() {
        let mut schedule = VestingSchedule::new(
            "alice".to_string(),
            1000,
            0,
            0, // No cliff
            1000,
        ).unwrap();
        
        // Release at 50%
        let released = schedule.release(500).unwrap();
        assert_eq!(released, 500);
        assert_eq!(schedule.released_amount, 500);
        
        // Release again at 75%
        let released = schedule.release(750).unwrap();
        assert_eq!(released, 250);
        assert_eq!(schedule.released_amount, 750);
    }

    #[test]
    fn test_vesting_manager() {
        let mut manager = VestingManager::new();
        
        let schedule1 = VestingSchedule::new(
            "alice".to_string(),
            1000,
            0,
            0,
            1000,
        ).unwrap();
        
        let schedule2 = VestingSchedule::new(
            "alice".to_string(),
            500,
            0,
            0,
            1000,
        ).unwrap();
        
        manager.add_schedule(schedule1).unwrap();
        manager.add_schedule(schedule2).unwrap();
        
        assert_eq!(manager.total_vesting, 1500);
        assert_eq!(manager.total_vested(&"alice".to_string(), 500), 750); // 50% of 1500
    }
}