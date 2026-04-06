# Frontend - Risk Profile Selection

## 🎯 SIMPLE USER INTERFACE
**Users ONLY choose between 3 risk profiles - AI does everything else**

## 🎨 UI DESIGN:

### DASHBOARD LAYOUT:
```
┌─────────────────────────────────────────────────────┐
│                NOVA QUANTUM AI                      │
│                Trading Platform                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Welcome, [Username]!                               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │          CHOOSE YOUR RISK PROFILE           │   │
│  │                                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────┐   │
│  │  │             │  │             │  │       │   │
│  │  │   🔥        │  │   🟢        │  │   🔵  │   │
│  │  │  AGGRESSIVE │  │   MEDIUM    │  │ CONS. │   │
│  │  │             │  │             │  │       │   │
│  │  │  Max Profit │  │  Balanced   │  │  Safe │   │
│  │  │  Fast Trades│  │  Growth     │  │  Slow │   │
│  │  │  20x Lev.   │  │  10x Lev.   │  │ 5x Lev│   │
│  │  └─────────────┘  └─────────────┘  └───────┘   │
│  │                                             │   │
│  │  Your AI bot will handle everything else!   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Once selected, AI takes over:                     │
│  • Strategy Selection ✓                            │
│  • Pair Selection ✓                                │
│  • Parameter Optimization ✓                        │
│  • Continuous Improvement ✓                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### BUTTON DESIGNS:

#### 🔥 AGGRESSIVE BUTTON:
- **Color:** Red gradient (#ff4757 → #ff3838)
- **Icon:** Fire emoji (🔥)
- **Text:** "AGGRESSIVE"
- **Subtext:** "Max Profit • Fast Trades • 20x Leverage"
- **Hover Effect:** Pulse animation
- **Selected State:** Glowing border

#### 🟢 MEDIUM BUTTON:
- **Color:** Green gradient (#2ed573 → #1dd1a1)
- **Icon:** Checkmark emoji (🟢)
- **Text:** "MEDIUM"
- **Subtext:** "Balanced Growth • 10x Leverage"
- **Hover Effect:** Smooth scale
- **Selected State:** Subtle glow

#### 🔵 CONSERVATIVE BUTTON:
- **Color:** Blue gradient (#3742fa → #5352ed)
- **Icon:** Shield emoji (🔵)
- **Text:** "CONSERVATIVE"
- **Subtext:** "Safe & Steady • 5x Leverage"
- **Hover Effect:** Gentle fade
- **Selected State:** Solid border

## 📱 RESPONSIVE DESIGN:
- **Desktop:** 3 buttons side-by-side
- **Tablet:** 3 buttons in a row (slightly smaller)
- **Mobile:** 3 buttons stacked vertically

## 🎯 USER FLOW:

### STEP 1: REGISTRATION/LOGIN
- User creates account or logs in
- If new user: Bot is created automatically

### STEP 2: RISK PROFILE SELECTION
- User sees the 3 buttons
- Clicks their preferred risk profile
- Confirmation modal appears

### STEP 3: AI TAKES OVER
- Button shows "SELECTED" state
- Message: "AI is configuring your bot..."
- Loading animation for 2-3 seconds
- Then: "Your bot is now running! AI will optimize everything."

### STEP 4: DASHBOARD VIEW
- User sees their bot's performance
- **NO strategy configuration options**
- **NO pair selection options**
- **NO parameter tuning options**
- Only: Performance charts, PnL, Status

## 🔧 TECHNICAL IMPLEMENTATION:

### HTML STRUCTURE:
```html
<div class="risk-profile-selector">
  <div class="profile-card aggressive" data-profile="aggressive">
    <div class="profile-icon">🔥</div>
    <div class="profile-title">AGGRESSIVE</div>
    <div class="profile-subtitle">Max Profit • Fast Trades</div>
    <div class="profile-leverage">20x Leverage</div>
  </div>
  
  <div class="profile-card medium" data-profile="medium">
    <div class="profile-icon">🟢</div>
    <div class="profile-title">MEDIUM</div>
    <div class="profile-subtitle">Balanced Growth</div>
    <div class="profile-leverage">10x Leverage</div>
  </div>
  
  <div class="profile-card conservative" data-profile="conservative">
    <div class="profile-icon">🔵</div>
    <div class="profile-title">CONSERVATIVE</div>
    <div class="profile-subtitle">Safe & Steady</div>
    <div class="profile-leverage">5x Leverage</div>
  </div>
</div>
```

### JAVASCRIPT LOGIC:
```javascript
// When user selects a profile
function selectRiskProfile(profile) {
  // Send to backend
  fetch('/api/bot/set-risk-profile', {
    method: 'POST',
    body: JSON.stringify({ profile: profile }),
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage('AI is now configuring your bot...');
      // AI takes over - no further user input needed
      startBotAutonomousMode();
    }
  });
}
```

## 🚫 WHAT'S REMOVED FROM UI:
- Strategy dropdown/selection
- Pair selection lists
- Parameter sliders (leverage, stop loss, etc.)
- Technical indicator configuration
- Manual trade execution (for paper trading, keep simple buy/sell)

## ✅ WHAT'S KEPT IN UI:
- Performance charts
- PnL display
- Trade history
- Bot status (Running/Paused)
- Account balance
- Simple paper trading (buy/sell buttons only)

## 🎨 DESIGN PHILOSOPHY:
**"Less is more"** - The simpler the UI, the more powerful the AI appears. Users should feel like they're entrusting their trading to a sophisticated AI, not configuring a complex system.