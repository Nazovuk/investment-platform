'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, BarChart3, DollarSign, Target, Activity, Building2, PieChart, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

// Lazy load Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <div className="h-80 flex items-center justify-center text-gray-500">Loading chart...</div>
});

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
    forward_pe: number;
    peg_ratio: number;
    price_to_book: number;
    price_to_sales: number;
    ev_to_ebitda: number;
    revenue_growth: number;
    gross_margin: number;
    operating_margin: number;
    profit_margin: number;
    roe: number;
    roa: number;
    beta: number;
    fifty_two_week_high: number;
    fifty_two_week_low: number;
    fifty_day_avg: number;
    two_hundred_day_avg: number;
    target_high: number;
    target_low: number;
    target_mean: number;
    recommendation: string;
    num_analysts: number;
    dividend_yield: number;
    dividend_rate: number;
    payout_ratio: number;
    total_cash: number;
    total_debt: number;
    debt_to_equity: number;
    current_ratio: number;
    eps: number;
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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function StockDetailModal({ symbol, onClose }: StockDetailModalProps) {
    const [detail, setDetail] = useState<StockDetail | null>(null);
    const [history, setHistory] = useState<HistoryData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('6mo');
    const [activeTab, setActiveTab] = useState<'chart' | 'fundamentals'>('chart');

    // Fetch data when symbol changes
    useEffect(() => {
        if (!symbol) {
            setDetail(null);
            setHistory([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [detailRes, historyRes] = await Promise.all([
                    fetch(`${API_URL}/api/stock/${symbol}`),
                    fetch(`${API_URL}/api/stock/${symbol}/history?period=${period}`)
                ]);

                if (detailRes.ok) {
                    const detailData = await detailRes.json();
                    setDetail(detailData);
                } else {
                    setError('Failed to load stock details');
                }

                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    setHistory(historyData.data || []);
                }
            } catch (err) {
                console.error('Error fetching stock data:', err);
                setError('Network error loading data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, period]);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (symbol) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [symbol, onClose]);

    // Don't render anything if no symbol
    if (!symbol) return null;

    const formatMoney = (num: number | null | undefined) => {
        if (num === null || num === undefined) return '—';
        if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
        if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
        return `$${num.toFixed(2)}`;
    };

    const formatPct = (num: number | null | undefined, multiply = true) => {
        if (num === null || num === undefined) return '—';
        const val = multiply ? num * 100 : num;
        return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
    };

    const formatNum = (num: number | null | undefined, decimals = 2) => {
        if (num === null || num === undefined) return '—';
        return num.toFixed(decimals);
    };

    const get52WPosition = () => {
        if (!detail?.fifty_two_week_high || !detail?.fifty_two_week_low) return 50;
        const range = detail.fifty_two_week_high - detail.fifty_two_week_low;
        if (range === 0) return 50;
        return ((detail.current_price - detail.fifty_two_week_low) / range) * 100;
    };

    const getUpsideToTarget = () => {
        if (!detail?.target_mean || !detail?.current_price) return null;
        return ((detail.target_mean - detail.current_price) / detail.current_price) * 100;
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-[#0d1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161b22] shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-lg font-bold text-white">
                            {symbol.slice(0, 2)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white">{symbol}</h2>
                                {detail && (
                                    <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-gray-400">
                                        {detail.sector}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm">{detail?.name || 'Loading...'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {detail && (
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">${formatNum(detail.current_price)}</div>
                                <div className={`flex items-center justify-end gap-1 text-sm ${detail.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {detail.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    {formatPct(detail.change_percent, false)}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-3 bg-[#161b22] border-b border-white/5 shrink-0">
                    <button
                        onClick={() => setActiveTab('chart')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'chart'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4 inline-block mr-2" />
                        Chart
                    </button>
                    <button
                        onClick={() => setActiveTab('fundamentals')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeTab === 'fundamentals'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <PieChart className="w-4 h-4 inline-block mr-2" />
                        Fundamentals
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-500 border-t-transparent"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-64 text-red-400">
                            {error}
                        </div>
                    ) : activeTab === 'chart' ? (
                        <div>
                            {/* Period Selector */}
                            <div className="flex gap-1 mb-4">
                                {['1mo', '3mo', '6mo', '1y', '2y'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${period === p
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {p.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Chart */}
                            {history.length > 0 ? (
                                <div className="bg-[#161b22] rounded-xl p-4">
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
                                                increasing: { line: { color: '#22c55e' } },
                                                decreasing: { line: { color: '#ef4444' } },
                                            },
                                            {
                                                type: 'scatter',
                                                mode: 'lines',
                                                x: history.map(d => d.date),
                                                y: history.map(d => d.sma20),
                                                name: 'SMA 20',
                                                line: { color: '#eab308', width: 1 },
                                            },
                                            {
                                                type: 'scatter',
                                                mode: 'lines',
                                                x: history.map(d => d.date),
                                                y: history.map(d => d.sma50),
                                                name: 'SMA 50',
                                                line: { color: '#3b82f6', width: 1 },
                                            },
                                        ]}
                                        layout={{
                                            autosize: true,
                                            height: 350,
                                            margin: { l: 50, r: 50, t: 20, b: 40 },
                                            paper_bgcolor: 'transparent',
                                            plot_bgcolor: 'transparent',
                                            font: { color: '#9ca3af', size: 11 },
                                            xaxis: {
                                                gridcolor: 'rgba(255,255,255,0.04)',
                                                rangeslider: { visible: false },
                                            },
                                            yaxis: {
                                                gridcolor: 'rgba(255,255,255,0.04)',
                                                side: 'right',
                                            },
                                            legend: { orientation: 'h', y: 1.05, x: 0.5, xanchor: 'center' },
                                            showlegend: true,
                                        }}
                                        config={{ displayModeBar: false, responsive: true }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-gray-500">
                                    No chart data available
                                </div>
                            )}
                        </div>
                    ) : detail && (
                        <div className="space-y-4">
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Market Cap" value={formatMoney(detail.market_cap)} />
                                <StatCard label="P/E Ratio" value={formatNum(detail.pe_ratio)} />
                                <StatCard label="EPS" value={`$${formatNum(detail.eps)}`} />
                                <StatCard label="Beta" value={formatNum(detail.beta)} />
                            </div>

                            {/* 52 Week Range */}
                            <div className="bg-[#161b22] rounded-xl p-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                    <span>52W: ${formatNum(detail.fifty_two_week_low)}</span>
                                    <span className="text-white">${formatNum(detail.current_price)}</span>
                                    <span>${formatNum(detail.fifty_two_week_high)}</span>
                                </div>
                                <div className="relative h-2 bg-gradient-to-r from-red-500/40 via-yellow-500/40 to-emerald-500/40 rounded-full">
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border-2 border-violet-500"
                                        style={{ left: `calc(${Math.min(100, Math.max(0, get52WPosition()))}% - 6px)` }}
                                    />
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Valuation */}
                                <MetricCard title="Valuation" icon={<DollarSign className="w-4 h-4" />}>
                                    <MetricRow label="P/E (TTM)" value={formatNum(detail.pe_ratio)} />
                                    <MetricRow label="P/E (Fwd)" value={formatNum(detail.forward_pe)} />
                                    <MetricRow label="PEG" value={formatNum(detail.peg_ratio)} />
                                    <MetricRow label="P/B" value={formatNum(detail.price_to_book)} />
                                    <MetricRow label="EV/EBITDA" value={formatNum(detail.ev_to_ebitda)} />
                                </MetricCard>

                                {/* Profitability */}
                                <MetricCard title="Profitability" icon={<Activity className="w-4 h-4" />}>
                                    <MetricRow label="Gross Margin" value={formatPct(detail.gross_margin)} positive={detail.gross_margin > 0} />
                                    <MetricRow label="Operating Margin" value={formatPct(detail.operating_margin)} positive={detail.operating_margin > 0} />
                                    <MetricRow label="Profit Margin" value={formatPct(detail.profit_margin)} positive={detail.profit_margin > 0} />
                                    <MetricRow label="ROE" value={formatPct(detail.roe)} positive={detail.roe > 0.1} />
                                    <MetricRow label="Revenue Growth" value={formatPct(detail.revenue_growth)} positive={detail.revenue_growth > 0} />
                                </MetricCard>

                                {/* Analyst */}
                                <MetricCard title="Analyst" icon={<Target className="w-4 h-4" />}>
                                    <div className="mb-2">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${detail.recommendation?.includes('buy') ? 'bg-emerald-500/20 text-emerald-400' :
                                                detail.recommendation?.includes('sell') ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {detail.recommendation?.replace('_', ' ') || '—'}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-500">({detail.num_analysts} analysts)</span>
                                    </div>
                                    <MetricRow label="Target High" value={`$${formatNum(detail.target_high)}`} />
                                    <MetricRow label="Target Mean" value={`$${formatNum(detail.target_mean)}`} />
                                    <MetricRow label="Target Low" value={`$${formatNum(detail.target_low)}`} />
                                    {getUpsideToTarget() !== null && (
                                        <MetricRow
                                            label="Upside"
                                            value={`${getUpsideToTarget()! >= 0 ? '+' : ''}${getUpsideToTarget()!.toFixed(1)}%`}
                                            positive={getUpsideToTarget()! > 0}
                                        />
                                    )}
                                </MetricCard>

                                {/* Financial Health */}
                                <MetricCard title="Balance Sheet" icon={<Building2 className="w-4 h-4" />}>
                                    <MetricRow label="Cash" value={formatMoney(detail.total_cash)} />
                                    <MetricRow label="Debt" value={formatMoney(detail.total_debt)} />
                                    <MetricRow label="D/E Ratio" value={formatNum(detail.debt_to_equity)} />
                                    <MetricRow label="Current Ratio" value={formatNum(detail.current_ratio)} positive={detail.current_ratio > 1} />
                                </MetricCard>

                                {/* Dividends */}
                                <MetricCard title="Dividends" icon={<DollarSign className="w-4 h-4" />}>
                                    <MetricRow label="Yield" value={detail.dividend_yield > 0 ? `${(detail.dividend_yield).toFixed(2)}%` : '—'} positive={detail.dividend_yield > 0} />
                                    <MetricRow label="Rate" value={detail.dividend_rate > 0 ? `$${formatNum(detail.dividend_rate)}` : '—'} />
                                    <MetricRow label="Payout Ratio" value={formatPct(detail.payout_ratio)} />
                                </MetricCard>

                                {/* Moving Averages */}
                                <MetricCard title="Technicals" icon={<TrendingUp className="w-4 h-4" />}>
                                    <MetricRow
                                        label="50-Day Avg"
                                        value={`$${formatNum(detail.fifty_day_avg)}`}
                                        positive={detail.current_price > detail.fifty_day_avg}
                                    />
                                    <MetricRow
                                        label="200-Day Avg"
                                        value={`$${formatNum(detail.two_hundred_day_avg)}`}
                                        positive={detail.current_price > detail.two_hundred_day_avg}
                                    />
                                    <MetricRow label="Sector" value={detail.sector} />
                                    <MetricRow label="Industry" value={detail.industry} />
                                </MetricCard>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper Components
function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#161b22] rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-lg font-bold text-white">{value}</div>
        </div>
    );
}

function MetricCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-[#161b22] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-violet-400">
                {icon}
                <h3 className="font-semibold text-white text-sm">{title}</h3>
            </div>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function MetricRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
    const valueColor = positive === undefined ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400';
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">{label}</span>
            <span className={`font-medium ${valueColor}`}>{value}</span>
        </div>
    );
}
