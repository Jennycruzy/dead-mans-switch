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

// Initialize app
function init() {
    const app = document.getElementById('app');
    app.className = 'app-layout';

    // Render sidebar
    renderSidebar(app);

    // Create main content area
    const main = document.createElement('main');
    main.id = 'page-content';
    main.className = 'main-content';
    app.appendChild(main);

    // Register routes
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
