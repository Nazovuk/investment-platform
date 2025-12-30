'use client';

import { useState } from 'react';

// Mock alerts data
const mockAlerts = [
    {
        id: 1,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        alert_type: 'price_below',
        target_value: 180.00,
        current_value: 193.60,
        status: 'active',
        created_at: '2024-01-15',
        message: 'Alert when AAPL drops below $180'
    },
    {
        id: 2,
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        alert_type: 'price_above',
        target_value: 550.00,
        current_value: 495.22,
        status: 'active',
        created_at: '2024-01-10',
        message: 'Alert when NVDA reaches $550'
    },
    {
        id: 3,
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        alert_type: 'fair_value_reached',
        target_value: 415.50,
        current_value: 376.17,
        status: 'active',
        created_at: '2024-01-08',
        message: 'Alert when MSFT reaches fair value'
    }
];

const alertTypes = [
    // Price Alerts
    { id: 'price_above', name: 'Price Above', icon: '📈', category: 'price' },
    { id: 'price_below', name: 'Price Below', icon: '📉', category: 'price' },
    { id: 'fair_value_reached', name: 'Fair Value', icon: '🎯', category: 'price' },
    { id: 'score_threshold', name: 'AI Score', icon: '🤖', category: 'price' },
    // Technical Alerts
    { id: 'golden_cross', name: 'Golden Cross', icon: '🌟', category: 'technical', description: 'SMA50 crosses above SMA200' },
    { id: 'death_cross', name: 'Death Cross', icon: '⚠️', category: 'technical', description: 'SMA50 crosses below SMA200' },
    { id: 'above_sma50', name: 'Above SMA50', icon: '📊', category: 'technical', description: 'Price above 50-day MA' },
    { id: 'below_sma50', name: 'Below SMA50', icon: '📉', category: 'technical', description: 'Price below 50-day MA' },
    { id: 'above_sma200', name: 'Above SMA200', icon: '📈', category: 'technical', description: 'Price above 200-day MA' },
    { id: 'below_sma200', name: 'Below SMA200', icon: '📉', category: 'technical', description: 'Price below 200-day MA' },
    { id: 'rsi_oversold', name: 'RSI Oversold', icon: '🔻', category: 'technical', description: 'RSI drops below 30' },
    { id: 'rsi_overbought', name: 'RSI Overbought', icon: '🔺', category: 'technical', description: 'RSI rises above 70' },
];

export default function AlertsPage() {
    const [alerts, setAlerts] = useState(mockAlerts);
    const [showModal, setShowModal] = useState(false);
    const [newAlert, setNewAlert] = useState({
        symbol: '',
        alert_type: 'price_above',
        target_value: 0,
        email: ''
    });

    const getAlertTypeInfo = (type: string) => {
        return alertTypes.find(t => t.id === type) || { name: type, icon: '🔔' };
    };

    const getProgress = (current: number, target: number, type: string) => {
        if (type === 'price_above') {
            return Math.min(100, (current / target) * 100);
        } else {
            return Math.min(100, (target / current) * 100);
        }
    };

    const deleteAlert = (id: number) => {
        setAlerts(alerts.filter(a => a.id !== id));
    };

    const createAlert = () => {
        const newId = Math.max(...alerts.map(a => a.id)) + 1;
        setAlerts([...alerts, {
            id: newId,
            symbol: newAlert.symbol.toUpperCase(),
            name: newAlert.symbol.toUpperCase(),
            alert_type: newAlert.alert_type,
            target_value: newAlert.target_value,
            current_value: 100, // Mock
            status: 'active',
            created_at: new Date().toISOString().split('T')[0],
            message: `Alert for ${newAlert.symbol.toUpperCase()}`
        }]);
        setShowModal(false);
        setNewAlert({ symbol: '', alert_type: 'price_above', target_value: 0, email: '' });
    };

    return (
        <div>
            {/* Page Header */}
            <header className="page-header">
                <div>
                    <h1 className="page-title">🔔 Price Alerts</h1>
                    <p className="page-subtitle">Get notified when stocks hit your target prices</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Create Alert
                </button>
            </header>

            {/* Stats */}
            <div className="stats-grid mb-lg">
                <div className="stat-card">
                    <span className="stat-label">Active Alerts</span>
                    <span className="stat-value">{alerts.filter(a => a.status === 'active').length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Triggered Today</span>
                    <span className="stat-value">0</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Stocks Monitored</span>
                    <span className="stat-value">{new Set(alerts.map(a => a.symbol)).size}</span>
                </div>
            </div>

            {/* Alerts List */}
            <div className="flex flex-col gap-md">
                {alerts.map(alert => {
                    const typeInfo = getAlertTypeInfo(alert.alert_type);
                    const progress = getProgress(alert.current_value, alert.target_value, alert.alert_type);

                    return (
                        <div key={alert.id} className="card">
                            <div className="flex items-center gap-lg" style={{ flexWrap: 'wrap' }}>
                                {/* Icon */}
                                <div style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--bg-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem'
                                }}>
                                    {typeInfo.icon}
                                </div>

                                {/* Stock Info */}
                                <div style={{ minWidth: 150 }}>
                                    <div className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                                        {alert.symbol}
                                    </div>
                                    <div className="text-sm text-muted">{alert.name}</div>
                                    <span className="badge mt-xs" style={{ fontSize: '0.65rem' }}>
                                        {typeInfo.name}
                                    </span>
                                </div>

                                {/* Progress */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div className="flex justify-between text-sm mb-xs">
                                        <span>Current: ${alert.current_value.toFixed(2)}</span>
                                        <span>Target: ${alert.target_value.toFixed(2)}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${progress}%`,
                                                background: progress >= 90 ? 'var(--success)' : 'var(--accent-gradient)'
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-muted mt-xs text-right">
                                        {progress.toFixed(0)}% to target
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex items-center gap-md">
                                    <span className={`badge ${alert.status === 'active' ? 'badge-success' : ''}`}>
                                        {alert.status}
                                    </span>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => deleteAlert(alert.id)}
                                        style={{ padding: 'var(--spacing-sm)' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {alerts.length === 0 && (
                <div className="card text-center" style={{ padding: 'var(--spacing-2xl)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>🔔</div>
                    <h3>No Alerts Yet</h3>
                    <p className="text-muted mb-lg">Create your first price alert to get started</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        Create Alert
                    </button>
                </div>
            )}

            {/* Create Alert Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div className="card" style={{ maxWidth: 450, width: '100%' }}>
                        <div className="card-header">
                            <h3 className="card-title">Create Price Alert</h3>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="flex flex-col gap-lg">
                            <div className="filter-group">
                                <label className="filter-label">Stock Symbol</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="AAPL, NVDA, etc."
                                    value={newAlert.symbol}
                                    onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">Price Alerts</label>
                                <div className="flex gap-sm flex-wrap" style={{ marginBottom: '12px' }}>
                                    {alertTypes.filter(t => t.category === 'price').map(type => (
                                        <button
                                            key={type.id}
                                            className={`btn ${newAlert.alert_type === type.id ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setNewAlert({ ...newAlert, alert_type: type.id })}
                                            style={{ fontSize: '12px', padding: '6px 12px' }}
                                        >
                                            {type.icon} {type.name}
                                        </button>
                                    ))}
                                </div>
                                <label className="filter-label">Technical Alerts</label>
                                <div className="flex gap-sm flex-wrap">
                                    {alertTypes.filter(t => t.category === 'technical').map(type => (
                                        <button
                                            key={type.id}
                                            className={`btn ${newAlert.alert_type === type.id ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setNewAlert({ ...newAlert, alert_type: type.id })}
                                            style={{ fontSize: '12px', padding: '6px 12px' }}
                                            title={(type as any).description || ''}
                                        >
                                            {type.icon} {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {alertTypes.find(t => t.id === newAlert.alert_type)?.category === 'price' && (
                                <div className="filter-group">
                                    <label className="filter-label">Target Price</label>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="150.00"
                                        value={newAlert.target_value || ''}
                                        onChange={(e) => setNewAlert({ ...newAlert, target_value: Number(e.target.value) })}
                                    />
                                </div>
                            )}

                            <div className="filter-group">
                                <label className="filter-label">Email for Notification</label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="your@email.com"
                                    value={newAlert.email}
                                    onChange={(e) => setNewAlert({ ...newAlert, email: e.target.value })}
                                />
                            </div>

                            <button
                                className="btn btn-primary w-full"
                                onClick={createAlert}
                                disabled={!newAlert.symbol || !newAlert.target_value}
                            >
                                Create Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
