//! Vesting and allocation management

pub mod vesting_schedule;
pub mod allocation_manager;

pub use vesting_schedule::VestingSchedule;
pub use allocation_manager::AllocationManager;

use serde::{Deserialize, Serialize};
use scale::{Decode, Encode};
use crate::{Address, Balance, Timestamp, Result};