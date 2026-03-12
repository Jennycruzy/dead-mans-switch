/**
 * Sidebar navigation component
 * Shows connection status and real account ID when connected to Miden.
 * Includes mobile hamburger toggle for responsive layout.
 */

import { navigate } from '../router.js';
import store from '../store.js';

const NAV_ITEMS = [
  { route: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { route: '/setup', icon: '⚙️', label: 'Setup' },
  { route: '/activity', icon: '📋', label: 'Activity' },
  { route: '/claim', icon: '🔓', label: 'Claim' },
];

export function renderSidebar(container) {
  // ─── Mobile Header (visible only on small screens) ────────────────
  const mobileHeader = document.createElement('header');
  mobileHeader.className = 'mobile-header';
  mobileHeader.innerHTML = `
    <div class="mobile-header-brand">
      <span class="sidebar-logo">🛡️</span>
      <span class="sidebar-brand-name">Dead Man's Switch</span>
    </div>
    <button class="hamburger" id="hamburger-btn" aria-label="Toggle menu">
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>
  `;
  container.appendChild(mobileHeader);

  // ─── Sidebar Overlay (for mobile) ─────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  container.appendChild(overlay);

  // ─── Sidebar ──────────────────────────────────────────────────────
  const sidebar = document.createElement('nav');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">🛡️</div>
      <div class="sidebar-brand">
        <span class="sidebar-brand-name">Dead Man's Switch</span>
        <span class="sidebar-brand-sub">Miden Wallet</span>
      </div>
    </div>
    <div class="sidebar-nav" id="sidebar-nav"></div>
    
    <div class="sidebar-footer">
      <button id="sidebar-logout-btn" class="nav-link" style="width: 100%; margin-bottom: 16px; justify-content: flex-start; opacity: 0.8;">
        <span class="nav-icon">🚪</span>
        <span class="nav-label">Log Out</span>
      </button>

      <div class="wallet-badge" id="wallet-badge">
        <span class="wallet-badge-dot" id="wallet-badge-dot"></span>
        <span id="wallet-id"></span>
      </div>
      <div class="sidebar-mode-label" id="sidebar-mode-label"></div>
    </div>
  `;

  const nav = sidebar.querySelector('#sidebar-nav');

  NAV_ITEMS.forEach(item => {
    const link = document.createElement('button');
    link.className = 'nav-link';
    link.dataset.route = item.route;
    link.innerHTML = `
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
    `;
    link.addEventListener('click', () => {
      navigate(item.route);
      closeMobileSidebar();
    });
    nav.appendChild(link);
  });

  container.appendChild(sidebar);

  // ─── Mobile toggle logic ──────────────────────────────────────────
  function toggleMobileSidebar() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    mobileHeader.querySelector('.hamburger').classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    mobileHeader.querySelector('.hamburger').classList.remove('active');
    document.body.classList.remove('sidebar-open');
  }

  mobileHeader.querySelector('#hamburger-btn').addEventListener('click', toggleMobileSidebar);
  overlay.addEventListener('click', closeMobileSidebar);

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  // ─── Log Out Logic ────────────────────────────────────────────────
  const logoutBtn = sidebar.querySelector('#sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      store.resetWallet();
      navigate('/login');
      closeMobileSidebar(); // Ensures the menu closes on mobile devices
    });
  }

  // ─── Live-update wallet badge & connection status ─────────────────
  function updateFooter() {
    const walletId = sidebar.querySelector('#wallet-id');
    const badgeDot = sidebar.querySelector('#wallet-badge-dot');
    const modeLabel = sidebar.querySelector('#sidebar-mode-label');

    // Prioritize the actual connected Account ID string from the SDK if available
    const displayId = store.state.ownerAccountId
      ? store.state.ownerAccountId.toString()
      : (store.state.owner.full || store.state.owner.prefix);

    if (walletId) walletId.textContent = store.formatAccountId({ full: displayId, prefix: displayId.slice(0, 10), suffix: displayId.slice(-8) });

    if (badgeDot) {
      if (store.state.connecting) {
        badgeDot.className = 'wallet-badge-dot connecting';
      } else if (store.state.connected) {
        badgeDot.className = 'wallet-badge-dot connected';
      } else {
        badgeDot.className = 'wallet-badge-dot';
      }
    }

    if (modeLabel) {
      if (store.state.connecting) {
        modeLabel.textContent = 'Connecting...';
        modeLabel.style.color = 'var(--status-warning)';
      } else if (store.state.connected) {
        modeLabel.textContent = 'Miden Testnet';
        modeLabel.style.color = 'var(--accent-emerald)';
      } else {
        modeLabel.textContent = 'Demo Mode';
        modeLabel.style.color = 'var(--text-muted)';
      }
    }
  }

  updateFooter();
  store.subscribe(updateFooter);
}