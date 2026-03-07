/**
 * Login Page
 * Landing page for unauthenticated users featuring Social Login options.
 */

import store from '../store.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="login-page-wrapper">
      <div class="login-card card">
        <div class="login-header">
          <div class="login-logo-container">
            <div class="login-logo">🛡️</div>
          </div>
          <h1 class="login-title">Dead Man's Switch</h1>
          <p class="login-subtitle">Secure your crypto inheritance on Miden.</p>
        </div>

        <div class="login-methods">
          <button class="btn btn-social btn-google" id="btn-login-google">
            <svg class="social-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <button class="btn btn-social btn-apple" id="btn-login-apple">
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.308 15.652c-.628.29-1.341.442-2.152.442-1.849 0-3.136-.931-3.837-2.784-.131-.341-.219-.711-.264-1.121h6.632c-.068-1.554-.607-2.744-1.611-3.557-1.026-.826-2.315-1.246-3.84-1.246-1.579 0-2.894.46-3.916 1.349-1.001.874-1.517 2.083-1.517 3.633s.516 2.76 1.517 3.633c1.022.889 2.337 1.349 3.916 1.349 1.127 0 2.146-.226 3.065-.674.204-.101.32-.239.349-.408.032-.191-.045-.37-.222-.53-.18-.16-.391-.218-.636-.169-.161.032-.338.061-.53.085zm-2.479-5.118c1.063 0 1.938.318 2.625.961.439.406.862 1.054 1.157 2.057H9.284c.254-.954.673-1.614 1.25-2.003.553-.37 1.258-.567 2.126-.567zm-.724-1.631c-.502.508-1.066 1.022-1.693 1.536l-.612-.663c.638-.568 1.189-1.068 1.66-1.503.73-.679 1.166-1.218 1.314-1.613v-.004l1.01.272-1.679 1.975z"/>
            </svg>
            Continue with Apple
          </button>
          
          <div class="login-divider">
            <span>or</span>
          </div>
          
          <button class="btn btn-social btn-miden" id="btn-login-demo">
            ✨ Try Demo Mode
          </button>
        </div>
        
        <p class="login-footer">
          By connecting, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  `;

  // Simulated login handler that feels like a real OAuth popup flow
  const handleLogin = async (provider) => {
    const btns = container.querySelectorAll('.btn-social');

    // Disable all buttons to prevent double-clicks
    btns.forEach(b => {
      b.style.pointerEvents = 'none';
      b.style.opacity = '0.6';
    });

    // Add loading state to the clicked button
    const targetBtn = Array.from(btns).find(b => b.innerText.includes(provider) || b.id.includes(provider.toLowerCase()));
    if (targetBtn) {
      targetBtn.classList.add('loading-state');
      targetBtn.style.opacity = '1';
      targetBtn.innerHTML = `Connecting to ${provider}...`;
    }

    // Simulate OAuth redirect / authentication delay
    await new Promise(r => setTimeout(r, 2000));

    // Set a flag in local storage to simulate authentication
    localStorage.setItem('dms_authenticated', 'true');
    localStorage.setItem('dms_provider', provider);

    showToast(`Successfully authenticated via ${provider}`, 'success');
    navigate('/dashboard');
  };

  container.querySelector('#btn-login-google').addEventListener('click', () => handleLogin('Google'));
  container.querySelector('#btn-login-apple').addEventListener('click', () => handleLogin('Apple'));
  container.querySelector('#btn-login-demo').addEventListener('click', () => handleLogin('Demo Mode'));
}
