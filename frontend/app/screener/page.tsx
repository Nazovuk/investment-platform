'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { screenerApi, Stock } from '@/lib/api';
import { exportToCSV, copyToClipboard, ExportColumn } from '@/lib/export';

type SortKey = 'symbol' | 'score' | 'upside_potential' | 'pe_ratio' | 'peg_ratio' | 'current_price';
type SortDirection = 'asc' | 'desc';

export default function ScreenerPage() {
    const router = useRouter();
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const [filters, setFilters] = useState({
        maxPE: 0,
        maxPEG: 0,
        minScore: 0,
        minUpside: 0,
        sector: '',
        market: ''
    });

    const fetchStocks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setHasSearched(true);

            const response = await screenerApi.getResults({
                search: searchTerm || undefined,
                max_pe: filters.maxPE > 0 ? filters.maxPE : undefined,
                max_peg: filters.maxPEG > 0 ? filters.maxPEG : undefined,
                min_score: filters.minScore > 0 ? filters.minScore : undefined,
                min_upside: filters.minUpside > 0 ? filters.minUpside / 100 : undefined,
                sector: filters.sector || undefined,
                market: filters.market || undefined
            });

            setStocks(response.results || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch stocks:', err);
            setError('Failed to load stocks.');
        } finally {
            setIsLoading(false);
        }
    }, [filters, searchTerm]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStocks();
    };

    useEffect(() => {
        if (!autoRefresh || !hasSearched) return;
        const interval = setInterval(fetchStocks, 60000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchStocks, hasSearched]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const handleStockClick = (symbol: string) => {
        window.open(`/stock/${symbol}`, `stock_${symbol}`, 'width=1200,height=800,resizable=yes,scrollbars=yes');
    };

    const filteredAndSortedStocks = useMemo(() => {
        let result = [...stocks];
        result.sort((a, b) => {
            const aVal = a[sortKey] ?? 0;
            const bVal = b[sortKey] ?? 0;
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
        return result;
    }, [stocks, sortKey, sortDir]);

    const getSortIcon = (key: SortKey) => sortKey !== key ? '↕' : sortDir === 'asc' ? '↑' : '↓';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white mb-1">Stock Screener</h1>
                    <p className="text-slate-400 text-sm">Filter and analyze S&P 500 stocks with live data</p>
                </div>

                {/* Compact Filter Panel */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 mb-6">
                    {/* Search Row */}
                    <form onSubmit={handleSearchSubmit} className="mb-4">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                                    placeholder="Search symbol (e.g., AAPL, MSFT)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                {isLoading ? 'Loading...' : 'Search'}
                            </button>
                        </div>
                    </form>

                    {/* Filter Grid - Compact */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {/* Market */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Market</label>
                            <select
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                value={filters.market}
                                onChange={(e) => setFilters({ ...filters, market: e.target.value })}
                            >
                                <option value="">All Markets</option>
                                <option value="S&P 500">S&P 500</option>
                                <option value="NASDAQ 100">NASDAQ 100</option>
                                <option value="FTSE 100">FTSE 100</option>
                            </select>
                        </div>

                        {/* Sector */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Sector</label>
                            <select
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                value={filters.sector}
                                onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                            >
                                <option value="">All Sectors</option>
                                <option value="Technology">Technology</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Financial Services">Financial</option>
                                <option value="Consumer Cyclical">Consumer</option>
                                <option value="Industrials">Industrials</option>
                                <option value="Energy">Energy</option>
                            </select>
                        </div>

                        {/* Max P/E */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Max P/E</label>
                            <input
                                type="number"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                placeholder="Any"
                                value={filters.maxPE || ''}
                                onChange={(e) => setFilters({ ...filters, maxPE: Number(e.target.value) })}
                            />
                        </div>

                        {/* Max PEG */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Max PEG</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                placeholder="Any"
                                value={filters.maxPEG || ''}
                                onChange={(e) => setFilters({ ...filters, maxPEG: Number(e.target.value) })}
                            />
                        </div>

                        {/* Min Score */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Min Score</label>
                            <input
                                type="number"
                                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                placeholder="0"
                                value={filters.minScore || ''}
                                onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-end gap-2">
                            <button
                                onClick={fetchStocks}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg font-medium text-sm transition-colors"
                            >
                                Apply
                            </button>
                            <button
                                onClick={() => {
                                    setFilters({ maxPE: 0, maxPEG: 0, minScore: 0, minUpside: 0, sector: '', market: '' });
                                    setSearchTerm('');
                                    setStocks([]);
                                    setHasSearched(false);
                                }}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden">
                    {/* Results Header */}
                    <div className="flex justify-between items-center px-5 py-3 border-b border-slate-700/50 bg-slate-800/30">
                        <div className="flex items-center gap-3">
                            <span className="text-white font-medium">Results</span>
                            <span className="text-slate-400 text-sm">({stocks.length} stocks)</span>
                            {lastUpdate && (
                                <span className="text-slate-500 text-xs">Updated: {lastUpdate.toLocaleTimeString()}</span>
                            )}
                        </div>
                        {stocks.length > 0 && (
                            <div className="flex gap-2">
                                <button
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                                    onClick={() => copyToClipboard(stocks as any, [])}
                                >
                                    Copy
                                </button>
                                <button
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                                    onClick={() => exportToCSV(stocks as any, [], 'screener')}
                                >
                                    Export CSV
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Empty State */}
                    {!hasSearched && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="text-4xl mb-3">📊</div>
                            <h3 className="text-lg font-medium text-white mb-1">Ready to Screen</h3>
                            <p className="text-slate-400 text-sm max-w-sm">
                                Select a market, apply filters, and click "Apply" to scan stocks
                            </p>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-slate-400 text-sm">Fetching market data...</p>
                        </div>
                    )}

                    {/* No Results */}
                    {hasSearched && !isLoading && stocks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="text-4xl mb-3">🔍</div>
                            <h3 className="text-lg font-medium text-white mb-1">No Matches</h3>
                            <p className="text-slate-400 text-sm">Try adjusting your filters</p>
                        </div>
                    )}

                    {/* Results Table */}
                    {stocks.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50">
                                    <tr className="text-left text-xs text-slate-400 uppercase">
                                        <th className="px-4 py-3 font-medium cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                                            Symbol {getSortIcon('symbol')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('current_price')}>
                                            Price {getSortIcon('current_price')}
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('pe_ratio')}>
                                            P/E {getSortIcon('pe_ratio')}
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('score')}>
                                            Score {getSortIcon('score')}
                                        </th>
                                        <th className="px-4 py-3 font-medium text-right cursor-pointer hover:text-white" onClick={() => handleSort('upside_potential')}>
                                            Upside {getSortIcon('upside_potential')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">Sector</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredAndSortedStocks.slice(0, 100).map((stock: any) => (
                                        <tr
                                            key={stock.symbol}
                                            className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                                            onClick={() => handleStockClick(stock.symbol)}
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-medium text-indigo-400">{stock.symbol}</span>
                                            </td>
                                            <td className="px-4 py-3 text-white text-sm">{stock.name || stock.symbol}</td>
                                            <td className="px-4 py-3 text-right text-white font-mono text-sm">
                                                ${(stock.current_price || stock.price)?.toFixed(2) || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-300 font-mono text-sm">
                                                {(stock.pe_ratio || stock.pe)?.toFixed(1) || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-mono text-sm ${(stock.score || 0) >= 70 ? 'text-emerald-400' : (stock.score || 0) >= 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                                                    {stock.score?.toFixed(0) || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-mono text-sm ${(stock.upside_potential || stock.upside || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {((stock.upside_potential || stock.upside) || 0) > 0 ? '+' : ''}{(stock.upside_potential || stock.upside)?.toFixed(1) || 0}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-sm">{stock.sector || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {stocks.length > 100 && (
                                <div className="text-center py-3 text-slate-500 text-sm border-t border-slate-700/50">
                                    Showing 100 of {stocks.length} results
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
