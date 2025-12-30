'use client';

/**
 * Reusable TickerLink component - opens stock detail in new tab
 * Use this anywhere you want a clickable stock symbol
 */

interface TickerLinkProps {
    symbol: string;
    className?: string;
    showIcon?: boolean;
}

export default function TickerLink({ symbol, className = '', showIcon = false }: TickerLinkProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Open in new tab
        window.open(`/stock/${symbol}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <button
            onClick={handleClick}
            className={className}
            style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: '#a855f7',
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
            }}
            title={`Open ${symbol} in new tab`}
        >
            {symbol}
            {showIcon && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
            )}
        </button>
    );
}
