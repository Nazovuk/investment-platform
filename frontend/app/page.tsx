'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { screenerApi, Stock } from '@/lib/api';

// Dynamic import for Plotly (client-side only)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Mock holdings (would come from portfolio API in full implementation)
const mockHoldings = [
    { symbol: 'AAPL', shares: 50, avgCost: 175.00 },
    { symbol: 'MSFT', shares: 30, avgCost: 380.00 },
    { symbol: 'GOOGL', shares: 25, avgCost: 140.00 },
    { symbol: 'NVDA', shares: 15, avgCost: 450.00 },
    { symbol: 'AMZN', shares: 40, avgCost: 155.00 },
];

export default function DashboardPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [topPicks, setTopPicks] = useState<Stock[]>([]);
    const [holdings, setHoldings] = useState(mockHoldings);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch live stock data
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Fetch top picks from screener
            const response = await screenerApi.getTopPicks(10);
            setTopPicks(response.results || []);

            // Get stock data for holdings
            const holdingSymbols = holdings.map(h => h.symbol);
            const allStocks = response.results || [];

            // Update holdings with current prices
            const updatedStocks = allStocks.filter(s => holdingSymbols.includes(s.symbol));
            setStocks(updatedStocks);

            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [holdings]);

    // Initial fetch
    useEffect(() => {
        fetchData();
    }, []);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchData]);

    // Calculate portfolio metrics
    const portfolioMetrics = {
        totalValue: holdings.reduce((sum, h) => {
            const stock = stocks.find(s => s.symbol === h.symbol);
            const price = stock?.current_price || h.avgCost;
            return sum + (h.shares * price);
        }, 0),
        totalCost: holdings.reduce((sum, h) => sum + (h.shares * h.avgCost), 0),
        positions: holdings.length,
        bestPerformer: stocks.length > 0
            ? stocks.reduce((best, s) => {
                const holding = holdings.find(h => h.symbol === s.symbol);
                if (!holding) return best;
                const gain = ((s.current_price - holding.avgCost) / holding.avgCost) * 100;
                return gain > (best.gain || 0) ? { symbol: s.symbol, gain } : best;
            }, { symbol: '', gain: 0 })
            : { symbol: 'N/A', gain: 0 }
    };

    portfolioMetrics.totalValue = portfolioMetrics.totalValue || 125420.50; // Fallback
    const totalGainLoss = portfolioMetrics.totalValue - portfolioMetrics.totalCost;
    const totalGainLossPct = portfolioMetrics.totalCost > 0
        ? ((totalGainLoss / portfolioMetrics.totalCost) * 100)
        : 0;

    // Pie chart data based on holdings and current prices
    const chartData = holdings.map(h => {
        const stock = stocks.find(s => s.symbol === h.symbol);
        const value = h.shares * (stock?.current_price || h.avgCost);
        return { symbol: h.symbol, value };
    });

    const chartColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome back! Here's your portfolio overview
                        {lastUpdate && (
                            <span className="text-xs text-muted" style={{ marginLeft: '1rem' }}>
                                Updated: {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-md items-center">
                    <label className="flex items-center gap-sm text-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        Live
                    </label>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchData}
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔄'} Refresh
                    </button>
                    <button className="btn btn-primary">
                        + Add Position
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid mb-lg">
                <div className="stat-card">
                    <span className="stat-label">Portfolio Value</span>
                    <span className="stat-value">${portfolioMetrics.totalValue.toLocaleString()}</span>
                    <span className={`stat-change ${totalGainLoss >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {totalGainLoss >= 0 ? '↑' : '↓'} {totalGainLossPct.toFixed(2)}% total
                    </span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Total Gain/Loss</span>
                    <span className={`stat-value ${totalGainLoss >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="stat-change text-muted">
                        From ${portfolioMetrics.totalCost.toLocaleString()} invested
                    </span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Positions</span>
                    <span className="stat-value">{portfolioMetrics.positions}</span>
                    <span className="stat-change text-muted">Active holdings</span>
                </div>

                <div className="stat-card">
                    <span className="stat-label">Best Performer</span>
                    <span className="stat-value">{portfolioMetrics.bestPerformer.symbol}</span>
                    <span className="stat-change value-positive">
                        +{portfolioMetrics.bestPerformer.gain.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {/* Portfolio Allocation Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Portfolio Allocation</h3>
                        <span className={`badge ${isLoading ? 'badge-warning' : 'badge-success'}`}>
                            {isLoading ? 'Updating...' : 'Live'}
                        </span>
                    </div>
                    <Plot
                        data={[
                            {
                                values: chartData.map(d => d.value),
                                labels: chartData.map(d => d.symbol),
                                type: 'pie',
                                hole: 0.6,
                                marker: { colors: chartColors },
                                textinfo: 'label+percent',
                                textposition: 'outside',
                                textfont: { color: '#f8fafc', size: 12 },
                                hovertemplate: '%{label}<br>$%{value:,.0f}<br>%{percent}<extra></extra>',
                            },
                        ]}
                        layout={{
                            showlegend: true,
                            legend: {
                                orientation: 'h',
                                y: -0.1,
                                font: { color: '#94a3b8', size: 11 }
                            },
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            margin: { t: 20, b: 60, l: 20, r: 20 },
                            height: 320,
                            annotations: [
                                {
                                    text: `$${(portfolioMetrics.totalValue / 1000).toFixed(0)}K`,
                                    x: 0.5,
                                    y: 0.5,
                                    font: { size: 24, color: '#f8fafc', family: 'Inter' },
                                    showarrow: false,
                                },
                            ],
                        }}
                        config={{ displayModeBar: false }}
                        style={{ width: '100%' }}
                    />
                </div>

                {/* Holdings Table */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Holdings</h3>
                        <span className="text-sm text-muted">{holdings.length} positions</span>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th className="text-right">Shares</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Value</th>
                                    <th className="text-right">Gain/Loss</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((holding) => {
                                    const stock = stocks.find(s => s.symbol === holding.symbol);
                                    const currentPrice = stock?.current_price || holding.avgCost;
                                    const value = holding.shares * currentPrice;
                                    const costBasis = holding.shares * holding.avgCost;
                                    const gainLoss = value - costBasis;
                                    const gainLossPct = ((currentPrice - holding.avgCost) / holding.avgCost) * 100;

                                    return (
                                        <tr key={holding.symbol}>
                                            <td>
                                                <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                                                    {holding.symbol}
                                                </span>
                                            </td>
                                            <td className="text-right font-mono">{holding.shares}</td>
                                            <td className="text-right font-mono">
                                                ${currentPrice.toFixed(2)}
                                                {stock && <span className="text-xs text-muted"> live</span>}
                                            </td>
                                            <td className="text-right font-mono">${value.toLocaleString()}</td>
                                            <td className={`text-right font-mono ${gainLoss >= 0 ? 'value-positive' : 'value-negative'}`}>
                                                {gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Top Picks Section */}
            <div className="card mt-lg">
                <div className="card-header">
                    <h3 className="card-title">🔥 Top AI Picks</h3>
                    <a href="/ai" className="btn btn-ghost">View All →</a>
                </div>
                {isLoading && topPicks.length === 0 ? (
                    <div className="text-center" style={{ padding: 'var(--spacing-lg)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                        {topPicks.slice(0, 5).map((stock, idx) => (
                            <div key={stock.symbol} className="glass-card" style={{ padding: 'var(--spacing-md)' }}>
                                <div className="flex items-center justify-between mb-sm">
                                    <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>{stock.symbol}</span>
                                    <span className="badge">#{idx + 1}</span>
                                </div>
                                <div className="text-sm text-muted mb-sm truncate">{stock.name}</div>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono">${stock.current_price?.toFixed(2)}</span>
                                    <span className={`font-bold ${(stock.upside_potential || 0) >= 0 ? 'value-positive' : 'value-negative'}`}>
                                        {(stock.upside_potential || 0) >= 0 ? '+' : ''}{(stock.upside_potential || 0).toFixed(1)}%
                                    </span>
                                </div>
                                {stock.score && (
                                    <div className="progress-bar mt-sm" style={{ height: 4 }}>
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${stock.score}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Market Status */}
            <div className="flex justify-between items-center mt-lg text-sm text-muted">
                <span>📊 Data: yfinance (15-min delay) • Auto-updates every 60s</span>
                <span>Market: {new Date().getHours() >= 9 && new Date().getHours() < 16 ? '🟢 Open' : '🔴 Closed'}</span>
            </div>
        </div>
    );
}
