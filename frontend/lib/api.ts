/**
 * API client for NazovInvest backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

// Screener API
export const screenerApi = {
    getResults: (params?: {
        search?: string;
        min_pe?: number;
        max_pe?: number;
        max_peg?: number;
        min_revenue_growth?: number;
        min_upside?: number;
        min_score?: number;
        sector?: string;
    }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                    searchParams.set(key, String(value));
                }
            });
        }
        return fetchAPI<{ count: number; results: Stock[] }>(
            `/api/screener?${searchParams.toString()}`
        );
    },

    getTopPicks: (count = 10) =>
        fetchAPI<{ count: number; results: Stock[] }>(`/api/screener/top-picks?count=${count}`),

    getValuePicks: () =>
        fetchAPI<{ count: number; results: Stock[] }>('/api/screener/value'),

    getGrowthPicks: () =>
        fetchAPI<{ count: number; results: Stock[] }>('/api/screener/growth'),
};

// Optimizer API
export const optimizerApi = {
    optimize: (data: {
        symbols: string[];
        investment_amount: number;
        risk_profile: string;
    }) =>
        fetchAPI<OptimizationResult>('/api/optimizer/optimize', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getEfficientFrontier: (symbols: string[], n_portfolios = 50) =>
        fetchAPI<{ frontier: FrontierPoint[] }>(
            `/api/optimizer/efficient-frontier?symbols=${symbols.join(',')}&n_portfolios=${n_portfolios}`
        ),

    getRiskProfiles: () =>
        fetchAPI<{ profiles: RiskProfile[] }>('/api/optimizer/risk-profiles'),
};

// Backtest API
export const backtestApi = {
    run: (data: {
        portfolio: Record<string, number>;
        start_date?: string;
        end_date?: string;
        initial_value?: number;
        benchmark?: string;
    }) =>
        fetchAPI<{ success: boolean; backtest: BacktestResult }>('/api/backtest/run', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    quickBacktest: (symbols: string[], weights: number[], period = '1y') =>
        fetchAPI<{ success: boolean; backtest: BacktestResult }>(
            `/api/backtest/quick?symbols=${symbols.join(',')}&weights=${weights.join(',')}&period=${period}`
        ),
};

// Portfolio API
export const portfolioApi = {
    getAll: () => fetchAPI<{ portfolios: Portfolio[] }>('/api/portfolio'),

    get: (id: number) => fetchAPI<Portfolio>(`/api/portfolio/${id}`),

    getSummary: (id: number, currency = 'USD') =>
        fetchAPI<PortfolioSummary>(`/api/portfolio/${id}/summary?target_currency=${currency}`),

    create: (data: { name: string; currency: string; risk_profile: string }) =>
        fetchAPI<{ success: boolean; portfolio: Portfolio }>('/api/portfolio', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// Currency API
export const currencyApi = {
    getRates: (base = 'USD') =>
        fetchAPI<{ base: string; rates: Record<string, number> }>(`/api/currency/rates?base=${base}`),

    convert: (amount: number, from: string, to: string) =>
        fetchAPI<{ converted: { amount: number } }>(
            `/api/currency/convert?amount=${amount}&from_currency=${from}&to_currency=${to}`
        ),

    getSupported: () => fetchAPI<{ currencies: Currency[] }>('/api/currency/supported'),
};

// Types
export interface Stock {
    symbol: string;
    name: string;
    sector: string;
    current_price: number;
    pe_ratio: number | null;
    peg_ratio: number | null;
    revenue_growth: number | null;
    fair_value: number | null;
    upside_potential: number | null;
    score: number | null;
    market_cap: number;
    dividend_yield: number | null;
    beta: number | null;
}

export interface OptimizationResult {
    success: boolean;
    optimization: {
        expected_return: number;
        volatility: number;
        sharpe_ratio: number;
    };
    allocations: Allocation[];
    weights: Record<string, number>;
}

export interface Allocation {
    symbol: string;
    name: string;
    weight: number;
    amount: number;
    shares: number;
    price: number;
}

export interface FrontierPoint {
    return: number;
    volatility: number;
    sharpe: number;
}

export interface RiskProfile {
    id: string;
    name: string;
    description: string;
    max_volatility: string;
    max_single_position: string;
}

export interface BacktestResult {
    start_date: string;
    end_date: string;
    trading_days: number;
    total_return: number;
    cagr: number;
    volatility: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    benchmark_return: number;
    alpha: number;
    beta: number;
    equity_curve: { date: string; portfolio: number; benchmark: number }[];
}

export interface Portfolio {
    id: number;
    name: string;
    currency: string;
    risk_profile: string;
    holdings_count: number;
    holdings: { symbol: string; shares: number; avg_cost: number }[];
}

export interface PortfolioSummary {
    portfolio_id: number;
    name: string;
    currency: string;
    total_value: number;
    total_cost: number;
    total_gain_loss: number;
    total_gain_loss_pct: number;
    positions: Position[];
}

export interface Position {
    symbol: string;
    name: string;
    shares: number;
    current_price: number;
    current_value: number;
    gain_loss: number;
    gain_loss_pct: number;
    weight: number;
}

export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

// AI Recommendations API
export const aiApi = {
    getRecommendations: (style = 'balanced', count = 10, riskTolerance = 'moderate') =>
        fetchAPI<{
            success: boolean;
            recommendations: AIRecommendation[];
        }>(`/api/ai?style=${style}&count=${count}&risk_tolerance=${riskTolerance}`),

    getStyles: () =>
        fetchAPI<{ styles: InvestmentStyle[] }>('/api/ai/styles'),

    getTopPick: () =>
        fetchAPI<{ success: boolean; top_pick: AIRecommendation; summary: string }>('/api/ai/top-pick'),
};

// Alerts API
export const alertsApi = {
    getAll: () =>
        fetchAPI<{ success: boolean; alerts: Alert[] }>('/api/alerts'),

    create: (data: {
        symbol: string;
        alert_type: string;
        target_value: number;
        email: string;
        message?: string;
    }) =>
        fetchAPI<{ success: boolean; alert: Alert }>('/api/alerts', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    delete: (id: number) =>
        fetchAPI<{ success: boolean }>(`/api/alerts/${id}`, { method: 'DELETE' }),

    check: () =>
        fetchAPI<{ success: boolean; triggered_count: number }>('/api/alerts/check', {
            method: 'POST',
        }),
};

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        fetchAPI<{ success: boolean; user: User; token: Token }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    register: (email: string, password: string, name: string) =>
        fetchAPI<{ success: boolean; user: User; token: Token }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        }),

    getMe: (token: string) =>
        fetchAPI<{ success: boolean; user: User }>('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        }),
};

export interface AIRecommendation {
    symbol: string;
    name: string;
    sector?: string;
    current_price: number;
    change_percent?: number;
    pe_ratio?: number;
    peg_ratio?: number;
    revenue_growth?: number;
    fair_value?: number;
    dividend_yield?: number;
    recommendation: string;
    confidence: number;
    reasons: string[];
    target_price: number | null;
    upside_potential: number;
    risk_level: string;
    time_horizon: string;
    ai_score: number;
}

export interface InvestmentStyle {
    id: string;
    name: string;
    description: string;
    key_metrics: string[];
    time_horizon: string;
    risk_level: string;
}

export interface Alert {
    id: number;
    user_id: number;
    symbol: string;
    alert_type: string;
    target_value: number;
    current_value: number;
    status: string;
    email: string;
    created_at: string;
    triggered_at: string | null;
    message: string;
}

export interface User {
    id: number;
    email: string;
    name: string;
    is_active: boolean;
}

export interface Token {
    access_token: string;
    token_type: string;
    expires_in: number;
}
