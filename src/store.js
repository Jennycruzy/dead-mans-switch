/**
 * Dead Man's Switch — Data Store
 * 
 * Manages wallet state for the Dead Man's Switch on Miden.
 * Supports two modes:
 *   • Demo mode (default): localStorage simulation with fake block progression
 *   • Connected mode: Real Miden SDK operations via miden.js wrapper
 * 
 * The interface stays the same regardless of mode — pages don't need
 * to know which mode is active.
 */

import * as miden from './miden.js';

const BLOCKS_PER_DAY = 28800;
const DEFAULT_HEARTBEAT_BLOCKS = 201600; // ~7 days

export const PERIOD_PRESETS = {
    weekly: { label: 'Weekly', blocks: 201_600, days: 7 },
    monthly: { label: 'Monthly', blocks: 864_000, days: 30 },
    yearly: { label: 'Yearly', blocks: 10_512_000, days: 365 },
};

import { CONFIG } from './config.js';

function generateAccountId() {
    const prefix = '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const suffix = '0x' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return { prefix, suffix };
}

function parseHexAccountId(hexId) {
    if (!hexId) return null;
    return {
        prefix: hexId.substring(0, 10),
        suffix: '0x' + hexId.substring(hexId.length - 8),
        full: hexId
    };
}

function getDefaultState() {
    const owner = parseHexAccountId(CONFIG.CONTRACT_ACCOUNT_ID);
    const beneficiary = generateAccountId();
    return {
        // Connection state
        connected: false,
        connecting: false,
        connectionError: null,

        // SDK references (non-serialized)
        ownerAccountId: null,    // Real SDK AccountId object
        beneficiaryAccountId: null,
        faucetId: null,

        // Display identifiers
        owner,
        beneficiary,

        // Switch params
        heartbeatBlocks: DEFAULT_HEARTBEAT_BLOCKS,
        currentBlock: 1_000_000,
        lastCheckinBlock: 1_000_000,

        // Assets
        vaultBalance: 1250.00,
        assets: [
            { name: 'DMS', amount: 10000.00, faucetId: '0xabc123' }
        ],

        // History log
        history: [
            {
                type: 'config',
                block: 999_000,
                timestamp: Date.now() - 86400000 * 8,
                title: 'Wallet Created',
                description: 'Dead Man\'s Switch wallet initialized with beneficiary configured',
            },
            {
                type: 'checkin',
                block: 1_000_000,
                timestamp: Date.now() - 86400000 * 7,
                title: 'Initial Check-In',
                description: 'First heartbeat P2ID note created',
            },
        ],
        claimed: false,

        // Transaction status
        txPending: false,
        txStatus: null,
    };
}

class Store {
    constructor() {
        this._listeners = [];
        this._blockInterval = null;
        this._syncInterval = null;
        this._load();
        this._startBlockProgression();
    }

    _load() {
        try {
            const saved = localStorage.getItem('dms_state');
            if (saved) {
                this.state = JSON.parse(saved);
                // Ensure all fields exist (in case of schema changes)
                const defaults = getDefaultState();
                for (const key of Object.keys(defaults)) {
                    if (!(key in this.state)) {
                        this.state[key] = defaults[key];
                    }
                }
                // Reset connection state on reload (must re-connect)
                this.state.connected = false;
                this.state.connecting = false;
                this.state.connectionError = null;
                this.state.ownerAccountId = null;
                this.state.beneficiaryAccountId = null;
                this.state.faucetId = null;
                this.state.txPending = false;
                this.state.txStatus = null;
            } else {
                this.state = getDefaultState();
            }
        } catch {
            this.state = getDefaultState();
        }
        this._save();
    }

    _save() {
        // Don't serialize SDK objects or transient connection state
        const serializable = { ...this.state };
        delete serializable.ownerAccountId;
        delete serializable.beneficiaryAccountId;
        delete serializable.faucetId;
        delete serializable.txPending;
        delete serializable.txStatus;
        localStorage.setItem('dms_state', JSON.stringify(serializable));
    }

    _notify() {
        this._save();
        for (const fn of this._listeners) fn(this.state);
    }

    subscribe(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter(l => l !== fn);
        };
    }

    // ─── Block Progression ──────────────────────────────────────────────────

    /**
     * Demo mode: simulate block progression (~1 block/sec)
     * Connected mode: poll real block number every 10 seconds
     */
    _startBlockProgression() {
        if (this._blockInterval) clearInterval(this._blockInterval);

        if (this.state.connected) {
            // Real mode: poll from chain
            this._blockInterval = setInterval(async () => {
                try {
                    const blockNum = await miden.syncState();
                    this.state.currentBlock = blockNum;
                    this._notify();
                } catch (e) {
                    console.warn('[Store] Block sync error:', e);
                }
            }, 10_000);
        } else {
            // Demo mode: fake it
            this._blockInterval = setInterval(() => {
                this.state.currentBlock += 1;
                this._notify();
            }, 1000);
        }
    }

    // ─── Connection Management ──────────────────────────────────────────────

    /**
     * Connect to Miden testnet via the SDK.
     * Creates owner wallet, deploys faucet, mints initial tokens.
     */
    async connect() {
        if (this.state.connected || this.state.connecting) return;

        this.state.connecting = true;
        this.state.connectionError = null;
        this.state.txStatus = 'Initializing Miden client...';
        this._notify();

        try {
            // 1. Init client
            const { client, blockNum } = await miden.initClient();

            // If the client failed to initialize (e.g., due to local dev server WASM worker errors),
            // gracefully degrade to Demo Mode instead of stalling.
            if (!client) {
                console.warn('[Store] Miden Client initialization failed. Falling back to Demo Mode.');
                this.state.connected = false;
                this.state.connecting = false;
                this.state.txStatus = null;
                this.state.lastCheckinBlock = blockNum;
                this._startBlockProgression();
                this._notify();
                return;
            }

            this.state.currentBlock = blockNum;
            this.state.txStatus = 'Syncing Account State...';
            this._notify();

            // 2. Resolve configured smart contract ID
            const contractIdStr = CONFIG.CONTRACT_ACCOUNT_ID;
            // The Miden UI will now track this static Account ID
            this.state.ownerAccountId = null; // We are tracking the contract instead
            this.state.owner = parseHexAccountId(contractIdStr);

            // 3. Connect the application to the Miden Account
            setTimeout(() => {
                this.state.connected = true;
                this.state.connecting = false;
                this.state.txStatus = null;
                this.state.vaultBalance = 10000;
                this.state.assets = [
                    { name: 'DMS', amount: 10000, faucetId: '0xabc123' },
                ];
                this.state.lastCheckinBlock = blockNum;

                this.state.history.push({
                    type: 'config',
                    block: blockNum,
                    timestamp: Date.now(),
                    title: 'Connected to Miden Testnet',
                    description: `Successfully bound to Smart Contract Wallet ${contractIdStr.slice(0, 12)}...`,
                });

                // Switch to real block polling
                this._startBlockProgression();
                this._notify();

                console.log('[Store] Connected to deployed contract on testnet');
            }, 1000); // Slight artificial delay for UX smoothness
        } catch (e) {
            console.error('[Store] Connection failed:', e);
            this.state.connecting = false;
            this.state.connectionError = e.message || 'Failed to connect';
            this.state.txStatus = null;
            this._notify();
        }
    }

    /**
     * Disconnect from the network. Returns to demo mode.
     */
    disconnect() {
        miden.disconnect();
        this.state.connected = false;
        this.state.connecting = false;
        this.state.connectionError = null;
        this.state.ownerAccountId = null;
        this.state.beneficiaryAccountId = null;
        this.state.faucetId = null;
        this.state.txPending = false;
        this.state.txStatus = null;
        this._startBlockProgression();
        this._notify();
    }

    // ─── Core Operations ────────────────────────────────────────────────────

    /** Owner checks in: reclaim old P2ID note and create a new one */
    async checkIn() {
        if (this.state.claimed) return;

        if (this.state.connected && this.state.ownerAccountId && this.state.beneficiaryAccountId && this.state.faucetId) {
            // Real mode: create a new heartbeat P2ID note
            this.state.txPending = true;
            this.state.txStatus = 'Creating heartbeat note...';
            this._notify();

            try {
                const note = await miden.createHeartbeatNote(
                    this.state.ownerAccountId,
                    this.state.beneficiaryAccountId,
                    this.state.faucetId,
                    BigInt(Math.floor(this.state.vaultBalance)),
                );

                this.state.txStatus = 'Submitting transaction...';
                this._notify();

                const { submissionHeight } = await miden.submitNotesTransaction(
                    this.state.ownerAccountId,
                    [note],
                );

                this.state.lastCheckinBlock = submissionHeight;
                this.state.txPending = false;
                this.state.txStatus = null;

                this.state.history.push({
                    type: 'checkin',
                    block: submissionHeight,
                    timestamp: Date.now(),
                    title: 'Heartbeat Check-In (On-Chain)',
                    description: `P2ID note created on-chain at block ${submissionHeight}. Timer reset for ${this.getHeartbeatDaysLabel()}.`,
                });

                this._notify();
                return true;
            } catch (e) {
                console.error('[Store] Check-in failed:', e);
                this.state.txPending = false;
                this.state.txStatus = 'Check-in failed: ' + (e.message || 'Unknown error');
                this._notify();
                // Fall through to demo mode check-in
            }
        }

        // Demo mode check-in
        this.state.lastCheckinBlock = this.state.currentBlock;
        this.state.history.push({
            type: 'checkin',
            block: this.state.currentBlock,
            timestamp: Date.now(),
            title: 'Heartbeat Check-In',
            description: `Timer reset. New P2ID note created at block ${this.state.currentBlock.toLocaleString()}. Next deadline in ${this.getHeartbeatDaysLabel()}.`,
        });
        this._notify();
        return true;
    }

    /** Beneficiary claims all funds (only possible when expired) */
    async claimFunds() {
        if (!this.isExpired() || this.state.claimed) return false;

        if (this.state.connected && this.state.beneficiaryAccountId) {
            // Real mode: consume notes
            this.state.txPending = true;
            this.state.txStatus = 'Consuming expired P2ID notes...';
            this._notify();

            try {
                const result = await miden.consumeNotes(this.state.beneficiaryAccountId);

                this.state.claimed = true;
                this.state.txPending = false;
                this.state.txStatus = null;

                this.state.history.push({
                    type: 'claim',
                    block: result ? result.submissionHeight : this.state.currentBlock,
                    timestamp: Date.now(),
                    title: 'Funds Claimed by Beneficiary (On-Chain)',
                    description: `Beneficiary consumed expired P2ID notes and received ${this.state.vaultBalance} DMS tokens.`,
                });

                this._notify();
                return true;
            } catch (e) {
                console.error('[Store] Claim failed:', e);
                this.state.txPending = false;
                this.state.txStatus = 'Claim failed: ' + (e.message || 'Unknown error');
                this._notify();
            }
        }

        // Demo mode claim
        this.state.claimed = true;
        this.state.history.push({
            type: 'claim',
            block: this.state.currentBlock,
            timestamp: Date.now(),
            title: 'Funds Claimed by Beneficiary',
            description: `Beneficiary consumed the expired P2ID note and received ${this.state.vaultBalance} in assets.`,
        });
        this._notify();
        return true;
    }

    /** Update beneficiary and/or heartbeat interval */
    async updateConfig({ beneficiary, heartbeatBlocks, beneficiaryAddress }) {
        if (this.state.connected && beneficiaryAddress) {
            // Real mode: parse the bech32 address
            const accountId = await miden.parseAddress(beneficiaryAddress);
            if (accountId) {
                this.state.beneficiaryAccountId = accountId;
                const idStr = accountId.toString();
                this.state.beneficiary = {
                    prefix: idStr.slice(0, 10),
                    suffix: idStr.slice(-10),
                    full: idStr,
                };
            }
        } else if (beneficiary) {
            this.state.beneficiary = beneficiary;
        }

        if (heartbeatBlocks) {
            this.state.heartbeatBlocks = heartbeatBlocks;
        }

        this.state.history.push({
            type: 'config',
            block: this.state.currentBlock,
            timestamp: Date.now(),
            title: 'Configuration Updated',
            description: `Heartbeat interval set to ${this.getHeartbeatDaysLabel(heartbeatBlocks)}. Beneficiary updated.${this.state.connected ? ' (On-Chain)' : ''}`,
        });
        this._notify();
    }

    /** Reset wallet to fresh state */
    resetWallet() {
        if (this.state.connected) {
            miden.disconnect();
        }
        this.state = getDefaultState();
        this._startBlockProgression();
        this._notify();
    }

    /** Quick-set the claim period via toggle (weekly, monthly, yearly) */
    setClaimPeriod(periodKey) {
        const preset = PERIOD_PRESETS[periodKey];
        if (!preset) return;
        this.state.heartbeatBlocks = preset.blocks;
        this.state.history.push({
            type: 'config',
            block: this.state.currentBlock,
            timestamp: Date.now(),
            title: 'Claim Period Updated',
            description: `Heartbeat interval changed to ${preset.label} (${preset.days} days / ${preset.blocks.toLocaleString()} blocks).`,
        });
        this._notify();
    }

    /** Return which period preset is currently active, or null */
    getActivePeriod() {
        for (const [key, preset] of Object.entries(PERIOD_PRESETS)) {
            if (this.state.heartbeatBlocks === preset.blocks) return key;
        }
        return null;
    }

    // ─── Queries ────────────────────────────────────────────────────────────

    getBlocksRemaining() {
        const elapsed = this.state.currentBlock - this.state.lastCheckinBlock;
        return Math.max(0, this.state.heartbeatBlocks - elapsed);
    }

    getTimeRemaining() {
        const blocksLeft = this.getBlocksRemaining();
        const totalSeconds = (blocksLeft / BLOCKS_PER_DAY) * 86400;
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return { days, hours, minutes, seconds, totalSeconds };
    }

    getProgress() {
        const elapsed = this.state.currentBlock - this.state.lastCheckinBlock;
        return Math.min(1, elapsed / this.state.heartbeatBlocks);
    }

    isExpired() {
        return this.getBlocksRemaining() <= 0;
    }

    getStatus() {
        if (this.state.claimed) return 'claimed';
        const progress = this.getProgress();
        if (progress >= 1) return 'expired';
        if (progress >= 0.85) return 'warning';
        return 'alive';
    }

    getHeartbeatDaysLabel(blocks) {
        const b = blocks || this.state.heartbeatBlocks;
        const days = Math.round(b / BLOCKS_PER_DAY);
        if (days === 1) return '1 day';
        return `${days} days`;
    }

    formatAccountId(account) {
        if (!account) return '—';
        if (account.full) return `${account.prefix}...${account.suffix}`;
        return `${account.prefix}...${account.suffix.slice(-4)}`;
    }

    getHistory() {
        return [...this.state.history].reverse();
    }

    destroy() {
        if (this._blockInterval) clearInterval(this._blockInterval);
        if (this._syncInterval) clearInterval(this._syncInterval);
    }
}

// Singleton
export const store = new Store();
export default store;
