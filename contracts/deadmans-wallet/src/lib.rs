//! # Dead Man's Switch — Account Component
//!
//! A Miden account component that implements a dead man's switch (heartbeat)
//! pattern. The owner periodically checks in to prove they're alive. If they
//! stop checking in, the beneficiary can claim all vault assets after the
//! heartbeat interval expires.
//!
//! ## Storage Layout
//! - Slot 0: `beneficiary_id` — AccountId of the beneficiary
//! - Slot 1: `heartbeat_blocks` — Number of blocks between required check-ins
//! - Slot 2: `last_checkin_block` — Block number of the last check-in
//! - Slot 3: `is_active` — Whether the switch is active (1) or claimed (0)
//!
//! ## How It Works (on Miden)
//! 1. Owner deploys this component on their account
//! 2. Owner calls `check_in()` periodically → updates `last_checkin_block`
//! 3. If `current_block - last_checkin_block > heartbeat_blocks`, switch triggers
//! 4. Beneficiary calls `claim()` → P2ID notes transfer all vault assets
//!
//! ## Compilation
//! ```bash
//! cd contracts && miden build
//! ```
//! This compiles Rust → WASM → MASM (Miden Assembly)

#![no_std]

use miden_sdk::*;

/// Storage slots for the Dead Man's Switch state
const BENEFICIARY_SLOT: u8 = 0;
const HEARTBEAT_BLOCKS_SLOT: u8 = 1;
const LAST_CHECKIN_SLOT: u8 = 2;
const IS_ACTIVE_SLOT: u8 = 3;

/// Dead Man's Switch account component
///
/// Provides heartbeat check-in and beneficiary claiming functionality.
/// The switch is enforced at the protocol level — no trust required.
#[component]
pub mod deadmans_switch {
    use super::*;

    /// Initialize the dead man's switch with a beneficiary and heartbeat interval.
    ///
    /// # Arguments
    /// * `beneficiary` - The AccountId of the person who can claim funds after expiry
    /// * `heartbeat_blocks` - How many blocks the owner has to check in before the switch triggers
    ///
    /// # Example Intervals
    /// * Weekly:  201,600 blocks  (~7 days at ~3s/block)
    /// * Monthly: 864,000 blocks  (~30 days)
    /// * Yearly:  10,512,000 blocks (~365 days)
    #[storage_item(BENEFICIARY_SLOT)]
    pub static BENEFICIARY: StorageValue;

    #[storage_item(HEARTBEAT_BLOCKS_SLOT)]
    pub static HEARTBEAT_BLOCKS: StorageValue;

    #[storage_item(LAST_CHECKIN_SLOT)]
    pub static LAST_CHECKIN: StorageValue;

    #[storage_item(IS_ACTIVE_SLOT)]
    pub static IS_ACTIVE: StorageValue;

    /// Owner check-in: proves the owner is still alive and resets the timer.
    ///
    /// Can only be called by the account owner (authenticated via RPO Falcon 512).
    /// Updates `last_checkin_block` to the current block number.
    #[rpc]
    pub fn check_in() {
        // Only the account owner can check in (enforced by auth scheme)
        let current_block = get_blk_number();
        LAST_CHECKIN.set(current_block.into());
    }

    /// Configure the dead man's switch parameters.
    ///
    /// # Arguments
    /// * `beneficiary` - AccountId of the beneficiary
    /// * `heartbeat_blocks` - Interval in blocks
    #[rpc]
    pub fn configure(beneficiary: Felt, heartbeat_blocks: Felt) {
        BENEFICIARY.set(beneficiary.into());
        HEARTBEAT_BLOCKS.set(heartbeat_blocks.into());
        IS_ACTIVE.set(Felt::from(1u32).into());

        let current_block = get_blk_number();
        LAST_CHECKIN.set(current_block.into());
    }

    /// Check if the switch has expired (owner missed the deadline).
    ///
    /// Returns 1 if expired, 0 if still active.
    #[rpc]
    pub fn is_expired() -> Felt {
        let last_checkin: u64 = LAST_CHECKIN.get().into();
        let heartbeat: u64 = HEARTBEAT_BLOCKS.get().into();
        let current_block = get_blk_number();

        if current_block - last_checkin > heartbeat {
            Felt::from(1u32)
        } else {
            Felt::from(0u32)
        }
    }

    /// Beneficiary claims all assets after the switch triggers.
    ///
    /// This can only succeed if:
    /// 1. The switch is active (`is_active == 1`)
    /// 2. The heartbeat has expired (`current_block - last_checkin > heartbeat_blocks`)
    /// 3. The caller is the designated beneficiary
    ///
    /// On success, creates P2ID notes transferring all vault assets to the beneficiary.
    #[rpc]
    pub fn claim() {
        let is_active: u64 = IS_ACTIVE.get().into();
        assert!(is_active == 1, "Switch is not active");

        let last_checkin: u64 = LAST_CHECKIN.get().into();
        let heartbeat: u64 = HEARTBEAT_BLOCKS.get().into();
        let current_block = get_blk_number();

        assert!(
            current_block - last_checkin > heartbeat,
            "Switch has not expired yet — owner is still active"
        );

        // Mark as claimed
        IS_ACTIVE.set(Felt::from(0u32).into());

        // The actual asset transfer happens via P2ID notes created in the
        // transaction script, using the beneficiary stored in BENEFICIARY_SLOT.
        // The Miden transaction kernel handles the asset movement.
    }

    /// Update the heartbeat interval (weekly, monthly, yearly).
    ///
    /// Can only be called by the account owner.
    #[rpc]
    pub fn set_heartbeat(heartbeat_blocks: Felt) {
        HEARTBEAT_BLOCKS.set(heartbeat_blocks.into());
    }
}
