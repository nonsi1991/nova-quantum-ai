/**
 * Nova Quantum AI Platform - Notifications
 * Toast notification system with auto-dismiss and queue
 */

import state from './state.js';
import { randomId } from './utils.js';

// Toast types → styling
const TYPE_META = {
    success: { icon: '✅', css: 'toast-success' },
    error:   { icon: '❌', css: 'toast-error'   },
    warning: { icon: '⚠️',  css: 'toast-warning' },
    info:    { icon: 'ℹ️',  css: 'toast-info'    },
    trade:   { icon: '💹', css: 'toast-trade'   }
};

class NotificationManager {
    constructor() {
        this.container = null;
        this.MAX_VISIBLE = 5;
        this._ensureContainer();
    }

    _ensureContainer() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._createContainer());
        } else {
            this._createContainer();
        }
    }

    _createContainer() {
        if (document.getElementById('toast-container')) return;
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');
        // Positioned in top-right via CSS (or inline fallback)
        Object.assign(this.container.style, {
            position:  'fixed',
            top:       '1rem',
            right:     '1rem',
            zIndex:    '9999',
            display:   'flex',
            flexDirection: 'column',
            gap:       '0.5rem',
            maxWidth:  '360px',
            width:     '100%'
        });
        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     * @param {string} message   Display text
     * @param {'success'|'error'|'warning'|'info'|'trade'} type
     * @param {number} duration  Auto-dismiss in ms (0 = sticky)
     * @returns {string}         Notification ID
     */
    show(message, type = 'info', duration = 5000) {
        if (!this.container) this._createContainer();

        const id   = randomId();
        const meta = TYPE_META[type] || TYPE_META.info;

        const toast = document.createElement('div');
        toast.id = `toast-${id}`;
        toast.className = `toast ${meta.css}`;
        toast.setAttribute('role', 'alert');

        // Inline base styles (CSS class overrides if stylesheet is loaded)
        Object.assign(toast.style, {
            display:      'flex',
            alignItems:   'flex-start',
            gap:          '0.5rem',
            background:   this._bgColor(type),
            color:        '#fff',
            borderRadius: '0.5rem',
            padding:      '0.75rem 1rem',
            fontSize:     '0.875rem',
            boxShadow:    '0 4px 12px rgba(0,0,0,0.3)',
            opacity:      '0',
            transform:    'translateX(110%)',
            transition:   'opacity 0.25s, transform 0.25s',
            pointerEvents: 'all',
            cursor:       'pointer'
        });

        toast.innerHTML = `
            <span class="toast-icon" style="font-size:1rem;flex-shrink:0;">${meta.icon}</span>
            <span class="toast-message" style="flex:1;line-height:1.4;">${this._escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close" style="
                background:none;border:none;color:inherit;cursor:pointer;
                font-size:1rem;padding:0;flex-shrink:0;opacity:0.7;
            ">✕</button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => this.dismiss(id));
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('toast-close')) this.dismiss(id);
        });

        // Limit visible toasts
        const existing = this.container.children;
        if (existing.length >= this.MAX_VISIBLE) {
            const oldest = existing[0];
            if (oldest?.id) this.dismiss(oldest.id.replace('toast-', ''));
        }

        this.container.appendChild(toast);

        // Track in state
        state.push('ui.notifications', { id, message, type, timestamp: Date.now() });

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.opacity   = '1';
                toast.style.transform = 'translateX(0)';
            });
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Dismiss a specific toast by ID
     */
    dismiss(id) {
        const toast = document.getElementById(`toast-${id}`);
        if (!toast) return;

        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(110%)';

        setTimeout(() => toast.remove(), 300);

        // Remove from state
        const notifications = state.get('ui.notifications', []);
        state.set('ui.notifications', notifications.filter(n => n.id !== id));
    }

    /**
     * Dismiss all visible toasts
     */
    dismissAll() {
        if (!this.container) return;
        const toasts = [...this.container.children];
        toasts.forEach(t => this.dismiss(t.id.replace('toast-', '')));
    }

    _bgColor(type) {
        return {
            success: '#10b981',
            error:   '#ef4444',
            warning: '#f59e0b',
            info:    '#3b82f6',
            trade:   '#8b5cf6'
        }[type] || '#6b7280';
    }

    _escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

const manager = new NotificationManager();

// Named exports for direct use
export function showNotification(message, type = 'info', duration = 5000) {
    return manager.show(message, type, duration);
}

export function dismissNotification(id) {
    manager.dismiss(id);
}

export function dismissAllNotifications() {
    manager.dismissAll();
}

export default manager;
