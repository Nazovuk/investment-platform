"""
Portfolio optimizer API router.
"""

from fastapi import APIRouter, Query
from typing import List, Dict
from pydantic import BaseModel

from services.optimizer import optimizer_service, RiskProfile


router = APIRouter()


class OptimizeRequest(BaseModel):
    """Request body for portfolio optimization."""
    symbols: List[str]
    investment_amount: float = 10000
    risk_profile: str = "moderate"  # conservative, moderate, aggressive, ultra_aggressive
    min_weight: float = 0.02
    period: str = "2y"


class RebalanceRequest(BaseModel):
    """Request body for portfolio rebalancing."""
    current_holdings: Dict[str, float]  # symbol -> shares
    target_weights: Dict[str, float]  # symbol -> weight
    investment_amount: float = 0


@router.post("/optimize")
async def optimize_portfolio(request: OptimizeRequest):
    """
    Optimize portfolio allocation using Mean-Variance Optimization.
    Maximizes Sharpe ratio within risk constraints.
    """
    try:
        risk_profile = RiskProfile(request.risk_profile)
    except ValueError:
        risk_profile = RiskProfile.MODERATE
    
    result = optimizer_service.optimize(
        symbols=request.symbols,
        investment_amount=request.investment_amount,
        risk_profile=risk_profile,
        min_weight=request.min_weight,
        period=request.period
    )
    
    return {
        "success": True,
        "optimization": {
            "expected_return": result.expected_return,
            "volatility": result.volatility,
            "sharpe_ratio": result.sharpe_ratio,
        },
        "allocations": result.allocations,
        "weights": result.weights
    }


@router.get("/efficient-frontier")
async def get_efficient_frontier(
    symbols: str = Query(..., description="Comma-separated stock symbols"),
    n_portfolios: int = Query(50, ge=10, le=100)
):
    """
    Calculate efficient frontier points for visualization.
    """
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    
    frontier = optimizer_service.get_efficient_frontier(
        symbols=symbol_list,
        n_portfolios=n_portfolios
    )
    
    return {
        "symbols": symbol_list,
        "frontier": frontier
    }


@router.post("/rebalance")
async def calculate_rebalance(request: RebalanceRequest):
    """
    Calculate trades needed to rebalance to target weights.
    """
    trades = optimizer_service.rebalance_portfolio(
        current_holdings=request.current_holdings,
        target_weights=request.target_weights,
        investment_amount=request.investment_amount
    )
    
    return {
        "trades": trades,
        "total_trades": len(trades)
    }


@router.get("/risk-profiles")
async def get_risk_profiles():
    """Get available risk profiles and their constraints."""
    return {
        "profiles": [
            {
                "id": "conservative",
                "name": "Conservative",
                "description": "Lower risk, stable returns",
                "max_volatility": "10%",
                "max_single_position": "15%"
            },
            {
                "id": "moderate",
                "name": "Moderate",
                "description": "Balanced risk and return",
                "max_volatility": "20%",
                "max_single_position": "25%"
            },
            {
                "id": "aggressive",
                "name": "Aggressive",
                "description": "Higher risk, higher potential returns",
                "max_volatility": "35%",
                "max_single_position": "35%"
            },
            {
                "id": "ultra_aggressive",
                "name": "Ultra Aggressive",
                "description": "Maximum growth potential",
                "max_volatility": "50%",
                "max_single_position": "50%"
            }
        ]
    }
