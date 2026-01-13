'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Target, Activity, Building2, BarChart3, Briefcase } from 'lucide-react';

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

interface NewsItem {
    title: string;
    publisher: string;
    link: string;
    published: number;
    published_date: string;
    thumbnail: string;
    summary: string;
}

interface EarningsData {
    quarters: { date: string; revenue: number | null; earnings: number | null; eps: number | null }[];
    eps_history: { date: string; eps_estimate: number | null; eps_actual: number | null; surprise_pct: number | null }[];
    next_earnings: string | null;
    current_eps: number | null;
    forward_eps: number | null;
}

interface FinancialsData {
    income_statement: { period: string; total_revenue: number; gross_profit: number; operating_income: number; net_income: number }[];
    cash_flow: { period: string; operating_cash_flow: number; free_cash_flow: number; capital_expenditure: number }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
    const router = useRouter();
    const symbol = params.symbol.toUpperCase();

    const [detail, setDetail] = useState<StockDetail | null>(null);
    const [history, setHistory] = useState<HistoryData[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [financials, setFinancials] = useState<FinancialsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('6mo');
    const [activeView, setActiveView] = useState<'chart' | 'fundamentals' | 'news' | 'earnings' | 'financials' | 'valuation'>('chart');
    const [valuation, setValuation] = useState<{
        ticker: string;
        current_price: number;
        fair_value: number;
        upside_pct: number;
        status: string;
        methodology: {
            sector: string;
            pe_vs_sector: number | null;
            ev_ebitda_vs_sector: number | null;
            adjustments: {
                pe_adj: number;
                ev_ebitda_adj: number;
                growth_adj: number;
                margin_adj: number;
                total_adj: number;
            };
        };
        disclaimers: string[];
    } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const [detailRes, historyRes, newsRes, earningsRes, financialsRes, valuationRes] = await Promise.all([
                    fetch(`${API_URL}/api/stock/${symbol}`),
                    fetch(`${API_URL}/api/stock/${symbol}/history?period=${period}`),
                    fetch(`${API_URL}/api/stock/${symbol}/news`),
                    fetch(`${API_URL}/api/stock/${symbol}/earnings`),
                    fetch(`${API_URL}/api/stock/${symbol}/financials`),
                    fetch(`${API_URL}/api/stock/${symbol}/valuation`)
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

                if (newsRes.ok) {
                    const data = await newsRes.json();
                    setNews(data.news || []);
                }

                if (earningsRes.ok) {
                    setEarnings(await earningsRes.json());
                }

                if (financialsRes.ok) {
                    setFinancials(await financialsRes.json());
                }

                if (valuationRes.ok) {
                    const valData = await valuationRes.json();
                    if (!valData.code) { // No error
                        setValuation(valData);
                    }
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
            <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-violet-500 border-t-transparent"></div>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0d1117]">
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
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: '#161b22',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 24px'
            }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={() => router.back()}
                            style={{ padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                            <ArrowLeft style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                        </button>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', fontWeight: 'bold', color: 'white'
                        }}>
                            {symbol.slice(0, 2)}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>{symbol}</h1>
                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', fontSize: '12px', color: '#9ca3af' }}>
                                    {detail.sector}
                                </span>
                            </div>
                            <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>{detail.name}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>${fmt(detail.current_price)}</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: detail.change_percent >= 0 ? '#10b981' : '#ef4444' }}>
                                {detail.change_percent >= 0 ? <ArrowUpRight style={{ width: '16px', height: '16px' }} /> : <ArrowDownRight style={{ width: '16px', height: '16px' }} />}
                                <span style={{ fontWeight: '500' }}>{detail.change_percent >= 0 ? '+' : ''}{fmt(detail.change_percent)}%</span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                const price = detail.current_price;
                                const shares = prompt(`How many shares of ${symbol} @ $${price}?`, '10');
                                if (shares && parseFloat(shares) > 0) {
                                    fetch(`${API_URL}/api/portfolio`)
                                        .then(r => r.json())
                                        .then(async data => {
                                            let portfolioId = 1;
                                            if (data.portfolios?.length > 0) {
                                                portfolioId = data.portfolios[0].id;
                                            } else {
                                                const createRes = await fetch(`${API_URL}/api/portfolio`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ name: 'My Portfolio', currency: 'USD' })
                                                });
                                                const newP = await createRes.json();
                                                portfolioId = newP.portfolio.id;
                                            }
                                            return fetch(`${API_URL}/api/portfolio/${portfolioId}/transactions`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    symbol: symbol,
                                                    transaction_type: 'buy',
                                                    shares: parseFloat(shares),
                                                    price: price,
                                                    currency: 'USD'
                                                })
                                            });
                                        })
                                        .then(r => {
                                            if (r.ok) {
                                                alert(`✅ Added ${shares} shares of ${symbol} to portfolio!`);
                                            } else {
                                                alert('Failed to add to portfolio');
                                            }
                                        })
                                        .catch(() => alert('Error adding to portfolio'));
                                }
                            }}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '10px',
                                background: '#10b981',
                                border: 'none',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            + Add to Portfolio
                        </button>
                    </div>
                </div>
            </header>

            {/* Tab Buttons */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <TabButton active={activeView === 'chart'} onClick={() => setActiveView('chart')}>
                        <BarChart3 style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Price Chart
                    </TabButton>
                    <TabButton active={activeView === 'fundamentals'} onClick={() => setActiveView('fundamentals')}>
                        <Activity style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Fundamentals
                    </TabButton>
                    <TabButton active={activeView === 'news'} onClick={() => setActiveView('news')}>
                        📰 News ({news.length})
                    </TabButton>
                    <TabButton active={activeView === 'earnings'} onClick={() => setActiveView('earnings')}>
                        💰 Earnings
                    </TabButton>
                    <TabButton active={activeView === 'financials'} onClick={() => setActiveView('financials')}>
                        📊 Financials
                    </TabButton>
                    <TabButton active={activeView === 'valuation'} onClick={() => setActiveView('valuation')}>
                        <Target style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                        Valuation
                    </TabButton>
                </div>
            </div>

            {/* Content */}
            <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 48px' }}>
                {activeView === 'chart' && (
                    <div>
                        {/* Period Selector */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            {['1mo', '3mo', '6mo', '1y', '2y'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        fontWeight: '500',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        background: period === p ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                                        color: period === p ? 'white' : '#9ca3af',
                                    }}
                                >
                                    {p.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Chart Card */}
                        <Card>
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
                                <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                    No chart data available
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeView === 'fundamentals' && (
                    <div>
                        {/* Key Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            <MetricCard label="Market Cap" value={fmtMoney(detail.market_cap)} />
                            <MetricCard label="P/E Ratio" value={fmt(detail.pe_ratio)} highlight={detail.pe_ratio < 20 && detail.pe_ratio > 0} />
                            <MetricCard label="EPS" value={`$${fmt(detail.eps)}`} />
                            <MetricCard label="Beta" value={fmt(detail.beta)} />
                            <MetricCard label="Dividend" value={detail.dividend_yield > 0 ? `${fmt(detail.dividend_yield)}%` : '—'} />
                        </div>

                        {/* Fair Value Card */}
                        {(() => {
                            // Calculate Fair Value based on EPS and sector P/E
                            const sectorPE: Record<string, number> = {
                                'Technology': 28, 'Healthcare': 22, 'Financial Services': 14,
                                'Consumer Cyclical': 20, 'Consumer Defensive': 24, 'Energy': 12,
                                'Industrials': 18, 'Communication Services': 20, 'Real Estate': 16,
                            };
                            const avgPE = sectorPE[detail.sector] || 20;
                            const fairValueEPS = detail.eps > 0 ? detail.eps * avgPE : 0;
                            const fairValueTarget = detail.target_mean || 0;
                            const fairValue = fairValueEPS > 0 ? (fairValueEPS + fairValueTarget) / 2 : fairValueTarget;
                            const premium = detail.current_price && fairValue > 0
                                ? ((detail.current_price - fairValue) / fairValue) * 100
                                : 0;
                            const isUndervalued = premium < -5;
                            const isOvervalued = premium > 10;

                            return fairValue > 0 ? (
                                <Card style={{ marginBottom: '24px', background: isUndervalued ? 'rgba(16,185,129,0.1)' : isOvervalued ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', border: `1px solid ${isUndervalued ? '#10b981' : isOvervalued ? '#ef4444' : '#6366f1'}` }}>
                                    <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        💎 Fair Value Analysis
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', background: isUndervalued ? '#10b981' : isOvervalued ? '#ef4444' : '#6366f1', color: 'white' }}>
                                            {isUndervalued ? 'UNDERVALUED' : isOvervalued ? 'OVERVALUED' : 'FAIR'}
                                        </span>
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Current Price</div>
                                            <div style={{ fontSize: '20px', fontWeight: '700', color: 'white' }}>${fmt(detail.current_price)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Fair Value</div>
                                            <div style={{ fontSize: '20px', fontWeight: '700', color: '#a855f7' }}>${fmt(fairValue)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Premium/Discount</div>
                                            <div style={{ fontSize: '20px', fontWeight: '700', color: premium < 0 ? '#10b981' : '#ef4444' }}>
                                                {premium >= 0 ? '+' : ''}{fmt(premium)}%
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ) : null;
                        })()}

                        {/* 52 Week Range Card */}
                        <Card style={{ marginBottom: '24px' }}>
                            <h3 style={{ color: 'white', fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>
                                52 Week Price Range
                            </h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#9ca3af', marginBottom: '12px' }}>
                                <span>${fmt(detail.fifty_two_week_low)}</span>
                                <span style={{ color: 'white', fontWeight: '600' }}>${fmt(detail.current_price)}</span>
                                <span>${fmt(detail.fifty_two_week_high)}</span>
                            </div>
                            <div style={{ position: 'relative', height: '12px', background: 'linear-gradient(to right, rgba(239,68,68,0.3), rgba(234,179,8,0.3), rgba(34,197,94,0.3))', borderRadius: '9999px' }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    border: '3px solid #7c3aed',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                    left: `calc(${get52WPos()}% - 8px)`
                                }} />
                            </div>
                        </Card>

                        {/* Metrics Cards Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                            {/* Valuation */}
                            <SectionCard title="Valuation" icon={<DollarSign style={{ width: '18px', height: '18px' }} />} color="#a855f7">
                                <MetricRow label="P/E (TTM)" value={fmt(detail.pe_ratio)} />
                                <MetricRow label="P/E (Forward)" value={fmt(detail.forward_pe)} />
                                <MetricRow label="PEG Ratio" value={fmt(detail.peg_ratio)} />
                                <MetricRow label="P/B Ratio" value={fmt(detail.price_to_book)} />
                                <MetricRow label="EV/EBITDA" value={fmt(detail.ev_to_ebitda)} />
                            </SectionCard>

                            {/* Profitability */}
                            <SectionCard title="Profitability" icon={<Activity style={{ width: '18px', height: '18px' }} />} color="#10b981">
                                <MetricRow label="Gross Margin" value={fmtPct(detail.gross_margin)} positive={detail.gross_margin > 0} />
                                <MetricRow label="Operating Margin" value={fmtPct(detail.operating_margin)} positive={detail.operating_margin > 0} />
                                <MetricRow label="Profit Margin" value={fmtPct(detail.profit_margin)} positive={detail.profit_margin > 0} />
                                <MetricRow label="ROE" value={fmtPct(detail.roe)} positive={detail.roe > 0.1} />
                                <MetricRow label="Revenue Growth" value={fmtPct(detail.revenue_growth)} positive={detail.revenue_growth > 0} />
                            </SectionCard>

                            {/* Analyst Consensus */}
                            <SectionCard title="Analyst Consensus" icon={<Target style={{ width: '18px', height: '18px' }} />} color="#3b82f6">
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        background: detail.recommendation?.includes('buy') ? 'rgba(16,185,129,0.2)' :
                                            detail.recommendation?.includes('sell') ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)',
                                        color: detail.recommendation?.includes('buy') ? '#10b981' :
                                            detail.recommendation?.includes('sell') ? '#ef4444' : '#eab308'
                                    }}>
                                        {detail.recommendation?.replace('_', ' ') || '—'}
                                    </span>
                                    <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6b7280' }}>
                                        ({detail.num_analysts} analysts)
                                    </span>
                                </div>
                                <MetricRow label="Target High" value={`$${fmt(detail.target_high)}`} />
                                <MetricRow label="Target Mean" value={`$${fmt(detail.target_mean)}`} />
                                <MetricRow label="Target Low" value={`$${fmt(detail.target_low)}`} />
                                {upside !== null && (
                                    <MetricRow label="Upside Potential" value={`${upside >= 0 ? '+' : ''}${fmt(upside)}%`} positive={upside > 0} />
                                )}
                            </SectionCard>

                            {/* Balance Sheet */}
                            <SectionCard title="Balance Sheet" icon={<Building2 style={{ width: '18px', height: '18px' }} />} color="#f97316">
                                <MetricRow label="Total Cash" value={fmtMoney(detail.total_cash)} />
                                <MetricRow label="Total Debt" value={fmtMoney(detail.total_debt)} />
                                <MetricRow label="Debt/Equity" value={fmt(detail.debt_to_equity)} />
                                <MetricRow label="Current Ratio" value={fmt(detail.current_ratio)} positive={detail.current_ratio > 1} />
                            </SectionCard>

                            {/* Dividends */}
                            <SectionCard title="Dividends" icon={<DollarSign style={{ width: '18px', height: '18px' }} />} color="#ec4899">
                                <MetricRow label="Dividend Yield" value={detail.dividend_yield > 0 ? `${fmt(detail.dividend_yield)}%` : '—'} positive={detail.dividend_yield > 0} />
                                <MetricRow label="Dividend Rate" value={detail.dividend_rate > 0 ? `$${fmt(detail.dividend_rate)}` : '—'} />
                            </SectionCard>

                            {/* Moving Averages */}
                            <SectionCard title="Moving Averages" icon={<TrendingUp style={{ width: '18px', height: '18px' }} />} color="#06b6d4">
                                <MetricRow label="50-Day MA" value={`$${fmt(detail.fifty_day_avg)}`} positive={detail.current_price > detail.fifty_day_avg} />
                                <MetricRow label="200-Day MA" value={`$${fmt(detail.two_hundred_day_avg)}`} positive={detail.current_price > detail.two_hundred_day_avg} />
                                <MetricRow label="Industry" value={detail.industry} />
                            </SectionCard>
                        </div>
                    </div>
                )}

                {/* News Tab */}
                {activeView === 'news' && (
                    <div>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
                            📰 Latest News for {symbol}
                        </h2>
                        {news.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {news.map((item, idx) => (
                                    <a
                                        key={idx}
                                        href={item.link || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            gap: '16px',
                                            padding: '20px',
                                            background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(99,102,241,0.25)',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
                                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)')}
                                    >
                                        {item.thumbnail && (
                                            <img
                                                src={item.thumbnail}
                                                alt=""
                                                style={{ width: '120px', height: '80px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                                            />
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                                                {item.title}
                                            </h3>
                                            {item.summary && (
                                                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 12px 0', lineHeight: '1.5', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.summary}
                                                </p>
                                            )}
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                                                <span style={{ color: '#a855f7', fontWeight: '500' }}>{item.publisher}</span>
                                                <span>{item.published_date || 'Recently'}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', color: '#7c3aed', fontSize: '20px' }}>↗</div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                No news available for this stock.
                            </div>
                        )}
                    </div>
                )}

                {/* Earnings Tab */}
                {activeView === 'earnings' && earnings && (
                    <div>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
                            💰 Earnings History - {symbol}
                        </h2>

                        {/* Current EPS Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ padding: '20px', background: 'rgba(99,102,241,0.1)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Current EPS (TTM)</div>
                                <div style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>
                                    ${earnings.current_eps?.toFixed(2) || '—'}
                                </div>
                            </div>
                            <div style={{ padding: '20px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Forward EPS</div>
                                <div style={{ color: '#10b981', fontSize: '24px', fontWeight: '700' }}>
                                    ${earnings.forward_eps?.toFixed(2) || '—'}
                                </div>
                            </div>
                            {earnings.next_earnings && (
                                <div style={{ padding: '20px', background: 'rgba(236,72,153,0.1)', borderRadius: '12px', border: '1px solid rgba(236,72,153,0.2)' }}>
                                    <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>📅 Next Earnings</div>
                                    <div style={{ color: '#f472b6', fontSize: '16px', fontWeight: '600' }}>
                                        {earnings.next_earnings}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quarterly Revenue & Earnings Table */}
                        {earnings.quarters && earnings.quarters.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '16px' }}>Quarterly Revenue & Earnings</h3>
                                <div className="table-container">
                                    <table className="data-table" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th>Quarter</th>
                                                <th className="text-right">Revenue</th>
                                                <th className="text-right">Net Income</th>
                                                <th className="text-right">EPS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {earnings.quarters.slice(0, 8).map((q: { date: string; revenue: number | null; earnings: number | null; eps: number | null }, idx: number) => (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: '500' }}>{q.date}</td>
                                                    <td className="text-right font-mono">
                                                        {q.revenue ? `$${(q.revenue / 1e9).toFixed(2)}B` : '—'}
                                                    </td>
                                                    <td className="text-right font-mono" style={{ color: (q.earnings || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {q.earnings ? `$${(q.earnings / 1e9).toFixed(2)}B` : '—'}
                                                    </td>
                                                    <td className="text-right font-mono" style={{ color: (q.eps || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                                        {q.eps ? `$${q.eps.toFixed(2)}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* EPS History */}
                        {earnings.eps_history && earnings.eps_history.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '16px' }}>EPS - Actual vs Estimate</h3>
                                <div className="table-container">
                                    <table className="data-table" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th>Quarter</th>
                                                <th className="text-right">EPS Estimate</th>
                                                <th className="text-right">EPS Actual</th>
                                                <th className="text-right">Surprise %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {earnings.eps_history.slice(0, 8).map((q: { date: string; eps_estimate: number | null; eps_actual: number | null; surprise_pct: number | null }, idx: number) => (
                                                <tr key={idx}>
                                                    <td>{q.date}</td>
                                                    <td className="text-right font-mono">${q.eps_estimate?.toFixed(2) || '—'}</td>
                                                    <td className="text-right font-mono">${q.eps_actual?.toFixed(2) || '—'}</td>
                                                    <td className="text-right font-mono" style={{
                                                        color: (q.surprise_pct || 0) >= 0 ? '#10b981' : '#ef4444',
                                                        fontWeight: '600'
                                                    }}>
                                                        {q.surprise_pct != null ? `${q.surprise_pct >= 0 ? '+' : ''}${q.surprise_pct.toFixed(1)}%` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* No data message */}
                        {(!earnings.quarters || earnings.quarters.length === 0) && (!earnings.eps_history || earnings.eps_history.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                                <div>No earnings data available for this stock.</div>
                                <div style={{ fontSize: '12px', marginTop: '8px' }}>This may be a newer company or earnings data is not reported.</div>
                            </div>
                        )}
                    </div>
                )}

                {/* Financials Tab */}
                {activeView === 'financials' && financials && (
                    <div>
                        <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
                            📊 Financial Statements - {symbol}
                        </h2>

                        {/* Income Statement */}
                        {financials.income_statement.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <h3 style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '16px' }}>Income Statement (Annual)</h3>
                                <div className="table-container">
                                    <table className="data-table" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', minWidth: '180px' }}>Breakdown</th>
                                                {financials.income_statement.map((row: { period: string }, idx: number) => (
                                                    <th key={idx} className="text-right">{row.period}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { key: 'total_revenue', label: 'Total Revenue' },
                                                { key: 'cost_of_revenue', label: 'Cost of Revenue' },
                                                { key: 'gross_profit', label: 'Gross Profit' },
                                                { key: 'operating_expense', label: 'Operating Expense' },
                                                { key: 'operating_income', label: 'Operating Income' },
                                                { key: 'interest_expense', label: 'Interest Expense' },
                                                { key: 'pretax_income', label: 'Pretax Income' },
                                                { key: 'tax_provision', label: 'Tax Provision' },
                                                { key: 'net_income', label: 'Net Income' },
                                                { key: 'ebitda', label: 'EBITDA' },
                                            ].map(({ key, label }) => (
                                                <tr key={key}>
                                                    <td style={{ fontWeight: key === 'ebitda' ? '600' : '400', color: key === 'ebitda' ? '#a855f7' : '#d1d5db' }}>{label}</td>
                                                    {financials.income_statement.map((row: Record<string, number | null | string>, idx: number) => (
                                                        <td key={idx} className="text-right font-mono" style={{
                                                            color: typeof row[key] === 'number' && row[key] !== null
                                                                ? (row[key] as number) >= 0 ? '#10b981' : '#ef4444'
                                                                : '#9ca3af'
                                                        }}>
                                                            {fmtMoney(row[key] as number | null | undefined)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Cash Flow Statement */}
                        {financials.cash_flow.length > 0 && (
                            <div>
                                <h3 style={{ color: '#d1d5db', fontSize: '16px', marginBottom: '16px' }}>Cash Flow Statement</h3>
                                <div className="table-container">
                                    <table className="data-table" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', minWidth: '200px' }}>Breakdown</th>
                                                {financials.cash_flow.map((row: { period: string }, idx: number) => (
                                                    <th key={idx} className="text-right">{row.period}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { key: 'operating_cash_flow', label: 'Operating Cash Flow' },
                                                { key: 'investing_cash_flow', label: 'Investing Cash Flow' },
                                                { key: 'financing_cash_flow', label: 'Financing Cash Flow' },
                                                { key: 'end_cash_position', label: 'End Cash Position' },
                                                { key: 'capital_expenditure', label: 'Capital Expenditure' },
                                                { key: 'issuance_of_capital_stock', label: 'Issuance of Capital Stock' },
                                                { key: 'issuance_of_debt', label: 'Issuance of Debt' },
                                                { key: 'repayment_of_debt', label: 'Repayment of Debt' },
                                                { key: 'repurchase_of_capital_stock', label: 'Repurchase of Capital Stock' },
                                                { key: 'free_cash_flow', label: 'Free Cash Flow' },
                                            ].map(({ key, label }) => (
                                                <tr key={key}>
                                                    <td style={{ fontWeight: key === 'free_cash_flow' ? '600' : '400', color: key === 'free_cash_flow' ? '#a855f7' : '#d1d5db' }}>{label}</td>
                                                    {financials.cash_flow.map((row: Record<string, number | null | string>, idx: number) => (
                                                        <td key={idx} className="text-right font-mono" style={{
                                                            color: typeof row[key] === 'number' && row[key] !== null
                                                                ? (row[key] as number) >= 0 ? '#10b981' : '#ef4444'
                                                                : '#9ca3af'
                                                        }}>
                                                            {fmtMoney(row[key] as number | null | undefined)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Valuation Tab */}
                {activeView === 'valuation' && (
                    <div className="card" style={{ padding: '24px' }}>
                        {valuation ? (
                            <div>
                                {/* Fair Value Summary */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                                    <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>Fair Value</div>
                                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#a855f7' }}>
                                            ${valuation.fair_value.toFixed(2)}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>Current Price</div>
                                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                                            ${valuation.current_price.toFixed(2)}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: valuation.upside_pct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '12px', padding: '20px',
                                        border: `1px solid ${valuation.upside_pct >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>Upside/Downside</div>
                                        <div style={{ fontSize: '2rem', fontWeight: '700', color: valuation.upside_pct >= 0 ? '#10b981' : '#ef4444' }}>
                                            {valuation.upside_pct >= 0 ? '+' : ''}{valuation.upside_pct.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div style={{
                                        background: valuation.status === 'UNDERVALUED' ? 'rgba(16, 185, 129, 0.1)' : valuation.status === 'OVERVALUED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '12px', padding: '20px',
                                        border: `1px solid ${valuation.status === 'UNDERVALUED' ? 'rgba(16, 185, 129, 0.2)' : valuation.status === 'OVERVALUED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                    }}>
                                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>Status</div>
                                        <div style={{
                                            fontSize: '1.25rem', fontWeight: '700',
                                            color: valuation.status === 'UNDERVALUED' ? '#10b981' : valuation.status === 'OVERVALUED' ? '#ef4444' : '#f59e0b'
                                        }}>
                                            {valuation.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                </div>

                                {/* Methodology Breakdown */}
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '16px', color: '#f8fafc' }}>
                                    📊 Methodology Breakdown
                                </h3>
                                <div style={{ background: 'rgba(26, 26, 38, 0.6)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Sector</span>
                                            <div style={{ fontWeight: '500' }}>{valuation.methodology.sector}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>P/E vs Sector</span>
                                            <div style={{ fontWeight: '500', color: (valuation.methodology.pe_vs_sector || 0) < 1 ? '#10b981' : '#ef4444' }}>
                                                {valuation.methodology.pe_vs_sector ? `${valuation.methodology.pe_vs_sector.toFixed(2)}x` : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>EV/EBITDA vs Sector</span>
                                            <div style={{ fontWeight: '500', color: (valuation.methodology.ev_ebitda_vs_sector || 0) < 1 ? '#10b981' : '#ef4444' }}>
                                                {valuation.methodology.ev_ebitda_vs_sector ? `${valuation.methodology.ev_ebitda_vs_sector.toFixed(2)}x` : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '16px 0' }} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                                        {[
                                            { label: 'P/E Adjustment', value: valuation.methodology.adjustments.pe_adj },
                                            { label: 'EV/EBITDA Adj', value: valuation.methodology.adjustments.ev_ebitda_adj },
                                            { label: 'Growth Adj', value: valuation.methodology.adjustments.growth_adj },
                                            { label: 'Margin Adj', value: valuation.methodology.adjustments.margin_adj },
                                            { label: 'Total Adj', value: valuation.methodology.adjustments.total_adj },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{label}</span>
                                                <div style={{ fontWeight: '600', color: value >= 0 ? '#10b981' : '#ef4444' }}>
                                                    {value >= 0 ? '+' : ''}{value.toFixed(1)}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Disclaimers */}
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <div style={{ fontWeight: '600', color: '#f59e0b', marginBottom: '8px', fontSize: '0.875rem' }}>⚠️ Important Disclaimers</div>
                                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#d1d5db', fontSize: '0.8rem' }}>
                                        {valuation.disclaimers.map((d, i) => (
                                            <li key={i} style={{ marginBottom: '4px' }}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '48px' }}>
                                <Target style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.5 }} />
                                <p>Fair value calculation not available for this stock.</p>
                                <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>Insufficient data to perform valuation.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

// Helper Components with inline styles for reliability
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                background: active ? '#7c3aed' : 'rgba(255,255,255,0.05)',
                color: active ? 'white' : '#9ca3af',
                transition: 'all 0.2s'
            }}
        >
            {children}
        </button>
    );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{
            backgroundColor: '#161b22',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '24px',
            ...style
        }}>
            {children}
        </div>
    );
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div style={{
            backgroundColor: '#161b22',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '16px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: highlight ? '#10b981' : 'white' }}>{value}</div>
        </div>
    );
}

function SectionCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
    return (
        <div style={{
            backgroundColor: '#161b22',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ color }}>{icon}</div>
                <h3 style={{ color: 'white', fontWeight: '600', fontSize: '15px', margin: 0 }}>{title}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {children}
            </div>
        </div>
    );
}

function MetricRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
            <span style={{ color: '#9ca3af' }}>{label}</span>
            <span style={{
                fontWeight: '500',
                color: positive === undefined ? 'white' : positive ? '#10b981' : '#ef4444'
            }}>
                {value}
            </span>
        </div>
    );
}
