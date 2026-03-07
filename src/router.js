/**
 * Dead Man's Switch — Hash Router
 * Simple SPA router using hash-based navigation (#/dashboard, #/setup, etc.)
 */

const routes = {};
let currentCleanup = null;

export function registerRoute(path, renderFn) {
    routes[path] = renderFn;
}

export function navigate(path) {
    if (path !== '/login' && !localStorage.getItem('dms_authenticated')) {
        path = '/login';
    }
    window.location.hash = path;
}

export function getCurrentRoute() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    return hash;
}

export function initRouter(containerSelector) {
    const container = document.querySelector(containerSelector);

    function render() {
        const path = getCurrentRoute();
        const renderFn = routes[path] || routes['/dashboard'];

        // Cleanup previous page
        // Enforce auth
        if (path !== '/login' && !localStorage.getItem('dms_authenticated')) {
            navigate('/login');
            return;
        }

        if (currentCleanup && typeof currentCleanup === 'function') {
            currentCleanup();
            currentCleanup = null;
        }

        if (renderFn) {
            container.innerHTML = '';
            container.className = 'main-content fade-in';
            currentCleanup = renderFn(container);
        }

        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.dataset.route;
            link.classList.toggle('active', href === path);
        });
    }

    window.addEventListener('hashchange', render);

    // Initial render
    if (!window.location.hash || window.location.hash === '#/') {
        navigate(localStorage.getItem('dms_authenticated') ? '/dashboard' : '/login');
    } else {
        render();
    }
}
