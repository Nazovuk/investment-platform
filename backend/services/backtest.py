"""
Backtest engine - Historical performance testing.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

from services.stock_data import stock_service


@dataclass
class BacktestResult:
    """Backtest results container."""
    # Period info
    start_date: str
    end_date: str
    trading_days: int
    
    # Returns
    total_return: float
    cagr: float  # Compound Annual Growth Rate
    
    # Risk metrics
    volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    
    # Comparison
    benchmark_return: float
    alpha: float
    beta: float
    
    # Equity curve for charting
    equity_curve: List[Dict[str, Any]]
    
    # Trade statistics
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0


class BacktestService:
    """Service for running historical backtests on portfolios."""
    
    # Risk-free rate for Sharpe calculation
    RISK_FREE_RATE = 0.05
    
    # Default benchmark
    DEFAULT_BENCHMARK = "SPY"
    
    def __init__(self):
        self.stock_service = stock_service
    
    def run_backtest(
        self,
        portfolio: Dict[str, float],  # symbol -> weight
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        initial_value: float = 10000,
        benchmark: str = "SPY",
        rebalance_frequency: str = "monthly"  # daily, weekly, monthly, quarterly
    ) -> BacktestResult:
        """
        Run a historical backtest on a portfolio.
        
        Args:
            portfolio: Dict of symbol -> weight (weights should sum to 1)
            start_date: Start date (YYYY-MM-DD), defaults to 1 year ago
            end_date: End date (YYYY-MM-DD), defaults to today
            initial_value: Starting portfolio value
            benchmark: Benchmark symbol for comparison
            rebalance_frequency: How often to rebalance
        
        Returns:
            BacktestResult with performance metrics
        """
        # Set default dates
        if end_date is None:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if start_date is None:
            start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        
        # Normalize weights
        total_weight = sum(portfolio.values())
        portfolio = {k: v / total_weight for k, v in portfolio.items()}
        
        # Get historical data for all symbols
        symbols = list(portfolio.keys())
        price_data = self._get_price_data(symbols, start_date, end_date)
        
        if price_data.empty:
            raise ValueError("No price data available for the specified period")
        
        # Get benchmark data
        benchmark_data = self._get_price_data([benchmark], start_date, end_date)
        
        # Calculate portfolio values
        portfolio_values = self._calculate_portfolio_values(
            price_data, portfolio, initial_value, rebalance_frequency
        )
        
        # Calculate benchmark values
        benchmark_values = self._calculate_portfolio_values(
            benchmark_data, {benchmark: 1.0}, initial_value, "daily"
        )
        
        # Calculate metrics
        returns = portfolio_values.pct_change().dropna()
        benchmark_returns = benchmark_values.pct_change().dropna()
        
        # Total return
        total_return = (portfolio_values.iloc[-1] / portfolio_values.iloc[0] - 1) * 100
        benchmark_return = (benchmark_values.iloc[-1] / benchmark_values.iloc[0] - 1) * 100
        
        # CAGR
        years = len(portfolio_values) / 252
        cagr = ((portfolio_values.iloc[-1] / portfolio_values.iloc[0]) ** (1/years) - 1) * 100
        
        # Volatility (annualized)
        volatility = returns.std() * np.sqrt(252) * 100
        
        # Sharpe Ratio
        excess_return = returns.mean() * 252 - self.RISK_FREE_RATE
        sharpe = excess_return / (returns.std() * np.sqrt(252)) if returns.std() > 0 else 0
        
        # Sortino Ratio (only considers downside volatility)
        downside_returns = returns[returns < 0]
        downside_std = downside_returns.std() * np.sqrt(252)
        sortino = excess_return / downside_std if downside_std > 0 else 0
        
        # Max Drawdown
        cummax = portfolio_values.cummax()
        drawdown = (portfolio_values - cummax) / cummax
        max_drawdown = drawdown.min() * 100
        
        # Alpha and Beta
        if len(returns) == len(benchmark_returns):
            covariance = np.cov(returns, benchmark_returns)[0, 1]
            benchmark_var = benchmark_returns.var()
            beta = covariance / benchmark_var if benchmark_var > 0 else 1
            alpha = (returns.mean() * 252 - self.RISK_FREE_RATE - 
                    beta * (benchmark_returns.mean() * 252 - self.RISK_FREE_RATE)) * 100
        else:
            alpha, beta = 0, 1
        
        # Create equity curve for charting
        equity_curve = []
        for date, value in portfolio_values.items():
            bm_value = benchmark_values.get(date, initial_value)
            equity_curve.append({
                "date": date.strftime("%Y-%m-%d"),
                "portfolio": round(value, 2),
                "benchmark": round(bm_value, 2)
            })
        
        return BacktestResult(
            start_date=start_date,
            end_date=end_date,
            trading_days=len(portfolio_values),
            total_return=round(total_return, 2),
            cagr=round(cagr, 2),
            volatility=round(volatility, 2),
            sharpe_ratio=round(sharpe, 2),
            sortino_ratio=round(sortino, 2),
            max_drawdown=round(max_drawdown, 2),
            benchmark_return=round(benchmark_return, 2),
            alpha=round(alpha, 2),
            beta=round(beta, 2),
            equity_curve=equity_curve
        )
    
    def _get_price_data(
        self,
        symbols: List[str],
        start_date: str,
        end_date: str
    ) -> pd.DataFrame:
        """Get historical price data for multiple symbols."""
        prices = {}
        
        for symbol in symbols:
            hist = self.stock_service.get_historical_data(
                symbol, period="5y"  # Get max data, filter later
            )
            if not hist.empty:
                prices[symbol] = hist["Close"]
        
        if not prices:
            return pd.DataFrame()
        
        # Combine and filter by dates
        df = pd.DataFrame(prices)
        df.index = pd.to_datetime(df.index)
        df = df.loc[start_date:end_date]
        df = df.dropna()
        
        return df
    
    def _calculate_portfolio_values(
        self,
        price_data: pd.DataFrame,
        weights: Dict[str, float],
        initial_value: float,
        rebalance_frequency: str
    ) -> pd.Series:
        """Calculate daily portfolio values with rebalancing."""
        if price_data.empty:
            return pd.Series()
        
        # Calculate returns
        returns = price_data.pct_change().fillna(0)
        
        # Get rebalance dates
        if rebalance_frequency == "daily":
            rebalance_mask = pd.Series(True, index=returns.index)
        elif rebalance_frequency == "weekly":
            rebalance_mask = returns.index.dayofweek == 0  # Monday
        elif rebalance_frequency == "monthly":
            rebalance_mask = returns.index.is_month_start
        elif rebalance_frequency == "quarterly":
            rebalance_mask = returns.index.is_quarter_start
        else:
            rebalance_mask = pd.Series(True, index=returns.index)
        
        # Calculate portfolio value
        portfolio_values = []
        current_value = initial_value
        current_weights = weights.copy()
        
        for i, (date, daily_returns) in enumerate(returns.iterrows()):
            # Calculate daily return based on weights
            daily_port_return = sum(
                current_weights.get(symbol, 0) * daily_returns.get(symbol, 0)
                for symbol in weights.keys()
            )
            
            current_value *= (1 + daily_port_return)
            portfolio_values.append(current_value)
            
            # Rebalance if needed
            if rebalance_mask.iloc[i] if hasattr(rebalance_mask, 'iloc') else rebalance_mask[i]:
                current_weights = weights.copy()
        
        return pd.Series(portfolio_values, index=returns.index)
    
    def compare_strategies(
        self,
        strategies: Dict[str, Dict[str, float]],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        initial_value: float = 10000
    ) -> Dict[str, BacktestResult]:
        """Compare multiple portfolio strategies."""
        results = {}
        
        for name, portfolio in strategies.items():
            try:
                result = self.run_backtest(
                    portfolio, start_date, end_date, initial_value
                )
                results[name] = asdict(result)
            except Exception as e:
                results[name] = {"error": str(e)}
        
        return results


# Singleton instance
backtest_service = BacktestService()
