/**
 * Nova Quantum AI Platform - State Management
 * Lightweight reactive state store with event-driven updates
 */

class StateManager {
    constructor() {
        this._state = {
            user:        null,        // Current user object
            bot:         null,        // Bot status / config
            trades:      [],          // Recent trades
            marketData:  {},          // Current market prices
            performance: null,        // Bot performance metrics
            ui: {
                loading:       false,
                notifications: [],
                activeTab:     'overview',
                chartPeriod:   '1h',
                errors:        {}
            }
        };

        this._listeners = new Map(); // key → Set<callback>
        this._wildcardListeners = new Set();

        // Persist select keys across page loads
        this._persistKeys = ['user'];
        this._loadPersisted();
    }

    // ──────────────────────────────────────────
    // Persistence
    // ──────────────────────────────────────────

    _loadPersisted() {
        for (const key of this._persistKeys) {
            try {
                const raw = localStorage.getItem(`state_${key}`);
                if (raw) this._state[key] = JSON.parse(raw);
            } catch { /* ignore */ }
        }
    }

    _maybePersist(key) {
        if (this._persistKeys.includes(key)) {
            try {
                localStorage.setItem(`state_${key}`, JSON.stringify(this._state[key]));
            } catch { /* storage full – ignore */ }
        }
    }

    // ──────────────────────────────────────────
    // Core read/write
    // ──────────────────────────────────────────

    /**
     * Get a value by dot-path, e.g. "ui.loading"
     */
    get(path, defaultValue = undefined) {
        const parts = path.split('.');
        let current = this._state;
        for (const part of parts) {
            if (current == null || typeof current !== 'object') return defaultValue;
            current = current[part];
        }
        return current !== undefined ? current : defaultValue;
    }

    /**
     * Set a value by dot-path. Triggers listeners.
     * @param {string} path  Dot-separated path e.g. "bot.status"
     * @param {*}      value New value
     */
    set(path, value) {
        const parts = path.split('.');
        const topKey = parts[0];
        let current = this._state;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current[part] == null || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }

        const lastKey = parts[parts.length - 1];
        const oldValue = current[lastKey];

        if (oldValue === value) return; // No change – skip

        current[lastKey] = value;
        this._maybePersist(topKey);
        this._emit(path, value, oldValue);
        this._emit('*', { path, value, oldValue });
    }

    /**
     * Merge an object into a state path (shallow merge)
     */
    merge(path, patch) {
        const existing = this.get(path);
        const merged   = typeof existing === 'object' && existing !== null
            ? { ...existing, ...patch }
            : patch;
        this.set(path, merged);
    }

    /**
     * Append an item to an array at path
     */
    push(path, item) {
        const arr = this.get(path, []);
        this.set(path, [...arr, item]);
    }

    /**
     * Reset to initial state (called on logout)
     */
    reset() {
        const fresh = {
            user:        null,
            bot:         null,
            trades:      [],
            marketData:  {},
            performance: null,
            ui: {
                loading:       false,
                notifications: [],
                activeTab:     'overview',
                chartPeriod:   '1h',
                errors:        {}
            }
        };
        this._state = fresh;
        for (const key of this._persistKeys) {
            localStorage.removeItem(`state_${key}`);
        }
        this._emit('*', { path: 'reset', value: null, oldValue: null });
    }

    // ──────────────────────────────────────────
    // Event system
    // ──────────────────────────────────────────

    /**
     * Subscribe to state changes at a path (or '*' for all)
     * @returns  Unsubscribe function
     */
    subscribe(path, callback) {
        if (path === '*') {
            this._wildcardListeners.add(callback);
            return () => this._wildcardListeners.delete(callback);
        }

        if (!this._listeners.has(path)) {
            this._listeners.set(path, new Set());
        }
        this._listeners.get(path).add(callback);
        return () => this._listeners.get(path).delete(callback);
    }

    _emit(path, value, oldValue) {
        if (path === '*') {
            for (const cb of this._wildcardListeners) {
                try { cb(value); } catch (e) { console.error('State listener error:', e); }
            }
            return;
        }

        const listeners = this._listeners.get(path);
        if (listeners) {
            for (const cb of listeners) {
                try { cb(value, oldValue); } catch (e) { console.error('State listener error:', e); }
            }
        }
    }
}

const state = new StateManager();
export default state;
