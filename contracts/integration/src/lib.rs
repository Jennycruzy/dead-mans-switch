// Integration library for Dead Man's Switch
// This module provides shared utilities for the deploy and check-in binaries.

pub mod utils {
    /// Block calculation constants (matching the frontend)
    pub const BLOCKS_PER_DAY: u64 = 28_800;

    pub fn weekly_blocks() -> u64 { 201_600 }
    pub fn monthly_blocks() -> u64 { 864_000 }
    pub fn yearly_blocks() -> u64 { 10_512_000 }
}
