/**
 * Activity / History Page
 * Timeline of all check-in events, config changes, and claims.
 * Shows on-chain indicators when transactions were real.
 */

import store from '../store.js';

const TYPE_META = {
  checkin: { icon: '💚', color: 'checkin', label: 'Check-In' },
  config: { icon: '⚙️', color: 'config', label: 'Config Change' },
  claim: { icon: '🔓', color: 'claim', label: 'Claim' },
  expired: { icon: '💀', color: 'expired', label: 'Expired' },
};

export function renderActivity(container) {
  function render() {
    const history = store.getHistory();
    const isConnected = store.state.connected;

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Activity Log</h1>
        <p class="page-subtitle">Complete history of check-ins, configuration changes, and claims.</p>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-4 section stagger">
        <div class="card stat-card">
          <span class="stat-label">Total Check-Ins</span>
          <span class="stat-value">${history.filter(h => h.type === 'checkin').length}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Config Changes</span>
          <span class="stat-value">${history.filter(h => h.type === 'config').length}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Current Block</span>
          <span class="stat-value mono" id="current-block">${store.state.currentBlock.toLocaleString()}</span>
        </div>
        <div class="card stat-card">
          <span class="stat-label">Status</span>
          <span class="stat-value">
            <span class="status-indicator">
              <span class="status-dot ${store.getStatus()}"></span>
              <span>${store.getStatus().toUpperCase()}</span>
            </span>
          </span>
        </div>
      </div>

      <!-- Mode Indicator -->
      <div class="section" style="margin-top: calc(-1 * var(--space-lg));">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-md);">
          <span class="connection-dot ${isConnected ? 'connected' : 'demo'}" style="width:8px;height:8px;"></span>
          <span class="text-sm text-muted">${isConnected ? 'On-Chain transactions marked with ⛓️' : 'Demo mode — simulated transactions'}</span>
        </div>
      </div>

      <!-- Timeline -->
      <div class="section">
        <h3 class="section-title">Timeline</h3>
        ${history.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>No activity yet. Make your first check-in from the Dashboard.</p>
          </div>
        ` : `
          <div class="timeline stagger">
            ${history.map((item, i) => {
      const meta = TYPE_META[item.type] || TYPE_META.checkin;
      const isOnChain = item.title && item.title.includes('On-Chain');
      return `
                <div class="timeline-item" style="animation-delay: ${i * 80}ms">
                  <div class="timeline-dot ${meta.color}"></div>
                  <div class="timeline-content">
                    <div class="timeline-time">
                      ${new Date(item.timestamp).toLocaleString()} · Block ${item.block.toLocaleString()}
                      <span class="badge badge-${meta.color === 'checkin' ? 'alive' : meta.color === 'config' ? 'alive' : meta.color === 'claim' ? 'claimed' : 'expired'}" style="margin-left: 8px; font-size: 0.65rem; padding: 2px 8px;">
                        ${meta.icon} ${meta.label}
                      </span>
                      ${isOnChain ? '<span style="margin-left:4px;font-size:0.65rem;">⛓️</span>' : ''}
                    </div>
                    <div class="timeline-title">${item.title}</div>
                    <div class="timeline-desc">${item.description}</div>
                  </div>
                </div>
              `;
    }).join('')}
          </div>
        `}
      </div>
    `;
  }

  render();

  // Update the current block display in real-time
  const unsub = store.subscribe(() => {
    const blockEl = container.querySelector('#current-block');
    if (blockEl) blockEl.textContent = store.state.currentBlock.toLocaleString();
  });

  return () => unsub();
}
