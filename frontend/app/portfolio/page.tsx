'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const mockPortfolio = {
    id: 1,
    name: 'Main Portfolio',
    currency: 'USD',
    risk_profile: 'moderate',
    total_value: 125420.50,
    total_cost: 107080.25,
    total_gain_loss: 18340.25,
    total_gain_loss_pct: 17.12,
    positions: [
        { symbol: 'AAPL', name: 'Apple Inc.', shares: 165, avg_cost: 145.50, current_price: 193.60, current_value: 31944, gain_loss: 7936.50, gain_loss_pct: 33.08, weight: 25.5 },
        { symbol: 'MSFT', name: 'Microsoft Corp', shares: 73, avg_cost: 285.20, current_price: 376.17, current_value: 27460.41, gain_loss: 6640.19, gain_loss_pct: 31.90, weight: 21.9 },
        { symbol: 'GOOGL', name: 'Alphabet Inc', shares: 165, avg_cost: 110.80, current_price: 140.25, current_value: 23141.25, gain_loss: 4859.25, gain_loss_pct: 26.57, weight: 18.5 },
        { symbol: 'NVDA', name: 'NVIDIA Corp', shares: 38, avg_cost: 380.50, current_price: 495.22, current_value: 18818.36, gain_loss: 4359.36, gain_loss_pct: 30.15, weight: 15.0 },
        { symbol: 'AMZN', name: 'Amazon.com', shares: 97, avg_cost: 135.20, current_price: 154.62, current_value: 14998.14, gain_loss: 1884.94, gain_loss_pct: 14.37, weight: 12.0 },
        { symbol: 'META', name: 'Meta Platforms', shares: 25, avg_cost: 295.80, current_price: 353.96, current_value: 8849, gain_loss: 1454, gain_loss_pct: 19.66, weight: 7.1 },
    ]
};

const transactions = [
    { date: '2024-01-15', symbol: 'NVDA', type: 'BUY', shares: 10, price: 485.50, total: 4855 },
    { date: '2024-01-10', symbol: 'AAPL', type: 'BUY', shares: 25, price: 185.20, total: 4630 },
    { date: '2024-01-05', symbol: 'META', type: 'SELL', shares: 5, price: 348.90, total: 1744.50 },
    { date: '2023-12-28', symbol: 'GOOGL', type: 'BUY', shares: 40, price: 138.50, total: 5540 },
    { date: '2023-12-20', symbol: 'MSFT', type: 'BUY', shares: 15, price: 372.80, total: 5592 },
];

export default function PortfolioPage() {
    const [portfolio] = useState(mockPortfolio);
    const [activeTab, setActiveTab] = useState('holdings');
    const [currency, setCurrency] = useState('USD');

    const pieData = [{
        values: portfolio.positions.map(p => p.weight),
        labels: portfolio.positions.map(p => p.symbol),
        type: 'pie' as const,
        hole: 0.6,
        textinfo: 'label+percent',
        textposition: 'outside',
        marker: {
            colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']
        },
    }];

    const pieLayout = {
        showlegend: false,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { t: 20, b: 20, l: 20, r: 20 },
        font: { color: '#94a3b8', size: 11 },
        annotations: [{
            text: `<b>$${(portfolio.total_value / 1000).toFixed(1)}K</b>`,
            showarrow: false,
            font: { size: 20, color: '#f8fafc' }
        }]
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">{portfolio.name}</h1>
                    <p className="page-subtitle">Track your investments and performance</p>
                </div>
                <div className="flex gap-md items-center">
                    <select
                        className="input select"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{ width: 100 }}
                    >
                        <option value="USD">USD $</option>
                        <option value="EUR">EUR €</option>
                        <option value="GBP">GBP £</option>
                        <option value="TRY">TRY ₺</option>
                    </select>
                    <button className="btn btn-primary">
                        + Add Transaction
                    </button>
                </div>
            </header>

            {/* Stats */}
            <div className="stats-grid mb-lg">
                <div className="stat-card">
                    <span className="stat-label">Total Value</span>
                    <span className="stat-value">${portfolio.total_value.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Cost</span>
                    <span className="stat-value text-muted">${portfolio.total_cost.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Gain/Loss</span>
                    <span className={`stat-value ${portfolio.total_gain_loss >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {portfolio.total_gain_loss >= 0 ? '+' : ''}${portfolio.total_gain_loss.toLocaleString()}
                    </span>
                    <span className={`stat-change ${portfolio.total_gain_loss_pct >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {portfolio.total_gain_loss_pct >= 0 ? '+' : ''}{portfolio.total_gain_loss_pct}%
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Positions</span>
                    <span className="stat-value">{portfolio.positions.length}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--spacing-lg)' }}>
                {/* Main Content */}
                <div className="flex flex-col gap-lg">
                    {/* Tabs */}
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === 'holdings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('holdings')}
                        >
                            Holdings
                        </button>
                        <button
                            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('transactions')}
                        >
                            Transactions
                        </button>
                        <button
                            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
                            onClick={() => setActiveTab('performance')}
                        >
                            Performance
                        </button>
                    </div>

                    {/* Holdings Tab */}
                    {activeTab === 'holdings' && (
                        <div className="card">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Name</th>
                                            <th className="text-right">Shares</th>
                                            <th className="text-right">Avg Cost</th>
                                            <th className="text-right">Price</th>
                                            <th className="text-right">Value</th>
                                            <th className="text-right">Gain/Loss</th>
                                            <th className="text-right">Weight</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {portfolio.positions.map(pos => (
                                            <tr key={pos.symbol}>
                                                <td>
                                                    <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                                                        {pos.symbol}
                                                    </span>
                                                </td>
                                                <td className="text-muted truncate" style={{ maxWidth: 150 }}>{pos.name}</td>
                                                <td className="text-right font-mono">{pos.shares}</td>
                                                <td className="text-right font-mono text-muted">${pos.avg_cost.toFixed(2)}</td>
                                                <td className="text-right font-mono">${pos.current_price.toFixed(2)}</td>
                                                <td className="text-right font-mono">${pos.current_value.toLocaleString()}</td>
                                                <td className="text-right">
                                                    <div className={pos.gain_loss >= 0 ? 'value-positive' : 'value-negative'}>
                                                        <div className="font-mono font-bold">
                                                            {pos.gain_loss >= 0 ? '+' : ''}${pos.gain_loss.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs">
                                                            {pos.gain_loss_pct >= 0 ? '+' : ''}{pos.gain_loss_pct.toFixed(1)}%
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <div className="score-indicator" style={{ justifyContent: 'flex-end' }}>
                                                        <span className="font-mono">{pos.weight}%</span>
                                                        <div className="score-bar" style={{ width: 50 }}>
                                                            <div className="score-fill good" style={{ width: `${pos.weight * 4}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Transactions Tab */}
                    {activeTab === 'transactions' && (
                        <div className="card">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Symbol</th>
                                            <th>Type</th>
                                            <th className="text-right">Shares</th>
                                            <th className="text-right">Price</th>
                                            <th className="text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx, i) => (
                                            <tr key={i}>
                                                <td className="font-mono text-muted">{tx.date}</td>
                                                <td className="font-bold" style={{ color: 'var(--accent-primary)' }}>{tx.symbol}</td>
                                                <td>
                                                    <span className={`badge ${tx.type === 'BUY' ? 'badge-success' : 'badge-danger'}`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="text-right font-mono">{tx.shares}</td>
                                                <td className="text-right font-mono">${tx.price.toFixed(2)}</td>
                                                <td className="text-right font-mono">${tx.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Performance Tab */}
                    {activeTab === 'performance' && (
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Performance by Position</h3>
                            </div>
                            <div className="flex flex-col gap-md">
                                {portfolio.positions.sort((a, b) => b.gain_loss_pct - a.gain_loss_pct).map(pos => (
                                    <div key={pos.symbol} className="flex items-center gap-lg">
                                        <div style={{ width: 60 }} className="font-bold">{pos.symbol}</div>
                                        <div style={{ flex: 1 }}>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{
                                                        width: `${Math.min(pos.gain_loss_pct, 100)}%`,
                                                        background: pos.gain_loss_pct >= 0 ? 'var(--success)' : 'var(--danger)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ width: 80 }} className={`text-right font-mono font-bold ${pos.gain_loss_pct >= 0 ? 'value-positive' : 'value-negative'}`}>
                                            {pos.gain_loss_pct >= 0 ? '+' : ''}{pos.gain_loss_pct.toFixed(1)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="flex flex-col gap-lg">
                    {/* Allocation Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Allocation</h3>
                        </div>
                        <div style={{ height: 250 }}>
                            <Plot
                                data={pieData}
                                layout={pieLayout as any}
                                config={{ displayModeBar: false, responsive: true }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Portfolio Info</h3>
                        </div>
                        <div className="flex flex-col gap-sm">
                            <div className="flex justify-between items-center" style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="text-muted">Risk Profile</span>
                                <span className="badge">{portfolio.risk_profile}</span>
                            </div>
                            <div className="flex justify-between items-center" style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="text-muted">Currency</span>
                                <span className="font-bold">{currency}</span>
                            </div>
                            <div className="flex justify-between items-center" style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span className="text-muted">Best Performer</span>
                                <span className="font-bold value-positive">AAPL +33.1%</span>
                            </div>
                            <div className="flex justify-between items-center" style={{ padding: 'var(--spacing-sm) 0' }}>
                                <span className="text-muted">Worst Performer</span>
                                <span className="font-bold">AMZN +14.4%</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Actions</h3>
                        </div>
                        <div className="flex flex-col gap-sm">
                            <a href="/optimizer" className="btn btn-secondary w-full">
                                Rebalance Portfolio
                            </a>
                            <a href="/backtest" className="btn btn-secondary w-full">
                                Backtest Strategy
                            </a>
                            <button className="btn btn-ghost w-full">
                                Export to CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
