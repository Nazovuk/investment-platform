'use client';

import { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
    category: string;
}

const faqData: FAQItem[] = [
    // Metrics
    {
        category: 'Metrics',
        question: 'How is Upside Potential calculated?',
        answer: `**Upside Potential** measures how much a stock price could increase to reach its fair value or analyst target price.

**Formula:**
\`\`\`
Upside % = ((Target Price - Current Price) / Current Price) × 100
\`\`\`

**Example:**
- Current Price: $150
- Target Price: $180
- Upside = ((180 - 150) / 150) × 100 = **20%**

The target price is typically derived from analyst consensus estimates or our fair value model. A higher upside indicates more potential for price appreciation.`
    },
    {
        category: 'Metrics',
        question: 'How is the AI Score calculated?',
        answer: `**AI Score** is a composite score (0-100) that combines multiple factors to rate stock attractiveness.

**Components:**
| Factor | Weight | Description |
|--------|--------|-------------|
| Valuation | 25% | P/E, PEG ratio vs sector |
| Growth | 25% | Revenue & earnings growth |
| Analyst Sentiment | 20% | Buy/Hold/Sell ratings |
| Momentum | 15% | Price trend, RSI, SMA |
| Quality | 15% | Profit margins, ROE |

**Scoring:**
- **80-100**: Excellent - Strong buy candidate
- **60-79**: Good - Consider buying
- **40-59**: Average - Hold
- **Below 40**: Weak - Consider avoiding

Each factor is scored 0-100 and weighted to produce the final score.`
    },
    {
        category: 'Metrics',
        question: 'How is Fair Value calculated?',
        answer: `**Fair Value** estimates what a stock should be worth based on fundamentals.

**Method 1: DCF (Discounted Cash Flow)**
\`\`\`
Fair Value = Σ (Future Cash Flows / (1 + Discount Rate)^n)
\`\`\`

**Method 2: Earnings-Based**
\`\`\`
Fair Value = EPS × Fair P/E Ratio
Fair P/E = Industry Average × (1 + Growth Premium)
\`\`\`

**Method 3: Analyst Targets**
We use the mean of analyst price targets as a market-based fair value estimate.

**Interpretation:**
- **Current < Fair Value**: Stock is undervalued → potential buy
- **Current > Fair Value**: Stock is overvalued → be cautious
- Use as one input, not sole decision factor`
    },
    // Backtest
    {
        category: 'Backtesting',
        question: 'How does the Backtest work?',
        answer: `**Backtesting** simulates how your portfolio would have performed historically.

**Process:**
1. **Input**: Portfolio weights, date range, benchmark
2. **Data**: Fetch historical daily prices for all stocks
3. **Simulation**: 
   - Start with initial investment
   - Apply daily portfolio returns
   - Rebalance monthly (optional)
4. **Comparison**: Run same simulation for benchmark

**Key Metrics:**
| Metric | Description |
|--------|-------------|
| Total Return | Overall gain/loss percentage |
| CAGR | Compound Annual Growth Rate |
| Sharpe Ratio | Risk-adjusted return |
| Max Drawdown | Worst peak-to-trough decline |
| Alpha | Excess return vs benchmark |
| Beta | Volatility relative to market |

**Limitations:**
- Past performance ≠ future results
- Excludes trading costs and taxes
- Uses end-of-day prices`
    },
    {
        category: 'Backtesting',
        question: 'What is the Sharpe Ratio?',
        answer: `**Sharpe Ratio** measures risk-adjusted return - how much return you get per unit of risk.

**Formula:**
\`\`\`
Sharpe = (Portfolio Return - Risk-Free Rate) / Portfolio Volatility
\`\`\`

**Example:**
- Portfolio Return: 15%
- Risk-Free Rate: 5%
- Volatility: 10%
- Sharpe = (15 - 5) / 10 = **1.0**

**Interpretation:**
- **> 1.0**: Good - adequate compensation for risk
- **> 2.0**: Very Good - excellent risk/reward
- **< 0.5**: Poor - not enough return for the risk

Higher is better, but compare within similar strategies.`
    },
    // Optimizer
    {
        category: 'Portfolio Optimizer',
        question: 'How does Portfolio Optimization work?',
        answer: `**Mean-Variance Optimization** finds the portfolio with best risk-adjusted returns.

**Theory (Markowitz Modern Portfolio Theory):**
1. Each stock has expected return and volatility
2. Stocks have correlations (move together or opposite)
3. Combining stocks can reduce overall risk
4. There's an "efficient frontier" of optimal portfolios

**Our Algorithm:**
1. Fetch 2 years of historical prices
2. Calculate expected returns (annualized mean)
3. Calculate covariance matrix (how stocks move together)
4. Optimize to **maximize Sharpe Ratio** subject to:
   - Risk profile constraints (max volatility)
   - Position limits (e.g., max 25% in one stock)
   - Minimum weight (avoid tiny positions)

**Result:**
- Optimal weight for each stock
- Expected annual return
- Expected volatility
- Sharpe ratio of optimized portfolio`
    },
    {
        category: 'Portfolio Optimizer',
        question: 'What is the Efficient Frontier?',
        answer: `**Efficient Frontier** is the set of portfolios offering the highest expected return for each level of risk.

**Visualization:**
The chart shows:
- **X-axis**: Volatility (risk)
- **Y-axis**: Expected return
- **Points**: Possible portfolios
- **Star**: Your optimal portfolio

**Key Insight:**
- Portfolios ON the frontier are "efficient"
- Portfolios BELOW the frontier are suboptimal
- You can't get more return without more risk on the frontier

**Risk Profiles:**
- **Conservative**: Lower on frontier, less risk
- **Aggressive**: Higher on frontier, more return + more risk`
    },
    // Alerts
    {
        category: 'Alerts',
        question: 'What technical indicators do alerts support?',
        answer: `**Price Alerts:**
- Price Above/Below target
- Fair Value Reached
- AI Score Threshold

**Technical Alerts:**
| Alert | Trigger |
|-------|---------|
| Golden Cross | SMA50 crosses above SMA200 (bullish) |
| Death Cross | SMA50 crosses below SMA200 (bearish) |
| Above/Below SMA50 | Price vs 50-day moving average |
| Above/Below SMA200 | Price vs 200-day moving average |
| RSI Oversold | RSI drops below 30 (potential buy) |
| RSI Overbought | RSI rises above 70 (potential sell) |

**How it works:**
1. Create alert with stock symbol and type
2. System checks conditions periodically
3. Email notification when triggered`
    }
];

export default function FAQPage() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [expandedItem, setExpandedItem] = useState<number | null>(0);

    const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))];

    const filteredFAQ = activeCategory === 'All'
        ? faqData
        : faqData.filter(item => item.category === activeCategory);

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">❓ FAQ & Help</h1>
                    <p className="page-subtitle">Learn how our calculations and features work</p>
                </div>
            </header>

            {/* Category Tabs */}
            <div className="tabs mb-lg">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`tab ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* FAQ Items */}
            <div className="flex flex-col gap-md">
                {filteredFAQ.map((item, idx) => (
                    <div key={idx} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpandedItem(expandedItem === idx ? null : idx)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-md">
                                <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a855f7' }}>
                                    {item.category}
                                </span>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{item.question}</h3>
                            </div>
                            <span style={{ fontSize: '1.5rem', color: '#9ca3af' }}>
                                {expandedItem === idx ? '−' : '+'}
                            </span>
                        </div>

                        {expandedItem === idx && (
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div
                                    className="faq-content"
                                    style={{ color: '#d1d5db', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
                                    dangerouslySetInnerHTML={{
                                        __html: item.answer
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/`([^`]+)`/g, '<code style="background: rgba(99,102,241,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
                                            .replace(/```([\s\S]*?)```/g, '<pre style="background: #0d1117; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 12px 0;">$1</pre>')
                                            .replace(/\|(.*?)\|/g, (match) => {
                                                if (match.includes('---')) return '';
                                                return `<span style="display: inline-block; min-width: 80px; padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); margin: 2px;">${match.replace(/\|/g, '')}</span>`;
                                            })
                                            .replace(/\n/g, '<br />')
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Contact Section */}
            <div className="card mt-lg" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))' }}>
                <div className="text-center">
                    <h3 style={{ marginBottom: '8px' }}>💬 Still have questions?</h3>
                    <p className="text-muted mb-md">Check our documentation or reach out to support</p>
                    <div className="flex gap-md justify-center">
                        <a href="#" className="btn btn-secondary">📚 Documentation</a>
                        <a href="#" className="btn btn-primary">✉️ Contact Support</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
