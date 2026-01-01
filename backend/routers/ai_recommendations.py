"""
AI Recommendations API router.
"""

from fastapi import APIRouter, Query
from typing import List
from pydantic import BaseModel
from dataclasses import asdict

from services.ai_recommendations import (
    get_ai_recommendations,
    InvestmentStyle,
    StockRecommendation
)


router = APIRouter()


class PortfolioRecommendationRequest(BaseModel):
    """Request for portfolio-specific recommendations."""
    holdings: dict  # symbol -> shares
    investment_amount: float = 10000


@router.get("/")
async def get_recommendations(
    style: str = Query("balanced", description="Investment style: value, growth, dividend, momentum, balanced"),
    count: int = Query(10, ge=1, le=20, description="Number of recommendations"),
    risk_tolerance: str = Query("moderate", description="Risk tolerance: low, moderate, high")
):
    """
    Get AI-powered stock recommendations.
    """
    try:
        investment_style = InvestmentStyle(style)
    except ValueError:
        investment_style = InvestmentStyle.BALANCED
    
    try:
        # Call async function directly with correct parameter name
        result = await get_ai_recommendations(
            style=investment_style.value,  # Pass string value
            limit=count,  # Use 'limit' parameter name
            risk_tolerance=risk_tolerance
        )
        
        return {
            "success": True,
            "style": style,
            "risk_tolerance": risk_tolerance,
            "count": len(result.get("recommendations", [])),
            "recommendations": result.get("recommendations", [])  # Already a list of dicts
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "recommendations": []
        }


@router.get("/styles")
async def get_investment_styles():
    """Get available investment styles and their descriptions."""
    return {
        "styles": [
            {
                "id": "value",
                "name": "Value Investing",
                "description": "Focus on undervalued stocks with strong fundamentals",
                "key_metrics": ["Low P/E", "Low PEG", "High upside potential"],
                "time_horizon": "6-18 months",
                "risk_level": "Medium"
            },
            {
                "id": "growth",
                "name": "Growth Investing",
                "description": "Focus on companies with high revenue and earnings growth",
                "key_metrics": ["Revenue growth", "Earnings growth", "Market expansion"],
                "time_horizon": "1-3 years",
                "risk_level": "High"
            },
            {
                "id": "dividend",
                "name": "Dividend Investing",
                "description": "Focus on stable companies paying regular dividends",
                "key_metrics": ["Dividend yield", "Payout ratio", "Dividend growth"],
                "time_horizon": "3-5 years",
                "risk_level": "Low"
            },
            {
                "id": "momentum",
                "name": "Momentum Trading",
                "description": "Focus on stocks showing strong price momentum",
                "key_metrics": ["Price trends", "Volume", "Analyst upgrades"],
                "time_horizon": "1-3 months",
                "risk_level": "High"
            },
            {
                "id": "balanced",
                "name": "Balanced Approach",
                "description": "Combines multiple factors for diversified picks",
                "key_metrics": ["Overall quality", "Risk-adjusted returns", "Diversification"],
                "time_horizon": "6-12 months",
                "risk_level": "Medium"
            }
        ]
    }


@router.get("/top-pick")
async def get_top_pick():
    """Get the single best AI-recommended stock right now."""
    try:
        recommendations = await get_ai_recommendations(
            style=InvestmentStyle.BALANCED,
            count=1
        )
        
        if recommendations:
            top = recommendations[0]
            return {
                "success": True,
                "top_pick": asdict(top),
                "summary": f"{top.symbol} is rated {top.recommendation.value} with {top.confidence:.0f}% confidence. Target: ${top.target_price:.2f if top.target_price else 'N/A'}"
            }
    except Exception as e:
        pass
    
    return {
        "success": False,
        "message": "No recommendations available"
    }
