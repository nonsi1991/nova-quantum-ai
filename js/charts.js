/**
 * Nova Quantum AI Platform - Chart Updates
 * Lightweight chart rendering without external libs (Canvas 2D API)
 * Optionally enhances to Chart.js if it's available on the page
 */

import state from './state.js';
import { formatCurrency, formatPercent, debounce } from './utils.js';

/**
 * ChartManager wraps either Chart.js instances or a minimal Canvas2D fallback.
 */
class ChartManager {
    constructor() {
        this._charts     = new Map(); // id → chart instance or ctx
        this._data       = new Map(); // id → data array
        this._unsubscribe = null;
        this._hasChartJs  = typeof window !== 'undefined' && typeof window.Chart !== 'undefined';
    }

    init() {
        // Subscribe to state changes that drive chart updates
        this._unsubscribe = state.subscribe('marketData', debounce((md) => {
            this._onMarketData(md);
        }, 250));

        document.addEventListener('trade:executed', (e) => this._onTradeExecuted(e.detail));
        document.addEventListener('bot:updated',    (e) => this._onBotUpdate(e.detail));
    }

    // ──────────────────────────────────────────
    // Registration
    // ──────────────────────────────────────────

    /**
     * Register a canvas element for charting
     * @param {string}  id       Unique chart identifier
     * @param {string}  type     'line' | 'bar' | 'pie'
     * @param {object}  options  Chart-specific options
     */
    register(id, type = 'line', options = {}) {
        const canvas = document.getElementById(id);
        if (!canvas || canvas.tagName !== 'CANVAS') {
            console.warn(`[Charts] Canvas #${id} not found`);
            return;
        }

        if (this._hasChartJs) {
            this._registerChartJs(id, canvas, type, options);
        } else {
            this._registerCanvas2D(id, canvas, options);
        }
    }

    _registerChartJs(id, canvas, type, options) {
        const defaultOptions = {
            responsive:          true,
            maintainAspectRatio: false,
            animation:           { duration: 200 },
            plugins: {
                legend: { labels: { color: '#e2e8f0' } }
            },
            scales: type !== 'pie' ? {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
            } : undefined
        };

        const chart = new window.Chart(canvas, {
            type,
            data:    { labels: [], datasets: [] },
            options: this._deepMerge(defaultOptions, options)
        });

        this._charts.set(id, chart);
        this._data.set(id, []);
    }

    _registerCanvas2D(id, canvas, options) {
        const ctx = canvas.getContext('2d');
        this._charts.set(id, { ctx, canvas, options, type: '2d-fallback' });
        this._data.set(id, []);
    }

    // ──────────────────────────────────────────
    // Update methods
    // ──────────────────────────────────────────

    /**
     * Push a data point to a chart
     * @param {string} id        Chart id
     * @param {string} label     X-axis label (e.g. timestamp)
     * @param {number} value     Y value
     * @param {number} maxPoints Max data points to keep (rolling window)
     */
    push(id, label, value, maxPoints = 60) {
        const data = this._data.get(id) || [];
        data.push({ label, value });
        if (data.length > maxPoints) data.shift();
        this._data.set(id, data);
        this._render(id, data);
    }

    /**
     * Replace all data in a chart
     */
    replace(id, points = []) {
        this._data.set(id, points);
        this._render(id, points);
    }

    _render(id, data) {
        const chart = this._charts.get(id);
        if (!chart) return;

        if (this._hasChartJs && chart.data) {
            this._renderChartJs(chart, data);
        } else {
            this._renderCanvas2D(chart, data);
        }
    }

    _renderChartJs(chart, data) {
        chart.data.labels   = data.map(d => d.label);
        const dataset = chart.data.datasets[0];
        if (dataset) {
            dataset.data = data.map(d => d.value);
        } else {
            chart.data.datasets = [{
                label:           'Price',
                data:            data.map(d => d.value),
                borderColor:     '#8b5cf6',
                backgroundColor: 'rgba(139,92,246,0.1)',
                fill:            true,
                tension:         0.3,
                pointRadius:     2
            }];
        }
        chart.update('none'); // no animation on live updates
    }

    _renderCanvas2D({ ctx, canvas }, data) {
        if (!data.length) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const values = data.map(d => d.value);
        const min    = Math.min(...values);
        const max    = Math.max(...values);
        const range  = max - min || 1;
        const pad    = 10;

        const xStep = (width - pad * 2) / Math.max(data.length - 1, 1);

        // Draw grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth   = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad + ((height - pad * 2) / 4) * i;
            ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(width - pad, y); ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = pad + i * xStep;
            const y = height - pad - ((d.value - min) / range) * (height - pad * 2);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill under line
        ctx.fillStyle = 'rgba(139,92,246,0.1)';
        ctx.lineTo(width - pad, height - pad);
        ctx.lineTo(pad, height - pad);
        ctx.closePath();
        ctx.fill();
    }

    // ──────────────────────────────────────────
    // Event-driven auto-updates
    // ──────────────────────────────────────────

    _onMarketData(md) {
        if (!md) return;
        const now = new Date().toLocaleTimeString();

        // Update price chart for each known symbol
        Object.entries(md).forEach(([symbol, data]) => {
            const chartId = `chart-price-${symbol.toLowerCase()}`;
            if (this._charts.has(chartId)) {
                this.push(chartId, now, data.price);
            }
        });
    }

    _onTradeExecuted(trade) {
        if (!trade) return;
        const now = new Date().toLocaleTimeString();
        if (this._charts.has('chart-trades')) {
            this.push('chart-trades', now, trade.pnl || 0);
        }
    }

    _onBotUpdate(bot) {
        if (!bot?.performance) return;
        const now = new Date().toLocaleTimeString();
        if (this._charts.has('chart-performance')) {
            this.push('chart-performance', now, bot.performance.total_profit || 0);
        }
    }

    // ──────────────────────────────────────────
    // Utilities
    // ──────────────────────────────────────────

    destroy(id) {
        const chart = this._charts.get(id);
        if (!chart) return;
        if (chart.destroy) chart.destroy(); // Chart.js cleanup
        this._charts.delete(id);
        this._data.delete(id);
    }

    destroyAll() {
        for (const id of this._charts.keys()) this.destroy(id);
        if (this._unsubscribe) this._unsubscribe();
    }

    _deepMerge(target, source) {
        for (const key of Object.keys(source || {})) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = this._deepMerge(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }
}

const charts = new ChartManager();

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    charts.init();

    // Register known charts if their canvases exist
    charts.register('chart-price-btc',   'line');
    charts.register('chart-price-eth',   'line');
    charts.register('chart-performance', 'line');
    charts.register('chart-trades',      'bar');
});

export default charts;
