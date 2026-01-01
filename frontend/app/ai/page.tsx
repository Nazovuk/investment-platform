'use client';

import { useState, useEffect, useCallback } from 'react';
import { aiApi, AIRecommendation } from '@/lib/api';

const investmentStyles = [
    { id: 'balanced', name: 'Balanced', icon: '⚖️' },
    { id: 'value', name: 'Value', icon: '💎' },
    { id: 'growth', name: 'Growth', icon: '🚀' },
    { id: 'dividend', name: 'Dividend', icon: '💰' },
    { id: 'momentum', name: 'Momentum', icon: '📈' },
];

export default function AIPage() {
    const [selectedStyle, setSelectedStyle] = useState('balanced');
    const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchRecommendations = useCallback(async (style: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await aiApi.getRecommendations(style, 10, 'moderate');
            setRecommendations(response.recommendations || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Failed to fetch AI recommendations:', err);
            setError('Failed to load recommendations. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchRecommendations(selectedStyle);
    }, []);

    // Auto-refresh every 2 minutes
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchRecommendations(selectedStyle);
        }, 120000); // 2 minutes

        return () => clearInterval(interval);
    }, [autoRefresh, selectedStyle, fetchRecommendations]);

    const handleStyleChange = (style: string) => {
        setSelectedStyle(style);
        fetchRecommendations(style);
    };

    const getRecommendationBadge = (rec: string) => {
        const badges: Record<string, { class: string; text: string }> = {
            'strong_buy': { class: 'badge-success', text: '🔥 Strong Buy' },
            'buy': { class: 'badge-success', text: 'Buy' },
            'hold': { class: '', text: 'Hold' },
            'sell': { class: 'badge-danger', text: 'Sell' },
            'strong_sell': { class: 'badge-danger', text: '⚠️ Strong Sell' },
        };
        return badges[rec] || { class: '', text: rec };
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'average';
        return 'poor';
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">🤖 AI Stock Picks</h1>
                    <p className="page-subtitle">
                        AI-powered recommendations based on your investment style
                        {lastUpdate && (
                            <span className="text-xs text-muted" style={{ marginLeft: '1rem' }}>
                                Updated: {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-md items-center">
                    <label className="flex items-center gap-sm text-sm">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        Auto-refresh
                    </label>
                    <button
                        className="btn btn-secondary"
                        onClick={() => fetchRecommendations(selectedStyle)}
                        disabled={isLoading}
                    >
                        {isLoading ? '⏳' : '🔄'} Refresh
                    </button>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="card mb-lg" style={{
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    padding: 'var(--spacing-md)'
                }}>
                    <span style={{ color: 'var(--danger)' }}>⚠️ {error}</span>
                </div>
            )}

            {/* Investment Style Selector */}
            <div className="card mb-lg">
                <div className="card-header">
                    <h3 className="card-title">Investment Style</h3>
                </div>
                <div className="tabs" style={{ background: 'transparent', padding: 0 }}>
                    {investmentStyles.map(style => (
                        <button
                            key={style.id}
                            className={`tab ${selectedStyle === style.id ? 'active' : ''}`}
                            onClick={() => handleStyleChange(style.id)}
                            disabled={isLoading}
                        >
                            {style.icon} {style.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && recommendations.length === 0 && (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <div className="spinner" style={{ margin: '0 auto var(--spacing-lg)' }}></div>
                    <p className="text-muted">Analyzing stocks with AI...</p>
                </div>
            )}

            {/* Top Pick Highlight */}
            {recommendations.length > 0 && (
                <div className="card mb-lg" style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                    <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--accent-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem'
                        }}>
                            🏆
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div className="text-sm text-muted mb-sm">TOP AI PICK</div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>
                                {recommendations[0].symbol} - {recommendations[0].name}
                            </h2>
                            <div className="flex items-center gap-md flex-wrap">
                                <span className={`badge ${getRecommendationBadge(recommendations[0].recommendation).class}`}>
                                    {getRecommendationBadge(recommendations[0].recommendation).text}
                                </span>
                                <span className="text-muted">
                                    {recommendations[0].confidence}% confidence
                                </span>
                                <span className="value-positive font-bold">
                                    +{recommendations[0].upside_potential?.toFixed(1) || 0}% upside
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-lg" style={{ textAlign: 'right' }}>
                            <div>
                                <div className="text-sm text-muted">Current Price</div>
                                <div className="stat-value" style={{ fontSize: '1.25rem' }}>${recommendations[0].current_price?.toFixed(2) || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted">Target Price</div>
                                <div className="stat-value value-positive" style={{ fontSize: '1.25rem' }}>${recommendations[0].target_price?.toFixed(2) || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations Grid */}
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                {recommendations.map((rec, idx) => (
                    <div key={rec.symbol} className="card" style={{ opacity: isLoading ? 0.7 : 1 }}>
                        <div className="flex gap-lg" style={{ flexWrap: 'wrap' }}>
                            {/* Left - Stock Info */}
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div className="flex items-center gap-md mb-md">
                                    <span style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 'bold',
                                        color: 'var(--accent-primary)'
                                    }}>
                                        #{idx + 1}
                                    </span>
                                    <div>
                                        <button
                                            onClick={() => {
                                                const w = 1200, h = 800;
                                                const left = (window.screen.width - w) / 2;
                                                const top = (window.screen.height - h) / 2;
                                                window.open(`/stock/${rec.symbol}`, `stock_${rec.symbol}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
                                            }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a855f7', fontWeight: 'bold', padding: 0, fontSize: '1rem' }}
                                        >
                                            {rec.symbol} ↗
                                        </button>
                                        <div className="text-sm text-muted">{rec.name}</div>
                                    </div>
                                </div>

                                <div className="flex gap-md mb-md flex-wrap">
                                    <span className={`badge ${getRecommendationBadge(rec.recommendation).class}`}>
                                        {getRecommendationBadge(rec.recommendation).text}
                                    </span>
                                    <span className="badge">{rec.risk_level} Risk</span>
                                    <span className="badge">{rec.time_horizon}</span>
                                </div>
                            </div>

                            {/* Middle - Reasons */}
                            <div style={{ flex: 2, minWidth: 300 }}>
                                <div className="text-sm font-bold mb-sm" style={{ color: 'var(--text-secondary)' }}>
                                    AI ANALYSIS
                                </div>
                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--spacing-xs)'
                                }}>
                                    {rec.reasons?.map((reason, i) => (
                                        <li key={i} className="flex items-center gap-sm text-sm">
                                            <span style={{ color: 'var(--success)' }}>✓</span>
                                            {reason}
                                        </li>
                                    )) || <li className="text-muted">No analysis available</li>}
                                </ul>
                            </div>

                            {/* Right - Metrics */}
                            <div style={{ minWidth: 180 }}>
                                <div className="flex flex-col gap-md">
                                    <div>
                                        <div className="text-xs text-muted">AI Score</div>
                                        <div className="flex items-center gap-sm">
                                            <span className="font-bold" style={{ fontSize: '1.5rem' }}>
                                                {rec.ai_score}
                                            </span>
                                            <div className="score-bar" style={{ flex: 1 }}>
                                                <div
                                                    className={`score-fill ${getScoreColor(rec.ai_score)}`}
                                                    style={{ width: `${rec.ai_score}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
                                        <div>
                                            <div className="text-xs text-muted">Current</div>
                                            <div className="font-bold">${rec.current_price?.toFixed(2) || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted">Target</div>
                                            <div className="font-bold value-positive">${rec.target_price?.toFixed(2) || 'N/A'}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-muted">Upside Potential</div>
                                        <div className="font-bold value-positive">+{rec.upside_potential?.toFixed(1) || 0}%</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-muted">Confidence</div>
                                        <div className="progress-bar" style={{ height: 6 }}>
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${rec.confidence}%` }}
                                            />
                                        </div>
                                        <div className="text-xs text-right mt-xs">{rec.confidence}%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* No Results */}
            {!isLoading && recommendations.length === 0 && (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>🤖</div>
                    <h3>No Recommendations Available</h3>
                    <p className="text-muted mb-lg">Try a different investment style or refresh</p>
                    <button className="btn btn-primary" onClick={() => fetchRecommendations(selectedStyle)}>
                        Retry
                    </button>
                </div>
            )}

            {/* Data Source */}
            <div className="text-center text-xs text-muted mt-lg">
                📊 Data source: yfinance • AI analysis updates every 2 minutes when auto-refresh is enabled
            </div>

            {/* Disclaimer */}
            <div className="card mt-lg" style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
                <div className="flex items-center gap-md">
                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                    <div>
                        <div className="font-bold" style={{ color: 'var(--warning)' }}>Disclaimer</div>
                        <div className="text-sm">
                            AI recommendations are for informational purposes only and should not be considered financial advice.
                            Past performance does not guarantee future results. Always do your own research before investing.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
