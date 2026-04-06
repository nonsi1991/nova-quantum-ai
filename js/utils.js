/**
 * Nova Quantum AI Platform - Utilities
 * Shared helper functions used across modules
 */

// ──────────────────────────────────────────
// Validation
// ──────────────────────────────────────────

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * Password must be ≥ 8 chars and contain at least one letter and one digit
 */
export function validatePassword(password) {
    return typeof password === 'string'
        && password.length >= 8
        && /[a-zA-Z]/.test(password)
        && /[0-9]/.test(password);
}

// ──────────────────────────────────────────
// Sanitization
// ──────────────────────────────────────────

/**
 * Strip HTML tags from user-supplied strings to prevent XSS
 */
export function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"'&]/g, (c) => ({
        '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '&': '&amp;'
    })[c]);
}

// ──────────────────────────────────────────
// Formatting
// ──────────────────────────────────────────

/**
 * Format a number as currency: 1234.5 → "$1,234.50"
 */
export function formatCurrency(value, currency = 'USD') {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('en-US', {
        style:                 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

/**
 * Format a percentage: 0.12 → "+12.00%"
 */
export function formatPercent(value, decimals = 2) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    const sign = num > 0 ? '+' : '';
    return `${sign}${(num * 100).toFixed(decimals)}%`;
}

/**
 * Format a large number with K/M/B suffix
 */
export function formatCompactNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
}

/**
 * Format a Unix timestamp (seconds) to local date-time string
 */
export function formatTimestamp(ts) {
    if (!ts) return '-';
    const date = ts > 1e10 ? new Date(ts) : new Date(ts * 1000); // ms vs s
    return date.toLocaleString();
}

/**
 * Format milliseconds to human-readable duration: "2h 15m"
 */
export function formatDuration(ms) {
    if (!ms || ms < 0) return '-';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ──────────────────────────────────────────
// DOM helpers
// ──────────────────────────────────────────

/**
 * Shorthand for document.querySelector
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * Shorthand for document.querySelectorAll (returns array)
 */
export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/**
 * Set element text safely (no XSS)
 */
export function setText(selector, text, parent = document) {
    const el = typeof selector === 'string' ? $(selector, parent) : selector;
    if (el) el.textContent = text ?? '-';
}

/**
 * Toggle a CSS class on an element
 */
export function toggleClass(el, className, force) {
    if (!el) return;
    el.classList.toggle(className, force);
}

/**
 * Show/hide an element (display none)
 */
export function setVisible(el, visible) {
    if (!el) return;
    el.style.display = visible ? '' : 'none';
}

// ──────────────────────────────────────────
// Timing helpers
// ──────────────────────────────────────────

/**
 * Debounce: only fire after `delay` ms of silence
 */
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Throttle: fire at most once per `limit` ms
 */
export function throttle(fn, limit = 250) {
    let lastCall = 0;
    return (...args) => {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            fn(...args);
        }
    };
}

/**
 * Sleep for `ms` milliseconds (async)
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────
// Misc
// ──────────────────────────────────────────

/**
 * Deep clone a plain object/array
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a short random ID (not crypto-secure, for UI only)
 */
export function randomId() {
    return Math.random().toString(36).slice(2, 9);
}

/**
 * Map bot status string to display label + CSS class
 */
export function botStatusMeta(status) {
    const map = {
        running:  { label: 'Running',  css: 'status-running',  icon: '▶' },
        paused:   { label: 'Paused',   css: 'status-paused',   icon: '⏸' },
        stopped:  { label: 'Stopped',  css: 'status-stopped',  icon: '⏹' },
        starting: { label: 'Starting…', css: 'status-starting', icon: '⏳' },
        error:    { label: 'Error',    css: 'status-error',    icon: '⚠' }
    };
    return map[status] || { label: status ?? 'Unknown', css: 'status-unknown', icon: '?' };
}
