'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { screenerApi, Stock } from '@/lib/api';
import { exportToCSV, copyToClipboard } from '@/lib/export';

type SortKey = 'symbol' | 'score' | 'upside_potential' | 'pe_ratio' | 'current_price';
type SortDirection = 'asc' | 'desc';

export default function ScreenerPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [searchTerm, setSearchTerm] = useState('');

    const [filters, setFilters] = useState({
        maxPE: 0,
        maxPEG: 0,
        minScore: 0,
        sector: '',
        market: ''
    });

    const fetchStocks = useCallback(async () => {
        try {
            setIsLoading(true);
            setHasSearched(true);
            const response = await screenerApi.getResults({
                search: searchTerm || undefined,
                max_pe: filters.maxPE > 0 ? filters.maxPE : undefined,
                max_peg: filters.maxPEG > 0 ? filters.maxPEG : undefined,
                min_score: filters.minScore > 0 ? filters.minScore : undefined,
                sector: filters.sector || undefined,
                market: filters.market || undefined
            });
            setStocks(response.results || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch stocks:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filters, searchTerm]);

    const handleStockClick = (symbol: string) => {
        window.open(`/stock/${symbol}`, `stock_${symbol}`, 'width=1200,height=800');
    };

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sortedStocks = useMemo(() => {
        return [...stocks].sort((a, b) => {
            const aVal = (a as any)[sortKey] ?? 0;
            const bVal = (b as any)[sortKey] ?? 0;
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
    }, [stocks, sortKey, sortDir]);

    const resetFilters = () => {
        setFilters({ maxPE: 0, maxPEG: 0, minScore: 0, sector: '', market: '' });
        setSearchTerm('');
        setStocks([]);
        setHasSearched(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a12] p-6">
            <div className="max-w-7xl mx-auto">

                {/* Header with gradient */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                        Stock Screener
                    </h1>
                    <p className="text-gray-400 mt-2">Discover opportunities across 500+ stocks with real-time data</p>
                </div>

                {/* Modern Filter Card */}
                <div className="relative mb-8 rounded-2xl overflow-hidden">
                    {/* Gradient border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-pink-600/20 rounded-2xl"></div>
                    <div className="relative bg-[#12121a]/90 backdrop-blur-xl m-[1px] rounded-2xl p-6">

                        {/* Search Row */}
                        <div className="flex gap-4 mb-6">
                            <div className="flex-1 relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-gray-500 focus:border-violet-500/50 focus:bg-white/10 outline-none transition-all"
                                    placeholder="Search by symbol (AAPL, MSFT, TSLA...)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchStocks()}
                                />
                            </div>
                        </div>

                        {/* Filter Pills - Horizontal Layout */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            {/* Market Pill */}
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                                <span className="text-gray-400 text-sm">Market</span>
                                <select
                                    className="bg-transparent text-white text-sm outline-none cursor-pointer min-w-[100px]"
                                    value={filters.market}
                                    onChange={(e) => setFilters({ ...filters, market: e.target.value })}
                                >
                                    <option value="" className="bg-[#1a1a2e]">All</option>
                                    <option value="S&P 500" className="bg-[#1a1a2e]">S&P 500</option>
                                    <option value="NASDAQ 100" className="bg-[#1a1a2e]">NASDAQ</option>
                                </select>
                            </div>

                            {/* Sector Pill */}
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                                <span className="text-gray-400 text-sm">Sector</span>
                                <select
                                    className="bg-transparent text-white text-sm outline-none cursor-pointer min-w-[120px]"
                                    value={filters.sector}
                                    onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                                >
                                    <option value="" className="bg-[#1a1a2e]">All Sectors</option>
                                    <option value="Technology" className="bg-[#1a1a2e]">Technology</option>
                                    <option value="Healthcare" className="bg-[#1a1a2e]">Healthcare</option>
                                    <option value="Financial" className="bg-[#1a1a2e]">Financial</option>
                                    <option value="Consumer" className="bg-[#1a1a2e]">Consumer</option>
                                    <option value="Industrial" className="bg-[#1a1a2e]">Industrial</option>
                                    <option value="Energy" className="bg-[#1a1a2e]">Energy</option>
                                </select>
                            </div>

                            {/* Max P/E Pill */}
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                                <span className="text-gray-400 text-sm">Max P/E</span>
                                <input
                                    type="number"
                                    className="bg-transparent text-white text-sm outline-none w-16 text-center"
                                    placeholder="∞"
                                    value={filters.maxPE || ''}
                                    onChange={(e) => setFilters({ ...filters, maxPE: Number(e.target.value) })}
                                />
                            </div>

                            {/* Min Score Pill */}
                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                                <span className="text-gray-400 text-sm">Min Score</span>
                                <input
                                    type="number"
                                    className="bg-transparent text-white text-sm outline-none w-12 text-center"
                                    placeholder="0"
                                    value={filters.minScore || ''}
                                    onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={fetchStocks}
                                disabled={isLoading}
                                className="group relative px-8 py-3 rounded-xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600"></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Scanning...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Apply Filters
                                        </>
                                    )}
                                </span>
                            </button>

                            <button
                                onClick={resetFilters}
                                className="px-6 py-3 rounded-xl font-medium text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                <div className="relative rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-transparent to-pink-600/10"></div>
                    <div className="relative bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5">

                        {/* Results Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stocks.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></div>
                                    <span className="text-white font-medium">{stocks.length} Results</span>
                                </div>
                                {lastUpdate && (
                                    <span className="text-gray-500 text-sm">
                                        Updated {lastUpdate.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                            {stocks.length > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                        onClick={() => copyToClipboard(stocks as any, [])}
                                    >
                                        📋 Copy
                                    </button>
                                    <button
                                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                        onClick={() => exportToCSV(stocks as any, [], 'screener')}
                                    >
                                        ⬇️ Export
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Empty State */}
                        {!hasSearched && !isLoading && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">Ready to Discover</h3>
                                <p className="text-gray-400 text-center max-w-md">Select your filters and click Apply to scan the market</p>
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-violet-600/20"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin"></div>
                                </div>
                                <p className="text-gray-400">Scanning 500+ stocks...</p>
                            </div>
                        )}

                        {/* No Results */}
                        {hasSearched && !isLoading && stocks.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="text-5xl mb-4">🔍</div>
                                <h3 className="text-xl font-semibold text-white mb-2">No Matches</h3>
                                <p className="text-gray-400">Try adjusting your filters</p>
                            </div>
                        )}

                        {/* Results Table */}
                        {stocks.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-white/5">
                                            <th className="px-6 py-4 font-medium cursor-pointer hover:text-violet-400 transition-colors" onClick={() => handleSort('symbol')}>
                                                Symbol {sortKey === 'symbol' && (sortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-4 font-medium">Company</th>
                                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-violet-400 transition-colors" onClick={() => handleSort('current_price')}>
                                                Price {sortKey === 'current_price' && (sortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-violet-400 transition-colors" onClick={() => handleSort('pe_ratio')}>
                                                P/E {sortKey === 'pe_ratio' && (sortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-violet-400 transition-colors" onClick={() => handleSort('score')}>
                                                Score {sortKey === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-4 font-medium text-right cursor-pointer hover:text-violet-400 transition-colors" onClick={() => handleSort('upside_potential')}>
                                                Upside {sortKey === 'upside_potential' && (sortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-4 font-medium">Sector</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedStocks.slice(0, 100).map((stock: any, i) => (
                                            <tr
                                                key={stock.symbol}
                                                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                                                onClick={() => handleStockClick(stock.symbol)}
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-bold text-violet-400 group-hover:text-violet-300">
                                                        {stock.symbol}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-white">{stock.name || stock.symbol}</td>
                                                <td className="px-6 py-4 text-right font-mono text-white">
                                                    ${(stock.current_price || stock.price)?.toFixed(2) || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-400">
                                                    {(stock.pe_ratio || stock.pe)?.toFixed(1) || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center justify-center w-10 h-6 rounded font-mono text-sm font-medium ${(stock.score || 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                                                            (stock.score || 0) >= 50 ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {stock.score?.toFixed(0) || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-mono text-sm ${(stock.upside_potential || stock.upside || 0) > 0 ? 'text-emerald-400' : 'text-red-400'
                                                        }`}>
                                                        {(stock.upside_potential || stock.upside || 0) > 0 ? '+' : ''}
                                                        {(stock.upside_potential || stock.upside)?.toFixed(1) || 0}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
                                                        {stock.sector?.split(' ').slice(-1)[0] || '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {stocks.length > 100 && (
                                    <div className="text-center py-4 text-gray-500 text-sm border-t border-white/5">
                                        Showing top 100 of {stocks.length} results
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
