'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface EconomicEvent {
    date: string;
    time: string;
    country: string;
    event: string;
    impact: string;
    expected: number | null;
    actual: number | null;
    previous: number | null;
}

export default function EconomicCalendarPage() {
    const [events, setEvents] = useState<EconomicEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [country, setCountry] = useState('');
    const [source, setSource] = useState('');

    useEffect(() => {
        fetchCalendar();
    }, [days, country]);

    const fetchCalendar = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('days', String(days));
            if (country) params.set('country', country);

            const res = await fetch(`${API_URL}/api/economic/calendar?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
                setSource(data.source || 'unknown');
            }
        } catch (e) {
            console.error('Failed to fetch economic calendar:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const getImpactBadge = (impact: string) => {
        const colors: Record<string, { bg: string; text: string }> = {
            high: { bg: 'rgba(239,68,68,0.2)', text: '#ef4444' },
            medium: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
            low: { bg: 'rgba(16,185,129,0.2)', text: '#10b981' },
        };
        const c = colors[impact] || colors.low;
        return (
            <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: c.bg,
                color: c.text,
                textTransform: 'uppercase',
            }}>
                {impact}
            </span>
        );
    };

    const getCountryFlag = (code: string) => {
        const flags: Record<string, string> = {
            'US': '🇺🇸', 'UK': '🇬🇧', 'EU': '🇪🇺', 'JP': '🇯🇵', 'CN': '🇨🇳',
            'DE': '🇩🇪', 'FR': '🇫🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'CH': '🇨🇭',
        };
        return flags[code] || '🌍';
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">📅 Economic Calendar</h1>
                    <p className="page-subtitle">
                        Track important economic events and their impact on markets
                    </p>
                </div>
                <div className="flex gap-md items-center">
                    <span className="badge" style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
                        Source: {source === 'finnhub' ? 'Finnhub (Live)' : 'Estimated Dates'}
                    </span>
                    <button className="btn btn-secondary" onClick={fetchCalendar}>
                        🔄 Refresh
                    </button>
                </div>
            </header>

            {/* Filters */}
            <div className="card mb-lg">
                <div className="flex gap-lg items-center flex-wrap" style={{ padding: 'var(--spacing-md)' }}>
                    <div className="filter-group" style={{ minWidth: '150px' }}>
                        <label className="filter-label">Time Range</label>
                        <select
                            className="input"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            style={{ padding: '8px 12px' }}
                        >
                            <option value={7}>Next 7 days</option>
                            <option value={14}>Next 14 days</option>
                            <option value={30}>Next 30 days</option>
                            <option value={60}>Next 60 days</option>
                        </select>
                    </div>
                    <div className="filter-group" style={{ minWidth: '150px' }}>
                        <label className="filter-label">Country</label>
                        <select
                            className="input"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            style={{ padding: '8px 12px' }}
                        >
                            <option value="">All Countries</option>
                            <option value="US">🇺🇸 United States</option>
                            <option value="UK">🇬🇧 United Kingdom</option>
                            <option value="EU">🇪🇺 European Union</option>
                            <option value="JP">🇯🇵 Japan</option>
                            <option value="CN">🇨🇳 China</option>
                        </select>
                    </div>
                    <div className="flex gap-md" style={{ marginLeft: 'auto' }}>
                        <span className="text-muted text-sm">
                            {isLoading ? 'Loading...' : `${events.length} events`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Events Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Upcoming Economic Events</h3>
                    <span className="badge">{events.filter(e => e.impact === 'high').length} High Impact</span>
                </div>
                {isLoading ? (
                    <div className="text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <div className="spinner" style={{ margin: '0 auto', marginBottom: '1rem' }}></div>
                        <p className="text-muted">Loading economic calendar...</p>
                    </div>
                ) : events.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%', minWidth: '800px' }}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time (UTC)</th>
                                    <th>Country</th>
                                    <th>Event</th>
                                    <th>Impact</th>
                                    <th className="text-right">Previous</th>
                                    <th className="text-right">Expected</th>
                                    <th className="text-right">Actual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.map((event, idx) => (
                                    <tr key={idx} style={{
                                        background: event.impact === 'high' ? 'rgba(239,68,68,0.05)' : 'transparent'
                                    }}>
                                        <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                                            {new Date(event.date).toLocaleDateString('en-GB', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td style={{ color: '#94a3b8' }}>{event.time || '—'}</td>
                                        <td>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                {getCountryFlag(event.country)} {event.country}
                                            </span>
                                        </td>
                                        <td style={{
                                            fontWeight: event.impact === 'high' ? 600 : 400,
                                            maxWidth: '300px'
                                        }}>
                                            {event.event}
                                        </td>
                                        <td>{getImpactBadge(event.impact)}</td>
                                        <td className="text-right font-mono" style={{ color: '#94a3b8' }}>
                                            {event.previous !== null ? event.previous : '—'}
                                        </td>
                                        <td className="text-right font-mono" style={{ color: '#64748b' }}>
                                            {event.expected !== null ? event.expected : '—'}
                                        </td>
                                        <td className="text-right font-mono" style={{
                                            fontWeight: 600,
                                            color: event.actual !== null
                                                ? (event.expected !== null && event.actual > event.expected ? '#10b981'
                                                    : event.expected !== null && event.actual < event.expected ? '#ef4444'
                                                        : '#f8fafc')
                                                : '#64748b'
                                        }}>
                                            {event.actual !== null ? event.actual : (
                                                <span style={{
                                                    background: 'rgba(100,100,100,0.2)',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                        <p className="text-muted">📊 No economic events found for the selected period</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex gap-lg items-center justify-center mt-lg text-sm text-muted">
                <span>Impact Legend:</span>
                {getImpactBadge('high')} High
                {getImpactBadge('medium')} Medium
                {getImpactBadge('low')} Low
            </div>

            {/* Data Source Notice */}
            <div className="text-center mt-lg text-sm text-muted">
                📊 Data: {source === 'finnhub' ? 'Finnhub API (real-time)' : 'Static fallback (estimated dates)'}
                • Major events: FOMC, NFP, CPI, GDP, Unemployment, ECB, BoE
            </div>
        </div>
    );
}
