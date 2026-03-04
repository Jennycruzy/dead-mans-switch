/**
 * Claim Page
 * Beneficiary view to claim funds when the switch triggers.
 * When connected to Miden, performs real note consumption via the SDK.
 */

import store from '../store.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export function renderClaim(container) {
  function render() {
    const status = store.getStatus();
    const remaining = store.getTimeRemaining();
    const isExpired = store.isExpired();
    const isClaimed = store.state.claimed;
    const isConnected = store.state.connected;
    const tokenName = isConnected ? 'DMS' : 'MIDEN';

    // Success state after claiming
    if (isClaimed) {
      container.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Claim Funds</h1>
          <p class="page-subtitle">Beneficiary portal for claiming inherited assets.</p>
        </div>
        <div class="card">
          <div class="success-animation">
            <div class="success-checkmark">✓</div>
            <h2 class="success-title">Funds Successfully Claimed</h2>
            <p class="success-desc">
              All assets have been transferred to the beneficiary account 
              <span class="mono">${store.formatAccountId(store.state.beneficiary)}</span>.
              ${isConnected ? '<br/><span class="badge badge-alive" style="font-size:0.65rem;padding:2px 8px;margin-top:8px;display:inline-block;"><span class="badge-dot"></span> Confirmed On-Chain</span>' : ''}
            </p>
            <div class="card" style="width: 100%; max-width: 400px; margin-top: var(--space-md);">
              <h3 style="margin-bottom: var(--space-md);">Transferred Assets</h3>
              ${store.state.assets.map(a => `
                <div class="asset-row">
                  <span class="asset-name">${a.name}</span>
                  <span class="asset-amount">${a.amount.toLocaleString()}</span>
                </div>
              `).join('')}
              <hr class="divider" />
              <div class="flex justify-between items-center" style="padding: var(--space-sm) var(--space-md);">
                <span style="font-weight: 700;">Total</span>
                <span class="asset-amount" style="font-size: 1.2rem;">${store.state.vaultBalance.toLocaleString()} ${tokenName}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Determine stepper state
    const step1State = 'done';
    const step2State = isExpired ? 'done' : 'active';
    const step3State = isExpired ? 'active' : 'locked';

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Claim Funds</h1>
        <p class="page-subtitle">Beneficiary portal for claiming inherited assets when the switch triggers.</p>
      </div>

      <!-- Progress Stepper -->
      <div class="claim-stepper">
        <div class="claim-step ${step1State}">
          <div class="claim-step-circle">📋</div>
          <div class="claim-step-label">Status</div>
        </div>
        <div class="claim-step-connector ${step1State === 'done' ? 'done' : ''}"></div>
        <div class="claim-step ${step2State}">
          <div class="claim-step-circle">${isExpired ? '✓' : '⏳'}</div>
          <div class="claim-step-label">${isExpired ? 'Expired' : 'Waiting'}</div>
        </div>
        <div class="claim-step-connector ${step2State === 'done' ? 'done' : ''}"></div>
        <div class="claim-step ${step3State}">
          <div class="claim-step-circle">🔓</div>
          <div class="claim-step-label">Claim</div>
        </div>
      </div>

      <div class="card">
        <div class="claim-hero">
          <div class="claim-icon">${isExpired ? '🔓' : '🔒'}</div>
          <div class="claim-status" style="color: ${isExpired ? 'var(--status-expired)' : 'var(--accent-emerald)'}">
            ${isExpired ? 'Switch Triggered — Funds Claimable' : 'Switch Active — Funds Locked'}
          </div>
          <p class="text-secondary" style="max-width: 500px; margin: 0 auto;">
            ${isExpired
        ? `The owner has not checked in and the P2ID${isConnected ? 'E' : ''} note has expired. As the designated beneficiary, you can now claim all assets.`
        : `The owner last checked in at block ${store.state.lastCheckinBlock.toLocaleString()}. The switch will trigger if the owner doesn't check in within the next <strong style="color: var(--text-primary);">${remaining.days}d ${remaining.hours}h ${remaining.minutes}m</strong>.`
      }
          </p>
          ${isExpired ? `
            <span class="badge badge-expired mt-lg" style="font-size: 0.85rem; padding: 6px 16px;">
              <span class="badge-dot"></span> CLAIMABLE NOW
            </span>
          ` : `
            <span class="badge badge-alive mt-lg" style="font-size: 0.85rem; padding: 6px 16px;">
              <span class="badge-dot"></span> LOCKED
            </span>
          `}
        </div>

        <hr class="divider" />

        <!-- Asset Breakdown -->
        <div class="section">
          <h3 class="section-title">Assets in Vault</h3>
          <div class="asset-breakdown">
            ${store.state.assets.map(a => `
              <div class="asset-row">
                <div>
                  <span class="asset-name">${a.name}</span>
                  <span class="text-sm text-muted" style="margin-left: 8px;">Faucet: ${typeof a.faucetId === 'object' ? '(SDK)' : a.faucetId}</span>
                </div>
                <span class="asset-amount">${a.amount.toLocaleString()}</span>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between items-center" style="padding: var(--space-md); background: var(--bg-glass); border-radius: var(--radius-md); margin-top: var(--space-md);">
            <span style="font-weight: 700; font-size: 1rem;">Total Value</span>
            <span style="font-weight: 800; font-size: 1.25rem; color: var(--accent-emerald); font-family: var(--font-mono);">
              ${store.state.vaultBalance.toLocaleString()} ${tokenName}
            </span>
          </div>
        </div>

        <!-- Beneficiary Info -->
        <div class="section">
          <h3 class="section-title">Beneficiary Account</h3>
          <div class="config-display">
            ${store.state.beneficiary.full ? `
              <div class="config-row">
                <span class="config-key">Account Address</span>
                <span class="config-value mono">${store.state.beneficiary.full}</span>
              </div>
            ` : `
              <div class="config-row">
                <span class="config-key">Account ID Prefix</span>
                <span class="config-value">${store.state.beneficiary.prefix}</span>
              </div>
              <div class="config-row">
                <span class="config-key">Account ID Suffix</span>
                <span class="config-value">${store.state.beneficiary.suffix}</span>
              </div>
            `}
          </div>
        </div>

        <!-- Transaction Status -->
        ${store.state.txPending ? `
          <div class="section">
            <div class="card" style="text-align:center; border-color: var(--accent-emerald);">
              <div style="font-size:1.5rem; margin-bottom: var(--space-sm);">⏳</div>
              <p style="color: var(--accent-emerald); font-weight: 600;">${store.state.txStatus || 'Processing...'}</p>
            </div>
          </div>
        ` : ''}

        <!-- Claim Button -->
        <div class="flex justify-center mt-xl">
          <button class="btn ${isExpired ? 'btn-success btn-lg' : 'btn-ghost btn-lg'}" 
            id="btn-claim" ${!isExpired ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
            ${isExpired
        ? (isConnected ? '🔓 Claim All Funds (On-Chain)' : '🔓 Claim All Funds')
        : '🔒 Locked — Check Back Later'
      }
          </button>
        </div>
      </div>
    `;

    // Claim button handler
    if (isExpired) {
      container.querySelector('#btn-claim').addEventListener('click', () => {
        showModal({
          title: '🔓 Confirm Fund Claim',
          content: `
            <p style="color: var(--text-secondary); margin-bottom: var(--space-md);">
              You are about to consume the expired P2ID${isConnected ? 'E' : ''} note and transfer all assets to the beneficiary account.
              ${isConnected ? '<br/><br/><strong style="color:var(--accent-emerald);">This will execute a real transaction on the Miden testnet.</strong>' : ''}
            </p>
            <div class="config-display">
              <div class="config-row">
                <span class="config-key">Assets</span>
                <span class="config-value">${store.state.vaultBalance.toLocaleString()} ${tokenName}</span>
              </div>
              <div class="config-row">
                <span class="config-key">To Account</span>
                <span class="config-value">${store.formatAccountId(store.state.beneficiary)}</span>
              </div>
            </div>
          `,
          actions: [
            { label: 'Cancel', class: 'btn-ghost' },
            {
              label: isConnected ? 'Confirm On-Chain Claim' : 'Confirm Claim',
              class: 'btn-success',
              onClick: async () => {
                const claimBtn = container.querySelector('#btn-claim');
                if (claimBtn) {
                  claimBtn.disabled = true;
                  claimBtn.textContent = '⏳ Processing...';
                }

                const success = await store.claimFunds();
                if (success) {
                  showToast('Funds claimed successfully!', 'success');
                  render();
                } else {
                  showToast(store.state.txStatus || 'Claim failed', 'error');
                }
              },
            },
          ],
        });
      });
    }
  }

  render();
  const unsub = store.subscribe(render);
  return () => unsub();
}
