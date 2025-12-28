"""
Backtest API router.
"""

from fastapi import APIRouter, Query
from typing import Dict, List, Optional
from pydantic import BaseModel
from dataclasses import asdict

from services.backtest import backtest_service


router = APIRouter()


class BacktestRequest(BaseModel):
    """Request body for backtesting."""
    portfolio: Dict[str, float]  # symbol -> weight
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_value: float = 10000
    benchmark: str = "SPY"
    rebalance_frequency: str = "monthly"


class CompareRequest(BaseModel):
    """Request body for comparing strategies."""
    strategies: Dict[str, Dict[str, float]]  # strategy_name -> {symbol: weight}
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    initial_value: float = 10000


@router.post("/run")
async def run_backtest(request: BacktestRequest):
    """
    Run a historical backtest on a portfolio.
    
    Returns performance metrics including:
    - Total return and CAGR
    - Volatility and risk-adjusted returns (Sharpe, Sortino)
    - Maximum drawdown
    - Alpha and Beta vs benchmark
    - Equity curve for charting
    """
    try:
        result = backtest_service.run_backtest(
            portfolio=request.portfolio,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_value=request.initial_value,
            benchmark=request.benchmark,
            rebalance_frequency=request.rebalance_frequency
        )
        
        return {
            "success": True,
            "backtest": asdict(result)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.post("/compare")
async def compare_strategies(request: CompareRequest):
    """
    Compare multiple portfolio strategies.
    
    Useful for comparing different allocation approaches.
    """
    results = backtest_service.compare_strategies(
        strategies=request.strategies,
        start_date=request.start_date,
        end_date=request.end_date,
        initial_value=request.initial_value
    )
    
    return {
        "success": True,
        "comparisons": results
    }


@router.get("/quick")
async def quick_backtest(
    symbols: str = Query(..., description="Comma-separated symbols"),
    weights: str = Query(..., description="Comma-separated weights (must match symbols)"),
    period: str = Query("1y", description="Period: 1m, 3m, 6m, 1y, 2y, 5y")
):
    """
    Quick backtest with equal weights or specified weights.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    weight_list = [float(w.strip()) for w in weights.split(",")]
    
    if len(symbol_list) != len(weight_list):
        return {
            "success": False,
            "error": "Number of symbols must match number of weights"
        }
    
    # Normalize weights
    total_weight = sum(weight_list)
    portfolio = {
        symbol: weight / total_weight
        for symbol, weight in zip(symbol_list, weight_list)
    }
    
    # Calculate start date based on period
    from datetime import datetime, timedelta
    
    period_days = {
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "2y": 730,
        "5y": 1825
    }
    
    days = period_days.get(period, 365)
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    
    try:
        result = backtest_service.run_backtest(
            portfolio=portfolio,
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            "success": True,
            "period": period,
            "portfolio": portfolio,
            "backtest": asdict(result)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
