'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { exportToCSV, copyToClipboard, ExportColumn } from '@/lib/export';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Position {
    symbol: string;
    name: string;
    shares: number;
    avg_cost: number;
    current_price: number;
    current_value: number;
    gain_loss: number;
    gain_loss_pct: number;
    weight: number;
}

interface Portfolio {
    portfolio_id: number;
    name: string;
    currency: string;
    total_value: number;
    total_cost: number;
    total_gain_loss: number;
    total_gain_loss_pct: number;
    positions: Position[];
    position_count: number;
}

interface Transaction {
    id: number;
    symbol: string;
    transaction_type: string;
    shares: number;
    price: number;
    currency: string;
    created_at: string;
}

export default function PortfolioPage() {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('holdings');
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        symbol: '',
        type: 'buy',
        shares: '',
        price: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [fetchingPrice, setFetchingPrice] = useState(false);
    const [displayCurrency, setDisplayCurrency] = useState('USD');

    // Exchange rates (approximate - in production would fetch live rates)
    const EXCHANGE_RATES: Record<string, { rate: number; symbol: string }> = {
        USD: { rate: 1, symbol: '$' },
        EUR: { rate: 0.92, symbol: '€' },
        GBP: { rate: 0.79, symbol: '£' },
        TRY: { rate: 35.2, symbol: '₺' },
    };

    // Format currency with selected display currency
    const formatCurrency = (usdValue: number): string => {
        const { rate, symbol } = EXCHANGE_RATES[displayCurrency] || EXCHANGE_RATES.USD;
        const converted = usdValue * rate;
        if (displayCurrency === 'TRY') {
            return `${symbol}${converted.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        }
        return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Auto-fetch price when symbol changes
    const handleSymbolChange = async (symbol: string) => {
        setFormData(prev => ({ ...prev, symbol: symbol.toUpperCase() }));

        if (symbol.length >= 1) {
            setFetchingPrice(true);
            try {
                const res = await fetch(`${API_URL}/api/stock/${symbol.toUpperCase()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.current_price) {
                        setFormData(prev => ({ ...prev, price: data.current_price.toFixed(2) }));
                    }
                }
            } catch (e) {
                // Ignore errors, user can enter price manually
            } finally {
                setFetchingPrice(false);
            }
        }
    };

    const fetchPortfolio = useCallback(async () => {
        try {
            setLoading(true);
            // Get or create portfolio
            const res = await fetch(`${API_URL}/api/portfolio`);
            const data = await res.json();

            if (data.portfolios && data.portfolios.length > 0) {
                // Save portfolio ID to localStorage
                localStorage.setItem('nazov_portfolio_id', data.portfolios[0].id.toString());

                // Get detailed summary
                const summaryRes = await fetch(`${API_URL}/api/portfolio/${data.portfolios[0].id}/summary`);
                if (summaryRes.ok) {
                    const summary = await summaryRes.json();
                    setPortfolio(summary);
                    // Save portfolio data to localStorage as backup
                    localStorage.setItem('nazov_portfolio_backup', JSON.stringify(summary));
                }
            } else {
                // Create default portfolio
                const createRes = await fetch(`${API_URL}/api/portfolio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'My Portfolio', currency: 'USD', risk_profile: 'moderate' })
                });
                if (createRes.ok) {
                    const newPortfolio = await createRes.json();
                    localStorage.setItem('nazov_portfolio_id', newPortfolio.portfolio.id.toString());
                    setPortfolio({
                        portfolio_id: newPortfolio.portfolio.id,
                        name: newPortfolio.portfolio.name,
                        currency: 'USD',
                        total_value: 0,
                        total_cost: 0,
                        total_gain_loss: 0,
                        total_gain_loss_pct: 0,
                        positions: [],
                        position_count: 0
                    });
                }
            }
            setError(null);
        } catch (err) {
            console.error('Error fetching portfolio:', err);
            // Try to restore from localStorage backup
            const backup = localStorage.getItem('nazov_portfolio_backup');
            if (backup) {
                try {
                    const parsed = JSON.parse(backup);
                    setPortfolio(parsed);
                    setError('Using cached data - server unavailable');
                } catch {
                    setError('Failed to load portfolio');
                }
            } else {
                setError('Failed to load portfolio');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Try to load from localStorage first for instant UI
        const backup = localStorage.getItem('nazov_portfolio_backup');
        if (backup) {
            try {
                setPortfolio(JSON.parse(backup));
                setLoading(false);
            } catch { }
        }
        // Then fetch fresh data
        fetchPortfolio();
    }, [fetchPortfolio]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!portfolio || !formData.symbol || !formData.shares || !formData.price) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/portfolio/${portfolio.portfolio_id}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: formData.symbol.toUpperCase(),
                    transaction_type: formData.type,
                    shares: parseFloat(formData.shares),
                    price: parseFloat(formData.price),
                    currency: 'USD'
                })
            });

            if (res.ok) {
                setShowAddForm(false);
                setFormData({ symbol: '', type: 'buy', shares: '', price: '' });
                await fetchPortfolio();
            } else {
                const err = await res.json();
                alert(err.detail || 'Failed to add transaction');
            }
        } catch (err) {
            console.error('Error adding transaction:', err);
            alert('Failed to add transaction');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: '#ef4444' }}>{error}</p>
                <button onClick={fetchPortfolio} className="btn btn-primary">Retry</button>
            </div>
        );
    }

    const positions = portfolio?.positions || [];
    const pieData = positions.length > 0 ? [{
        values: positions.map(p => p.weight),
        labels: positions.map(p => p.symbol),
        type: 'pie' as const,
        hole: 0.6,
        textinfo: 'label+percent',
        textposition: 'outside',
        marker: { colors: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'] },
    }] : [];

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">{portfolio?.name || 'Portfolio'}</h1>
                    <p className="page-subtitle">Track your investments and performance</p>
                </div>
                <div className="flex gap-md items-center">
                    <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                        + Add Transaction
                    </button>
                </div>
            </header>

            {/* Add Transaction Modal */}
            {showAddForm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={() => setShowAddForm(false)}>
                    <div style={{
                        backgroundColor: '#161b22', borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '24px', width: '100%', maxWidth: '400px'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                            Add Transaction
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '6px' }}>Symbol</label>
                                <input
                                    type="text"
                                    value={formData.symbol}
                                    onChange={e => handleSymbolChange(e.target.value)}
                                    onBlur={e => handleSymbolChange(e.target.value)}
                                    placeholder="AAPL, MSFT..."
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                        backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', fontSize: '14px', textTransform: 'uppercase'
                                    }}
                                    required
                                />
                                {fetchingPrice && <span style={{ color: '#9ca3af', fontSize: '12px' }}>Loading price...</span>}
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '6px' }}>Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    style={{
                                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                                        backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', fontSize: '14px'
                                    }}
                                >
                                    <option value="buy">Buy</option>
                                    <option value="sell">Sell</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '6px' }}>Shares</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.shares}
                                        onChange={e => setFormData({ ...formData, shares: e.target.value })}
                                        placeholder="100"
                                        style={{
                                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                                            backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white', fontSize: '14px'
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#9ca3af', fontSize: '14px', marginBottom: '6px' }}>Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="150.00"
                                        style={{
                                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                                            backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'white', fontSize: '14px'
                                        }}
                                        required
                                    />
                                </div>
                            </div>
                            {formData.shares && formData.price && (
                                <div style={{
                                    backgroundColor: '#0d1117', borderRadius: '8px', padding: '12px',
                                    marginBottom: '16px', textAlign: 'center'
                                }}>
                                    <span style={{ color: '#9ca3af', fontSize: '14px' }}>Total: </span>
                                    <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
                                        ${(parseFloat(formData.shares) * parseFloat(formData.price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px',
                                        backgroundColor: 'rgba(255,255,255,0.05)', border: 'none',
                                        color: '#9ca3af', fontWeight: '500', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px',
                                        backgroundColor: '#7c3aed', border: 'none',
                                        color: 'white', fontWeight: '500', cursor: 'pointer',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? 'Adding...' : 'Add Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Currency Selector */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', gap: '8px', alignItems: 'center' }}>
                <span className="text-muted text-sm">Display Currency:</span>
                {Object.keys(EXCHANGE_RATES).map((currency) => (
                    <button
                        key={currency}
                        onClick={() => setDisplayCurrency(currency)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: displayCurrency === currency ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.2)',
                            background: displayCurrency === currency ? 'rgba(124,58,237,0.2)' : 'transparent',
                            color: displayCurrency === currency ? '#a855f7' : '#94a3b8',
                            cursor: 'pointer',
                            fontWeight: displayCurrency === currency ? 'bold' : 'normal',
                            fontSize: '13px'
                        }}
                    >
                        {currency}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="stats-grid mb-lg">
                <div className="stat-card">
                    <span className="stat-label">Total Value</span>
                    <span className="stat-value">{formatCurrency(portfolio?.total_value || 0)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Cost</span>
                    <span className="stat-value text-muted">{formatCurrency(portfolio?.total_cost || 0)}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Total Gain/Loss</span>
                    <span className={`stat-value ${(portfolio?.total_gain_loss || 0) >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {(portfolio?.total_gain_loss || 0) >= 0 ? '+' : ''}{formatCurrency(portfolio?.total_gain_loss || 0)}
                    </span>
                    <span className={`stat-change ${(portfolio?.total_gain_loss_pct || 0) >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {(portfolio?.total_gain_loss_pct || 0) >= 0 ? '+' : ''}{(portfolio?.total_gain_loss_pct || 0).toFixed(2)}%
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Positions</span>
                    <span className="stat-value">{positions.length}</span>
                </div>
            </div>

            {positions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>No Holdings Yet</h3>
                    <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
                        Start building your portfolio by adding your first transaction
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                        + Add Your First Stock
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--spacing-lg)' }}>
                    {/* Main Content */}
                    <div className="flex flex-col gap-lg">
                        {/* Tabs */}
                        <div className="tabs">
                            <button className={`tab ${activeTab === 'holdings' ? 'active' : ''}`} onClick={() => setActiveTab('holdings')}>
                                Holdings
                            </button>
                            <button className={`tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
                                Performance
                            </button>
                        </div>

                        {/* Holdings Tab */}
                        {activeTab === 'holdings' && (
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: 0 }}>Holdings</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                const columns: ExportColumn[] = [
                                                    { key: 'symbol', label: 'Symbol' },
                                                    { key: 'name', label: 'Name' },
                                                    { key: 'shares', label: 'Shares' },
                                                    { key: 'avg_cost', label: 'Avg Cost' },
                                                    { key: 'current_price', label: 'Price' },
                                                    { key: 'current_value', label: 'Value' },
                                                    { key: 'gain_loss', label: 'Gain/Loss' },
                                                    { key: 'gain_loss_pct', label: 'Gain %' },
                                                    { key: 'weight', label: 'Weight %' },
                                                ];
                                                exportToCSV(positions as unknown as Record<string, unknown>[], columns, 'portfolio_holdings');
                                            }}
                                            style={{
                                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                                                background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                                                border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer'
                                            }}
                                        >
                                            📥 CSV
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const columns: ExportColumn[] = [
                                                    { key: 'symbol', label: 'Symbol' },
                                                    { key: 'name', label: 'Name' },
                                                    { key: 'shares', label: 'Shares' },
                                                    { key: 'avg_cost', label: 'Avg Cost' },
                                                    { key: 'current_price', label: 'Price' },
                                                    { key: 'current_value', label: 'Value' },
                                                    { key: 'gain_loss', label: 'Gain/Loss' },
                                                    { key: 'weight', label: 'Weight %' },
                                                ];
                                                const success = await copyToClipboard(positions as unknown as Record<string, unknown>[], columns);
                                                if (success) alert('Copied to clipboard! Paste into Excel or Google Sheets.');
                                            }}
                                            style={{
                                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                                                background: 'rgba(16,185,129,0.2)', color: '#6ee7b7',
                                                border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer'
                                            }}
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
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
                                            {positions.map(pos => (
                                                <tr key={pos.symbol}>
                                                    <td>
                                                        <button
                                                            onClick={() => {
                                                                const w = 1200, h = 800;
                                                                const left = (window.screen.width - w) / 2;
                                                                const top = (window.screen.height - h) / 2;
                                                                window.open(`/stock/${pos.symbol}`, `stock_${pos.symbol}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                                            }}
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                color: '#a855f7', fontWeight: 'bold', padding: 0,
                                                                display: 'flex', alignItems: 'center', gap: '4px'
                                                            }}
                                                            title={`Open ${pos.symbol} details`}
                                                        >
                                                            {pos.symbol}
                                                            <span style={{ color: pos.gain_loss >= 0 ? '#10b981' : '#ef4444', fontSize: '14px' }}>
                                                                {pos.gain_loss >= 0 ? '↗' : '↘'}
                                                            </span>
                                                        </button>
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
                                                    <td className="text-right font-mono">{pos.weight}%</td>
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
                                    {[...positions].sort((a, b) => b.gain_loss_pct - a.gain_loss_pct).map(pos => (
                                        <div key={pos.symbol} className="flex items-center gap-lg">
                                            <div style={{ width: 60 }} className="font-bold">{pos.symbol}</div>
                                            <div style={{ flex: 1 }}>
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{
                                                            width: `${Math.min(Math.abs(pos.gain_loss_pct), 100)}%`,
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
                                    layout={{
                                        showlegend: false,
                                        paper_bgcolor: 'transparent',
                                        plot_bgcolor: 'transparent',
                                        margin: { t: 20, b: 20, l: 20, r: 20 },
                                        font: { color: '#94a3b8', size: 11 },
                                        annotations: [{
                                            text: `<b>$${((portfolio?.total_value || 0) / 1000).toFixed(1)}K</b>`,
                                            showarrow: false,
                                            font: { size: 20, color: '#f8fafc' }
                                        }]
                                    } as any}
                                    config={{ displayModeBar: false, responsive: true }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Actions</h3>
                            </div>
                            <div className="flex flex-col gap-sm">
                                <a href="/optimizer" className="btn btn-secondary w-full">
                                    Optimize Portfolio
                                </a>
                                <a href="/screener" className="btn btn-secondary w-full">
                                    Find New Stocks
                                </a>
                                <button onClick={fetchPortfolio} className="btn btn-ghost w-full">
                                    Refresh Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
