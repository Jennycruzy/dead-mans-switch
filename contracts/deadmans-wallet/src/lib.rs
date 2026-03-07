//! # Dead Man's Switch — Account Component
//!
//! A Miden account component that implements a dead man's switch pattern.
//!
//! ## Compilation
//! ```bash
//! cargo build --target wasm32-unknown-unknown --release
//! ```

#![no_std]
#![feature(alloc_error_handler)]

use miden::*;

/// Dead Man's Switch account component
#[component]
pub struct DeadMansSwitch {
    #[storage(description = "AccountId of the beneficiary")]
    pub beneficiary: miden::Value,

    #[storage(description = "How many blocks between required check-ins")]
    pub heartbeat_blocks: miden::Value,

    #[storage(description = "Block number of the last check-in")]
    pub last_checkin: miden::Value,

    #[storage(description = "Whether the switch is active (1) or claimed (0)")]
    pub is_active: miden::Value,
}

#[component]
impl DeadMansSwitch {
    /// Owner check-in: proves the owner is still alive and resets the timer.
    pub fn check_in(&mut self) {
        let current_block: miden::felt::Felt = miden::tx::get_block_number();
        let word = miden::Word::from([
            current_block,
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
        ]);
        self.last_checkin.write(word);
    }

    /// Configure the dead man's switch parameters.
    pub fn configure(&mut self, beneficiary: miden::Word, heartbeat_blocks: miden::felt::Felt) {
        self.beneficiary.write(beneficiary);
        self.heartbeat_blocks.write(miden::Word::from([
            heartbeat_blocks,
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
        ]));
        self.is_active.write(miden::Word::from([
            miden::felt::Felt::from_u32(1),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
        ]));

        let current_block = miden::tx::get_block_number();
        self.last_checkin.write(miden::Word::from([
            current_block,
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
        ]));
    }

    /// Check if the switch has expired (owner missed the deadline).
    /// Returns 1 if expired, 0 if still active.
    pub fn is_expired(&self) -> miden::felt::Felt {
        let last_checkin_word: miden::Word = self.last_checkin.read();
        let heartbeat_word: miden::Word = self.heartbeat_blocks.read();
        let current_block = miden::tx::get_block_number();

        let last_checkin: u64 = last_checkin_word[0].as_u64();
        let heartbeat: u64 = heartbeat_word[0].as_u64();
        let p_current: u64 = current_block.as_u64();

        if p_current > last_checkin + heartbeat {
            miden::felt::Felt::from_u32(1)
        } else {
            miden::felt::Felt::from_u32(0)
        }
    }

    /// Beneficiary claims all assets after the switch triggers.
    pub fn claim(&mut self) {
        let is_active_word: miden::Word = self.is_active.read();
        let is_active = is_active_word[0].as_u64();
        assert!(is_active == 1, "Switch is not active");

        let last_checkin_word: miden::Word = self.last_checkin.read();
        let heartbeat_word: miden::Word = self.heartbeat_blocks.read();
        let current_block = miden::tx::get_block_number();

        let last_checkin: u64 = last_checkin_word[0].as_u64();
        let heartbeat: u64 = heartbeat_word[0].as_u64();
        let p_current: u64 = current_block.as_u64();

        assert!(
            p_current > last_checkin + heartbeat,
            "Switch has not expired yet - owner is still active"
        );

        // Mark as claimed
        self.is_active.write(miden::Word::from([
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
        ]));
    }

    /// Update the heartbeat interval.
    pub fn set_heartbeat(&mut self, heartbeat_blocks: miden::felt::Felt) {
        self.heartbeat_blocks.write(miden::Word::from([
            heartbeat_blocks,
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
            miden::felt::Felt::from_u32(0),
        ]));
    }
}

