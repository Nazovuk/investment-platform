'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface BacktestResult {
    start_date: string;
    end_date: string;
    trading_days: number;
    total_return: number;
    cagr: number;
    volatility: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    benchmark_return: number;
    alpha: number;
    beta: number;
    equity_curve: { date: string; portfolio: number; benchmark: number }[];
}

export default function BacktestPage() {
    const [portfolio, setPortfolio] = useState([
        { symbol: 'AAPL', weight: 25 },
        { symbol: 'MSFT', weight: 25 },
        { symbol: 'GOOGL', weight: 20 },
        { symbol: 'NVDA', weight: 15 },
        { symbol: 'AMZN', weight: 15 },
    ]);
    const [period, setPeriod] = useState('1y');
    const [benchmark, setBenchmark] = useState('SPY');
    const [initialValue, setInitialValue] = useState(10000);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runBacktest = async () => {
        const totalWeight = portfolio.reduce((sum, p) => sum + p.weight, 0);
        if (totalWeight === 0) return;

        setIsLoading(true);
        setError(null);

        try {
            // Build portfolio weights object
            const portfolioWeights: Record<string, number> = {};
            portfolio.forEach(p => {
                if (p.symbol) {
                    portfolioWeights[p.symbol] = p.weight / totalWeight;
                }
            });

            // Calculate dates based on period
            const now = new Date();
            const periodDays: Record<string, number> = {
                '1m': 30, '3m': 90, '6m': 180, '1y': 365, '2y': 730, '5y': 1825
            };
            const days = periodDays[period] || 365;
            const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

            const response = await fetch(`${API_URL}/api/backtest/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    portfolio: portfolioWeights,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: now.toISOString().split('T')[0],
                    initial_value: initialValue,
                    benchmark: benchmark,
                    rebalance_frequency: 'monthly'
                })
            });

            const data = await response.json();

            if (data.success && data.backtest) {
                setResult(data.backtest);
            } else {
                throw new Error(data.error || 'Backtest failed');
            }
        } catch (err) {
            console.error('Backtest error:', err);
            setError('Backtest failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Run initial backtest
    useEffect(() => {
        runBacktest();
    }, []);

    // Chart data
    const equityChartData = result?.equity_curve ? [
        {
            x: result.equity_curve.map(d => d.date),
            y: result.equity_curve.map(d => d.portfolio),
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: 'Portfolio',
            line: { color: '#6366f1', width: 2 },
            fill: 'tonexty' as const,
            fillcolor: 'rgba(99, 102, 241, 0.1)',
        },
        {
            x: result.equity_curve.map(d => d.date),
            y: result.equity_curve.map(d => d.benchmark),
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Benchmark (${benchmark})`,
            line: { color: '#64748b', width: 2, dash: 'dash' as const },
        }
    ] : [];

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Backtest</h1>
                    <p className="page-subtitle">Test your portfolio strategy against historical data</p>
                </div>
                {result && <span className="badge badge-success">Live Data</span>}
            </header>

            {error && (
                <div className="card mb-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '12px' }}>
                    <span style={{ color: '#ef4444' }}>⚠️ {error}</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 'var(--spacing-lg)' }}>
                {/* Left Panel - Configuration */}
                <div className="flex flex-col gap-lg">
                    {/* Portfolio Input */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Portfolio</h3>
                        </div>

                        <div className="flex flex-col gap-md">
                            {portfolio.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-md">
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ width: 80 }}
                                        value={item.symbol}
                                        onChange={(e) => {
                                            const newPortfolio = [...portfolio];
                                            newPortfolio[idx].symbol = e.target.value.toUpperCase();
                                            setPortfolio(newPortfolio);
                                        }}
                                        placeholder="AAPL"
                                    />
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ width: 70 }}
                                        value={item.weight}
                                        onChange={(e) => {
                                            const newPortfolio = [...portfolio];
                                            newPortfolio[idx].weight = Number(e.target.value);
                                            setPortfolio(newPortfolio);
                                        }}
                                        min="0"
                                        max="100"
                                    />
                                    <span className="text-muted">%</span>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => setPortfolio(portfolio.filter((_, i) => i !== idx))}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}

                            <button
                                className="btn btn-secondary"
                                onClick={() => setPortfolio([...portfolio, { symbol: '', weight: 10 }])}
                            >
                                + Add Stock
                            </button>

                            <div className="flex items-center justify-between mt-md">
                                <span className="text-sm text-muted">Total Weight:</span>
                                <span className={`font-bold ${portfolio.reduce((sum, p) => sum + p.weight, 0) === 100 ? 'value-positive' : 'value-negative'}`}>
                                    {portfolio.reduce((sum, p) => sum + p.weight, 0)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Settings</h3>
                        </div>

                        <div className="flex flex-col gap-md">
                            <div className="filter-group">
                                <label className="filter-label">Period</label>
                                <select
                                    className="input select"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                >
                                    <option value="1m">1 Month</option>
                                    <option value="3m">3 Months</option>
                                    <option value="6m">6 Months</option>
                                    <option value="1y">1 Year</option>
                                    <option value="2y">2 Years</option>
                                    <option value="5y">5 Years</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Benchmark</label>
                                <select
                                    className="input select"
                                    value={benchmark}
                                    onChange={(e) => setBenchmark(e.target.value)}
                                >
                                    <option value="SPY">S&P 500 (SPY)</option>
                                    <option value="QQQ">NASDAQ 100 (QQQ)</option>
                                    <option value="DIA">Dow Jones (DIA)</option>
                                    <option value="IWM">Russell 2000 (IWM)</option>
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Initial Investment</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={initialValue}
                                    onChange={(e) => setInitialValue(Number(e.target.value))}
                                    min="1000"
                                    step="1000"
                                />
                            </div>

                            <button
                                className="btn btn-primary w-full mt-md"
                                onClick={runBacktest}
                                disabled={isLoading}
                            >
                                {isLoading ? '⏳ Running Backtest...' : '🚀 Run Backtest'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="flex flex-col gap-lg">
                    {isLoading && !result && (
                        <div className="card text-center" style={{ padding: '48px' }}>
                            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                            <p className="text-muted">Running backtest simulation...</p>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Performance Chart */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Performance</h3>
                                    <div className="flex items-center gap-md">
                                        <span className={`badge ${result.total_return >= 0 ? 'badge-success' : 'badge-danger'}`}>
                                            {result.total_return >= 0 ? '+' : ''}{result.total_return?.toFixed(1)}%
                                        </span>
                                        <span className="text-sm text-muted">
                                            vs Benchmark: {result.benchmark_return >= 0 ? '+' : ''}{result.benchmark_return?.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                <div style={{ height: 350 }}>
                                    <Plot
                                        data={equityChartData}
                                        layout={{
                                            showlegend: true,
                                            legend: { orientation: 'h' as const, y: -0.1 },
                                            paper_bgcolor: 'transparent',
                                            plot_bgcolor: 'transparent',
                                            margin: { t: 20, b: 50, l: 60, r: 20 },
                                            font: { color: '#94a3b8', size: 12 },
                                            xaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickformat: '%b %Y' },
                                            yaxis: { gridcolor: 'rgba(255,255,255,0.05)', tickprefix: '$' },
                                            hovermode: 'x unified' as const,
                                        } as any}
                                        config={{ displayModeBar: false, responsive: true }}
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="stats-grid">
                                <MetricCard label="Total Return" value={`${result.total_return?.toFixed(1)}%`} positive={result.total_return > 0} />
                                <MetricCard label="CAGR" value={`${result.cagr?.toFixed(1)}%`} positive={result.cagr > 0} />
                                <MetricCard label="Sharpe Ratio" value={result.sharpe_ratio?.toFixed(2)} positive={result.sharpe_ratio > 1} />
                                <MetricCard label="Sortino Ratio" value={result.sortino_ratio?.toFixed(2)} positive={result.sortino_ratio > 1} />
                                <MetricCard label="Volatility" value={`${result.volatility?.toFixed(1)}%`} neutral />
                                <MetricCard label="Max Drawdown" value={`${result.max_drawdown?.toFixed(1)}%`} positive={false} />
                                <MetricCard label="Alpha" value={`${result.alpha > 0 ? '+' : ''}${result.alpha?.toFixed(1)}%`} positive={result.alpha > 0} />
                                <MetricCard label="Beta" value={result.beta?.toFixed(2)} neutral />
                            </div>

                            {/* Comparison Table */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Performance Comparison</h3>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Metric</th>
                                                <th className="text-right">Portfolio</th>
                                                <th className="text-right">Benchmark</th>
                                                <th className="text-right">Difference</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Total Return</td>
                                                <td className={`text-right font-mono ${result.total_return >= 0 ? 'value-positive' : 'value-negative'}`}>
                                                    {result.total_return >= 0 ? '+' : ''}{result.total_return?.toFixed(1)}%
                                                </td>
                                                <td className="text-right font-mono">
                                                    {result.benchmark_return >= 0 ? '+' : ''}{result.benchmark_return?.toFixed(1)}%
                                                </td>
                                                <td className={`text-right font-mono ${(result.total_return - result.benchmark_return) >= 0 ? 'value-positive' : 'value-negative'}`}>
                                                    {(result.total_return - result.benchmark_return) >= 0 ? '+' : ''}{(result.total_return - result.benchmark_return)?.toFixed(1)}%
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>Alpha</td>
                                                <td className={`text-right font-mono ${result.alpha >= 0 ? 'value-positive' : 'value-negative'}`}>
                                                    {result.alpha >= 0 ? '+' : ''}{result.alpha?.toFixed(2)}%
                                                </td>
                                                <td className="text-right font-mono text-muted">0.00%</td>
                                                <td className={`text-right font-mono ${result.alpha >= 0 ? 'value-positive' : 'value-negative'}`}>
                                                    {result.alpha >= 0 ? '+' : ''}{result.alpha?.toFixed(2)}%
                                                </td>
                                            </tr>
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

function MetricCard({ label, value, positive, neutral }: {
    label: string;
    value: string;
    positive?: boolean;
    neutral?: boolean;
}) {
    return (
        <div className="stat-card">
            <span className="stat-label">{label}</span>
            <span className={`stat-value ${neutral ? '' : positive ? 'value-positive' : 'value-negative'}`}>
                {value}
            </span>
        </div>
    );
}
