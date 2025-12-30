'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const riskProfiles = [
    { id: 'conservative', name: 'Conservative', description: 'Lower risk, stable returns', maxVol: '10%', maxPos: '15%' },
    { id: 'moderate', name: 'Moderate', description: 'Balanced risk and return', maxVol: '20%', maxPos: '25%' },
    { id: 'aggressive', name: 'Aggressive', description: 'Higher risk, higher returns', maxVol: '35%', maxPos: '35%' },
    { id: 'ultra_aggressive', name: 'Ultra Aggressive', description: 'Maximum growth', maxVol: '50%', maxPos: '50%' },
];

interface Allocation {
    symbol: string;
    name: string;
    weight: number;
    amount: number;
    shares: number;
    price: number;
}

interface OptimizationResult {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    allocations: Allocation[];
}

export default function OptimizerPage() {
    const [symbols, setSymbols] = useState(['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMZN']);
    const [newSymbol, setNewSymbol] = useState('');
    const [investmentAmount, setInvestmentAmount] = useState(10000);
    const [selectedRisk, setSelectedRisk] = useState('moderate');
    const [result, setResult] = useState<OptimizationResult | null>(null);
    const [frontier, setFrontier] = useState<{ volatility: number; return: number; sharpe: number }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addSymbol = () => {
        if (newSymbol && !symbols.includes(newSymbol.toUpperCase())) {
            setSymbols([...symbols, newSymbol.toUpperCase()]);
            setNewSymbol('');
        }
    };

    const removeSymbol = (sym: string) => {
        setSymbols(symbols.filter(s => s !== sym));
    };

    const runOptimization = async () => {
        if (symbols.length < 2) return;

        setIsLoading(true);
        setError(null);

        try {
            // Call optimization API
            const optRes = await fetch(`${API_URL}/api/optimizer/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbols: symbols,
                    investment_amount: investmentAmount,
                    risk_profile: selectedRisk,
                    min_weight: 0.02,
                    period: '2y'
                })
            });

            if (optRes.ok) {
                const data = await optRes.json();
                setResult({
                    expected_return: data.optimization.expected_return,
                    volatility: data.optimization.volatility,
                    sharpe_ratio: data.optimization.sharpe_ratio,
                    allocations: data.allocations
                });
            } else {
                throw new Error('Optimization failed');
            }

            // Get efficient frontier
            const frontierRes = await fetch(`${API_URL}/api/optimizer/efficient-frontier?symbols=${symbols.join(',')}&n_portfolios=50`);
            if (frontierRes.ok) {
                const frontierData = await frontierRes.json();
                setFrontier(frontierData.frontier || []);
            }
        } catch (err) {
            console.error('Optimization error:', err);
            setError('Optimization failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Run initial optimization
    useEffect(() => {
        runOptimization();
    }, []);

    // Pie chart for allocation
    const pieData = result?.allocations && result.allocations.length > 0 ? [{
        values: result.allocations.map(a => a.weight),
        labels: result.allocations.map(a => a.symbol),
        type: 'pie' as const,
        hole: 0.55,
        textinfo: 'label+percent',
        textposition: 'outside',
        marker: {
            colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308']
        },
    }] : [];

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

    // Efficient frontier chart
    const frontierChartData = frontier.length > 0 ? [{
        x: frontier.map(d => d.volatility),
        y: frontier.map(d => d.return),
        type: 'scatter' as const,
        mode: 'markers' as const,
        marker: {
            size: 8,
            color: frontier.map(d => d.sharpe),
            colorscale: 'Viridis',
            showscale: true,
            colorbar: { title: 'Sharpe', tickfont: { color: '#94a3b8' } }
        },
        hovertemplate: 'Vol: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>'
    }, result ? {
        x: [result.volatility],
        y: [result.expected_return],
        type: 'scatter' as const,
        mode: 'markers' as const,
        name: 'Optimal',
        marker: { size: 15, color: '#f43f5e', symbol: 'star' },
    } : null].filter(Boolean) : [];

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Portfolio Optimizer</h1>
                    <p className="page-subtitle">Maximize risk-adjusted returns using Modern Portfolio Theory</p>
                </div>
                {result && (
                    <span className="badge badge-success">Live Data</span>
                )}
            </header>

            {error && (
                <div className="card mb-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '12px' }}>
                    <span style={{ color: '#ef4444' }}>⚠️ {error}</span>
                </div>
            )}

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
                                        cursor: 'pointer'
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
                            {isLoading ? '⏳ Optimizing...' : '🚀 Optimize Portfolio'}
                        </button>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="flex flex-col gap-lg">
                    {/* Portfolio Metrics */}
                    {result && (
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
                    )}

                    {isLoading && !result && (
                        <div className="card text-center" style={{ padding: '48px' }}>
                            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                            <p className="text-muted">Running Mean-Variance Optimization...</p>
                        </div>
                    )}

                    {result && (
                        <>
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
                                            data={frontierChartData as any}
                                            layout={{
                                                showlegend: false,
                                                paper_bgcolor: 'transparent',
                                                plot_bgcolor: 'transparent',
                                                margin: { t: 20, b: 50, l: 60, r: 80 },
                                                font: { color: '#94a3b8', size: 12 },
                                                xaxis: { title: 'Volatility (%)', gridcolor: 'rgba(255,255,255,0.05)' },
                                                yaxis: { title: 'Expected Return (%)', gridcolor: 'rgba(255,255,255,0.05)' },
                                            } as any}
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
                                                        <button
                                                            onClick={() => {
                                                                const w = 1200, h = 800;
                                                                const left = (window.screen.width - w) / 2;
                                                                const top = (window.screen.height - h) / 2;
                                                                window.open(`/stock/${alloc.symbol}`, `stock_${alloc.symbol}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold', padding: 0 }}
                                                        >
                                                            {alloc.symbol} ↗
                                                        </button>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
