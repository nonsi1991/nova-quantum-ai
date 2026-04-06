/**
 * Nova Quantum AI - Paper Trading Demo
 * Pure JavaScript simulation of AI bot trading
 * User WATCHES ONLY - cannot trade manually
 */

class PaperTradingDemo {
    constructor() {
        // Demo state
        this.state = {
            balance: 1000.00,
            totalTrades: 0,
            winningTrades: 0,
            totalPnl: 0.00,
            trades: [],
            isDemoActive: false,
            autoTradeInterval: null,
            sessionId: null
        };
        
        // Trading symbols and strategies
        this.symbols = [
            { name: "BTC/USDT", currentPrice: 65432.10, volatility: 0.03 },
            { name: "ETH/USDT", currentPrice: 3456.78, volatility: 0.04 },
            { name: "SOL/USDT", currentPrice: 123.45, volatility: 0.05 },
            { name: "BNB/USDT", currentPrice: 567.89, volatility: 0.035 }
        ];
        
        this.strategies = [
            { name: "FibSniper", description: "Fibonacci retracement levels", winRate: 0.72 },
            { name: "LSOB", description: "Liquidity sweep order blocks", winRate: 0.68 },
            { name: "TrendFollowing", description: "Follows established trends", winRate: 0.65 },
            { name: "MeanReversion", description: "Returns to average price", winRate: 0.70 },
            { name: "Breakout", description: "Price breakouts with volume", winRate: 0.66 }
        ];
        
        // Initialize
        this.loadState();
        this.initEventListeners();
        this.updateUI();
        
        // Auto-start demo after 2 seconds
        setTimeout(() => {
            if (!this.state.isDemoActive) {
                this.startDemo();
            }
        }, 2000);
    }
    
    // Load state from localStorage
    loadState() {
        const saved = localStorage.getItem('novaQuantumDemo');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
                this.state.trades = this.state.trades || [];
            } catch (e) {
                console.log('Could not load saved state');
            }
        }
        
        // Generate session ID if not exists
        if (!this.state.sessionId) {
            this.state.sessionId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    }
    
    // Save state to localStorage
    saveState() {
        localStorage.setItem('novaQuantumDemo', JSON.stringify(this.state));
    }
    
    // Initialize event listeners
    initEventListeners() {
        document.getElementById('startDemo').addEventListener('click', () => this.startDemo());
        document.getElementById('simulateTrade').addEventListener('click', () => this.simulateTrade());
        document.getElementById('resetDemo').addEventListener('click', () => this.resetDemo());
        document.getElementById('autoTrade').addEventListener('change', (e) => this.toggleAutoTrade(e.target.checked));
    }
    
    // Start demo session
    startDemo() {
        if (this.state.isDemoActive) return;
        
        this.state.isDemoActive = true;
        this.state.sessionId = 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Enable simulate trade button
        document.getElementById('simulateTrade').disabled = false;
        
        // Update UI
        document.getElementById('startDemo').innerHTML = '<i class="fas fa-play me-2"></i>Demo Active';
        document.getElementById('startDemo').classList.remove('btn-primary');
        document.getElementById('startDemo').classList.add('btn-success');
        
        // Start auto-trading if enabled
        if (document.getElementById('autoTrade').checked) {
            this.startAutoTrading();
        }
        
        // Show initial analysis
        this.showBotAnalysis();
        
        // Simulate first trade after 1 second
        setTimeout(() => {
            if (this.state.isDemoActive) {
                this.simulateTrade();
            }
        }, 1000);
        
        this.saveState();
        this.showNotification('Demo started! Watching AI bot trade...', 'success');
    }
    
    // Start auto-trading interval
    startAutoTrading() {
        if (this.state.autoTradeInterval) {
            clearInterval(this.state.autoTradeInterval);
        }
        
        this.state.autoTradeInterval = setInterval(() => {
            if (this.state.isDemoActive) {
                this.simulateTrade();
            }
        }, 30000); // Every 30 seconds
        
        console.log('Auto-trading started (every 30s)');
    }
    
    // Stop auto-trading
    stopAutoTrading() {
        if (this.state.autoTradeInterval) {
            clearInterval(this.state.autoTradeInterval);
            this.state.autoTradeInterval = null;
        }
    }
    
    // Toggle auto-trading
    toggleAutoTrade(enabled) {
        if (enabled && this.state.isDemoActive) {
            this.startAutoTrading();
        } else {
            this.stopAutoTrading();
        }
    }
    
    // Simulate a trade (bot makes decision)
    simulateTrade() {
        if (!this.state.isDemoActive) {
            this.showNotification('Start the demo first!', 'warning');
            return;
        }
        
        // Select random symbol and strategy
        const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        const strategy = this.strategies[Math.floor(Math.random() * this.strategies.length)];
        
        // Determine trade direction (70% win rate for demo)
        const isWin = Math.random() < strategy.winRate;
        const side = Math.random() > 0.5 ? 'BUY' : 'SELL';
        
        // Calculate prices
        const entryPrice = symbol.currentPrice;
        const priceChange = isWin ? 
            (Math.random() * 0.03 + 0.01) : // 1-4% profit
            -(Math.random() * 0.03 + 0.01);  // 1-4% loss
        
        const exitPrice = entryPrice * (1 + priceChange);
        
        // Calculate position size (1-5% of balance)
        const positionSizePct = Math.random() * 0.04 + 0.01; // 1-5%
        const positionValue = this.state.balance * positionSizePct;
        const quantity = positionValue / entryPrice;
        
        // Calculate P&L
        let pnl;
        if (side === 'BUY') {
            pnl = (exitPrice - entryPrice) * quantity;
        } else {
            pnl = (entryPrice - exitPrice) * quantity;
        }
        
        // Update state
        this.state.totalTrades++;
        if (pnl > 0) this.state.winningTrades++;
        this.state.totalPnl += pnl;
        this.state.balance += pnl;
        
        // Create trade object
        const trade = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            symbol: symbol.name,
            side: side,
            entryPrice: entryPrice.toFixed(2),
            exitPrice: exitPrice.toFixed(2),
            quantity: quantity.toFixed(6),
            pnl: pnl.toFixed(2),
            strategy: strategy.name,
            status: 'CLOSED',
            isWin: pnl > 0,
            reason: this.generateTradeReason(strategy, side, isWin)
        };
        
        // Add to trades history (limit to 50 trades)
        this.state.trades.unshift(trade);
        if (this.state.trades.length > 50) {
            this.state.trades = this.state.trades.slice(0, 50);
        }
        
        // Update UI
        this.updateUI();
        this.showLatestTrade(trade);
        this.showBotAnalysis();
        
        // Show notification
        const pnlFormatted = pnl > 0 ? `+$${Math.abs(pnl).toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
        this.showNotification(`Bot ${side} ${symbol.name}: ${pnlFormatted} (${strategy.name})`, pnl > 0 ? 'success' : 'danger');
        
        // Update symbol price for next trade
        symbol.currentPrice = exitPrice;
        
        this.saveState();
    }
    
    // Generate realistic trade reason
    generateTradeReason(strategy, side, isWin) {
        const reasons = {
            FibSniper: [
                `Fibonacci 0.618 retracement level reached`,
                `Golden ratio confluence with support`,
                `Fibonacci extension target hit`
            ],
            LSOB: [
                `Liquidity sweep detected at order block`,
                `Market structure shift confirmed`,
                `Order block rejection with volume`
            ],
            TrendFollowing: [
                `Trend continuation confirmed`,
                `Higher high in uptrend established`,
                `Moving average alignment bullish`
            ],
            MeanReversion: [
                `Price deviated 2 standard deviations`,
                `Bollinger Band squeeze reversal`,
                `RSI oversold/overbought reversal`
            ],
            Breakout: [
                `Volume breakout above resistance`,
                `Consolidation breakout with momentum`,
                `Key level break with follow-through`
            ]
        };
        
        const reasonList = reasons[strategy.name] || [`${strategy.name} signal triggered`];
        return reasonList[Math.floor(Math.random() * reasonList.length)];
    }
    
    // Reset demo
    resetDemo() {
        if (confirm('Reset demo and start fresh with $1,000?')) {
            this.state = {
                balance: 1000.00,
                totalTrades: 0,
                winningTrades: 0,
                totalPnl: 0.00,
                trades: [],
                isDemoActive: false,
                autoTradeInterval: null,
                sessionId: 'demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            };
            
            // Reset UI
            document.getElementById('startDemo').innerHTML = '<i class="fas fa-play me-2"></i>Start Demo';
            document.getElementById('startDemo').classList.remove('btn-success');
            document.getElementById('startDemo').classList.add('btn-primary');
            document.getElementById('simulateTrade').disabled = true;
            
            this.stopAutoTrading();
            this.updateUI();
            this.showBotAnalysis();
            this.showLatestTrade(null);
            
            this.saveState();
            this.showNotification('Demo reset! Starting fresh with $1,000.', 'info');
            
            // Auto-start after reset
            setTimeout(() => this.startDemo(), 1000);
        }
    }
    
    // Update main UI
    updateUI() {
        // Update stats
        document.getElementById('balanceValue').textContent = `$${this.state.balance.toFixed(2)}`;
        document.getElementById('totalTrades').textContent = this.state.totalTrades;
        
        const winRate = this.state.totalTrades > 0 ? 
            (this.state.winningTrades / this.state.totalTrades * 100).toFixed(1) : 0;
        document.getElementById('winRate').textContent = `${winRate}%`;
        
        const pnlClass = this.state.totalPnl >= 0 ? 'positive' : 'negative';
        document.getElementById('totalPnl').textContent = `$${this.state.totalPnl.toFixed(2)}`;
        document.getElementById('totalPnl').className = `stat-value ${pnlClass}`;
        
        // Update trade history table
        this.updateTradeHistory();
    }
    
    // Update trade history table
    updateTradeHistory() {
        const tbody = document.getElementById('tradeHistory');
        
        if (this.state.trades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No trades yet. Start the demo to see the bot in action!
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        this.state.trades.slice(0, 10).forEach(trade => {
            const pnlClass = trade.isWin ? 'positive' : 'negative';
            const pnlSign = trade.isWin ? '+' : '-';
            
            html += `
                <tr class="trade-animation ${trade.isWin ? 'win-trade' : 'loss-trade'}">
                    <td>${trade.timestamp}</td>
                    <td><strong>${trade.symbol}</strong></td>
                    <td>
                        <span class="badge ${trade.side === 'BUY' ? 'bg-success' : 'bg-danger'}">
                            ${trade.side}
                        </span>
                    </td>
                    <td>$${trade.entryPrice}</td>
                    <td>$${trade.exitPrice}</td>
                    <td class="${pnlClass} fw-bold">${pnlSign}$${Math.abs(parseFloat(trade.pnl)).toFixed(2)}</td>
                    <td>
                        <span class="badge bg-info">${trade.strategy}</span>
                    </td>
                    <td>
                        <span class="badge ${trade.isWin ? 'bg-success' : 'bg-danger'}">
                            ${trade.isWin ? 'WIN' : 'LOSS'}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    // Show latest trade details
    showLatestTrade(trade) {
        const container = document.getElementById('latestTrade');
        
        if (!trade) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exchange-alt fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No trades yet. Start the demo!</p>
                </div>
            `;
            return;
        }
        
        const pnlClass = trade.isWin ? 'positive' : 'negative';
        const pnlSign = trade.isWin ? '+' : '-';
        const icon = trade.isWin ? 'fa-arrow-up' : 'fa-arrow-down';
        const bgClass = trade.isWin ? 'bg-success' : 'bg-danger';
        
        container.innerHTML = `
            <div class="trade-animation">
                <div class="text-center mb-3">
                    <div class="${bgClass} text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                        <i class="fas ${icon} fa-2x"></i>
                    </div>
                </div>
                
                <div class="row text-center">
                    <div class="col-6">
                        <div class="fw-bold">${trade.symbol}</div>
                        <div class="text-muted small">Symbol</div>
                    </div>
                    <div class="col-6">
                        <div class="fw-bold ${trade.side === 'BUY' ? 'text-success' : 'text-danger'}">${trade.side}</div>
                        <div class="text-muted small">Direction</div>
                    </div>
                </div>
                
                <hr>
                
                <div class="row">
                    <div class="col-6">
                        <div class="small text-muted">Entry</div>
                        <div class="fw-bold">$${trade.entryPrice}</div>
                    </div>
                    <div class="col-6">
                        <div class="small text-muted">Exit</div>
                        <div class="fw-bold">$${trade.exitPrice}</div>
                    </div>
                </div>
                
                <div class="mt-3 text-center">
                    <div class="small text-muted">P&L</div>
                    <div class="h3 fw-bold ${pnlClass}">${pnlSign}$${Math.abs(parseFloat(trade.pnl)).toFixed(2)}</div>
                </div>
                
                <div class="mt-3">
                    <div class="small text-muted">Strategy</div>
                    <div class="fw-bold">${trade.strategy}</div>
                    <div class="small text-muted mt-1">${trade.reason}</div>
                </div>
            </div>
        `;
    }
    
    // Show bot analysis
    showBotAnalysis() {
        const container = document.getElementById('botAnalysis');
        
        if (!this.state.isDemoActive) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-robot fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Start the demo to see the bot's market analysis</p>
                </div>
            `;
            return;
        }
        
        // Select random strategy for analysis
        const strategy = this.strategies[Math.floor(Math.random() * this.strategies.length)];
        const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        
        const analyses = [
            `Market showing <strong>bullish divergence</strong> on 4H chart`,
            `<strong>Liquidity pool</strong> forming at key resistance level`,
            `<strong>Fibonacci confluence</strong> at 0.618 retracement`,
            `Volume profile indicates <strong>accumulation phase</strong>`,
            `<strong>Order block</strong> identified with high probability setup`,
            `Market structure <strong>shift to bullish</strong> confirmed`,
            `<strong>RSI divergence</strong> suggesting trend reversal`,
            `<strong>Moving averages</strong> aligning for potential breakout`
        ];
        
        const analysis = analyses[Math.floor(Math.random() * analyses.length)];
        
        container.innerHTML = `
            <div class="trade-animation">
                <div class="d-flex align-items-center mb-3">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div>
                        <h6 class="mb-0">Nova Quantum AI Analysis</h6>
                        <div class="small text-muted">Live market analysis</div>
                    </div>
                </div>
                
                <div class="alert alert-info">
                    <i class="fas fa-lightbulb me-2"></i>
                    <strong>Active Strategy:</strong> ${strategy.name}
                    <div class="small mt-1">${strategy.description} (${(strategy.winRate * 100).toFixed(0)}% historical win rate)</div>
                </div>
                
                <div class="mb-3">
                    <div class="small text-muted mb-1">Current Analysis</div>
                    <div class="fw-bold">${analysis}</div>
                </div>
                
                <div class="mb-3">
                    <div class="small text-muted mb-1">Focus Symbol</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="fw-bold">${symbol.name}</div>
                        <div class="badge bg-warning">$${symbol.currentPrice.toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="progress mb-3" style="height: 8px;">
                    <div class="progress-bar bg-success" style="width: ${strategy.winRate * 100}%"></div>
                </div>
                <div class="small text-muted text-center">Strategy confidence: ${(strategy.winRate * 100).toFixed(1)}%</div>
                
                <div class="mt-4">
                    <div class="small text-muted mb-1">Next Action</div>
                    <div class="d-flex align-items-center">
                        <div class="p-2 bg-light rounded me-3">
                            <i class="fas fa-clock text-primary"></i>
                        </div>
                        <div>
                            <div class="fw-bold">Waiting for setup</div>
                            <div class="small text-muted">Monitoring price action for entry signal</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 350px;';
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Upgrade form submission
function submitUpgrade() {
    const form = document.getElementById('upgradeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get form data
    const apiKey = form.querySelector('input[type="password"]').value;
    const apiSecret = form.querySelectorAll('input[type="password"]')[1].value;
    const capital = form.querySelector('input[type="number"]').value;
    
    // Show success message
    alert(`✅ Upgrade submitted!\n\nAPI Key: ${apiKey.substring(0, 10)}...\nCapital: $${capital} USDT\n\nThe bot will now start trading with real money using the same strategies you saw in the demo.`);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('upgradeModal'));
    modal.hide();
    
    // Reset form
    form.reset();
}

// Initialize demo when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.demo = new PaperTradingDemo();
});