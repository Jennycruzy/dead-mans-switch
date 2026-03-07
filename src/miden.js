/**
 * Dead Man's Switch — Miden SDK Wrapper
 * 
 * Centralizes all interactions with the @miden-sdk/miden-sdk WebClient.
 * Dynamically imports the SDK (WASM) so it only loads when the user
 * explicitly connects to the Miden network.
 */

let _sdk = null;
let _client = null;
let _prover = null;
let _lastSyncState = null;

const RPC_ENDPOINT = 'https://rpc.testnet.miden.io';

// ─── SDK Loading ────────────────────────────────────────────────────────────

/**
 * Dynamically load the Miden SDK. Must run in a browser context.
 * Returns the full set of SDK exports.
 */
async function loadSDK() {
    if (_sdk) return _sdk;
    if (typeof window === 'undefined') {
        throw new Error('Miden SDK can only run in the browser');
    }
    _sdk = await import('@miden-sdk/miden-sdk');
    return _sdk;
}

// ─── Client Initialization ─────────────────────────────────────────────────

/**
 * Initialize the WebClient and connect to the Miden testnet RPC.
 * Syncs state and returns the current block number.
 */
export async function initClient() {
    const sdk = await loadSDK();

    try {
        // Race the WebClient constructor against a 5-second timeout.
        // If it hangs (e.g., due to local dev server missing COOP headers for WASM), fallback gracefully.
        _client = await Promise.race([
            sdk.WebClient.createClient(RPC_ENDPOINT),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Miden WebClient initialization timeout')), 5000))
        ]);

        // Set up a local prover for off-chain ZK generation
        _prover = sdk.TransactionProver.newLocalProver();

        _lastSyncState = await _client.syncState();
        const blockNum = _lastSyncState.blockNum();
        console.log('[Miden] Connected — latest block:', blockNum);
        return { client: _client, blockNum };
    } catch (error) {
        console.error('[Miden] WebClient Initialization Error – Falling back to un-synced block.', error);
        // Clean up partial state
        _client = null;
        return { client: null, blockNum: 1000000 };
    }
}

/**
 * Re-sync with the chain and return the latest block number.
 */
export async function syncState() {
    if (!_client) throw new Error('Client not initialized');
    _lastSyncState = await _client.syncState();
    return _lastSyncState.blockNum();
}

/**
 * Get the current block number from last sync.
 */
export function getLastBlockNum() {
    return _lastSyncState ? _lastSyncState.blockNum() : null;
}

export async function parseAddress(addressStr) {
    const sdk = await loadSDK();
    try {
        return sdk.Address.fromBech32(addressStr).accountId();
    } catch (e) {
        console.warn('[Miden] Failed to parse address:', addressStr, e);
        return null;
    }
}

// ─── Note Operations (P2ID / Dead Man's Switch) ────────────────────────────

/**
 * Create a P2ID note from the owner to the beneficiary.
 * This represents the "heartbeat" note in the dead man's switch pattern.
 * 
 * In a real P2IDE implementation, the note would include time-lock and
 * reclaim block heights. The current SDK P2ID note allows the beneficiary
 * to consume it at any time, so we use the reclaim pattern:
 * - Owner creates a P2ID note TO the beneficiary
 * - Owner can reclaim it before the deadline (check-in)
 * - After the deadline, beneficiary consumes it (claim)
 * 
 * @param {object} ownerAccountId - Owner's AccountId
 * @param {object} beneficiaryAccountId - Beneficiary's AccountId  
 * @param {object} faucetId - Faucet ID for the asset
 * @param {bigint} amount - Amount in base units
 */
export async function createHeartbeatNote(ownerAccountId, beneficiaryAccountId, faucetId, amount) {
    if (!_client) throw new Error('Client not initialized');
    const sdk = await loadSDK();

    const assets = new sdk.NoteAssets([
        new sdk.FungibleAsset(faucetId, amount),
    ]);

    const note = sdk.Note.createP2IDNote(
        ownerAccountId,
        beneficiaryAccountId,
        assets,
        sdk.NoteType.Public,
        new sdk.NoteAttachment(),
    );

    console.log('[Miden] P2ID heartbeat note created');
    return note;
}

/**
 * Build and submit a transaction with one or more output notes.
 * Handles: execute → prove → submit → apply.
 */
export async function submitNotesTransaction(senderAccountId, outputNotes) {
    if (!_client) throw new Error('Client not initialized');
    const sdk = await loadSDK();

    const wrappedNotes = outputNotes.map(n => sdk.OutputNote.full(n));
    const txRequest = new sdk.TransactionRequestBuilder()
        .withOwnOutputNotes(new sdk.OutputNoteArray(wrappedNotes))
        .build();

    const txResult = await _client.executeTransaction(senderAccountId, txRequest);
    const proven = await _client.proveTransaction(txResult, _prover);
    const submissionHeight = await _client.submitProvenTransaction(proven, txResult);
    await _client.applyTransaction(txResult, submissionHeight);

    console.log('[Miden] Transaction submitted at block:', submissionHeight);
    return { txResult, submissionHeight };
}

/**
 * Get consumable notes for an account and consume them all.
 * Used by the beneficiary to claim funds.
 */
export async function consumeNotes(accountId) {
    if (!_client) throw new Error('Client not initialized');

    await _client.syncState();

    const consumableNotes = await _client.getConsumableNotes(accountId);
    if (!consumableNotes || consumableNotes.length === 0) {
        console.log('[Miden] No consumable notes found for account');
        return null;
    }

    const noteList = consumableNotes.map(rec => rec.inputNoteRecord().toNote());

    const txRequest = _client.newConsumeTransactionRequest(noteList);
    const txResult = await _client.executeTransaction(accountId, txRequest);
    const proven = await _client.proveTransaction(txResult, _prover);
    const submissionHeight = await _client.submitProvenTransaction(proven, txResult);
    await _client.applyTransaction(txResult, submissionHeight);

    console.log('[Miden] Notes consumed:', noteList.length, 'at block:', submissionHeight);
    return { consumed: noteList.length, submissionHeight };
}

/**
 * Mint tokens from a faucet to an account.
 * Used during setup to fund the owner wallet.
 */
export async function mintTokens(faucetAccountId, targetAccountId, amount) {
    if (!_client) throw new Error('Client not initialized');
    const sdk = await loadSDK();

    const txRequest = _client.newMintTransactionRequest(
        targetAccountId,
        faucetAccountId,
        sdk.NoteType.Public,
        amount,
    );

    const txResult = await _client.executeTransaction(faucetAccountId, txRequest);
    const proven = await _client.proveTransaction(txResult, _prover);
    const submissionHeight = await _client.submitProvenTransaction(proven, txResult);
    await _client.applyTransaction(txResult, submissionHeight);

    console.log('[Miden] Minted', amount.toString(), 'tokens at block:', submissionHeight);

    // Wait for settlement and re-sync
    await new Promise(r => setTimeout(r, 7000));
    await _client.syncState();

    return { submissionHeight };
}

/**
 * Deploy a fungible faucet (for demo/testing purposes).
 */
export async function deployFaucet(symbol = 'DMS', decimals = 8, maxSupply = BigInt(1_000_000)) {
    if (!_client) throw new Error('Client not initialized');
    const sdk = await loadSDK();

    const faucet = await _client.newFaucet(
        sdk.AccountStorageMode.public(),
        false,  // immutable
        symbol,
        decimals,
        maxSupply,
        sdk.AuthScheme.AuthRpoFalcon512,
    );

    console.log('[Miden] Faucet deployed:', faucet.id().toString());
    return faucet;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Check if the client is currently connected.
 */
export function isConnected() {
    return _client !== null;
}

/**
 * Get the raw SDK module (for advanced usage).
 */
export function getSDK() {
    return _sdk;
}

/**
 * Get the raw client instance.
 */
export function getClient() {
    return _client;
}

/**
 * Disconnect and clear state.
 */
export function disconnect() {
    _client = null;
    _prover = null;
    _lastSyncState = null;
    console.log('[Miden] Disconnected');
}
