'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, TrendingUp, TrendingDown, BarChart3, DollarSign, Target, Activity, Users } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface StockDetailModalProps {
    symbol: string | null;
    onClose: () => void;
}

interface StockDetail {
    symbol: string;
    name: string;
    sector: string;
    industry: string;
    current_price: number;
    previous_close: number;
    change_percent: number;
    market_cap: number;
    pe_ratio: number;
    peg_ratio: number;
    revenue_growth: number;
    profit_margin: number;
    roe: number;
    beta: number;
    fifty_two_week_high: number;
    fifty_two_week_low: number;
    target_mean: number;
    recommendation: string;
    num_analysts: number;
    dividend_yield: number;
}

interface HistoryData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi: number | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function StockDetailModal({ symbol, onClose }: StockDetailModalProps) {
    const [detail, setDetail] = useState<StockDetail | null>(null);
    const [history, setHistory] = useState<HistoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('6mo');
    const [activeTab, setActiveTab] = useState<'chart' | 'fundamentals'>('chart');

    useEffect(() => {
        if (!symbol) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [detailRes, historyRes] = await Promise.all([
                    fetch(`${API_URL}/api/stock/${symbol}`),
                    fetch(`${API_URL}/api/stock/${symbol}/history?period=${period}`)
                ]);

                if (detailRes.ok) {
                    setDetail(await detailRes.json());
                }
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    setHistory(data.data || []);
                }
            } catch (error) {
                console.error('Error fetching stock data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, period]);

    if (!symbol) return null;

    const formatNumber = (num: number | null | undefined) => {
        if (num === null || num === undefined) return 'N/A';
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toFixed(2)}`;
    };

    const formatPercent = (num: number | null | undefined) => {
        if (num === null || num === undefined) return 'N/A';
        return `${(num * 100).toFixed(2)}%`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-2xl border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gray-900/95 backdrop-blur-sm border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white">
                            {symbol.slice(0, 2)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{symbol}</h2>
                            <p className="text-gray-400">{detail?.name || 'Loading...'}</p>
                        </div>
                        {detail && (
                            <div className="ml-4">
                                <span className="text-3xl font-bold text-white">${detail.current_price}</span>
                                <span className={`ml-2 text-lg ${detail.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {detail.change_percent >= 0 ? '+' : ''}{detail.change_percent.toFixed(2)}%
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setActiveTab('chart')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'chart' ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <BarChart3 className="w-4 h-4 inline-block mr-2" />
                                Chart
                            </button>
                            <button
                                onClick={() => setActiveTab('fundamentals')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'fundamentals' ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                <Activity className="w-4 h-4 inline-block mr-2" />
                                Fundamentals
                            </button>
                        </div>

                        {activeTab === 'chart' && (
                            <>
                                {/* Period Selector */}
                                <div className="flex gap-2 mb-4">
                                    {['1mo', '3mo', '6mo', '1y', '2y'].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${period === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>

                                {/* Candlestick Chart */}
                                <div className="bg-white/5 rounded-xl p-4 mb-6">
                                    <Plot
                                        data={[
                                            {
                                                type: 'candlestick',
                                                x: history.map(d => d.date),
                                                open: history.map(d => d.open),
                                                high: history.map(d => d.high),
                                                low: history.map(d => d.low),
                                                close: history.map(d => d.close),
                                                name: symbol,
                                                increasing: { line: { color: '#10b981' } },
                                                decreasing: { line: { color: '#ef4444' } },
                                            },
                                            {
                                                type: 'scatter',
                                                mode: 'lines',
                                                x: history.map(d => d.date),
                                                y: history.map(d => d.sma20),
                                                name: 'SMA 20',
                                                line: { color: '#f59e0b', width: 1 },
                                            },
                                            {
                                                type: 'scatter',
                                                mode: 'lines',
                                                x: history.map(d => d.date),
                                                y: history.map(d => d.sma50),
                                                name: 'SMA 50',
                                                line: { color: '#3b82f6', width: 1 },
                                            },
                                            {
                                                type: 'scatter',
                                                mode: 'lines',
                                                x: history.map(d => d.date),
                                                y: history.map(d => d.sma200),
                                                name: 'SMA 200',
                                                line: { color: '#a855f7', width: 1.5 },
                                            },
                                        ]}
                                        layout={{
                                            autosize: true,
                                            height: 400,
                                            margin: { l: 50, r: 30, t: 30, b: 50 },
                                            paper_bgcolor: 'transparent',
                                            plot_bgcolor: 'transparent',
                                            font: { color: '#9ca3af' },
                                            xaxis: {
                                                gridcolor: 'rgba(255,255,255,0.05)',
                                                rangeslider: { visible: false },
                                            },
                                            yaxis: {
                                                gridcolor: 'rgba(255,255,255,0.05)',
                                                side: 'right',
                                            },
                                            legend: {
                                                orientation: 'h',
                                                y: 1.1,
                                            },
                                            showlegend: true,
                                        }}
                                        config={{ displayModeBar: false }}
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                {/* Volume Chart */}
                                <div className="bg-white/5 rounded-xl p-4 mb-6">
                                    <h3 className="text-sm font-medium text-gray-400 mb-2">Volume</h3>
                                    <Plot
                                        data={[
                                            {
                                                type: 'bar',
                                                x: history.map(d => d.date),
                                                y: history.map(d => d.volume),
                                                marker: {
                                                    color: history.map((d, i) =>
                                                        i > 0 && d.close >= history[i - 1].close ? '#10b981' : '#ef4444'
                                                    ),
                                                },
                                            },
                                        ]}
                                        layout={{
                                            autosize: true,
                                            height: 150,
                                            margin: { l: 50, r: 30, t: 10, b: 30 },
                                            paper_bgcolor: 'transparent',
                                            plot_bgcolor: 'transparent',
                                            font: { color: '#9ca3af' },
                                            xaxis: { gridcolor: 'rgba(255,255,255,0.05)' },
                                            yaxis: { gridcolor: 'rgba(255,255,255,0.05)', side: 'right' },
                                            showlegend: false,
                                        }}
                                        config={{ displayModeBar: false }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </>
                        )}

                        {activeTab === 'fundamentals' && detail && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Valuation */}
                                <div className="bg-white/5 rounded-xl p-4">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Valuation
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Market Cap</span><span className="text-white">{formatNumber(detail.market_cap)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">P/E Ratio</span><span className="text-white">{detail.pe_ratio?.toFixed(2) || 'N/A'}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">PEG Ratio</span><span className="text-white">{detail.peg_ratio?.toFixed(2) || 'N/A'}</span></div>
                                    </div>
                                </div>

                                {/* Performance */}
                                <div className="bg-white/5 rounded-xl p-4">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Performance
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-400">52W High</span><span className="text-white">${detail.fifty_two_week_high?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">52W Low</span><span className="text-white">${detail.fifty_two_week_low?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Beta</span><span className="text-white">{detail.beta?.toFixed(2) || 'N/A'}</span></div>
                                    </div>
                                </div>

                                {/* Profitability */}
                                <div className="bg-white/5 rounded-xl p-4">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Profitability
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Profit Margin</span><span className="text-white">{formatPercent(detail.profit_margin)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">ROE</span><span className="text-white">{formatPercent(detail.roe)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Revenue Growth</span><span className="text-white">{formatPercent(detail.revenue_growth)}</span></div>
                                    </div>
                                </div>

                                {/* Analyst */}
                                <div className="bg-white/5 rounded-xl p-4">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <Target className="w-4 h-4" /> Analyst Ratings
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Target Price</span><span className="text-white">${detail.target_mean?.toFixed(2)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Recommendation</span><span className="text-emerald-400 uppercase">{detail.recommendation || 'N/A'}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Analysts</span><span className="text-white">{detail.num_analysts || 'N/A'}</span></div>
                                    </div>
                                </div>

                                {/* Dividend */}
                                <div className="bg-white/5 rounded-xl p-4">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> Dividend
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Yield</span><span className="text-white">{formatPercent(detail.dividend_yield)}</span></div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="bg-white/5 rounded-xl p-4">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Company Info
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Sector</span><span className="text-white">{detail.sector}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Industry</span><span className="text-white">{detail.industry}</span></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
