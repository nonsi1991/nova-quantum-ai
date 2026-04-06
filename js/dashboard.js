/**
 * Nova Quantum AI Platform - Dashboard Logic
 * Bot management, risk profile selection, live status display
 */

import api from './api.js';
import state from './state.js';
import wsManager from './websocket.js';
import auth from './auth.js';
import { showNotification, dismissNotification } from './notifications.js';
import { setText, $, $$, formatCurrency, formatPercent, botStatusMeta, sleep } from './utils.js';

class Dashboard {
    constructor() {
        this.botId        = null;
        this._unsubscribers = [];
    }

    async init() {
        // Guard: must be authenticated
        if (!auth.isAuthenticated()) {
            window.location.href = '/login.html';
            return;
        }

        await this._loadInitialData();
        this._bindUI();
        this._subscribeToState();
        this._subscribeToWsEvents();
        this._renderAll();
    }

    // ──────────────────────────────────────────
    // Data loading
    // ──────────────────────────────────────────

    async _loadInitialData() {
        try {
            state.set('ui.loading', true);

            const [user, botData, marketData, trades] = await Promise.allSettled([
                api.get('/auth/me'),
                api.get('/bots/'),
                api.get('/trading/market-data'),
                api.get('/trading/trades')
            ]);

            if (user.status === 'fulfilled')      state.set('user', user.value);
            if (botData.status === 'fulfilled') {
                const bot = Array.isArray(botData.value) ? botData.value[0] : botData.value;
                state.set('bot', bot || null);
                this.botId = bot?.id || null;
            }
            if (marketData.status === 'fulfilled') state.set('marketData', marketData.value);
            if (trades.status === 'fulfilled')      state.set('trades',     trades.value?.trades || trades.value || []);

        } catch (err) {
            showNotification('Failed to load dashboard data.', 'error');
            console.error('[Dashboard] Init error:', err);
        } finally {
            state.set('ui.loading', false);
        }
    }

    // ──────────────────────────────────────────
    // UI Binding
    // ──────────────────────────────────────────

    _bindUI() {
        // Bot control buttons
        this._bindButton('#btn-start',  () => this._controlBot('start'));
        this._bindButton('#btn-pause',  () => this._controlBot('pause'));
        this._bindButton('#btn-resume', () => this._controlBot('resume'));
        this._bindButton('#btn-stop',   () => this._controlBot('stop'));

        // Risk profile buttons
        $$('[data-risk]').forEach(btn => {
            btn.addEventListener('click', () => this._selectRiskProfile(btn.dataset.risk));
        });

        // Logout button
        this._bindButton('#btn-logout', () => auth.logout());

        // Tab navigation
        $$('[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                state.set('ui.activeTab', tab.dataset.tab);
            });
        });
    }

    _bindButton(selector, handler) {
        const el = $(selector);
        if (!el) return;
        el.addEventListener('click', async () => {
            el.disabled = true;
            try {
                await handler();
            } finally {
                el.disabled = false;
            }
        });
    }

    // ──────────────────────────────────────────
    // State subscriptions
    // ──────────────────────────────────────────

    _subscribeToState() {
        this._unsubscribers.push(
            state.subscribe('bot',       (bot)       => this._renderBotStatus(bot)),
            state.subscribe('marketData',(md)        => this._renderMarketData(md)),
            state.subscribe('trades',    (trades)    => this._renderTrades(trades)),
            state.subscribe('user',      (user)      => this._renderUserInfo(user)),
            state.subscribe('ui.loading',(loading)   => this._renderLoadingState(loading)),
            state.subscribe('ui.activeTab', (tab)    => this._renderTabs(tab))
        );
    }

    _subscribeToWsEvents() {
        document.addEventListener('bot:updated',     (e) => this._renderBotStatus(e.detail));
        document.addEventListener('market:updated',  (e) => this._renderMarketData(e.detail));
        document.addEventListener('trade:executed',  (e) => this._renderLatestTrade(e.detail));
        document.addEventListener('ws:connected',    ()  => this._updateConnectionIndicator(true));
        document.addEventListener('ws:disconnected', ()  => this._updateConnectionIndicator(false));
    }

    // ──────────────────────────────────────────
    // Bot control actions
    // ──────────────────────────────────────────

    async _controlBot(action) {
        if (!this.botId) {
            showNotification('No bot found. Please create one first.', 'warning');
            return;
        }

        const validTransitions = {
            start:  ['stopped', 'paused', null],
            pause:  ['running'],
            resume: ['paused'],
            stop:   ['running', 'paused', 'starting']
        };

        const currentStatus = state.get('bot.status');
        const allowed = validTransitions[action] || [];

        if (!allowed.includes(currentStatus)) {
            showNotification(`Cannot ${action} bot in "${currentStatus}" state.`, 'warning');
            return;
        }

        try {
            state.set('ui.loading', true);
            const endpointMap = {
                start:  `/bots/${this.botId}/start`,
                pause:  `/bots/${this.botId}/pause`,
                resume: `/bots/${this.botId}/resume`,
                stop:   `/bots/${this.botId}/stop`
            };

            const result = await api.post(endpointMap[action]);
            state.merge('bot', result);

            const labels = { start: 'started', pause: 'paused', resume: 'resumed', stop: 'stopped' };
            showNotification(`Bot ${labels[action]} successfully.`, 'success');
        } catch (err) {
            showNotification(`Failed to ${action} bot: ${err.message}`, 'error');
        } finally {
            state.set('ui.loading', false);
        }
    }

    // ──────────────────────────────────────────
    // Risk profile selection
    // ──────────────────────────────────────────

    async _selectRiskProfile(profile) {
        const validProfiles = ['aggressive', 'medium', 'conservative'];
        if (!validProfiles.includes(profile)) return;
        if (!this.botId) {
            showNotification('No bot found.', 'warning');
            return;
        }

        const loadingId = showNotification('🤖 AI is configuring your bot…', 'info', 0);

        // Show loading state on all risk buttons
        $$('[data-risk]').forEach(btn => {
            btn.disabled = true;
            btn.classList.toggle('active', btn.dataset.risk === profile);
        });

        try {
            state.set('ui.loading', true);
            const result = await api.post(`/bots/${this.botId}/risk-profile`, { profile });
            state.merge('bot', result);

            // Dismiss loading notification, show success
            dismissNotification(loadingId);
            showNotification(`✅ Risk profile set to "${profile}". Bot is ready!`, 'success', 6000);
        } catch (err) {
            dismissNotification(loadingId);
            showNotification(`Failed to set risk profile: ${err.message}`, 'error');
            // Restore buttons
            $$('[data-risk]').forEach(btn => btn.classList.remove('active'));
        } finally {
            $$('[data-risk]').forEach(btn => { btn.disabled = false; });
            state.set('ui.loading', false);
        }
    }

    // ──────────────────────────────────────────
    // Render helpers
    // ──────────────────────────────────────────

    _renderAll() {
        this._renderBotStatus(state.get('bot'));
        this._renderMarketData(state.get('marketData'));
        this._renderTrades(state.get('trades', []));
        this._renderUserInfo(state.get('user'));
        this._renderTabs(state.get('ui.activeTab', 'overview'));
        this._updateConnectionIndicator(state.get('ui.wsConnected', false));
    }

    _renderBotStatus(bot) {
        if (!bot) {
            setText('#bot-status-label', 'No bot');
            setText('#bot-status-icon', '❓');
            this._updateBotButtons(null);
            return;
        }

        this.botId = bot.id || this.botId;

        const meta = botStatusMeta(bot.status);
        setText('#bot-status-label',   meta.label);
        setText('#bot-status-icon',    meta.icon);
        setText('#bot-profit',         formatCurrency(bot.total_profit));
        setText('#bot-profit-pct',     formatPercent(bot.profit_pct));
        setText('#bot-trades-count',   bot.total_trades ?? '-');
        setText('#bot-risk-profile',   bot.risk_profile ?? '-');
        setText('#bot-uptime',         bot.uptime ?? '-');

        const statusEl = $('#bot-status-label');
        if (statusEl) {
            statusEl.className = `bot-status ${meta.css}`;
        }

        // Highlight active risk button
        if (bot.risk_profile) {
            $$('[data-risk]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.risk === bot.risk_profile);
            });
        }

        this._updateBotButtons(bot.status);
    }

    _updateBotButtons(status) {
        const startEl  = $('#btn-start');
        const pauseEl  = $('#btn-pause');
        const resumeEl = $('#btn-resume');
        const stopEl   = $('#btn-stop');

        if (startEl)  startEl.disabled  = status === 'running' || status === 'starting';
        if (pauseEl)  pauseEl.disabled  = status !== 'running';
        if (resumeEl) resumeEl.disabled = status !== 'paused';
        if (stopEl)   stopEl.disabled   = status === 'stopped' || !status;
    }

    _renderMarketData(md) {
        if (!md) return;
        Object.entries(md).forEach(([symbol, data]) => {
            setText(`#price-${symbol}`,  formatCurrency(data.price));
            setText(`#change-${symbol}`, formatPercent(data.change_24h));
            const changeEl = $(`#change-${symbol}`);
            if (changeEl) {
                changeEl.className = `price-change ${data.change_24h >= 0 ? 'positive' : 'negative'}`;
            }
        });
    }

    _renderLatestTrade(trade) {
        if (!trade) return;
        const trades = state.get('trades', []);
        this._renderTrades(trades);
    }

    _renderTrades(trades) {
        const container = $('#trades-list');
        if (!container || !trades?.length) return;

        const rows = trades.slice(0, 20).map(t => `
            <tr class="trade-row trade-${t.side}">
                <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
                <td>${t.symbol ?? '-'}</td>
                <td class="${t.side === 'buy' ? 'text-green' : 'text-red'}">${(t.side ?? '').toUpperCase()}</td>
                <td>${formatCurrency(t.price)}</td>
                <td>${t.amount ?? '-'}</td>
                <td>${formatCurrency(t.pnl)}</td>
            </tr>
        `).join('');

        container.innerHTML = rows;
    }

    _renderUserInfo(user) {
        if (!user) return;
        setText('#user-name',  user.full_name || user.email || 'User');
        setText('#user-email', user.email     || '');
    }

    _renderLoadingState(loading) {
        const overlay = $('#loading-overlay');
        if (overlay) overlay.style.display = loading ? 'flex' : 'none';
    }

    _renderTabs(activeTab) {
        $$('[data-tab]').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === activeTab);
        });
        $$('[data-tab-panel]').forEach(panel => {
            panel.style.display = panel.dataset.tabPanel === activeTab ? '' : 'none';
        });
    }

    _updateConnectionIndicator(connected) {
        const dot  = $('#ws-indicator-dot');
        const text = $('#ws-indicator-text');
        if (dot)  dot.className  = `indicator-dot ${connected ? 'connected' : 'disconnected'}`;
        if (text) text.textContent = connected ? 'Live' : 'Offline';
    }

    destroy() {
        this._unsubscribers.forEach(fn => fn());
        this._unsubscribers = [];
    }
}

// Auto-init on DOMContentLoaded
const dashboard = new Dashboard();
document.addEventListener('DOMContentLoaded', () => dashboard.init());

export default dashboard;
