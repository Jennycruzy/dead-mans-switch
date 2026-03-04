/**
 * Countdown ring SVG component
 */

export function createCountdownRing(container, store) {
    const radius = 120;
    const circumference = 2 * Math.PI * radius;

    const wrapper = document.createElement('div');
    wrapper.className = 'countdown-container';

    wrapper.innerHTML = `
    <div class="countdown-ring">
      <svg viewBox="0 0 280 280">
        <circle class="countdown-ring-bg" cx="140" cy="140" r="${radius}" />
        <circle
          class="countdown-ring-progress"
          id="countdown-progress"
          cx="140" cy="140" r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="0"
          stroke="var(--accent-emerald)"
        />
      </svg>
      <div class="countdown-center">
        <div class="countdown-time" id="countdown-time">--:--:--</div>
        <div class="countdown-label" id="countdown-label">Time Remaining</div>
        <div class="countdown-sub" id="countdown-sub"></div>
      </div>
    </div>
  `;

    container.appendChild(wrapper);

    const progressEl = wrapper.querySelector('#countdown-progress');
    const timeEl = wrapper.querySelector('#countdown-time');
    const labelEl = wrapper.querySelector('#countdown-label');
    const subEl = wrapper.querySelector('#countdown-sub');

    function update() {
        const status = store.getStatus();
        const progress = store.getProgress();
        const remaining = store.getTimeRemaining();

        // Update ring
        const offset = circumference * (1 - progress);
        progressEl.style.strokeDashoffset = offset;

        // Color based on status
        if (status === 'expired' || status === 'claimed') {
            progressEl.style.stroke = 'var(--status-expired)';
            progressEl.style.filter = 'drop-shadow(0 0 8px var(--status-expired-glow))';
        } else if (status === 'warning') {
            progressEl.style.stroke = 'var(--status-warning)';
            progressEl.style.filter = 'drop-shadow(0 0 8px var(--status-warning-glow))';
        } else {
            progressEl.style.stroke = 'var(--accent-emerald)';
            progressEl.style.filter = 'drop-shadow(0 0 8px var(--accent-emerald-glow))';
        }

        // Update time display
        if (status === 'claimed') {
            timeEl.textContent = 'CLAIMED';
            timeEl.style.fontSize = '1.8rem';
            timeEl.style.color = 'var(--status-claimed)';
            labelEl.textContent = 'Funds transferred';
            subEl.textContent = '';
        } else if (status === 'expired') {
            timeEl.textContent = 'EXPIRED';
            timeEl.style.fontSize = '1.8rem';
            timeEl.style.color = 'var(--status-expired)';
            labelEl.textContent = 'Switch triggered';
            subEl.textContent = 'Beneficiary can claim';
        } else {
            const pad = (n) => n.toString().padStart(2, '0');
            if (remaining.days > 0) {
                timeEl.textContent = `${remaining.days}d ${pad(remaining.hours)}h`;
            } else {
                timeEl.textContent = `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;
            }
            timeEl.style.fontSize = '2.5rem';
            timeEl.style.color = status === 'warning' ? 'var(--status-warning)' : 'var(--text-primary)';
            labelEl.textContent = 'Until switch triggers';
            subEl.textContent = `Block ${store.state.currentBlock.toLocaleString()}`;
        }
    }

    return { update, element: wrapper };
}
