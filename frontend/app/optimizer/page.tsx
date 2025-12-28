'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const riskProfiles = [
    { id: 'conservative', name: 'Conservative', description: 'Lower risk, stable returns', maxVol: '10%', maxPos: '15%' },
    { id: 'moderate', name: 'Moderate', description: 'Balanced risk and return', maxVol: '20%', maxPos: '25%' },
    { id: 'aggressive', name: 'Aggressive', description: 'Higher risk, higher returns', maxVol: '35%', maxPos: '35%' },
    { id: 'ultra_aggressive', name: 'Ultra Aggressive', description: 'Maximum growth', maxVol: '50%', maxPos: '50%' },
];

const mockOptimizationResult = {
    expected_return: 18.5,
    volatility: 15.2,
    sharpe_ratio: 0.89,
    allocations: [
        { symbol: 'NVDA', name: 'NVIDIA Corporation', weight: 22.5, amount: 2250, shares: 4, price: 495.22 },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', weight: 20.0, amount: 2000, shares: 14, price: 140.25 },
        { symbol: 'META', name: 'Meta Platforms', weight: 18.5, amount: 1850, shares: 5, price: 353.96 },
        { symbol: 'MSFT', name: 'Microsoft Corp', weight: 15.0, amount: 1500, shares: 3, price: 376.17 },
        { symbol: 'AAPL', name: 'Apple Inc.', weight: 14.0, amount: 1400, shares: 7, price: 193.60 },
        { symbol: 'V', name: 'Visa Inc.', weight: 10.0, amount: 1000, shares: 3, price: 260.15 },
    ]
};

// Mock efficient frontier data
const frontierData = Array.from({ length: 50 }, (_, i) => ({
    volatility: 8 + i * 0.5,
    return: 8 + i * 0.3 + Math.random() * 2,
    sharpe: (8 + i * 0.3) / (8 + i * 0.5)
}));

export default function OptimizerPage() {
    const [symbols, setSymbols] = useState(['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMZN']);
    const [newSymbol, setNewSymbol] = useState('');
    const [investmentAmount, setInvestmentAmount] = useState(10000);
    const [selectedRisk, setSelectedRisk] = useState('moderate');
    const [result, setResult] = useState(mockOptimizationResult);
    const [isLoading, setIsLoading] = useState(false);

    const addSymbol = () => {
        if (newSymbol && !symbols.includes(newSymbol.toUpperCase())) {
            setSymbols([...symbols, newSymbol.toUpperCase()]);
            setNewSymbol('');
        }
    };

    const removeSymbol = (sym: string) => {
        setSymbols(symbols.filter(s => s !== sym));
    };

    const runOptimization = () => {
        setIsLoading(true);
        setTimeout(() => {
            setResult(mockOptimizationResult);
            setIsLoading(false);
        }, 1500);
    };

    // Pie chart for allocation
    const pieData = [{
        values: result.allocations.map(a => a.weight),
        labels: result.allocations.map(a => a.symbol),
        type: 'pie' as const,
        hole: 0.55,
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
            text: '<b>Optimal</b><br>Allocation',
            showarrow: false,
            font: { size: 14, color: '#f8fafc' }
        }]
    };

    // Efficient frontier scatter plot
    const frontierChartData = [{
        x: frontierData.map(d => d.volatility),
        y: frontierData.map(d => d.return),
        type: 'scatter' as const,
        mode: 'markers' as const,
        marker: {
            size: 8,
            color: frontierData.map(d => d.sharpe),
            colorscale: 'Viridis',
            showscale: true,
            colorbar: { title: 'Sharpe', tickfont: { color: '#94a3b8' } }
        },
        hovertemplate: 'Vol: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>'
    }, {
        x: [result.volatility],
        y: [result.expected_return],
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: 'Optimal',
        marker: { size: 15, color: '#f43f5e', symbol: 'star' },
    }];

    const frontierLayout = {
        showlegend: false,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { t: 20, b: 50, l: 60, r: 80 },
        font: { color: '#94a3b8', size: 12 },
        xaxis: { title: 'Volatility (%)', gridcolor: 'rgba(255,255,255,0.05)' },
        yaxis: { title: 'Expected Return (%)', gridcolor: 'rgba(255,255,255,0.05)' },
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Portfolio Optimizer</h1>
                    <p className="page-subtitle">Maximize risk-adjusted returns using Modern Portfolio Theory</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 'var(--spacing-lg)' }}>
                {/* Left Panel - Input */}
                <div className="flex flex-col gap-lg">
                    {/* Stock Selection */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Select Stocks</h3>
                        </div>

                        <div className="flex gap-sm mb-lg">
                            <input
                                type="text"
                                className="input"
                                placeholder="Add symbol..."
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                            />
                            <button className="btn btn-primary" onClick={addSymbol}>Add</button>
                        </div>

                        <div className="flex flex-wrap gap-sm">
                            {symbols.map(sym => (
                                <span key={sym} className="badge" style={{
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    color: 'var(--accent-primary)',
                                    padding: 'var(--spacing-xs) var(--spacing-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)'
                                }}>
                                    {sym}
                                    <button
                                        onClick={() => removeSymbol(sym)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                        </div>

                        <p className="text-sm text-muted mt-md">{symbols.length} stocks selected</p>
                    </div>

                    {/* Risk Profile */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Risk Profile</h3>
                        </div>

                        <div className="flex flex-col gap-sm">
                            {riskProfiles.map(profile => (
                                <label
                                    key={profile.id}
                                    className="flex items-center gap-md"
                                    style={{
                                        padding: 'var(--spacing-md)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${selectedRisk === profile.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                        background: selectedRisk === profile.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="risk"
                                        value={profile.id}
                                        checked={selectedRisk === profile.id}
                                        onChange={(e) => setSelectedRisk(e.target.value)}
                                        style={{ accentColor: 'var(--accent-primary)' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div className="font-bold">{profile.name}</div>
                                        <div className="text-xs text-muted">{profile.description}</div>
                                    </div>
                                    <div className="text-right text-xs text-muted">
                                        <div>Max Vol: {profile.maxVol}</div>
                                        <div>Max Pos: {profile.maxPos}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Investment Amount */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Investment Amount</h3>
                        </div>

                        <div className="filter-group">
                            <input
                                type="number"
                                className="input"
                                value={investmentAmount}
                                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                                min="1000"
                                step="1000"
                            />
                            <div className="flex gap-sm mt-md">
                                {[5000, 10000, 25000, 50000].map(amt => (
                                    <button
                                        key={amt}
                                        className={`btn ${investmentAmount === amt ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setInvestmentAmount(amt)}
                                        style={{ flex: 1, padding: 'var(--spacing-sm)' }}
                                    >
                                        ${(amt / 1000)}K
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary w-full mt-lg"
                            onClick={runOptimization}
                            disabled={isLoading || symbols.length < 2}
                        >
                            {isLoading ? 'Optimizing...' : 'Optimize Portfolio'}
                        </button>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="flex flex-col gap-lg">
                    {/* Portfolio Metrics */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card">
                            <span className="stat-label">Expected Return</span>
                            <span className="stat-value value-positive">{result.expected_return}%</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Volatility</span>
                            <span className="stat-value">{result.volatility}%</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Sharpe Ratio</span>
                            <span className="stat-value">{result.sharpe_ratio}</span>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                        {/* Allocation Pie */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Optimal Allocation</h3>
                            </div>
                            <div style={{ height: 280 }}>
                                <Plot
                                    data={pieData}
                                    layout={pieLayout as any}
                                    config={{ displayModeBar: false, responsive: true }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>

                        {/* Efficient Frontier */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Efficient Frontier</h3>
                            </div>
                            <div style={{ height: 280 }}>
                                <Plot
                                    data={frontierChartData}
                                    layout={frontierLayout as any}
                                    config={{ displayModeBar: false, responsive: true }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Allocation Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recommended Allocation</h3>
                            <span className="text-sm text-muted">Total: ${investmentAmount.toLocaleString()}</span>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Name</th>
                                        <th className="text-right">Weight</th>
                                        <th className="text-right">Amount</th>
                                        <th className="text-right">Shares</th>
                                        <th className="text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.allocations.map(alloc => (
                                        <tr key={alloc.symbol}>
                                            <td>
                                                <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                                                    {alloc.symbol}
                                                </span>
                                            </td>
                                            <td className="text-muted">{alloc.name}</td>
                                            <td className="text-right">
                                                <div className="score-indicator" style={{ justifyContent: 'flex-end' }}>
                                                    <span className="font-mono">{alloc.weight}%</span>
                                                    <div className="score-bar" style={{ width: 60 }}>
                                                        <div
                                                            className="score-fill good"
                                                            style={{ width: `${alloc.weight * 4}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-right font-mono">${alloc.amount.toLocaleString()}</td>
                                            <td className="text-right font-mono">{alloc.shares}</td>
                                            <td className="text-right font-mono text-muted">${alloc.price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
