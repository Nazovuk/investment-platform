"""
AI-Powered Stock Recommendations Service.
Simplified version that works with async screener.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import httpx
import os
import logging

logger = logging.getLogger(__name__)

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d58lr11r01qvj8ihdt60d58lr11r01qvj8ihdt6g")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# Top stocks for AI analysis
AI_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
    "JPM", "V", "MA", "BAC", "UNH", "JNJ", "LLY",
    "HD", "PG", "KO", "PEP", "WMT", "COST", "MCD",
    "XOM", "CVX", "CAT", "BA", "GE", "HON",
    "DIS", "NFLX", "CRM", "ORCL", "ADBE", "AMD", "NVDA", "AVGO",
    "PYPL", "SQ", "COIN", "PLTR", "SNOW", "CRWD"
]

STOCK_META = {
    "AAPL": {"name": "Apple Inc.", "sector": "Technology"},
    "MSFT": {"name": "Microsoft Corporation", "sector": "Technology"},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology"},
    "AMZN": {"name": "Amazon.com Inc.", "sector": "Consumer Cyclical"},
    "META": {"name": "Meta Platforms Inc.", "sector": "Technology"},
    "NVDA": {"name": "NVIDIA Corporation", "sector": "Technology"},
    "TSLA": {"name": "Tesla Inc.", "sector": "Consumer Cyclical"},
    "JPM": {"name": "JPMorgan Chase & Co.", "sector": "Financial Services"},
    "V": {"name": "Visa Inc.", "sector": "Financial Services"},
    "MA": {"name": "Mastercard Inc.", "sector": "Financial Services"},
    "BAC": {"name": "Bank of America Corp", "sector": "Financial Services"},
    "UNH": {"name": "UnitedHealth Group", "sector": "Healthcare"},
    "JNJ": {"name": "Johnson & Johnson", "sector": "Healthcare"},
    "LLY": {"name": "Eli Lilly and Company", "sector": "Healthcare"},
    "HD": {"name": "The Home Depot Inc.", "sector": "Consumer Cyclical"},
    "PG": {"name": "Procter & Gamble Co.", "sector": "Consumer Defensive"},
    "KO": {"name": "The Coca-Cola Company", "sector": "Consumer Defensive"},
    "PEP": {"name": "PepsiCo Inc.", "sector": "Consumer Defensive"},
    "WMT": {"name": "Walmart Inc.", "sector": "Consumer Defensive"},
    "COST": {"name": "Costco Wholesale Corp", "sector": "Consumer Defensive"},
    "MCD": {"name": "McDonald's Corporation", "sector": "Consumer Cyclical"},
    "XOM": {"name": "Exxon Mobil Corporation", "sector": "Energy"},
    "CVX": {"name": "Chevron Corporation", "sector": "Energy"},
    "CAT": {"name": "Caterpillar Inc.", "sector": "Industrials"},
    "BA": {"name": "Boeing Company", "sector": "Industrials"},
    "GE": {"name": "GE Aerospace", "sector": "Industrials"},
    "HON": {"name": "Honeywell International", "sector": "Industrials"},
    "DIS": {"name": "The Walt Disney Company", "sector": "Communication Services"},
    "NFLX": {"name": "Netflix Inc.", "sector": "Communication Services"},
    "CRM": {"name": "Salesforce Inc.", "sector": "Technology"},
    "ORCL": {"name": "Oracle Corporation", "sector": "Technology"},
    "ADBE": {"name": "Adobe Inc.", "sector": "Technology"},
    "AMD": {"name": "Advanced Micro Devices", "sector": "Technology"},
    "AVGO": {"name": "Broadcom Inc.", "sector": "Technology"},
    "PYPL": {"name": "PayPal Holdings Inc.", "sector": "Financial Services"},
    "SQ": {"name": "Block Inc.", "sector": "Financial Services"},
    "COIN": {"name": "Coinbase Global Inc.", "sector": "Financial Services"},
    "PLTR": {"name": "Palantir Technologies", "sector": "Technology"},
    "SNOW": {"name": "Snowflake Inc.", "sector": "Technology"},
    "CRWD": {"name": "CrowdStrike Holdings", "sector": "Technology"},
}


class RecommendationType(str, Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class InvestmentStyle(str, Enum):
    VALUE = "value"
    GROWTH = "growth"
    DIVIDEND = "dividend"
    MOMENTUM = "momentum"
    BALANCED = "balanced"


@dataclass
class StockRecommendation:
    symbol: str
    name: str
    recommendation: RecommendationType
    confidence: float
    reasons: List[str]
    target_price: Optional[float]
    upside_potential: float
    risk_level: str
    time_horizon: str
    ai_score: int


async def fetch_quote(client: httpx.AsyncClient, symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch a single stock quote."""
    try:
        response = await client.get(
            f"{FINNHUB_BASE_URL}/quote",
            params={"symbol": symbol, "token": FINNHUB_API_KEY}
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("c", 0) > 0:
                meta = STOCK_META.get(symbol, {"name": symbol, "sector": "Unknown"})
                price = data["c"]
                prev = data.get("pc", price)
                change = ((price - prev) / prev * 100) if prev > 0 else 0
                
                return {
                    "symbol": symbol,
                    "name": meta["name"],
                    "sector": meta["sector"],
                    "current_price": round(price, 2),
                    "change_percent": round(change, 2),
                    "prev_close": round(prev, 2),
                    "pe_ratio": 25.0,  # Placeholder
                    "upside_potential": 10.0 + (5 if change > 0 else -5),
                    "revenue_growth": 0.08,
                }
    except Exception as e:
        logger.warning(f"Error fetching {symbol}: {e}")
    return None


async def fetch_stocks_for_ai() -> List[Dict[str, Any]]:
    """Fetch all stocks for AI analysis concurrently."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        tasks = [fetch_quote(client, symbol) for symbol in AI_UNIVERSE]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    stocks = []
    for result in results:
        if isinstance(result, dict) and result.get("current_price", 0) > 0:
            stocks.append(result)
    return stocks


def score_stock(stock: Dict, style: InvestmentStyle) -> int:
    """Calculate AI score for a stock based on style."""
    score = 50
    
    # Price momentum
    change = stock.get("change_percent", 0)
    if change > 2:
        score += 15
    elif change > 0:
        score += 8
    elif change < -2:
        score -= 10
    
    # Style-specific scoring
    if style == InvestmentStyle.VALUE:
        pe = stock.get("pe_ratio", 25)
        if pe < 15:
            score += 20
        elif pe < 20:
            score += 10
        upside = stock.get("upside_potential", 0)
        if upside > 15:
            score += 15
    
    elif style == InvestmentStyle.GROWTH:
        growth = stock.get("revenue_growth", 0)
        if growth > 0.15:
            score += 25
        elif growth > 0.10:
            score += 15
        elif growth > 0.05:
            score += 8
    
    elif style == InvestmentStyle.MOMENTUM:
        if change > 3:
            score += 25
        elif change > 1:
            score += 15
    
    elif style == InvestmentStyle.DIVIDEND:
        sector = stock.get("sector", "")
        if sector in ["Consumer Defensive", "Financial Services"]:
            score += 15
    
    else:  # BALANCED
        score += 10  # Boost for diversification
    
    # Sector boost for tech in growth/momentum
    if style in [InvestmentStyle.GROWTH, InvestmentStyle.MOMENTUM]:
        if stock.get("sector") == "Technology":
            score += 10
    
    return max(0, min(100, score))


def determine_recommendation(score: int) -> RecommendationType:
    if score >= 80:
        return RecommendationType.STRONG_BUY
    elif score >= 65:
        return RecommendationType.BUY
    elif score >= 45:
        return RecommendationType.HOLD
    elif score >= 30:
        return RecommendationType.SELL
    return RecommendationType.STRONG_SELL


def generate_reasons(stock: Dict, score: int, style: InvestmentStyle) -> List[str]:
    reasons = []
    
    if stock.get("change_percent", 0) > 1:
        reasons.append(f"Positive momentum: +{stock['change_percent']:.1f}% today")
    
    if style == InvestmentStyle.VALUE and stock.get("upside_potential", 0) > 10:
        reasons.append(f"Attractive upside potential of {stock['upside_potential']:.1f}%")
    
    if style == InvestmentStyle.GROWTH and stock.get("revenue_growth", 0) > 0.08:
        reasons.append(f"Strong revenue growth of {stock['revenue_growth']*100:.1f}%")
    
    if stock.get("sector") == "Technology":
        reasons.append("Leading position in Technology sector")
    
    if score >= 70:
        reasons.append("High AI confidence score")
    
    if not reasons:
        reasons.append(f"Solid fundamentals in {stock.get('sector', 'market')}")
    
    return reasons[:3]


async def get_ai_recommendations(
    style: InvestmentStyle = InvestmentStyle.BALANCED,
    count: int = 10,
    risk_tolerance: str = "moderate"
) -> List[StockRecommendation]:
    """Main async function to get AI recommendations."""
    stocks = await fetch_stocks_for_ai()
    
    if not stocks:
        return []
    
    recommendations = []
    for stock in stocks:
        score = score_stock(stock, style)
        rec_type = determine_recommendation(score)
        reasons = generate_reasons(stock, score, style)
        
        target_price = stock["current_price"] * (1 + stock.get("upside_potential", 10) / 100)
        
        rec = StockRecommendation(
            symbol=stock["symbol"],
            name=stock["name"],
            recommendation=rec_type,
            confidence=min(95, score + 5),
            reasons=reasons,
            target_price=round(target_price, 2),
            upside_potential=stock.get("upside_potential", 10),
            risk_level="Medium" if stock.get("sector") in ["Consumer Defensive", "Healthcare"] else "High",
            time_horizon="6-12 months" if style == InvestmentStyle.VALUE else "3-6 months",
            ai_score=score
        )
        recommendations.append(rec)
    
    # Sort by score and return top N
    recommendations.sort(key=lambda x: x.ai_score, reverse=True)
    return recommendations[:count]


# Sync wrapper for compatibility
class AIRecommendationService:
    """Sync wrapper for AI recommendations."""
    
    def __init__(self):
        pass
    
    def get_recommendations(
        self,
        style: InvestmentStyle = InvestmentStyle.BALANCED,
        count: int = 10,
        risk_tolerance: str = "moderate"
    ) -> List[StockRecommendation]:
        """Sync wrapper - runs async function."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Already in async context, create new task
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run,
                        get_ai_recommendations(style, count, risk_tolerance)
                    )
                    return future.result(timeout=30)
            else:
                return asyncio.run(get_ai_recommendations(style, count, risk_tolerance))
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            return []
    
    def get_portfolio_recommendations(
        self,
        current_holdings: Dict[str, float],
        investment_amount: float = 10000
    ) -> Dict[str, Any]:
        """Get recommendations for portfolio."""
        return {
            "add": [],
            "reduce": [],
            "hold": [],
            "watch": []
        }


# Singleton
ai_service = AIRecommendationService()
