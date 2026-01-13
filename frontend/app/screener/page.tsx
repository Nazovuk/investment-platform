'use client';

import { useState, useMemo, useCallback } from 'react';
import { screenerApi, Stock } from '@/lib/api';
import { exportToCSV, copyToClipboard } from '@/lib/export';

type SortKey = 'symbol' | 'score' | 'upside_potential' | 'pe_ratio' | 'current_price';

export default function ScreenerPage() {
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortAsc, setSortAsc] = useState(false);

    const [filters, setFilters] = useState({
        market: '',
        sector: '',
        minPE: 0,
        maxPE: 0,
        maxPEG: 0,
        minScore: 0,
        minUpside: 0,
        minRevGrowth: 0
    });

    const fetchStocks = useCallback(async () => {
        setIsLoading(true);
        setHasSearched(true);
        try {
            const res = await screenerApi.getResults({
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
            setStocks(res.results || []);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    }, [filters, searchTerm]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const sorted = useMemo(() => [...stocks].sort((a, b) => {
        const av = (a as any)[sortKey] ?? 0, bv = (b as any)[sortKey] ?? 0;
        return sortAsc ? av - bv : bv - av;
    }), [stocks, sortKey, sortAsc]);

    const reset = () => {
        setFilters({ market: '', sector: '', minPE: 0, maxPE: 0, maxPEG: 0, minScore: 0, minUpside: 0, minRevGrowth: 0 });
        setSearchTerm('');
        setStocks([]);
        setHasSearched(false);
    };

    // Inline styles for cross-browser compatibility
    const cardStyle: React.CSSProperties = { background: '#161622', border: '1px solid #2a2a3c', borderRadius: '16px', padding: '20px' };
    const inputStyle: React.CSSProperties = { background: '#1e1e2e', border: '1px solid #444', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '14px', width: '100%', outline: 'none' };
    const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
    const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#888', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' };
    const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' };
    const btnSecondary: React.CSSProperties = { background: '#2a2a3c', color: '#aaa', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px' };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Stock Screener</h1>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>Filter S&P 500 stocks with live market data</p>

            {/* Main Layout: Filters (1/3) + Visual (2/3) */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>

                {/* LEFT: Compact Filters (1/3 width) */}
                <div style={{ ...cardStyle, width: '340px', flexShrink: 0 }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Search Symbol</label>
                        <input type="text" style={inputStyle} placeholder="AAPL, MSFT..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchStocks()} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <label style={labelStyle}>Market</label>
                            <select style={selectStyle} value={filters.market} onChange={e => setFilters({ ...filters, market: e.target.value })}>
                                <option value="">All</option>
                                <option value="S&P 500">S&P 500</option>
                                <option value="NASDAQ 100">NASDAQ</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Sector</label>
                            <select style={selectStyle} value={filters.sector} onChange={e => setFilters({ ...filters, sector: e.target.value })}>
                                <option value="">All</option>
                                <option value="Technology">Tech</option>
                                <option value="Healthcare">Health</option>
                                <option value="Financial">Finance</option>
                                <option value="Energy">Energy</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Min P/E</label>
                            <input type="number" style={inputStyle} placeholder="0" value={filters.minPE || ''} onChange={e => setFilters({ ...filters, minPE: +e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Max P/E</label>
                            <input type="number" style={inputStyle} placeholder="∞" value={filters.maxPE || ''} onChange={e => setFilters({ ...filters, maxPE: +e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Max PEG</label>
                            <input type="number" step="0.1" style={inputStyle} placeholder="∞" value={filters.maxPEG || ''} onChange={e => setFilters({ ...filters, maxPEG: +e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Min Score</label>
                            <input type="number" style={inputStyle} placeholder="0" value={filters.minScore || ''} onChange={e => setFilters({ ...filters, minScore: +e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={fetchStocks} disabled={isLoading} style={{ ...btnPrimary, flex: 1, opacity: isLoading ? 0.6 : 1 }}>
                            {isLoading ? '⏳ Loading...' : '🔍 Apply'}
                        </button>
                        <button onClick={reset} style={btnSecondary}>Reset</button>
                    </div>
                </div>

                {/* RIGHT: Visual / Branding Area (2/3 width) */}
                <div style={{ ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 50%, #0f0f1a 100%)', position: 'relative', overflow: 'hidden' }}>
                    {/* Decorative circles */}
                    <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(219,39,119,0.1))', filter: 'blur(40px)' }}></div>
                    <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(124,58,237,0.1))', filter: 'blur(30px)' }}></div>

                    {/* Content */}
                    <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📈</div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Smart Stock Screening</h2>
                        <p style={{ color: '#666', maxWidth: '400px', lineHeight: 1.6, fontSize: '14px' }}>
                            Analyze 500+ stocks with real-time P/E ratios, growth metrics, and AI-powered scores. Find undervalued opportunities instantly.
                        </p>
                        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '24px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#a78bfa' }}>503</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Stocks</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#34d399' }}>Live</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Data</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: '#f472b6' }}>8+</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Filters</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #2a2a3c' }}>
                    <span style={{ color: 'white', fontWeight: 600 }}>{stocks.length} Results</span>
                    {stocks.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => copyToClipboard(stocks as any, [])} style={{ ...btnSecondary, padding: '6px 12px', fontSize: '12px' }}>📋 Copy</button>
                            <button onClick={() => exportToCSV(stocks as any, [], 'screener')} style={{ ...btnSecondary, padding: '6px 12px', fontSize: '12px' }}>⬇️ CSV</button>
                        </div>
                    )}
                </div>

                {!hasSearched && !isLoading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                        <p style={{ fontSize: '16px' }}>Set your filters and click Apply to scan the market</p>
                    </div>
                )}

                {isLoading && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
                        <p style={{ color: '#666' }}>Scanning stocks...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {hasSearched && !isLoading && stocks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                        <p>No matching stocks. Try adjusting filters.</p>
                    </div>
                )}

                {stocks.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #2a2a3c', color: '#666', textTransform: 'uppercase', fontSize: '11px' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('symbol')}>Symbol</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('current_price')}>Price</th>
                                    <th style={{ padding: '12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('pe_ratio')}>P/E</th>
                                    <th style={{ padding: '12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('score')}>Score</th>
                                    <th style={{ padding: '12px', textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('upside_potential')}>Upside</th>
                                    <th style={{ padding: '12px', textAlign: 'left' }}>Sector</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.slice(0, 100).map((s: any, i) => (
                                    <tr key={s.symbol} onClick={() => window.open(`/stock/${s.symbol}`, '_blank')} style={{ borderBottom: '1px solid #1e1e2e', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2e')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa' }}>{s.symbol}</td>
                                        <td style={{ padding: '12px', color: 'white' }}>{s.name || s.symbol}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: 'white' }}>${(s.current_price || s.price)?.toFixed(2) || '-'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#888' }}>{(s.pe_ratio || s.pe)?.toFixed(1) || '-'}</td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: (s.score || 0) >= 70 ? 'rgba(52,211,153,0.2)' : (s.score || 0) >= 50 ? 'rgba(251,191,36,0.2)' : 'rgba(100,100,100,0.2)', color: (s.score || 0) >= 70 ? '#34d399' : (s.score || 0) >= 50 ? '#fbbf24' : '#888' }}>
                                                {s.score?.toFixed(0) || '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: (s.upside_potential || s.upside || 0) > 0 ? '#34d399' : '#ef4444' }}>
                                            {(s.upside_potential || s.upside || 0) > 0 ? '+' : ''}{(s.upside_potential || s.upside)?.toFixed(1) || 0}%
                                        </td>
                                        <td style={{ padding: '12px', color: '#666', fontSize: '12px' }}>{s.sector?.split(' ').pop() || '-'}</td>
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
