'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X, TrendingUp, TrendingDown, BarChart3, DollarSign, Target, Activity, Building2, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
    forward_pe: number;
    peg_ratio: number;
    price_to_book: number;
    price_to_sales: number;
    ev_to_ebitda: number;
    revenue: number;
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
    forward_eps: number;
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
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('6mo');
    const [activeTab, setActiveTab] = useState<'chart' | 'fundamentals'>('chart');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Close on escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (symbol) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [symbol]);

    useEffect(() => {
        if (!symbol) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [detailRes, historyRes] = await Promise.all([
                    fetch(`${API_URL}/api/stock/${symbol}`),
                    fetch(`${API_URL}/api/stock/${symbol}/history?period=${period}`)
                ]);
                if (detailRes.ok) setDetail(await detailRes.json());
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

    if (!symbol || !mounted) return null;

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

    // Calculate position from 52W range
    const get52WPosition = () => {
        if (!detail) return 50;
        const range = detail.fifty_two_week_high - detail.fifty_two_week_low;
        if (range === 0) return 50;
        return ((detail.current_price - detail.fifty_two_week_low) / range) * 100;
    };

    // Calculate upside/downside to target
    const getUpsideToTarget = () => {
        if (!detail?.target_mean || !detail?.current_price) return null;
        return ((detail.target_mean - detail.current_price) / detail.current_price) * 100;
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={onClose}
        >
            <div
                className="relative w-[95vw] max-w-7xl max-h-[92vh] overflow-hidden bg-[#0d1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#161b22]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                            {symbol.slice(0, 2)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white">{symbol}</h2>
                                {detail && (
                                    <span className="px-2 py-1 rounded-md bg-white/10 text-xs text-gray-400">
                                        {detail.sector}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm">{detail?.name || 'Loading...'}</p>
                        </div>
                    </div>

                    {detail && (
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">${formatNum(detail.current_price)}</div>
                                <div className={`flex items-center justify-end gap-1 text-sm ${detail.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {detail.change_percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    {formatPct(detail.change_percent, false)}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-3 bg-[#161b22] border-b border-white/5">
                    <button
                        onClick={() => setActiveTab('chart')}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'chart'
                                ? 'bg-violet-600 text-white shadow-lg'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4 inline-block mr-2" />
                        Price Chart
                    </button>
                    <button
                        onClick={() => setActiveTab('fundamentals')}
                        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${activeTab === 'fundamentals'
                                ? 'bg-violet-600 text-white shadow-lg'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <PieChart className="w-4 h-4 inline-block mr-2" />
                        Fundamentals
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center h-80">
                            <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-500 border-t-transparent"></div>
                        </div>
                    ) : activeTab === 'chart' ? (
                        <>
                            {/* Period Selector */}
                            <div className="flex gap-1.5 mb-4">
                                {['1mo', '3mo', '6mo', '1y', '2y'].map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                                                ? 'bg-violet-600 text-white'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {p.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Candlestick Chart */}
                            <div className="bg-[#161b22] rounded-xl p-4 mb-4">
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
                                            line: { color: '#eab308', width: 1.5 },
                                        },
                                        {
                                            type: 'scatter',
                                            mode: 'lines',
                                            x: history.map(d => d.date),
                                            y: history.map(d => d.sma50),
                                            name: 'SMA 50',
                                            line: { color: '#3b82f6', width: 1.5 },
                                        },
                                        {
                                            type: 'scatter',
                                            mode: 'lines',
                                            x: history.map(d => d.date),
                                            y: history.map(d => d.sma200),
                                            name: 'SMA 200',
                                            line: { color: '#a855f7', width: 2 },
                                        },
                                    ]}
                                    layout={{
                                        autosize: true,
                                        height: 380,
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
                                        legend: { orientation: 'h', y: 1.08, x: 0.5, xanchor: 'center' },
                                        showlegend: true,
                                    }}
                                    config={{ displayModeBar: false, responsive: true }}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Volume Chart */}
                            <div className="bg-[#161b22] rounded-xl p-4">
                                <div className="text-xs font-medium text-gray-500 mb-2">Volume</div>
                                <Plot
                                    data={[{
                                        type: 'bar',
                                        x: history.map(d => d.date),
                                        y: history.map(d => d.volume),
                                        marker: {
                                            color: history.map((d, i) =>
                                                i > 0 && d.close >= history[i - 1].close ? '#22c55e' : '#ef4444'
                                            ),
                                        },
                                    }]}
                                    layout={{
                                        autosize: true,
                                        height: 120,
                                        margin: { l: 50, r: 50, t: 5, b: 30 },
                                        paper_bgcolor: 'transparent',
                                        plot_bgcolor: 'transparent',
                                        font: { color: '#9ca3af', size: 10 },
                                        xaxis: { gridcolor: 'rgba(255,255,255,0.04)' },
                                        yaxis: { gridcolor: 'rgba(255,255,255,0.04)', side: 'right' },
                                        showlegend: false,
                                    }}
                                    config={{ displayModeBar: false, responsive: true }}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </>
                    ) : detail && (
                        <div className="space-y-5">
                            {/* Key Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Market Cap" value={formatMoney(detail.market_cap)} />
                                <StatCard label="P/E Ratio" value={formatNum(detail.pe_ratio)} highlight={detail.pe_ratio < 20} />
                                <StatCard label="EPS" value={`$${formatNum(detail.eps)}`} />
                                <StatCard label="Beta" value={formatNum(detail.beta)} />
                            </div>

                            {/* 52 Week Range Visual */}
                            <div className="bg-[#161b22] rounded-xl p-5">
                                <div className="flex justify-between text-xs text-gray-500 mb-2">
                                    <span>52W Low: ${formatNum(detail.fifty_two_week_low)}</span>
                                    <span className="font-medium text-white">Current: ${formatNum(detail.current_price)}</span>
                                    <span>52W High: ${formatNum(detail.fifty_two_week_high)}</span>
                                </div>
                                <div className="relative h-3 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-emerald-500/30 rounded-full">
                                    <div
                                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-violet-500"
                                        style={{ left: `calc(${get52WPosition()}% - 8px)` }}
                                    />
                                </div>
                            </div>

                            {/* Main Grid */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Valuation */}
                                <div className="bg-[#161b22] rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <DollarSign className="w-4 h-4 text-violet-400" />
                                        <h3 className="font-semibold text-white">Valuation</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <MetricRow label="P/E (TTM)" value={formatNum(detail.pe_ratio)} />
                                        <MetricRow label="P/E (Fwd)" value={formatNum(detail.forward_pe)} />
                                        <MetricRow label="PEG Ratio" value={formatNum(detail.peg_ratio)} />
                                        <MetricRow label="P/B Ratio" value={formatNum(detail.price_to_book)} />
                                        <MetricRow label="P/S Ratio" value={formatNum(detail.price_to_sales)} />
                                        <MetricRow label="EV/EBITDA" value={formatNum(detail.ev_to_ebitda)} />
                                    </div>
                                </div>

                                {/* Profitability */}
                                <div className="bg-[#161b22] rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Activity className="w-4 h-4 text-emerald-400" />
                                        <h3 className="font-semibold text-white">Profitability</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <MetricRow label="Gross Margin" value={formatPct(detail.gross_margin)} positive={detail.gross_margin > 0} />
                                        <MetricRow label="Operating Margin" value={formatPct(detail.operating_margin)} positive={detail.operating_margin > 0} />
                                        <MetricRow label="Profit Margin" value={formatPct(detail.profit_margin)} positive={detail.profit_margin > 0} />
                                        <MetricRow label="ROE" value={formatPct(detail.roe)} positive={detail.roe > 0.15} />
                                        <MetricRow label="ROA" value={formatPct(detail.roa)} positive={detail.roa > 0.05} />
                                        <MetricRow label="Revenue Growth" value={formatPct(detail.revenue_growth)} positive={detail.revenue_growth > 0} />
                                    </div>
                                </div>

                                {/* Analyst Ratings */}
                                <div className="bg-[#161b22] rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Target className="w-4 h-4 text-blue-400" />
                                        <h3 className="font-semibold text-white">Analyst Ratings</h3>
                                    </div>
                                    <div className="mb-4">
                                        <div className={`inline-block px-3 py-1.5 rounded-lg text-sm font-bold uppercase ${detail.recommendation === 'buy' || detail.recommendation === 'strong_buy' ? 'bg-emerald-500/20 text-emerald-400' :
                                                detail.recommendation === 'sell' || detail.recommendation === 'strong_sell' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {detail.recommendation?.replace('_', ' ') || 'N/A'}
                                        </div>
                                        <span className="ml-2 text-sm text-gray-500">({detail.num_analysts} analysts)</span>
                                    </div>
                                    <div className="space-y-3">
                                        <MetricRow label="Target High" value={`$${formatNum(detail.target_high)}`} />
                                        <MetricRow label="Target Mean" value={`$${formatNum(detail.target_mean)}`} />
                                        <MetricRow label="Target Low" value={`$${formatNum(detail.target_low)}`} />
                                        {getUpsideToTarget() !== null && (
                                            <MetricRow
                                                label="Upside to Target"
                                                value={`${getUpsideToTarget()! >= 0 ? '+' : ''}${getUpsideToTarget()!.toFixed(1)}%`}
                                                positive={getUpsideToTarget()! > 0}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Financial Health */}
                                <div className="bg-[#161b22] rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Building2 className="w-4 h-4 text-orange-400" />
                                        <h3 className="font-semibold text-white">Financial Health</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <MetricRow label="Total Cash" value={formatMoney(detail.total_cash)} />
                                        <MetricRow label="Total Debt" value={formatMoney(detail.total_debt)} />
                                        <MetricRow label="Debt/Equity" value={formatNum(detail.debt_to_equity)} highlight={detail.debt_to_equity < 100} />
                                        <MetricRow label="Current Ratio" value={formatNum(detail.current_ratio)} positive={detail.current_ratio > 1} />
                                    </div>
                                </div>

                                {/* Dividends */}
                                <div className="bg-[#161b22] rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <DollarSign className="w-4 h-4 text-pink-400" />
                                        <h3 className="font-semibold text-white">Dividends</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <MetricRow label="Dividend Yield" value={formatPct(detail.dividend_yield / 100, false)} positive={detail.dividend_yield > 0} />
                                        <MetricRow label="Dividend Rate" value={`$${formatNum(detail.dividend_rate)}`} />
                                        <MetricRow label="Payout Ratio" value={formatPct(detail.payout_ratio)} />
                                    </div>
                                </div>

                                {/* Moving Averages */}
                                <div className="bg-[#161b22] rounded-xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                                        <h3 className="font-semibold text-white">Moving Averages</h3>
                                    </div>
                                    <div className="space-y-3">
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Use portal to render at document root
    return createPortal(modalContent, document.body);
}

// Helper Components
function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="bg-[#161b22] rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
        </div>
    );
}

function MetricRow({ label, value, positive, highlight }: { label: string; value: string; positive?: boolean; highlight?: boolean }) {
    const valueColor = highlight ? 'text-emerald-400' : positive !== undefined ? (positive ? 'text-emerald-400' : 'text-red-400') : 'text-white';
    return (
        <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{label}</span>
            <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
        </div>
    );
}
