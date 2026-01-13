'use client';

import { useState, useMemo, useCallback } from 'react';
import { screenerApi, Stock } from '@/lib/api';
import { exportToCSV, copyToClipboard } from '@/lib/export';

type SortKey = 'symbol' | 'score' | 'upside_potential' | 'pe_ratio' | 'current_price';
type SortDir = 'asc' | 'desc';

export default function ScreenerPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // All filters
    const [filters, setFilters] = useState({
        market: '',
        sector: '',
        minPE: 0,
        maxPE: 0,
        minPEG: 0,
        maxPEG: 0,
        minScore: 0,
        minUpside: 0,
        minRevGrowth: 0
    });

    const fetchStocks = useCallback(async () => {
        try {
            setIsLoading(true);
            setHasSearched(true);
            const response = await screenerApi.getResults({
                search: searchTerm || undefined,
                min_pe: filters.minPE > 0 ? filters.minPE : undefined,
                max_pe: filters.maxPE > 0 ? filters.maxPE : undefined,
                max_peg: filters.maxPEG > 0 ? filters.maxPEG : undefined,
                min_score: filters.minScore > 0 ? filters.minScore : undefined,
                min_upside: filters.minUpside > 0 ? filters.minUpside / 100 : undefined,
                min_revenue_growth: filters.minRevGrowth > 0 ? filters.minRevGrowth / 100 : undefined,
                sector: filters.sector || undefined,
                market: filters.market || undefined
            });
            setStocks(response.results || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filters, searchTerm]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const sorted = useMemo(() => [...stocks].sort((a, b) => {
        const aV = (a as any)[sortKey] ?? 0;
        const bV = (b as any)[sortKey] ?? 0;
        return sortDir === 'asc' ? aV - bV : bV - aV;
    }), [stocks, sortKey, sortDir]);

    const reset = () => {
        setFilters({ market: '', sector: '', minPE: 0, maxPE: 0, minPEG: 0, maxPEG: 0, minScore: 0, minUpside: 0, minRevGrowth: 0 });
        setSearchTerm('');
        setStocks([]);
        setHasSearched(false);
    };

    // Styles
    const inputClass = "bg-[#1e1e2e] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 outline-none w-full";
    const selectClass = "bg-[#1e1e2e] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:border-violet-500 outline-none w-full cursor-pointer";
    const labelClass = "text-xs text-gray-400 mb-1 block";

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-2">Stock Screener</h1>
            <p className="text-gray-400 mb-6">Filter S&P 500 stocks with live data</p>

            {/* Filter Card */}
            <div className="bg-[#161622] border border-[#2a2a3c] rounded-xl p-5 mb-6">
                {/* Search */}
                <div className="mb-5">
                    <label className={labelClass}>Search Symbol</label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            className={inputClass + " flex-1"}
                            placeholder="Enter ticker (AAPL, MSFT...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchStocks()}
                        />
                    </div>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-5">
                    <div>
                        <label className={labelClass}>Market</label>
                        <select className={selectClass} value={filters.market} onChange={e => setFilters({ ...filters, market: e.target.value })}>
                            <option value="">All Markets</option>
                            <option value="S&P 500">S&P 500</option>
                            <option value="NASDAQ 100">NASDAQ 100</option>
                            <option value="FTSE 100">FTSE 100 (UK)</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Sector</label>
                        <select className={selectClass} value={filters.sector} onChange={e => setFilters({ ...filters, sector: e.target.value })}>
                            <option value="">All Sectors</option>
                            <option value="Technology">Technology</option>
                            <option value="Healthcare">Healthcare</option>
                            <option value="Financial">Financial</option>
                            <option value="Consumer">Consumer</option>
                            <option value="Industrial">Industrial</option>
                            <option value="Energy">Energy</option>
                            <option value="Real Estate">Real Estate</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Materials">Materials</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Min P/E</label>
                        <input type="number" className={inputClass} placeholder="0" value={filters.minPE || ''} onChange={e => setFilters({ ...filters, minPE: +e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Max P/E</label>
                        <input type="number" className={inputClass} placeholder="∞" value={filters.maxPE || ''} onChange={e => setFilters({ ...filters, maxPE: +e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Max PEG</label>
                        <input type="number" step="0.1" className={inputClass} placeholder="∞" value={filters.maxPEG || ''} onChange={e => setFilters({ ...filters, maxPEG: +e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Min Score</label>
                        <input type="number" className={inputClass} placeholder="0" value={filters.minScore || ''} onChange={e => setFilters({ ...filters, minScore: +e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Min Upside %</label>
                        <input type="number" className={inputClass} placeholder="0" value={filters.minUpside || ''} onChange={e => setFilters({ ...filters, minUpside: +e.target.value })} />
                    </div>
                    <div>
                        <label className={labelClass}>Min Rev Growth %</label>
                        <input type="number" className={inputClass} placeholder="0" value={filters.minRevGrowth || ''} onChange={e => setFilters({ ...filters, minRevGrowth: +e.target.value })} />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={fetchStocks}
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                        {isLoading ? '⏳ Loading...' : '🔍 Apply Filters'}
                    </button>
                    <button
                        onClick={reset}
                        className="px-5 py-2.5 bg-[#2a2a3c] hover:bg-[#3a3a4c] text-gray-300 rounded-lg transition-colors"
                    >
                        Reset
                    </button>
                    {stocks.length > 0 && (
                        <>
                            <button onClick={() => copyToClipboard(stocks as any, [])} className="px-4 py-2 bg-[#2a2a3c] hover:bg-[#3a3a4c] text-gray-400 rounded-lg text-sm">📋 Copy</button>
                            <button onClick={() => exportToCSV(stocks as any, [], 'screener')} className="px-4 py-2 bg-[#2a2a3c] hover:bg-[#3a3a4c] text-gray-400 rounded-lg text-sm">⬇️ CSV</button>
                        </>
                    )}
                </div>
            </div>

            {/* Results */}
            <div className="bg-[#161622] border border-[#2a2a3c] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#2a2a3c] flex justify-between items-center">
                    <span className="text-white font-medium">{stocks.length} Results</span>
                </div>

                {!hasSearched && !isLoading && (
                    <div className="py-16 text-center">
                        <p className="text-xl text-gray-500 mb-2">📊 Ready to Screen</p>
                        <p className="text-gray-600 text-sm">Set your filters and click Apply</p>
                    </div>
                )}

                {isLoading && (
                    <div className="py-16 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-gray-400">Loading stocks...</p>
                    </div>
                )}

                {hasSearched && !isLoading && stocks.length === 0 && (
                    <div className="py-16 text-center">
                        <p className="text-xl text-gray-500">No matching stocks</p>
                        <p className="text-gray-600 text-sm mt-1">Try adjusting your filters</p>
                    </div>
                )}

                {stocks.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#1a1a2a] text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>Symbol</th>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('current_price')}>Price</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('pe_ratio')}>P/E</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('score')}>Score</th>
                                    <th className="px-4 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('upside_potential')}>Upside</th>
                                    <th className="px-4 py-3 text-left">Sector</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2a3c]">
                                {sorted.slice(0, 100).map((s: any) => (
                                    <tr key={s.symbol} className="hover:bg-[#1e1e2e] cursor-pointer" onClick={() => window.open(`/stock/${s.symbol}`, '_blank')}>
                                        <td className="px-4 py-3 font-mono font-bold text-violet-400">{s.symbol}</td>
                                        <td className="px-4 py-3 text-white">{s.name || s.symbol}</td>
                                        <td className="px-4 py-3 text-right text-white font-mono">${(s.current_price || s.price)?.toFixed(2) || '-'}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 font-mono">{(s.pe_ratio || s.pe)?.toFixed(1) || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${(s.score || 0) >= 70 ? 'bg-emerald-900/50 text-emerald-400' : (s.score || 0) >= 50 ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                                                {s.score?.toFixed(0) || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono">
                                            <span className={((s.upside_potential || s.upside || 0) > 0) ? 'text-emerald-400' : 'text-red-400'}>
                                                {(s.upside_potential || s.upside || 0) > 0 ? '+' : ''}{(s.upside_potential || s.upside)?.toFixed(1) || 0}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 text-xs">{s.sector || '-'}</td>
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
