'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Mock backtest data
const mockBacktestResult = {
    start_date: '2023-01-01',
    end_date: '2024-01-01',
    trading_days: 252,
    total_return: 28.5,
    cagr: 28.5,
    volatility: 18.2,
    sharpe_ratio: 1.42,
    sortino_ratio: 2.15,
    max_drawdown: -12.3,
    benchmark_return: 24.2,
    alpha: 4.3,
    beta: 1.08,
    equity_curve: generateEquityCurve(),
};

function generateEquityCurve() {
    const data = [];
    const startDate = new Date('2023-01-01');
    let portfolioValue = 10000;
    let benchmarkValue = 10000;

    for (let i = 0; i < 252; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        // Simulate daily returns
        const portfolioReturn = (Math.random() - 0.48) * 0.02;
        const benchmarkReturn = (Math.random() - 0.48) * 0.018;

        portfolioValue *= (1 + portfolioReturn);
        benchmarkValue *= (1 + benchmarkReturn);

        data.push({
            date: date.toISOString().split('T')[0],
            portfolio: portfolioValue,
            benchmark: benchmarkValue
        });
    }
    return data;
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
    const [result, setResult] = useState(mockBacktestResult);
    const [isLoading, setIsLoading] = useState(false);

    const runBacktest = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setResult(mockBacktestResult);
            setIsLoading(false);
        }, 1000);
    };

    // Chart data
    const equityChartData = [
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
            name: 'Benchmark (SPY)',
            line: { color: '#64748b', width: 2, dash: 'dash' as const },
        }
    ];

    const chartLayout = {
        showlegend: true,
        legend: { orientation: 'h' as const, y: -0.1 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { t: 20, b: 50, l: 60, r: 20 },
        font: { color: '#94a3b8', size: 12 },
        xaxis: {
            gridcolor: 'rgba(255,255,255,0.05)',
            tickformat: '%b %Y',
        },
        yaxis: {
            gridcolor: 'rgba(255,255,255,0.05)',
            tickprefix: '$',
        },
        hovermode: 'x unified' as const,
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Backtest</h1>
                    <p className="page-subtitle">Test your portfolio strategy against historical data</p>
                </div>
            </header>

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
                                <input type="text" className="input" defaultValue="$10,000" />
                            </div>

                            <button
                                className="btn btn-primary w-full mt-md"
                                onClick={runBacktest}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Running...' : 'Run Backtest'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Results */}
                <div className="flex flex-col gap-lg">
                    {/* Performance Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Performance</h3>
                            <div className="flex items-center gap-md">
                                <span className="badge badge-success">
                                    +{result.total_return}%
                                </span>
                                <span className="text-sm text-muted">
                                    vs Benchmark: +{result.benchmark_return}%
                                </span>
                            </div>
                        </div>

                        <div style={{ height: 350 }}>
                            <Plot
                                data={equityChartData}
                                layout={chartLayout as any}
                                config={{ displayModeBar: false, responsive: true }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="stats-grid">
                        <MetricCard
                            label="Total Return"
                            value={`${result.total_return}%`}
                            positive={result.total_return > 0}
                        />
                        <MetricCard
                            label="CAGR"
                            value={`${result.cagr}%`}
                            positive={result.cagr > 0}
                        />
                        <MetricCard
                            label="Sharpe Ratio"
                            value={result.sharpe_ratio.toFixed(2)}
                            positive={result.sharpe_ratio > 1}
                        />
                        <MetricCard
                            label="Sortino Ratio"
                            value={result.sortino_ratio.toFixed(2)}
                            positive={result.sortino_ratio > 1}
                        />
                        <MetricCard
                            label="Volatility"
                            value={`${result.volatility}%`}
                            neutral
                        />
                        <MetricCard
                            label="Max Drawdown"
                            value={`${result.max_drawdown}%`}
                            positive={false}
                        />
                        <MetricCard
                            label="Alpha"
                            value={`${result.alpha > 0 ? '+' : ''}${result.alpha}%`}
                            positive={result.alpha > 0}
                        />
                        <MetricCard
                            label="Beta"
                            value={result.beta.toFixed(2)}
                            neutral
                        />
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
                                        <td className="text-right font-mono value-positive">+{result.total_return}%</td>
                                        <td className="text-right font-mono">+{result.benchmark_return}%</td>
                                        <td className="text-right font-mono value-positive">
                                            +{(result.total_return - result.benchmark_return).toFixed(1)}%
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Volatility</td>
                                        <td className="text-right font-mono">{result.volatility}%</td>
                                        <td className="text-right font-mono">15.8%</td>
                                        <td className="text-right font-mono text-muted">
                                            +{(result.volatility - 15.8).toFixed(1)}%
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Sharpe Ratio</td>
                                        <td className="text-right font-mono value-positive">{result.sharpe_ratio}</td>
                                        <td className="text-right font-mono">1.25</td>
                                        <td className="text-right font-mono value-positive">
                                            +{(result.sharpe_ratio - 1.25).toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Max Drawdown</td>
                                        <td className="text-right font-mono value-negative">{result.max_drawdown}%</td>
                                        <td className="text-right font-mono">-10.5%</td>
                                        <td className="text-right font-mono value-negative">
                                            {(result.max_drawdown - (-10.5)).toFixed(1)}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
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
