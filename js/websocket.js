/**
 * Nova Quantum AI Platform - WebSocket Manager
 * Manages WS connection, auto-reconnect, message routing
 */

import state from './state.js';
import { showNotification } from './notifications.js';

const WS_URL           = 'ws://localhost:8000/ws';
const HEARTBEAT_INTERVAL = 25_000; // 25s ping
const MAX_RECONNECT_DELAY = 30_000; // cap backoff at 30s
const MAX_RECONNECT_ATTEMPTS = 10;

class WebSocketManager {
    constructor() {
        this.ws               = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer    = null;
        this.heartbeatTimer    = null;
        this.isConnected       = false;
        this.shouldConnect     = false; // set to true after login
        this._handlers         = new Map(); // type → Set<fn>
    }

    // ──────────────────────────────────────────
    // Connection lifecycle
    // ──────────────────────────────────────────

    connect() {
        if (this.isConnected || this.ws?.readyState === WebSocket.CONNECTING) return;
        this.shouldConnect = true;

        const token = localStorage.getItem('jwt_token');
        const url   = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;

        try {
            this.ws = new WebSocket(url);
        } catch (err) {
            console.error('[WS] Failed to create WebSocket:', err);
            this._scheduleReconnect();
            return;
        }

        this.ws.addEventListener('open',    () => this._onOpen());
        this.ws.addEventListener('message', (ev) => this._onMessage(ev));
        this.ws.addEventListener('close',   (ev) => this._onClose(ev));
        this.ws.addEventListener('error',   (ev) => this._onError(ev));
    }

    disconnect() {
        this.shouldConnect = false;
        this._clearTimers();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.isConnected = false;
        state.set('ui.wsConnected', false);
    }

    send(type, payload = {}) {
        if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Cannot send – not connected. type:', type);
            return false;
        }
        try {
            this.ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
            return true;
        } catch (err) {
            console.error('[WS] Send error:', err);
            return false;
        }
    }

    // ──────────────────────────────────────────
    // Subscribe / unsubscribe to message types
    // ──────────────────────────────────────────

    on(type, handler) {
        if (!this._handlers.has(type)) this._handlers.set(type, new Set());
        this._handlers.get(type).add(handler);
        return () => this.off(type, handler); // returns unsubscribe fn
    }

    off(type, handler) {
        this._handlers.get(type)?.delete(handler);
    }

    // ──────────────────────────────────────────
    // Internal event handlers
    // ──────────────────────────────────────────

    _onOpen() {
        console.log('[WS] Connected');
        this.isConnected       = true;
        this.reconnectAttempts = 0;
        state.set('ui.wsConnected', true);

        // Authenticate over WS if backend expects it
        const token = localStorage.getItem('jwt_token');
        if (token) this.send('auth', { token });

        // Subscribe to bot + market feeds
        this.send('subscribe', { channels: ['bot_updates', 'market_data', 'trades'] });

        this._startHeartbeat();
        document.dispatchEvent(new CustomEvent('ws:connected'));
    }

    _onMessage(ev) {
        let msg;
        try {
            msg = JSON.parse(ev.data);
        } catch {
            console.warn('[WS] Non-JSON message:', ev.data);
            return;
        }

        const { type, payload } = msg;

        // Route to registered handlers
        if (this._handlers.has(type)) {
            for (const fn of this._handlers.get(type)) {
                try { fn(payload, msg); } catch (e) { console.error('[WS] Handler error:', e); }
            }
        }

        // Handle special internal types
        switch (type) {
            case 'bot_update':
                this._handleBotUpdate(payload);
                break;
            case 'market_data':
                this._handleMarketData(payload);
                break;
            case 'trade_executed':
                this._handleTradeExecuted(payload);
                break;
            case 'pong':
                // Heartbeat reply – all good
                break;
            case 'error':
                console.error('[WS] Server error:', payload?.message);
                showNotification(payload?.message || 'WebSocket error from server', 'error');
                break;
        }
    }

    _onClose(ev) {
        console.warn(`[WS] Closed – code: ${ev.code}, reason: ${ev.reason}`);
        this.isConnected = false;
        state.set('ui.wsConnected', false);
        this._clearTimers();
        document.dispatchEvent(new CustomEvent('ws:disconnected'));

        if (this.shouldConnect && ev.code !== 1000) {
            this._scheduleReconnect();
        }
    }

    _onError(ev) {
        console.error('[WS] Error:', ev);
        // onClose will fire after this; reconnect is handled there
    }

    // ──────────────────────────────────────────
    // Reconnection logic (exponential backoff)
    // ──────────────────────────────────────────

    _scheduleReconnect() {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[WS] Max reconnect attempts reached');
            showNotification('Real-time connection lost. Please refresh the page.', 'error', 0);
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), MAX_RECONNECT_DELAY);
        this.reconnectAttempts++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            if (this.shouldConnect) this.connect();
        }, delay);
    }

    // ──────────────────────────────────────────
    // Heartbeat (keepalive ping)
    // ──────────────────────────────────────────

    _startHeartbeat() {
        this._clearHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { ts: Date.now() });
            }
        }, HEARTBEAT_INTERVAL);
    }

    _clearHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    _clearTimers() {
        this._clearHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ──────────────────────────────────────────
    // Built-in message handlers → update state
    // ──────────────────────────────────────────

    _handleBotUpdate(payload) {
        if (!payload) return;
        state.merge('bot', payload);
        document.dispatchEvent(new CustomEvent('bot:updated', { detail: payload }));
    }

    _handleMarketData(payload) {
        if (!payload) return;
        // payload expected: { BTC: { price, change_24h, volume }, ... }
        const current = state.get('marketData', {});
        state.set('marketData', { ...current, ...payload });
        document.dispatchEvent(new CustomEvent('market:updated', { detail: payload }));
    }

    _handleTradeExecuted(payload) {
        if (!payload) return;
        // Prepend to trades list, keep last 100
        const trades = state.get('trades', []);
        state.set('trades', [payload, ...trades].slice(0, 100));

        const side   = payload.side === 'buy' ? '🟢 BUY' : '🔴 SELL';
        const amount = payload.amount ? `${payload.amount} ${payload.symbol || ''}` : '';
        showNotification(`Trade: ${side} ${amount} @ ${payload.price ?? ''}`, 'trade', 7000);

        document.dispatchEvent(new CustomEvent('trade:executed', { detail: payload }));
    }
}

const wsManager = new WebSocketManager();

// Auto-connect when user is authenticated; auto-disconnect on logout
document.addEventListener('auth:logged-in',   () => wsManager.connect());
document.addEventListener('auth:registered',  () => wsManager.connect());
document.addEventListener('auth:logged-out',  () => wsManager.disconnect());
document.addEventListener('auth:unauthorized',() => wsManager.disconnect());

export default wsManager;
