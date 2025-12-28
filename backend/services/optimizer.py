"""
Portfolio optimizer service - Mean-Variance Optimization.
Uses Sharpe ratio maximization with risk constraints.
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from services.stock_data import stock_service


class RiskProfile(str, Enum):
    """Risk profile levels."""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"
    ULTRA_AGGRESSIVE = "ultra_aggressive"


@dataclass
class OptimizationResult:
    """Results from portfolio optimization."""
    weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    allocations: List[Dict[str, Any]]


class OptimizerService:
    """Portfolio optimization service using Modern Portfolio Theory."""
    
    # Risk-free rate (annual)
    RISK_FREE_RATE = 0.05  # 5% (US Treasury)
    
    # Risk profile constraints
    RISK_LIMITS = {
        RiskProfile.CONSERVATIVE: {"max_volatility": 0.10, "max_single": 0.15},
        RiskProfile.MODERATE: {"max_volatility": 0.20, "max_single": 0.25},
        RiskProfile.AGGRESSIVE: {"max_volatility": 0.35, "max_single": 0.35},
        RiskProfile.ULTRA_AGGRESSIVE: {"max_volatility": 0.50, "max_single": 0.50},
    }
    
    def __init__(self):
        self.stock_service = stock_service
    
    def optimize(
        self,
        symbols: List[str],
        investment_amount: float = 10000,
        risk_profile: RiskProfile = RiskProfile.MODERATE,
        min_weight: float = 0.02,
        period: str = "2y"
    ) -> OptimizationResult:
        """
        Optimize portfolio allocation using Mean-Variance Optimization.
        
        Args:
            symbols: List of stock symbols to include
            investment_amount: Total amount to invest
            risk_profile: Risk tolerance level
            min_weight: Minimum weight per stock (to avoid tiny allocations)
            period: Historical data period for calculations
        
        Returns:
            OptimizationResult with optimal weights and metrics
        """
        # Get historical returns
        returns_df = self._get_returns_matrix(symbols, period)
        
        if returns_df.empty:
            raise ValueError("Could not fetch historical data for optimization")
        
        # Calculate expected returns and covariance
        mean_returns = returns_df.mean() * 252  # Annualized
        cov_matrix = returns_df.cov() * 252  # Annualized
        
        n_assets = len(symbols)
        
        # Get risk constraints
        limits = self.RISK_LIMITS[risk_profile]
        max_volatility = limits["max_volatility"]
        max_single = limits["max_single"]
        
        # Optimization objective: Maximize Sharpe Ratio
        def neg_sharpe(weights):
            port_return = np.sum(mean_returns * weights)
            port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            return -(port_return - self.RISK_FREE_RATE) / port_vol
        
        # Constraints
        constraints = [
            {"type": "eq", "fun": lambda x: np.sum(x) - 1},  # Weights sum to 1
        ]
        
        # Volatility constraint
        def vol_constraint(weights):
            port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            return max_volatility - port_vol
        
        constraints.append({"type": "ineq", "fun": vol_constraint})
        
        # Bounds: min_weight to max_single for each asset
        bounds = tuple((min_weight, max_single) for _ in range(n_assets))
        
        # Initial guess: equal weights
        initial_weights = np.array([1/n_assets] * n_assets)
        
        # Run optimization
        result = minimize(
            neg_sharpe,
            initial_weights,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 1000}
        )
        
        if not result.success:
            # Fall back to equal weights
            optimal_weights = initial_weights
        else:
            optimal_weights = result.x
        
        # Normalize weights
        optimal_weights = optimal_weights / np.sum(optimal_weights)
        
        # Calculate portfolio metrics
        port_return = np.sum(mean_returns * optimal_weights)
        port_vol = np.sqrt(np.dot(optimal_weights.T, np.dot(cov_matrix, optimal_weights)))
        sharpe = (port_return - self.RISK_FREE_RATE) / port_vol
        
        # Create allocations list
        weights_dict = {}
        allocations = []
        
        for i, symbol in enumerate(symbols):
            weight = optimal_weights[i]
            if weight >= min_weight:
                weights_dict[symbol] = round(weight, 4)
                stock_info = self.stock_service.get_stock_info(symbol)
                price = stock_info.get("current_price", 0)
                
                allocation_amount = investment_amount * weight
                shares = int(allocation_amount / price) if price > 0 else 0
                
                allocations.append({
                    "symbol": symbol,
                    "name": stock_info.get("name", symbol),
                    "weight": round(weight * 100, 2),
                    "amount": round(allocation_amount, 2),
                    "shares": shares,
                    "price": round(price, 2),
                })
        
        # Sort by weight descending
        allocations.sort(key=lambda x: x["weight"], reverse=True)
        
        return OptimizationResult(
            weights=weights_dict,
            expected_return=round(port_return * 100, 2),
            volatility=round(port_vol * 100, 2),
            sharpe_ratio=round(sharpe, 2),
            allocations=allocations
        )
    
    def _get_returns_matrix(
        self,
        symbols: List[str],
        period: str
    ) -> pd.DataFrame:
        """Get historical returns matrix for all symbols."""
        prices = {}
        
        for symbol in symbols:
            hist = self.stock_service.get_historical_data(symbol, period=period)
            if not hist.empty:
                prices[symbol] = hist["Close"]
        
        if not prices:
            return pd.DataFrame()
        
        # Create DataFrame and calculate returns
        price_df = pd.DataFrame(prices)
        price_df = price_df.dropna()
        returns_df = price_df.pct_change().dropna()
        
        return returns_df
    
    def get_efficient_frontier(
        self,
        symbols: List[str],
        n_portfolios: int = 50,
        period: str = "2y"
    ) -> List[Dict[str, float]]:
        """
        Calculate points on the efficient frontier for visualization.
        """
        returns_df = self._get_returns_matrix(symbols, period)
        
        if returns_df.empty:
            return []
        
        mean_returns = returns_df.mean() * 252
        cov_matrix = returns_df.cov() * 252
        n_assets = len(symbols)
        
        results = []
        
        # Generate random portfolios
        for _ in range(n_portfolios * 10):
            weights = np.random.random(n_assets)
            weights /= np.sum(weights)
            
            port_return = np.sum(mean_returns * weights)
            port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            sharpe = (port_return - self.RISK_FREE_RATE) / port_vol
            
            results.append({
                "return": round(port_return * 100, 2),
                "volatility": round(port_vol * 100, 2),
                "sharpe": round(sharpe, 2)
            })
        
        # Sort by volatility and take efficient ones
        results.sort(key=lambda x: x["volatility"])
        
        # Filter to keep only efficient portfolios
        efficient = []
        max_return = -float("inf")
        
        for r in results:
            if r["return"] > max_return:
                efficient.append(r)
                max_return = r["return"]
        
        return efficient[:n_portfolios]
    
    def rebalance_portfolio(
        self,
        current_holdings: Dict[str, float],
        target_weights: Dict[str, float],
        investment_amount: float
    ) -> List[Dict[str, Any]]:
        """
        Calculate trades needed to rebalance to target weights.
        """
        trades = []
        
        # Calculate current values
        current_total = 0
        current_values = {}
        
        for symbol, shares in current_holdings.items():
            stock_info = self.stock_service.get_stock_info(symbol)
            price = stock_info.get("current_price", 0)
            value = shares * price
            current_values[symbol] = value
            current_total += value
        
        total_amount = current_total + investment_amount
        
        # Calculate target values
        for symbol, target_weight in target_weights.items():
            target_value = total_amount * target_weight
            current_value = current_values.get(symbol, 0)
            diff = target_value - current_value
            
            stock_info = self.stock_service.get_stock_info(symbol)
            price = stock_info.get("current_price", 0)
            
            if abs(diff) > 50 and price > 0:  # Ignore tiny adjustments
                shares_diff = int(diff / price)
                trades.append({
                    "symbol": symbol,
                    "action": "BUY" if diff > 0 else "SELL",
                    "shares": abs(shares_diff),
                    "amount": abs(round(diff, 2)),
                    "price": round(price, 2)
                })
        
        return trades


# Singleton instance
optimizer_service = OptimizerService()
