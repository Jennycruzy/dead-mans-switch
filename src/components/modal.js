/**
 * Modal dialog component
 */

export function showModal({ title, content, actions }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
    <h3 class="modal-title">${title}</h3>
    <div class="modal-body">${content}</div>
    <div class="modal-actions" id="modal-actions"></div>
  `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const actionsContainer = modal.querySelector('#modal-actions');

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = `btn ${action.class || 'btn-ghost'}`;
        btn.textContent = action.label;
        btn.addEventListener('click', () => {
            if (action.onClick) action.onClick();
            closeModal();
        });
        actionsContainer.appendChild(btn);
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Close on Escape
    const onKey = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
}
