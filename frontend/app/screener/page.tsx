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

    // Start with isLoading false because we are waiting for user input
    const [isLoading, setIsLoading] = useState(false);

    // Track if a search has been performed at least once
    const [hasSearched, setHasSearched] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    // Filters - default values that show all stocks
    const [filters, setFilters] = useState({
        maxPE: 0,       // 0 = no limit
        maxPEG: 0,      // 0 = no limit
        minScore: 0,    // 0 = no minimum
        minUpside: 0,   // 0 = no minimum
        sector: ''
    });

    // Fetch stocks from API
    const fetchStocks = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            setHasSearched(true); // Mark that we have attempted a search

            const response = await screenerApi.getResults({
                search: searchTerm || undefined,
                max_pe: filters.maxPE > 0 ? filters.maxPE : undefined,
                max_peg: filters.maxPEG > 0 ? filters.maxPEG : undefined,
                min_score: filters.minScore > 0 ? filters.minScore : undefined,
                min_upside: filters.minUpside > 0 ? filters.minUpside / 100 : undefined,
                sector: filters.sector || undefined
            });

            setStocks(response.results || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch stocks:', err);
            setError('Failed to load stocks. Using cached data.');
        } finally {
            setIsLoading(false);
        }
    }, [filters, searchTerm]); // Added searchTerm to be explicit, but we invoke manually mostly

    // Handle Search Submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchStocks();
    };

    // Auto-refresh ONLY works if we have searched already
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
        const width = 1200;
        const height = 800;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        window.open(
            `/stock/${symbol}`,
            `stock_${symbol}`,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    };

    const filteredAndSortedStocks = useMemo(() => {
        let result = [...stocks];
        // Sort
        result.sort((a, b) => {
            const aVal = a[sortKey] ?? 0;
            const bVal = b[sortKey] ?? 0;
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
        return result;
    }, [stocks, sortKey, sortDir]);

    const getSortIcon = (key: SortKey) => sortKey !== key ? '↕' : sortDir === 'asc' ? '↑' : '↓';

    return (
        <div className="container mx-auto p-4 max-w-[1600px]">
            {/* Modern Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        Market Screener
                    </h1>
                    <p className="text-muted mt-1">
                        Analyze top opportunities or search any global ticker
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-card/50 p-2 rounded-lg border border-white/5">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-2">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="accent-indigo-500 w-4 h-4"
                            disabled={!hasSearched} // Disable auto-refresh until searched
                        />
                        <span className={`text-gray-300 ${!hasSearched ? 'opacity-50' : ''}`}>Live Updates</span>
                    </label>
                    <div className="h-6 w-px bg-white/10"></div>
                    <button
                        onClick={fetchStocks}
                        className="flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 transition-all border border-indigo-500/20"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        )}
                        Refresh
                    </button>
                </div>
            </div>

            {/* Main Control Panel - Glassmorphism */}
            <div className="bg-[#1a1a26]/80 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8 shadow-xl">

                {/* Search Bar - Prominent */}
                <form onSubmit={handleSearchSubmit} className="mb-8 relative">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-6 w-6 text-gray-400 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-4 bg-[#0f0f15] border border-white/10 rounded-lg text-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner"
                            placeholder="Type a symbol (e.g., TSLA, ONDS, NVDA) or leave empty to screen top stocks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-medium transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            Search
                        </button>
                    </div>
                </form>

                <div className="h-px bg-white/5 mb-8"></div>

                {/* Filters Grid - 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Column 1: Sector & Score */}
                    <div className="space-y-6">
                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                            <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Sector</label>
                            <select
                                className="w-full bg-[#0a0a0f] border border-gray-700 rounded-md py-2 px-3 text-white focus:border-indigo-500 outline-none"
                                value={filters.sector}
                                onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                            >
                                <option value="">All Sectors</option>
                                <option value="Technology">Technology</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Financial Services">Financial</option>
                                <option value="Consumer Cyclical">Consumer Cyclical</option>
                                <option value="Consumer Defensive">Consumer Defensive</option>
                                <option value="Industrials">Industrials</option>
                                <option value="Energy">Energy</option>
                                <option value="Communication Services">Communication</option>
                                <option value="Real Estate">Real Estate</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Materials">Materials</option>
                            </select>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-300">Min Score</label>
                                <span className="text-indigo-400 font-mono">{filters.minScore || '0'}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="100" step="10"
                                value={filters.minScore}
                                onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Column 2: Valuation (P/E & PEG) */}
                    <div className="space-y-6">
                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-300">Max P/E Ratio</label>
                                <span className="text-indigo-400 font-mono">{filters.maxPE || 'Unlimited'}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="200" step="5"
                                value={filters.maxPE}
                                onChange={(e) => setFilters({ ...filters, maxPE: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-300">Max PEG Ratio</label>
                                <span className="text-indigo-400 font-mono">{filters.maxPEG || 'Unlimited'}</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="5" step="0.5"
                                value={filters.maxPEG}
                                onChange={(e) => setFilters({ ...filters, maxPEG: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Column 3: Upside & Actions */}
                    <div className="space-y-6">
                        <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                            <div className="flex justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-300">Min Upside Potential</label>
                                <span className="text-emerald-400 font-mono">{filters.minUpside || '0'}%</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="100" step="5"
                                value={filters.minUpside}
                                onChange={(e) => setFilters({ ...filters, minUpside: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        <div className="flex gap-4 items-end h-full pb-1">
                            <button
                                onClick={() => {
                                    setFilters({ maxPE: 0, maxPEG: 0, minScore: 0, minUpside: 0, sector: '' });
                                    setSearchTerm('');
                                    setStocks([]); // Clear results on reset
                                    setHasSearched(false);
                                }}
                                className="flex-1 py-3 rounded-lg border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Reset & Clear
                            </button>
                            <button
                                onClick={fetchStocks}
                                className="flex-1 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="bg-[#1a1a26]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl min-h-[400px]">
                <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="text-indigo-400">●</span> Results ({stocks.length})
                    </h3>
                    {stocks.length > 0 && (
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm border border-white/5 text-gray-300" onClick={() => copyToClipboard(stocks as any, [])}>Copy</button>
                            <button className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm border border-white/5 text-gray-300" onClick={() => exportToCSV(stocks as any, [], 'screener')}>CSV</button>
                        </div>
                    )}
                </div>

                {/* Initial Empty State */}
                {!hasSearched && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
                        <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
                            <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ready to Screen</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Enter a stock symbol to search instantly, or adjust the filters above and click "Apply Filters" to scan the market.
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400">Scanning market data...</p>
                    </div>
                )}

                {/* No Results State */}
                {hasSearched && !isLoading && stocks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center p-8">
                        <div className="bg-red-500/10 p-4 rounded-full mb-4">
                            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Matches Found</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            No stocks matched your criteria. Try loosening your filters or searching for a specific symbol directly.
                        </p>
                    </div>
                )}

                {/* Table Content */}
                {hasSearched && stocks.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-gray-400 text-sm uppercase tracking-wider">
                                    <th onClick={() => handleSort('symbol')} className="p-4 cursor-pointer hover:text-white transition-colors">Symbol {getSortIcon('symbol')}</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Sector</th>
                                    <th onClick={() => handleSort('current_price')} className="p-4 text-right cursor-pointer hover:text-white">Price {getSortIcon('current_price')}</th>
                                    <th onClick={() => handleSort('pe_ratio')} className="p-4 text-right cursor-pointer hover:text-white">P/E {getSortIcon('pe_ratio')}</th>
                                    <th onClick={() => handleSort('score')} className="p-4 text-right cursor-pointer hover:text-white">Score {getSortIcon('score')}</th>
                                    <th onClick={() => handleSort('upside_potential')} className="p-4 text-right cursor-pointer hover:text-white">Upside {getSortIcon('upside_potential')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredAndSortedStocks.map((stock) => (
                                    <tr
                                        key={stock.symbol}
                                        onClick={() => handleStockClick(stock.symbol)}
                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <td className="p-4 font-bold text-indigo-400 group-hover:text-indigo-300">{stock.symbol}</td>
                                        <td className="p-4 text-gray-300 truncate max-w-[200px]">{stock.name}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-full text-xs bg-white/5 text-gray-400 border border-white/5">
                                                {stock.sector}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-300">${stock.current_price?.toFixed(2)}</td>
                                        <td className="p-4 text-right font-mono text-gray-300">{stock.pe_ratio?.toFixed(1) || '-'}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="font-bold text-sm">{stock.score}</span>
                                                <div className="w-16 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${(stock.score || 0) >= 70 ? 'bg-emerald-500' : (stock.score || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${stock.score || 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-mono">
                                            <span className={`${(stock.upside_potential || 0) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {(stock.upside_potential || 0) > 0 ? '+' : ''}{stock.upside_potential?.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
