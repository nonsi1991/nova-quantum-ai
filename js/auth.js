/**
 * Nova Quantum AI Platform - Authentication Module
 * Handles login, registration, JWT management, auto-refresh
 */

import api from './api.js';
import state from './state.js';
import { showNotification } from './notifications.js';
import { validateEmail, validatePassword, sanitizeInput } from './utils.js';

class AuthManager {
    constructor() {
        this.refreshTimerID = null;
        this.REFRESH_MARGIN_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
        this._init();
    }

    _init() {
        // Listen for unauthorized events from API client
        document.addEventListener('auth:unauthorized', () => this.logout());

        // If there's a stored token on page load, schedule refresh
        const token = this.getToken();
        if (token && !this.isTokenExpired(token)) {
            this._scheduleRefresh(token);
            this._hydrateUserFromStorage();
        }
    }

    // ──────────────────────────────────────────
    // Token helpers
    // ──────────────────────────────────────────

    getToken() {
        return localStorage.getItem('jwt_token');
    }

    setToken(token) {
        localStorage.setItem('jwt_token', token);
        this._scheduleRefresh(token);
    }

    removeToken() {
        localStorage.removeItem('jwt_token');
        if (this.refreshTimerID) {
            clearTimeout(this.refreshTimerID);
            this.refreshTimerID = null;
        }
    }

    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return Date.now() >= payload.exp * 1000;
        } catch {
            return true;
        }
    }

    getTokenPayload(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch {
            return null;
        }
    }

    isAuthenticated() {
        const token = this.getToken();
        return !!token && !this.isTokenExpired(token);
    }

    // ──────────────────────────────────────────
    // Auto-refresh scheduler
    // ──────────────────────────────────────────

    _scheduleRefresh(token) {
        if (this.refreshTimerID) clearTimeout(this.refreshTimerID);

        const payload = this.getTokenPayload(token);
        if (!payload) return;

        const expiresAt = payload.exp * 1000;
        const refreshAt  = expiresAt - this.REFRESH_MARGIN_MS;
        const delay      = refreshAt - Date.now();

        if (delay <= 0) {
            // Already in the danger zone – refresh immediately
            this._doRefresh();
            return;
        }

        this.refreshTimerID = setTimeout(() => this._doRefresh(), delay);
    }

    async _doRefresh() {
        const token = this.getToken();
        if (!token) return;

        try {
            const data = await api.post('/auth/refresh', { token });
            if (data?.token) {
                this.setToken(data.token);
                document.dispatchEvent(new CustomEvent('auth:token-refreshed'));
            }
        } catch (err) {
            console.warn('Token refresh failed, logging out:', err.message);
            this.logout();
        }
    }

    // ──────────────────────────────────────────
    // User helpers
    // ──────────────────────────────────────────

    _hydrateUserFromStorage() {
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                state.set('user', JSON.parse(raw));
            }
        } catch { /* malformed JSON – ignore */ }
    }

    _persistUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
        state.set('user', user);
    }

    _clearUser() {
        localStorage.removeItem('user');
        state.set('user', null);
    }

    // ──────────────────────────────────────────
    // Public auth actions
    // ──────────────────────────────────────────

    /**
     * Register a new account
     * @param {string} email
     * @param {string} password
     * @param {string} fullName
     */
    async register(email, password, fullName) {
        // Client-side validation
        const errors = [];
        if (!validateEmail(email))         errors.push('Please enter a valid email address.');
        if (!validatePassword(password))   errors.push('Password must be at least 8 characters with a number and letter.');
        if (!fullName || fullName.trim().length < 2) errors.push('Full name must be at least 2 characters.');
        if (errors.length) throw new Error(errors.join(' '));

        state.set('ui.loading', true);
        try {
            const data = await api.post('/auth/register', {
                email:     sanitizeInput(email.toLowerCase()),
                password,
                full_name: sanitizeInput(fullName.trim())
            });

            this.setToken(data.token);
            this._persistUser(data.user);

            document.dispatchEvent(new CustomEvent('auth:registered', { detail: data.user }));
            showNotification('Account created! Welcome aboard 🚀', 'success');
            return data;
        } finally {
            state.set('ui.loading', false);
        }
    }

    /**
     * Login with email + password
     */
    async login(email, password) {
        const errors = [];
        if (!validateEmail(email))     errors.push('Please enter a valid email address.');
        if (!password || password.length < 1) errors.push('Password is required.');
        if (errors.length) throw new Error(errors.join(' '));

        state.set('ui.loading', true);
        try {
            const data = await api.post('/auth/login', {
                email:    sanitizeInput(email.toLowerCase()),
                password
            });

            this.setToken(data.token);
            this._persistUser(data.user);

            document.dispatchEvent(new CustomEvent('auth:logged-in', { detail: data.user }));
            showNotification(`Welcome back, ${data.user.full_name || data.user.email}!`, 'success');
            return data;
        } finally {
            state.set('ui.loading', false);
        }
    }

    /**
     * Fetch current user from backend (used to validate stored token)
     */
    async fetchCurrentUser() {
        try {
            const user = await api.get('/auth/me');
            this._persistUser(user);
            return user;
        } catch (err) {
            // Token invalid server-side
            this.logout();
            return null;
        }
    }

    /**
     * Logout – clear everything and redirect
     */
    logout() {
        this.removeToken();
        this._clearUser();
        state.reset();

        document.dispatchEvent(new CustomEvent('auth:logged-out'));
        showNotification('Logged out successfully.', 'info');

        // Redirect after a brief moment so the notification is visible
        setTimeout(() => {
            if (window.location.pathname !== '/login.html') {
                window.location.href = '/login.html';
            }
        }, 800);
    }
}

// ──────────────────────────────────────────
// Form helpers (wired up from dashboard / login HTML)
// ──────────────────────────────────────────

export function wireLoginForm(formEl) {
    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormErrors(formEl);

        const email    = formEl.querySelector('[name="email"]')?.value || '';
        const password = formEl.querySelector('[name="password"]')?.value || '';
        const btn      = formEl.querySelector('[type="submit"]');

        try {
            setButtonLoading(btn, true);
            await auth.login(email, password);
            window.location.href = '/dashboard.html';
        } catch (err) {
            showFormError(formEl, err.message);
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

export function wireRegisterForm(formEl) {
    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormErrors(formEl);

        const email    = formEl.querySelector('[name="email"]')?.value || '';
        const password = formEl.querySelector('[name="password"]')?.value || '';
        const fullName = formEl.querySelector('[name="full_name"]')?.value || '';
        const btn      = formEl.querySelector('[type="submit"]');

        try {
            setButtonLoading(btn, true);
            await auth.register(email, password, fullName);
            window.location.href = '/dashboard.html';
        } catch (err) {
            showFormError(formEl, err.message);
        } finally {
            setButtonLoading(btn, false);
        }
    });
}

function showFormError(formEl, message) {
    let errEl = formEl.querySelector('.form-error');
    if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'form-error text-red-400 text-sm mt-2';
        formEl.appendChild(errEl);
    }
    errEl.textContent = message;
}

function clearFormErrors(formEl) {
    const errEl = formEl.querySelector('.form-error');
    if (errEl) errEl.textContent = '';
}

function setButtonLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Loading…' : btn.dataset.originalText;
}

// Singleton
const auth = new AuthManager();
export default auth;
