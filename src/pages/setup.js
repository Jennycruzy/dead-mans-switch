/**
 * Setup / Configuration Page
 * Configure beneficiary account and heartbeat interval.
 * When connected to Miden, accepts bech32 addresses and performs on-chain operations.
 */

import store from '../store.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

const PRESET_INTERVALS = [
  { label: '🗓️ Weekly', blocks: 201600, primary: true },
  { label: '📅 Monthly', blocks: 864000, primary: true },
  { label: '📆 Yearly', blocks: 10512000, primary: true },
  { label: '1 Day', blocks: 28800 },
  { label: '3 Days', blocks: 86400 },
  { label: '14 Days', blocks: 403200 },
];

export function renderSetup(container) {
  const state = store.state;
  const isConnected = state.connected;

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Configuration</h1>
      <p class="page-subtitle">Set up your Dead Man's Switch parameters. Changes take effect on the next check-in.</p>
    </div>

    <!-- Current Config -->
    <div class="section">
      <h3 class="section-title">Current Configuration</h3>
      <div class="card">
        <div class="config-display">
          <div class="config-row">
            <span class="config-key">Owner Account</span>
            <span class="config-value">${state.owner.full || (state.owner.prefix + '...' + state.owner.suffix)}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Beneficiary Account</span>
            <span class="config-value">${state.beneficiary.full || (state.beneficiary.prefix + '...' + state.beneficiary.suffix)}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Heartbeat Interval</span>
            <span class="config-value">${store.getHeartbeatDaysLabel()} (${state.heartbeatBlocks.toLocaleString()} blocks)</span>
          </div>
          <div class="config-row">
            <span class="config-key">Blocks Per Day</span>
            <span class="config-value">28,800</span>
          </div>
          <div class="config-row">
            <span class="config-key">Vault Balance</span>
            <span class="config-value">${state.vaultBalance.toLocaleString()} ${isConnected ? 'DMS' : 'MIDEN'}</span>
          </div>
          <div class="config-row">
            <span class="config-key">Mode</span>
            <span class="config-value">${isConnected
      ? '<span class="badge badge-alive" style="font-size:0.65rem;padding:2px 8px;"><span class="badge-dot"></span> On-Chain</span>'
      : '<span class="badge" style="font-size:0.65rem;padding:2px 8px;background:var(--surface-border);color:var(--text-muted);">Demo</span>'
    }</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Update Config -->
    <div class="section">
      <h3 class="section-title">Update Configuration</h3>
      <div class="card">
        ${isConnected ? `
          <div class="input-group">
            <label for="beneficiary-address">Beneficiary Address (bech32)</label>
            <input type="text" class="input" id="beneficiary-address" 
              placeholder="mtst1a..." value="${state.beneficiary.full || ''}" />
            <span class="text-sm text-muted">Enter a Miden testnet address starting with <code>mtst1</code></span>
          </div>
        ` : `
          <div class="form-grid">
            <div class="input-group">
              <label for="beneficiary-prefix">Beneficiary ID Prefix</label>
              <input type="text" class="input" id="beneficiary-prefix" 
                placeholder="0x..." value="${state.beneficiary.prefix}" />
            </div>
            <div class="input-group">
              <label for="beneficiary-suffix">Beneficiary ID Suffix</label>
              <input type="text" class="input" id="beneficiary-suffix" 
                placeholder="0x..." value="${state.beneficiary.suffix}" />
            </div>
          </div>
        `}

        <div class="input-group mt-lg">
          <label>Heartbeat Interval</label>
          <div class="preset-group" id="preset-group">
            ${PRESET_INTERVALS.map(p => `
              <button class="preset-btn ${p.blocks === state.heartbeatBlocks ? 'active' : ''}" 
                data-blocks="${p.blocks}">${p.label}</button>
            `).join('')}
          </div>
        </div>

        <div class="input-group mt-lg">
          <label for="custom-blocks">Custom Interval (blocks)</label>
          <input type="number" class="input" id="custom-blocks" 
            placeholder="Enter block count..." value="${state.heartbeatBlocks}" 
            style="max-width: 300px;" />
          <span class="text-sm text-muted">1 day = 28,800 blocks · Enter any value for a custom interval</span>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" id="btn-save-config">
            💾 Save Configuration
          </button>
          <button class="btn btn-ghost" id="btn-reset">
            🔄 Reset to Defaults
          </button>
        </div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="section">
      <h3 class="section-title" style="color: var(--status-expired);">Danger Zone</h3>
      <div class="card" style="border-color: rgba(248, 113, 113, 0.2);">
        <div class="flex justify-between items-center">
          <div>
            <h3 style="font-size: 0.95rem;">Reset Wallet</h3>
            <p class="text-sm text-muted">Wipe all data and start fresh. This cannot be undone.${isConnected ? ' Will disconnect from Miden.' : ''}</p>
          </div>
          <button class="btn btn-danger" id="btn-danger-reset">Reset Everything</button>
        </div>
      </div>
    </div>
  `;

  // Preset buttons
  const presetGroup = container.querySelector('#preset-group');
  const customInput = container.querySelector('#custom-blocks');

  presetGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    const blocks = parseInt(btn.dataset.blocks);

    presetGroup.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    customInput.value = blocks;
  });

  customInput.addEventListener('input', () => {
    presetGroup.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    const val = parseInt(customInput.value);
    const match = presetGroup.querySelector(`[data-blocks="${val}"]`);
    if (match) match.classList.add('active');
  });

  // Save config
  container.querySelector('#btn-save-config').addEventListener('click', async () => {
    const blocks = parseInt(customInput.value);

    if (!blocks || blocks < 100) {
      showToast('Heartbeat interval must be at least 100 blocks.', 'error');
      return;
    }

    let configUpdate = { heartbeatBlocks: blocks };

    if (isConnected) {
      const address = container.querySelector('#beneficiary-address').value.trim();
      if (!address) {
        showToast('Please enter a beneficiary address.', 'error');
        return;
      }
      configUpdate.beneficiaryAddress = address;
    } else {
      const prefix = container.querySelector('#beneficiary-prefix').value.trim();
      const suffix = container.querySelector('#beneficiary-suffix').value.trim();
      if (!prefix || !suffix) {
        showToast('Please enter both beneficiary ID fields.', 'error');
        return;
      }
      configUpdate.beneficiary = { prefix, suffix };
    }

    showModal({
      title: '⚙️ Confirm Configuration Update',
      content: `
        <p style="color: var(--text-secondary); margin-bottom: var(--space-md);">
          You're about to update your Dead Man's Switch configuration:
        </p>
        <div class="config-display">
          <div class="config-row">
            <span class="config-key">Beneficiary</span>
            <span class="config-value">${isConnected
          ? configUpdate.beneficiaryAddress
          : `${configUpdate.beneficiary.prefix}...${configUpdate.beneficiary.suffix.slice(-4)}`
        }</span>
          </div>
          <div class="config-row">
            <span class="config-key">Interval</span>
            <span class="config-value">${blocks.toLocaleString()} blocks (~${Math.round(blocks / 28800)} days)</span>
          </div>
        </div>
      `,
      actions: [
        { label: 'Cancel', class: 'btn-ghost' },
        {
          label: 'Confirm',
          class: 'btn-primary',
          onClick: async () => {
            await store.updateConfig(configUpdate);
            showToast('Configuration updated successfully!', 'success');
            renderSetup(container);
          },
        },
      ],
    });
  });

  // Reset to defaults
  container.querySelector('#btn-reset').addEventListener('click', () => {
    customInput.value = 201600;
    presetGroup.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    const sevenDay = presetGroup.querySelector('[data-blocks="201600"]');
    if (sevenDay) sevenDay.classList.add('active');
    showToast('Form reset to defaults.', 'info');
  });

  // Danger reset
  container.querySelector('#btn-danger-reset').addEventListener('click', () => {
    showModal({
      title: '⚠️ Reset Everything?',
      content: `<p style="color: var(--status-expired);">This will erase all wallet data, history, and configuration. You will need to set everything up again.${isConnected ? ' You will be disconnected from Miden.' : ''}</p>`,
      actions: [
        { label: 'Cancel', class: 'btn-ghost' },
        {
          label: 'Yes, Reset',
          class: 'btn-danger',
          onClick: () => {
            store.resetWallet();
            showToast('Wallet has been reset.', 'info');
            renderSetup(container);
          },
        },
      ],
    });
  });
}
