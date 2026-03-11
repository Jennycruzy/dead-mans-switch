/**
 * Dashboard Page
 * Main view with countdown ring, status, stats, check-in button, and recent activity.
 * Includes connection banner for toggling between Demo and Miden SDK modes.
 */

import store from '../store.js';
import { PERIOD_PRESETS } from '../store.js';
import { createCountdownRing } from '../components/countdown.js';
import { showToast } from '../components/toast.js';

export function renderDashboard(container) {
  // Local state to track privacy toggle
  let isBalanceHidden = true;

  const statusMap = {
    alive: { badge: 'badge-alive', label: 'ALIVE', icon: '💚' },
    warning: { badge: 'badge-warning', label: 'WARNING', icon: '⚠️' },
    expired: { badge: 'badge-expired', label: 'EXPIRED', icon: '💀' },
    claimed: { badge: 'badge-claimed', label: 'CLAIMED', icon: '🔓' },
  };

  container.innerHTML = `
    <div class="connection-banner" id="connection-banner">
      <div class="connection-banner-inner">
        <div class="connection-info">
          <span class="connection-dot" id="connection-dot"></span>
          <span class="connection-label" id="connection-label"></span>
        </div>
        <div class="connection-actions" id="connection-actions"></div>
      </div>
      <div class="connection-status-text" id="connection-status-text" style="display:none;"></div>
    </div>

    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Monitor your Dead Man's Switch status and check in to keep your funds safe.</p>
    </div>

    <div class="grid grid-2 section stagger" id="top-section">
      <div class="card card-glow-emerald" id="countdown-card" style="grid-row: span 2;">
        <div id="countdown-mount"></div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-sm);margin:var(--space-md) 0;">
          <div class="period-toggle-label">Claim Period</div>
          <div class="period-toggle" id="period-toggle">
            ${Object.entries(PERIOD_PRESETS).map(([key, preset]) => `
              <button class="period-toggle-option ${store.getActivePeriod() === key ? 'active' : ''}" data-period="${key}">
                ${preset.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="flex justify-center mt-lg" id="checkin-area"></div>
      </div>

      <div class="card" id="status-card">
        <div class="flex items-center justify-between mb-md">
          <h3 style="display: flex; align-items: center; gap: 8px;">
            Switch Status <span id="dashboard-heart" class="status-heart">❤️</span>
          </h3>
          <span class="badge" id="status-badge"></span>
        </div>
        <div class="config-display" style="padding: var(--space-md);">
          <div class="config-row">
            <span class="config-key">Owner</span>
            <span class="config-value" id="stat-owner"></span>
          </div>
          <div class="config-row">
            <span class="config-key">Beneficiary</span>
            <span class="config-value" id="stat-beneficiary"></span>
          </div>
          <div class="config-row">
            <span class="config-key">Heartbeat</span>
            <span class="config-value" id="stat-heartbeat"></span>
          </div>
          <div class="config-row">
            <span class="config-key">Last Check-in</span>
            <span class="config-value" id="stat-last-checkin"></span>
          </div>
          <div class="config-row">
            <span class="config-key">Mode</span>
            <span class="config-value" id="stat-mode"></span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-md">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3>Vault Balance</h3>
            <button id="btn-toggle-balance" class="btn-ghost" style="border: none; background: transparent; cursor: pointer; font-size: 1.2rem; padding: 0 4px; filter: grayscale(100%); transition: all 0.2s;">
              🙈
            </button>
          </div>
          <span class="text-emerald" style="font-size:1.2rem">💎</span>
        </div>
        <div class="stat-value" id="vault-balance" style="font-size: 2rem; margin-bottom: var(--space-md);"></div>
        <div id="asset-list"></div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Recent Activity</h3>
      <div id="recent-activity"></div>
    </div>

    <div class="how-it-works section">
      <button class="how-it-works-toggle" id="hiw-toggle">
        <span>💡 How Dead Man's Switch Works</span>
        <span class="toggle-arrow">▼</span>
      </button>
      <div class="how-it-works-content" id="hiw-content">
        <div class="hiw-steps">
          <div class="hiw-step">
            <div class="hiw-step-number">1</div>
            <div class="hiw-step-icon">⚙️</div>
            <div class="hiw-step-title">Configure</div>
            <div class="hiw-step-desc">Set a beneficiary address and a heartbeat interval (e.g. 7 days)</div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-number">2</div>
            <div class="hiw-step-icon">🫀</div>
            <div class="hiw-step-title">Check In</div>
            <div class="hiw-step-desc">Periodically check in to prove you're still active and in control</div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-number">3</div>
            <div class="hiw-step-icon">⏰</div>
            <div class="hiw-step-title">Switch Triggers</div>
            <div class="hiw-step-desc">If you stop checking in, the countdown expires and the switch triggers</div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-number">4</div>
            <div class="hiw-step-icon">🔓</div>
            <div class="hiw-step-title">Funds Release</div>
            <div class="hiw-step-desc">Your beneficiary can now claim all assets locked in the vault</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ─── Balance Toggle Logic ─────────────────────────────────────────
  const btnToggleBalance = container.querySelector('#btn-toggle-balance');
  if (btnToggleBalance) {
    btnToggleBalance.addEventListener('click', () => {
      isBalanceHidden = !isBalanceHidden;
      update(); // Instantly trigger a UI refresh to show/hide the balance
    });
  }

  // Mount countdown ring
  const countdownMount = container.querySelector('#countdown-mount');
  const countdown = createCountdownRing(countdownMount, store);

  // ─── How It Works toggle ─────────────────────────────────────────
  const hiwToggle = container.querySelector('#hiw-toggle');
  const hiwContent = container.querySelector('#hiw-content');
  if (hiwToggle && hiwContent) {
    hiwToggle.addEventListener('click', () => {
      hiwToggle.classList.toggle('expanded');
      hiwContent.classList.toggle('visible');
    });
  }

  // ─── Period Toggle ──────────────────────────────────────────────
  const periodToggle = container.querySelector('#period-toggle');
  if (periodToggle) {
    periodToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.period-toggle-option');
      if (!btn) return;
      const period = btn.dataset.period;
      if (store.getActivePeriod() === period) return; // already active
      store.setClaimPeriod(period);
      showToast(`Claim period set to ${PERIOD_PRESETS[period].label} (${PERIOD_PRESETS[period].days} days)`, 'success');
    });
  }

  // ─── Connection banner logic ─────────────────────────────────────────
  function updateConnectionBanner() {
    const banner = container.querySelector('#connection-banner');
    const dot = container.querySelector('#connection-dot');
    const label = container.querySelector('#connection-label');
    const actions = container.querySelector('#connection-actions');
    const statusText = container.querySelector('#connection-status-text');
    if (!banner) return;

    actions.innerHTML = '';

    if (store.state.connecting) {
      dot.className = 'connection-dot connecting';
      label.textContent = 'Connecting to Miden Testnet...';
      banner.className = 'connection-banner connecting';
      if (store.state.txStatus) {
        statusText.style.display = 'block';
        statusText.textContent = store.state.txStatus;
      }
    } else if (store.state.connected) {
      dot.className = 'connection-dot connected';
      label.textContent = `Connected to Miden Testnet · Block ${store.state.currentBlock.toLocaleString()}`;
      banner.className = 'connection-banner connected';
      statusText.style.display = 'none';

      const disconnectBtn = document.createElement('button');
      disconnectBtn.className = 'btn btn-sm btn-ghost';
      disconnectBtn.textContent = 'Disconnect';
      disconnectBtn.addEventListener('click', () => {
        store.disconnect();
        showToast('Disconnected from Miden. Back to demo mode.', 'info');
        renderDashboard(container);
      });
      actions.appendChild(disconnectBtn);
    } else {
      dot.className = 'connection-dot demo';
      label.textContent = 'Demo Mode — Using simulated blockchain';
      banner.className = 'connection-banner demo';
      statusText.style.display = 'none';

      if (store.state.connectionError) {
        statusText.style.display = 'block';
        statusText.textContent = '⚠ ' + store.state.connectionError;
        statusText.style.color = 'var(--status-expired)';
      }

      const connectBtn = document.createElement('button');
      connectBtn.className = 'btn btn-sm btn-primary';
      connectBtn.id = 'btn-connect-miden';
      connectBtn.innerHTML = '🔗 Connect to Miden';
      connectBtn.addEventListener('click', async () => {
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';
        await store.connect();
        if (store.state.connected) {
          showToast('Connected to Miden testnet!', 'success');
        } else if (store.state.connectionError) {
          showToast('Connection failed: ' + store.state.connectionError, 'error');
        }
        renderDashboard(container);
      });
      actions.appendChild(connectBtn);
    }
  }

  // ─── Check-in button ─────────────────────────────────────────────────
  const checkinArea = container.querySelector('#checkin-area');
  const initialStatus = store.getStatus();

  if (initialStatus !== 'claimed') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-checkin';
    btn.id = 'btn-checkin';
    btn.innerHTML = `
      <span class="btn-checkin-icon status-heart ${initialStatus}">🫀</span>
      <span>Check In</span>
    `;
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = `<span class="btn-checkin-icon">⏳</span><span>Processing...</span>`;

      await store.checkIn();

      if (store.state.txStatus && store.state.txStatus.includes('failed')) {
        showToast(store.state.txStatus, 'error');
      } else {
        showToast('Heartbeat recorded! Timer has been reset.', 'success');
      }
      renderDashboard(container);
    });
    if (initialStatus === 'expired') {
      btn.style.opacity = '0.4';
      btn.style.pointerEvents = 'none';
    }
    checkinArea.appendChild(btn);
  }

  // ─── Update function ─────────────────────────────────────────────────
  function update() {
    const s = store.getStatus();
    const info = statusMap[s];

    // Update Badge
    const badge = container.querySelector('#status-badge');
    if (badge) {
      badge.className = `badge ${info.badge}`;
      badge.innerHTML = `<span class="badge-dot"></span> ${info.label}`;
    }

    // Update Dashboard Heart
    const dashboardHeart = container.querySelector('#dashboard-heart');
    if (dashboardHeart) {
      dashboardHeart.className = `status-heart ${s}`;
    }

    // Update Check-in Button Heart (only if not currently processing with the hourglass)
    const checkinIcon = container.querySelector('.btn-checkin-icon');
    if (checkinIcon && checkinIcon.textContent === '🫀') {
      checkinIcon.className = `btn-checkin-icon status-heart ${s}`;
    }

    countdown.update();

    // Sync period toggle active state
    const activePeriod = store.getActivePeriod();
    const toggleBtns = container.querySelectorAll('.period-toggle-option');
    toggleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === activePeriod);
    });

    // Stats
    const ownerEl = container.querySelector('#stat-owner');
    const beneficiaryEl = container.querySelector('#stat-beneficiary');
    const heartbeatEl = container.querySelector('#stat-heartbeat');
    const lastCheckinEl = container.querySelector('#stat-last-checkin');
    const modeEl = container.querySelector('#stat-mode');

    // Dynamic Vault Balance Reveal Logic
    const vaultEl = container.querySelector('#vault-balance');
    const toggleBtnEl = container.querySelector('#btn-toggle-balance');

    if (ownerEl) ownerEl.textContent = store.formatAccountId(store.state.owner);
    if (beneficiaryEl) beneficiaryEl.textContent = store.formatAccountId(store.state.beneficiary);
    if (heartbeatEl) heartbeatEl.textContent = store.getHeartbeatDaysLabel();
    if (lastCheckinEl) lastCheckinEl.textContent = `Block ${store.state.lastCheckinBlock.toLocaleString()}`;
    if (modeEl) {
      modeEl.innerHTML = store.state.connected
        ? '<span class="badge badge-alive" style="font-size:0.65rem;padding:2px 8px;"><span class="badge-dot"></span> On-Chain</span>'
        : '<span class="badge" style="font-size:0.65rem;padding:2px 8px;background:var(--surface-border);color:var(--text-muted);">Demo</span>';
    }
    if (vaultEl && toggleBtnEl) {
      if (isBalanceHidden) {
        vaultEl.textContent = `**** MIDEN`;
        toggleBtnEl.textContent = '🙈'; // Monkey covering eyes
        toggleBtnEl.style.filter = 'grayscale(100%)';
      } else {
        vaultEl.textContent = `${store.state.vaultBalance.toLocaleString()} MIDEN`;
        toggleBtnEl.textContent = '👁️'; // Open eye
        toggleBtnEl.style.filter = 'none';
      }
    }

    // Assets
    const assetList = container.querySelector('#asset-list');
    if (assetList) {
      assetList.innerHTML = store.state.assets.map(a => `
        <div class="flex justify-between items-center" style="padding: 6px 0; border-bottom: 1px solid var(--surface-border);">
          <span class="text-sm text-secondary">${a.name}</span>
          <span class="mono text-sm">${isBalanceHidden ? '****' : a.amount.toLocaleString()}</span>
        </div>
      `).join('');
    }

    // Recent activity
    const activityEl = container.querySelector('#recent-activity');
    if (activityEl) {
      const recent = store.getHistory().slice(0, 5);
      if (recent.length === 0) {
        activityEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No activity yet</p></div>';
      } else {
        activityEl.innerHTML = '<div class="timeline stagger">' + recent.map((item, i) => `
          <div class="timeline-item" style="animation-delay: ${i * 60}ms">
            <div class="timeline-dot ${item.type}"></div>
            <div class="timeline-content">
              <div class="timeline-time">${new Date(item.timestamp).toLocaleString()} · Block ${item.block.toLocaleString()}</div>
              <div class="timeline-title">${item.title}</div>
              <div class="timeline-desc">${item.description}</div>
            </div>
          </div>
        `).join('') + '</div>';
      }
    }

    updateConnectionBanner();
  }

  update();
  const unsub = store.subscribe(update);

  // Return cleanup function
  return () => unsub();
}