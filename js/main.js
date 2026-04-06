/**
 * Nova Quantum AI Platform - Main Entry Point
 * Bootstraps all modules and wires up the application
 */

import auth from './auth.js';
import state from './state.js';
import wsManager from './websocket.js';
import charts from './charts.js';
import { showNotification } from './notifications.js';

// Determine which page we're on
const PAGE = document.body.dataset.page || 'unknown';

// ──────────────────────────────────────────
// Global error boundary
// ──────────────────────────────────────────

window.addEventListener('error', (ev) => {
    console.error('[Global] Unhandled error:', ev.error);
    showNotification('An unexpected error occurred.', 'error');
});

window.addEventListener('unhandledrejection', (ev) => {
    console.error('[Global] Unhandled promise rejection:', ev.reason);
    // Don't spam notifications for auth errors (handled elsewhere)
    if (ev.reason?.message !== 'Authentication required') {
        showNotification('An unexpected error occurred.', 'error');
    }
    ev.preventDefault();
});

// ──────────────────────────────────────────
// Auth guard
// ──────────────────────────────────────────

function requireAuth() {
    if (!auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function redirectIfAuth() {
    if (auth.isAuthenticated()) {
        window.location.href = '/dashboard.html';
        return true;
    }
    return false;
}

// ──────────────────────────────────────────
// Page bootstrappers
// ──────────────────────────────────────────

async function initLoginPage() {
    // Redirect if already logged in
    if (redirectIfAuth()) return;

    const { wireLoginForm } = await import('./auth.js');
    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        wireLoginForm(loginForm);
    }

    if (registerForm) {
        const { wireRegisterForm } = await import('./auth.js');
        wireRegisterForm(registerForm);
    }

    // Tab switching between login/register
    document.querySelectorAll('[data-auth-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.authTab;
            document.querySelectorAll('[data-auth-panel]').forEach(panel => {
                panel.style.display = panel.dataset.authPanel === target ? '' : 'none';
            });
            document.querySelectorAll('[data-auth-tab]').forEach(t => {
                t.classList.toggle('active', t.dataset.authTab === target);
            });
        });
    });
}

async function initDashboardPage() {
    if (!requireAuth()) return;

    // Validate token server-side once on load
    try {
        await auth.fetchCurrentUser();
    } catch {
        // fetchCurrentUser already handles logout
        return;
    }

    // Connect WebSocket
    wsManager.connect();

    // Dashboard module self-initializes via its own DOMContentLoaded handler
    // (imported lazily to keep login page lean)
    await import('./dashboard.js');
}

// ──────────────────────────────────────────
// Boot
// ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    switch (PAGE) {
        case 'login':
        case 'register':
            await initLoginPage();
            break;

        case 'dashboard':
            await initDashboardPage();
            break;

        default:
            // Generic pages: just check auth status
            if (document.getElementById('login-form')) {
                await initLoginPage();
            } else if (document.getElementById('dashboard-root')) {
                await initDashboardPage();
            }
    }
});

// Expose for browser console debugging
window.__nova = { auth, state, wsManager, charts };
