/**
 * Dead Man's Switch — Main Entry Point
 * Initializes the app: sidebar, router, and default page
 */

import './styles/index.css';
import { registerRoute, initRouter } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSetup } from './pages/setup.js';
import { renderActivity } from './pages/activity.js';
import { renderClaim } from './pages/claim.js';
import { renderLogin } from './pages/login.js';

// Initialize app
function init() {
    const app = document.getElementById('app');
    app.className = 'app-layout';

    // Render sidebar (hidden on login)
    renderSidebar(app);

    // Create main content area
    const main = document.createElement('main');
    main.id = 'page-content';
    main.className = 'main-content';

    // Toggle sidebar visibility based on auth
    window.addEventListener('hashchange', () => {
        const isAuth = !!localStorage.getItem('dms_authenticated');
        document.getElementById('sidebar').style.display = isAuth ? 'flex' : 'none';
        const mobileHeader = document.querySelector('.mobile-header');
        if (mobileHeader) mobileHeader.style.display = isAuth ? '' : 'none';
        // Use a class instead of inline style so CSS media queries can override on mobile
        if (isAuth) {
            main.classList.add('has-sidebar');
            main.style.marginLeft = ''; // Allow CSS to take over
        } else {
            main.classList.remove('has-sidebar');
            main.style.marginLeft = '0';
        }
    });

    app.appendChild(main);

    // Register routes
    registerRoute('/login', renderLogin);
    registerRoute('/dashboard', renderDashboard);
    registerRoute('/setup', renderSetup);
    registerRoute('/activity', renderActivity);
    registerRoute('/claim', renderClaim);

    // Start router
    initRouter('#page-content');
}

// Go
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
