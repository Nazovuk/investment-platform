'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { screenerApi, Stock } from '@/lib/api';

// Dynamic import for Plotly (client-side only)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MarketIndex {
    symbol: string;
    name: string;
    emoji: string;
    price: number;
    change: number;
    change_percent: number;
}

interface Currency {
    code: string;
    name: string;
    emoji: string;
    rate: number;
    change_percent: number;
}

interface PortfolioPosition {
    symbol: string;
    name: string;
    shares: number;
    avg_cost: number;
    current_price: number;
    prev_close: number;
    daily_change_pct: number;
    current_value: number;
    gain_loss: number;
    gain_loss_pct: number;
    weight: number;
}

interface PortfolioSummary {
    portfolio_id: number;
    name: string;
    total_value: number;
    total_cost: number;
    total_gain_loss: number;
    total_gain_loss_pct: number;
    daily_change_value: number;
    daily_change_pct: number;
    positions: PortfolioPosition[];
    position_count: number;
}

export default function DashboardPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [topPicks, setTopPicks] = useState<Stock[]>([]);
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);

    // Fetch live stock data and portfolio
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Fetch top picks from screener
            const response = await screenerApi.getTopPicks(10);
            setTopPicks(response.results || []);
            setStocks(response.results || []);

            // Fetch real portfolio data
            try {
                const portfolioRes = await fetch(`${API_URL}/api/portfolio`);
                if (portfolioRes.ok) {
                    const portfolioData = await portfolioRes.json();
                    if (portfolioData.portfolios && portfolioData.portfolios.length > 0) {
                        const summaryRes = await fetch(`${API_URL}/api/portfolio/${portfolioData.portfolios[0].id}/summary`);
                        if (summaryRes.ok) {
                            const summary = await summaryRes.json();
                            setPortfolio(summary);
                        }
                    }
                }
            } catch (e) {
                console.warn('Portfolio fetch failed:', e);
            }

            // Fetch market data
            try {
                const marketRes = await fetch(`${API_URL}/api/market/summary`);
                if (marketRes.ok) {
                    const marketData = await marketRes.json();
                    setIndices(marketData.indices || []);
                    setCurrencies(marketData.currencies || []);
                }
            } catch (e) {
                console.warn('Market data fetch failed:', e);
            }

            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

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

    // Portfolio metrics from real data
    const portfolioMetrics = {
        totalValue: portfolio?.total_value || 0,
        totalCost: portfolio?.total_cost || 0,
        positions: portfolio?.position_count || 0,
        bestPerformer: portfolio?.positions?.length
            ? portfolio.positions.reduce((best, p) =>
                p.gain_loss_pct > (best.gain || 0) ? { symbol: p.symbol, gain: p.gain_loss_pct } : best
                , { symbol: '', gain: 0 })
            : { symbol: 'N/A', gain: 0 }
    };

    const totalGainLoss = portfolio?.total_gain_loss || 0;
    const totalGainLossPct = portfolio?.total_gain_loss_pct || 0;

    // Pie chart data from real portfolio
    const chartData = portfolio?.positions?.map(p => ({
        symbol: p.symbol,
        value: p.current_value
    })) || [];

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

            {/* Market Ticker Bar */}
            {(indices.length > 0 || currencies.length > 0) && (
                <div className="mb-lg" style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'rgba(99, 102, 241, 0.08)',
                    borderRadius: '12px',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    overflowX: 'auto',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    {/* Indices */}
                    {indices.map((idx) => (
                        <div key={idx.symbol} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            minWidth: '140px',
                        }}>
                            <span style={{ fontSize: '18px' }}>{idx.emoji}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>{idx.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                                        {idx.price > 100 ? idx.price.toLocaleString() : idx.price.toFixed(2)}
                                    </span>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: idx.change_percent >= 0 ? '#10b981' : '#ef4444',
                                    }}>
                                        {idx.change_percent >= 0 ? '+' : ''}{idx.change_percent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Divider */}
                    {indices.length > 0 && currencies.length > 0 && (
                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
                    )}

                    {/* Currencies */}
                    {currencies.map((curr) => (
                        <div key={curr.code} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px',
                            minWidth: '120px',
                        }}>
                            <span style={{ fontSize: '18px' }}>{curr.emoji}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>{curr.code}/USD</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                                        ${curr.rate.toFixed(4)}
                                    </span>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: curr.change_percent >= 0 ? '#10b981' : '#ef4444',
                                    }}>
                                        {curr.change_percent >= 0 ? '+' : ''}{curr.change_percent.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Cards - Enhanced */}
            <div className="stats-grid mb-lg">
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <span className="stat-label">💼 Portfolio Value</span>
                    <span className="stat-value" style={{ fontSize: '28px' }}>${portfolioMetrics.totalValue.toLocaleString()}</span>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Today</span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: (portfolio?.daily_change_pct || 0) >= 0 ? '#10b981' : '#ef4444'
                            }}>
                                {(portfolio?.daily_change_pct || 0) >= 0 ? '↑' : '↓'} {Math.abs(portfolio?.daily_change_pct || 0).toFixed(2)}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Total</span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: totalGainLossPct >= 0 ? '#10b981' : '#ef4444'
                            }}>
                                {totalGainLossPct >= 0 ? '↑' : '↓'} {Math.abs(totalGainLossPct).toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: totalGainLoss >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.1) 100%)' : 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.1) 100%)', border: `1px solid ${totalGainLoss >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    <span className="stat-label">{totalGainLoss >= 0 ? '📈' : '📉'} Total Gain/Loss</span>
                    <span className={`stat-value`} style={{ fontSize: '28px', color: totalGainLoss >= 0 ? '#10b981' : '#ef4444' }}>
                        {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Today $</span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: (portfolio?.daily_change_value || 0) >= 0 ? '#10b981' : '#ef4444'
                            }}>
                                {(portfolio?.daily_change_value || 0) >= 0 ? '+' : ''}${(portfolio?.daily_change_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase' }}>Invested</span>
                            <span style={{ fontSize: '14px', color: '#d1d5db' }}>
                                ${portfolioMetrics.totalCost.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(139,92,246,0.1) 100%)', border: '1px solid rgba(168,85,247,0.3)' }}>
                    <span className="stat-label">📊 Positions</span>
                    <span className="stat-value" style={{ fontSize: '28px' }}>{portfolioMetrics.positions}</span>
                    <span className="stat-change text-muted" style={{ marginTop: '8px' }}>
                        Active holdings in portfolio
                    </span>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(219,39,119,0.1) 100%)', border: '1px solid rgba(236,72,153,0.3)' }}>
                    <span className="stat-label">🏆 Best Performer</span>
                    <span className="stat-value" style={{ fontSize: '28px' }}>{portfolioMetrics.bestPerformer.symbol || 'N/A'}</span>
                    <span className="stat-change" style={{ marginTop: '8px', color: '#10b981', fontWeight: '600' }}>
                        {portfolioMetrics.bestPerformer.gain > 0 ? `+${portfolioMetrics.bestPerformer.gain.toFixed(1)}%` : 'N/A'}
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
                        <h3 className="card-title">📋 Holdings</h3>
                        <span className="text-sm text-muted">{portfolio?.position_count || 0} positions</span>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th className="text-right">Shares</th>
                                    <th className="text-right">Price</th>
                                    <th className="text-right">Today %</th>
                                    <th className="text-right">Value</th>
                                    <th className="text-right">Total Gain</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolio?.positions?.length ? (
                                    portfolio.positions.map((pos) => (
                                        <tr key={pos.symbol}>
                                            <td>
                                                <button
                                                    onClick={() => {
                                                        const w = 1200, h = 800;
                                                        const left = (window.screen.width - w) / 2;
                                                        const top = (window.screen.height - h) / 2;
                                                        window.open(`/stock/${pos.symbol}`, `stock_${pos.symbol}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold', padding: 0 }}
                                                >
                                                    {pos.symbol} ↗
                                                </button>
                                            </td>
                                            <td className="text-right font-mono">{pos.shares}</td>
                                            <td className="text-right font-mono">
                                                ${pos.current_price.toFixed(2)}
                                            </td>
                                            <td className="text-right font-mono" style={{
                                                color: pos.daily_change_pct >= 0 ? '#10b981' : '#ef4444',
                                                fontWeight: '600'
                                            }}>
                                                {pos.daily_change_pct >= 0 ? '+' : ''}{pos.daily_change_pct.toFixed(2)}%
                                            </td>
                                            <td className="text-right font-mono">${pos.current_value.toLocaleString()}</td>
                                            <td className={`text-right font-mono ${pos.gain_loss >= 0 ? 'value-positive' : 'value-negative'}`}>
                                                {pos.gain_loss >= 0 ? '+' : ''}{pos.gain_loss_pct.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center text-muted" style={{ padding: '24px' }}>
                                            No holdings yet. <a href="/portfolio" style={{ color: '#a855f7' }}>Add your first position →</a>
                                        </td>
                                    </tr>
                                )}
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
                                    <button
                                        onClick={() => {
                                            const w = 1200, h = 800;
                                            const left = (window.screen.width - w) / 2;
                                            const top = (window.screen.height - h) / 2;
                                            window.open(`/stock/${stock.symbol}`, `stock_${stock.symbol}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                        }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold', padding: 0 }}
                                    >
                                        {stock.symbol} ↗
                                    </button>
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
