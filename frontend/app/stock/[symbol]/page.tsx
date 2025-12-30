'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Target, Activity, Building2, BarChart3 } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <div className="h-80 flex items-center justify-center text-gray-500">Loading chart...</div>
});

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

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
    const router = useRouter();
    const symbol = params.symbol.toUpperCase();

    const [detail, setDetail] = useState<StockDetail | null>(null);
    const [history, setHistory] = useState<HistoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('6mo');
    const [activeView, setActiveView] = useState<'chart' | 'fundamentals'>('chart');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [detailRes, historyRes] = await Promise.all([
                    fetch(`${API_URL}/api/stock/${symbol}`),
                    fetch(`${API_URL}/api/stock/${symbol}/history?period=${period}`)
                ]);

                if (detailRes.ok) {
                    setDetail(await detailRes.json());
                } else {
                    setError('Stock not found');
                }

                if (historyRes.ok) {
                    const data = await historyRes.json();
                    setHistory(data.data || []);
                }
            } catch (err) {
                setError('Failed to load stock data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, period]);

    const fmt = (n: number | null | undefined, d = 2) => n == null ? '—' : n.toFixed(d);
    const fmtMoney = (n: number | null | undefined) => {
        if (n == null) return '—';
        if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
        if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
        if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
        return `$${n.toFixed(2)}`;
    };
    const fmtPct = (n: number | null | undefined) => n == null ? '—' : `${(n * 100).toFixed(2)}%`;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-red-400 text-xl">{error || 'Stock not found'}</p>
                <Link href="/screener" className="text-violet-400 hover:underline">← Back to Screener</Link>
            </div>
        );
    }

    const get52WPos = () => {
        const range = detail.fifty_two_week_high - detail.fifty_two_week_low;
        if (range === 0) return 50;
        return Math.min(100, Math.max(0, ((detail.current_price - detail.fifty_two_week_low) / range) * 100));
    };

    const upside = detail.target_mean ? ((detail.target_mean - detail.current_price) / detail.current_price * 100) : null;

    return (
        <div className="min-h-screen bg-[#0d1117]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#161b22] border-b border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/10 transition">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-lg font-bold text-white">
                            {symbol.slice(0, 2)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-white">{symbol}</h1>
                                <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-gray-400">{detail.sector}</span>
                            </div>
                            <p className="text-gray-400 text-sm">{detail.name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white">${fmt(detail.current_price)}</div>
                        <div className={`flex items-center justify-end gap-1 ${detail.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {detail.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span className="font-medium">{detail.change_percent >= 0 ? '+' : ''}{fmt(detail.change_percent)}%</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* View Tabs */}
            <div className="max-w-7xl mx-auto px-6 pt-6">
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveView('chart')}
                        className={`px-5 py-2.5 rounded-lg font-medium transition ${activeView === 'chart' ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-2" />Price Chart
                    </button>
                    <button
                        onClick={() => setActiveView('fundamentals')}
                        className={`px-5 py-2.5 rounded-lg font-medium transition ${activeView === 'fundamentals' ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <Activity className="w-4 h-4 inline mr-2" />Fundamentals
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-6 pb-12">
                {activeView === 'chart' ? (
                    <div className="space-y-6">
                        {/* Period Selector */}
                        <div className="flex gap-2">
                            {['1mo', '3mo', '6mo', '1y', '2y'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${period === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {p.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Chart */}
                        <div className="bg-[#161b22] rounded-2xl p-6">
                            {history.length > 0 ? (
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
                                        { type: 'scatter', mode: 'lines', x: history.map(d => d.date), y: history.map(d => d.sma20), name: 'SMA 20', line: { color: '#eab308', width: 1.5 } },
                                        { type: 'scatter', mode: 'lines', x: history.map(d => d.date), y: history.map(d => d.sma50), name: 'SMA 50', line: { color: '#3b82f6', width: 1.5 } },
                                    ]}
                                    layout={{
                                        autosize: true, height: 450,
                                        margin: { l: 50, r: 50, t: 30, b: 50 },
                                        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                                        font: { color: '#9ca3af' },
                                        xaxis: { gridcolor: 'rgba(255,255,255,0.04)', rangeslider: { visible: false } },
                                        yaxis: { gridcolor: 'rgba(255,255,255,0.04)', side: 'right' },
                                        legend: { orientation: 'h', y: 1.05, x: 0.5, xanchor: 'center' },
                                    }}
                                    config={{ displayModeBar: false, responsive: true }}
                                    style={{ width: '100%' }}
                                />
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">No chart data</div>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <QuickStat label="Open" value={`$${fmt(detail.previous_close)}`} />
                            <QuickStat label="Day Range" value={`$${fmt(detail.fifty_two_week_low)} - $${fmt(detail.fifty_two_week_high)}`} />
                            <QuickStat label="Volume" value="—" />
                            <QuickStat label="Market Cap" value={fmtMoney(detail.market_cap)} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <MetricBox label="Market Cap" value={fmtMoney(detail.market_cap)} />
                            <MetricBox label="P/E Ratio" value={fmt(detail.pe_ratio)} highlight={detail.pe_ratio < 20} />
                            <MetricBox label="EPS" value={`$${fmt(detail.eps)}`} />
                            <MetricBox label="Beta" value={fmt(detail.beta)} />
                            <MetricBox label="Dividend" value={detail.dividend_yield > 0 ? `${fmt(detail.dividend_yield)}%` : '—'} />
                        </div>

                        {/* 52 Week Range */}
                        <div className="bg-[#161b22] rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4">52 Week Price Range</h3>
                            <div className="flex justify-between text-sm text-gray-400 mb-2">
                                <span>${fmt(detail.fifty_two_week_low)}</span>
                                <span className="text-white font-medium">${fmt(detail.current_price)}</span>
                                <span>${fmt(detail.fifty_two_week_high)}</span>
                            </div>
                            <div className="relative h-3 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-emerald-500/30 rounded-full">
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-violet-500"
                                    style={{ left: `calc(${get52WPos()}% - 8px)` }}
                                />
                            </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Valuation */}
                            <Section title="Valuation" icon={<DollarSign className="w-4 h-4" />}>
                                <Row label="P/E (TTM)" value={fmt(detail.pe_ratio)} />
                                <Row label="P/E (Forward)" value={fmt(detail.forward_pe)} />
                                <Row label="PEG Ratio" value={fmt(detail.peg_ratio)} />
                                <Row label="P/B Ratio" value={fmt(detail.price_to_book)} />
                                <Row label="EV/EBITDA" value={fmt(detail.ev_to_ebitda)} />
                            </Section>

                            {/* Profitability */}
                            <Section title="Profitability" icon={<Activity className="w-4 h-4" />}>
                                <Row label="Gross Margin" value={fmtPct(detail.gross_margin)} good={detail.gross_margin > 0} />
                                <Row label="Operating Margin" value={fmtPct(detail.operating_margin)} good={detail.operating_margin > 0} />
                                <Row label="Profit Margin" value={fmtPct(detail.profit_margin)} good={detail.profit_margin > 0} />
                                <Row label="ROE" value={fmtPct(detail.roe)} good={detail.roe > 0.1} />
                                <Row label="Revenue Growth" value={fmtPct(detail.revenue_growth)} good={detail.revenue_growth > 0} />
                            </Section>

                            {/* Analyst */}
                            <Section title="Analyst Consensus" icon={<Target className="w-4 h-4" />}>
                                <div className="mb-3">
                                    <span className={`px-3 py-1 rounded-lg text-sm font-bold uppercase ${detail.recommendation?.includes('buy') ? 'bg-emerald-500/20 text-emerald-400' :
                                            detail.recommendation?.includes('sell') ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {detail.recommendation?.replace('_', ' ') || '—'}
                                    </span>
                                    <span className="ml-2 text-sm text-gray-500">({detail.num_analysts} analysts)</span>
                                </div>
                                <Row label="Target High" value={`$${fmt(detail.target_high)}`} />
                                <Row label="Target Mean" value={`$${fmt(detail.target_mean)}`} />
                                <Row label="Target Low" value={`$${fmt(detail.target_low)}`} />
                                {upside !== null && <Row label="Upside Potential" value={`${upside >= 0 ? '+' : ''}${fmt(upside)}%`} good={upside > 0} />}
                            </Section>

                            {/* Balance Sheet */}
                            <Section title="Balance Sheet" icon={<Building2 className="w-4 h-4" />}>
                                <Row label="Total Cash" value={fmtMoney(detail.total_cash)} />
                                <Row label="Total Debt" value={fmtMoney(detail.total_debt)} />
                                <Row label="Debt/Equity" value={fmt(detail.debt_to_equity)} />
                                <Row label="Current Ratio" value={fmt(detail.current_ratio)} good={detail.current_ratio > 1} />
                            </Section>

                            {/* Dividends */}
                            <Section title="Dividends" icon={<DollarSign className="w-4 h-4" />}>
                                <Row label="Dividend Yield" value={detail.dividend_yield > 0 ? `${fmt(detail.dividend_yield)}%` : '—'} good={detail.dividend_yield > 0} />
                                <Row label="Dividend Rate" value={detail.dividend_rate > 0 ? `$${fmt(detail.dividend_rate)}` : '—'} />
                            </Section>

                            {/* Technicals */}
                            <Section title="Moving Averages" icon={<TrendingUp className="w-4 h-4" />}>
                                <Row label="50-Day MA" value={`$${fmt(detail.fifty_day_avg)}`} good={detail.current_price > detail.fifty_day_avg} />
                                <Row label="200-Day MA" value={`$${fmt(detail.two_hundred_day_avg)}`} good={detail.current_price > detail.two_hundred_day_avg} />
                                <Row label="Industry" value={detail.industry} />
                            </Section>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function QuickStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#161b22] rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-white font-medium">{value}</div>
        </div>
    );
}

function MetricBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="bg-[#161b22] rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-[#161b22] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4 text-violet-400">
                {icon}
                <h3 className="font-semibold text-white">{title}</h3>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className={good === undefined ? 'text-white' : good ? 'text-emerald-400' : 'text-red-400'}>{value}</span>
        </div>
    );
}
