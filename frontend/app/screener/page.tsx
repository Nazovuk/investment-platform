'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { screenerApi, Stock } from '@/lib/api';

type SortKey = 'symbol' | 'score' | 'upside_potential' | 'pe_ratio' | 'peg_ratio' | 'current_price';
type SortDirection = 'asc' | 'desc';

export default function ScreenerPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [filters, setFilters] = useState({
        maxPE: 50,
        maxPEG: 2.0,
        minScore: 50,
        minUpside: 0,
        minRevenueGrowth: 0
    });

    // Fetch stocks from API
    const fetchStocks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await screenerApi.getResults({
                max_pe: filters.maxPE,
                max_peg: filters.maxPEG,
                min_score: filters.minScore,
                min_upside: filters.minUpside / 100,
                min_revenue_growth: filters.minRevenueGrowth / 100
            });

            setStocks(response.results || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch stocks:', err);
            setError('Failed to load stocks. Using cached data.');
            // Keep existing stocks on error
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Initial fetch
    useEffect(() => {
        fetchStocks();
    }, []);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchStocks();
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, [autoRefresh, fetchStocks]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const filteredAndSortedStocks = useMemo(() => {
        let result = [...stocks];

        // Apply search filter (client-side for responsiveness)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.symbol.toLowerCase().includes(term) ||
                s.name?.toLowerCase().includes(term)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            const aVal = a[sortKey] ?? 0;
            const bVal = b[sortKey] ?? 0;
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

        return result;
    }, [stocks, searchTerm, sortKey, sortDir]);

    const getSortIcon = (key: SortKey) => {
        if (sortKey !== key) return '↕';
        return sortDir === 'asc' ? '↑' : '↓';
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    };

    const formatMarketCap = (cap: number) => {
        if (!cap) return '—';
        if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
        if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
        if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
        return `$${cap}`;
    };

    const applyFilters = () => {
        fetchStocks();
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">Stock Screener</h1>
                    <p className="page-subtitle">
                        Find investment opportunities based on your criteria
                        {lastUpdate && (
                            <span className="text-xs text-muted" style={{ marginLeft: '1rem' }}>
                                Last updated: {lastUpdate.toLocaleTimeString()}
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
                        Auto-refresh
                    </label>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchStocks}
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔄'} Refresh
                    </button>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="card mb-lg" style={{
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    padding: 'var(--spacing-md)'
                }}>
                    <span style={{ color: 'var(--danger)' }}>⚠️ {error}</span>
                </div>
            )}

            {/* Filters Panel */}
            <div className="filters-panel">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label className="filter-label">Search</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Symbol or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Max P/E Ratio: {filters.maxPE}</label>
                        <input
                            type="range"
                            className="range-slider"
                            min="5" max="100"
                            value={filters.maxPE}
                            onChange={(e) => setFilters({ ...filters, maxPE: Number(e.target.value) })}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Max PEG Ratio: {filters.maxPEG}</label>
                        <input
                            type="range"
                            className="range-slider"
                            min="0" max="5" step="0.1"
                            value={filters.maxPEG}
                            onChange={(e) => setFilters({ ...filters, maxPEG: Number(e.target.value) })}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Min Score: {filters.minScore}</label>
                        <input
                            type="range"
                            className="range-slider"
                            min="0" max="100"
                            value={filters.minScore}
                            onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Min Upside: {filters.minUpside}%</label>
                        <input
                            type="range"
                            className="range-slider"
                            min="0" max="50"
                            value={filters.minUpside}
                            onChange={(e) => setFilters({ ...filters, minUpside: Number(e.target.value) })}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Min Revenue Growth: {filters.minRevenueGrowth}%</label>
                        <input
                            type="range"
                            className="range-slider"
                            min="0" max="30"
                            value={filters.minRevenueGrowth}
                            onChange={(e) => setFilters({ ...filters, minRevenueGrowth: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-lg">
                    <span className="text-muted text-sm">
                        {isLoading ? 'Loading...' : `Showing ${filteredAndSortedStocks.length} stocks`}
                    </span>
                    <div className="flex gap-md">
                        <button
                            className="btn btn-ghost"
                            onClick={() => {
                                setFilters({ maxPE: 50, maxPEG: 2.0, minScore: 50, minUpside: 0, minRevenueGrowth: 0 });
                            }}
                        >
                            Reset Filters
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={applyFilters}
                            disabled={isLoading}
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="card">
                {isLoading && stocks.length === 0 ? (
                    <div className="text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <div className="spinner" style={{ margin: '0 auto var(--spacing-lg)' }}></div>
                        <p className="text-muted">Loading stock data from yfinance...</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('symbol')}>Symbol {getSortIcon('symbol')}</th>
                                    <th>Name</th>
                                    <th>Sector</th>
                                    <th className="text-right" onClick={() => handleSort('current_price')}>Price {getSortIcon('current_price')}</th>
                                    <th className="text-right" onClick={() => handleSort('pe_ratio')}>P/E {getSortIcon('pe_ratio')}</th>
                                    <th className="text-right" onClick={() => handleSort('peg_ratio')}>PEG {getSortIcon('peg_ratio')}</th>
                                    <th className="text-right">Rev Growth</th>
                                    <th className="text-right">Fair Value</th>
                                    <th className="text-right" onClick={() => handleSort('upside_potential')}>Upside {getSortIcon('upside_potential')}</th>
                                    <th className="text-right" onClick={() => handleSort('score')}>Score {getSortIcon('score')}</th>
                                    <th className="text-right">Market Cap</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedStocks.map((stock) => (
                                    <tr key={stock.symbol}>
                                        <td>
                                            <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>{stock.symbol}</span>
                                        </td>
                                        <td className="truncate" style={{ maxWidth: 180 }}>{stock.name || '—'}</td>
                                        <td>
                                            <span className="badge">{stock.sector || '—'}</span>
                                        </td>
                                        <td className="text-right font-mono">${stock.current_price?.toFixed(2) || '—'}</td>
                                        <td className="text-right font-mono">
                                            {stock.pe_ratio ? stock.pe_ratio.toFixed(1) : '—'}
                                        </td>
                                        <td className="text-right font-mono">
                                            <span className={stock.peg_ratio && stock.peg_ratio < 1 ? 'value-positive' : ''}>
                                                {stock.peg_ratio ? stock.peg_ratio.toFixed(2) : '—'}
                                            </span>
                                        </td>
                                        <td className="text-right font-mono">
                                            <span className={stock.revenue_growth && stock.revenue_growth > 0.1 ? 'value-positive' : ''}>
                                                {stock.revenue_growth ? `${(stock.revenue_growth * 100).toFixed(1)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="text-right font-mono">
                                            {stock.fair_value ? `$${stock.fair_value.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="text-right">
                                            <span className={`font-mono font-bold ${stock.upside_potential && stock.upside_potential > 0 ? 'value-positive' : 'value-negative'}`}>
                                                {stock.upside_potential ? `${stock.upside_potential > 0 ? '+' : ''}${stock.upside_potential.toFixed(1)}%` : '—'}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            {stock.score ? (
                                                <div className="score-indicator">
                                                    <span className="text-sm font-bold">{stock.score}</span>
                                                    <div className="score-bar" style={{ width: 50 }}>
                                                        <div
                                                            className={`score-fill ${getScoreColor(stock.score)}`}
                                                            style={{ width: `${stock.score}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : '—'}
                                        </td>
                                        <td className="text-right font-mono text-muted">
                                            {formatMarketCap(stock.market_cap)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!isLoading && filteredAndSortedStocks.length === 0 && (
                    <div className="text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <p className="text-muted">No stocks match your filters</p>
                        <button
                            className="btn btn-primary mt-lg"
                            onClick={() => {
                                setFilters({ maxPE: 50, maxPEG: 2.0, minScore: 50, minUpside: 0, minRevenueGrowth: 0 });
                                fetchStocks();
                            }}
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Data Source Notice */}
            <div className="text-center text-xs text-muted mt-lg">
                📊 Data source: yfinance (15-minute delay) • Updates every 60 seconds when auto-refresh is enabled
            </div>
        </div>
    );
}
