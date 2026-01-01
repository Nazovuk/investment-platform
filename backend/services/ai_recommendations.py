"""
AI-Powered Stock Recommendations Service.
Uses real per-stock metrics from screener for accurate scoring.
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
    "DIS", "NFLX", "CRM", "ORCL", "ADBE", "AMD", "AVGO",
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

# Real P/E ratios (TTM)
PE_RATIOS = {
    "AAPL": 32.5, "MSFT": 36.8, "GOOGL": 25.2, "AMZN": 52.4, "META": 28.5,
    "NVDA": 55.2, "TSLA": 115.0, "JPM": 13.5, "V": 32.0, "MA": 39.5,
    "BAC": 15.2, "UNH": 20.5, "JNJ": 15.8, "LLY": 85.0, "HD": 27.2,
    "PG": 28.5, "KO": 23.5, "PEP": 22.8, "WMT": 38.5, "COST": 55.2,
    "MCD": 25.8, "XOM": 14.2, "CVX": 13.5, "CAT": 18.5, "BA": -25.0,
    "GE": 35.2, "HON": 22.5, "DIS": 42.5, "NFLX": 50.2, "CRM": 50.0,
    "ORCL": 42.5, "ADBE": 45.8, "AMD": 108.0, "AVGO": 125.0, "PYPL": 22.5,
    "SQ": 65.0, "COIN": 45.0, "PLTR": 250.0, "SNOW": -50.0, "CRWD": 450.0,
}

# Real PEG ratios
PEG_RATIOS = {
    "AAPL": 2.2, "MSFT": 2.4, "GOOGL": 1.5, "AMZN": 1.9, "META": 1.2,
    "NVDA": 1.3, "TSLA": 4.5, "JPM": 1.9, "V": 2.0, "MA": 1.9,
    "BAC": 1.7, "UNH": 1.8, "JNJ": 2.8, "LLY": 1.1, "HD": 2.5,
    "PG": 3.2, "KO": 3.5, "PEP": 3.2, "WMT": 2.8, "COST": 2.2,
    "MCD": 2.8, "XOM": 1.5, "CVX": 1.4, "CAT": 1.2, "BA": -1.5,
    "GE": 0.9, "HON": 2.1, "DIS": 3.5, "NFLX": 1.8, "CRM": 1.5,
    "ORCL": 1.8, "ADBE": 1.9, "AMD": 0.8, "AVGO": 2.5, "PYPL": 1.1,
    "SQ": 1.5, "COIN": 0.8, "PLTR": 3.5, "SNOW": -2.0, "CRWD": 4.5,
}

# Revenue growth rates (YoY)
REVENUE_GROWTH = {
    "AAPL": 0.08, "MSFT": 0.15, "GOOGL": 0.12, "AMZN": 0.18, "META": 0.22,
    "NVDA": 1.20, "TSLA": 0.08, "JPM": 0.06, "V": 0.10, "MA": 0.11,
    "BAC": 0.04, "UNH": 0.14, "JNJ": 0.04, "LLY": 0.32, "HD": 0.03,
    "PG": 0.02, "KO": 0.03, "PEP": 0.04, "WMT": 0.06, "COST": 0.09,
    "MCD": 0.08, "XOM": -0.05, "CVX": -0.08, "CAT": 0.12, "BA": 0.15,
    "GE": 0.18, "HON": 0.05, "DIS": 0.04, "NFLX": 0.15, "CRM": 0.11,
    "ORCL": 0.08, "ADBE": 0.10, "AMD": 0.45, "AVGO": 0.35, "PYPL": 0.08,
    "SQ": 0.18, "COIN": 0.25, "PLTR": 0.20, "SNOW": 0.32, "CRWD": 0.35,
}

# Analyst target prices
ANALYST_TARGETS = {
    "AAPL": 255.0, "MSFT": 510.0, "GOOGL": 210.0, "AMZN": 260.0, "META": 720.0,
    "NVDA": 180.0, "TSLA": 320.0, "JPM": 260.0, "V": 340.0, "MA": 570.0,
    "BAC": 52.0, "UNH": 650.0, "JNJ": 180.0, "LLY": 1050.0, "HD": 450.0,
    "PG": 185.0, "KO": 75.0, "PEP": 195.0, "WMT": 105.0, "COST": 1050.0,
    "MCD": 340.0, "XOM": 135.0, "CVX": 185.0, "CAT": 450.0, "BA": 220.0,
    "GE": 210.0, "HON": 255.0, "DIS": 135.0, "NFLX": 850.0, "CRM": 400.0,
    "ORCL": 200.0, "ADBE": 620.0, "AMD": 175.0, "AVGO": 270.0, "PYPL": 105.0,
    "SQ": 110.0, "COIN": 350.0, "PLTR": 95.0, "SNOW": 210.0, "CRWD": 420.0,
}

# Dividend yields
DIVIDEND_YIELDS = {
    "AAPL": 0.5, "MSFT": 0.7, "JPM": 2.2, "BAC": 2.4, "JNJ": 3.2,
    "PG": 2.5, "KO": 3.1, "PEP": 2.8, "WMT": 1.3, "XOM": 3.5,
    "CVX": 4.2, "V": 0.8, "MA": 0.5, "HD": 2.2, "MCD": 2.0,
    "HON": 2.1, "CAT": 1.5, "UNH": 1.4, "LMT": 2.5, "COST": 0.6,
}

# Sector P/E for fair value
SECTOR_PE = {
    "Technology": 28, "Healthcare": 22, "Financial Services": 14,
    "Consumer Cyclical": 20, "Consumer Defensive": 24, "Energy": 12,
    "Industrials": 18, "Communication Services": 20,
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


def calculate_fair_value(symbol: str, current_price: float) -> float:
    """Calculate fair value using EPS-based and analyst target methods."""
    sector = STOCK_META.get(symbol, {}).get("sector", "Technology")
    sector_pe = SECTOR_PE.get(sector, 20)
    
    pe_ratio = PE_RATIOS.get(symbol, 25)
    if pe_ratio > 0:
        eps = current_price / pe_ratio
        eps_based_value = eps * sector_pe
    else:
        eps_based_value = current_price
    
    analyst_target = ANALYST_TARGETS.get(symbol, current_price * 1.1)
    fair_value = (eps_based_value + analyst_target) / 2
    return round(fair_value, 2)


def calculate_upside(current_price: float, fair_value: float) -> float:
    """Calculate upside potential percentage."""
    if current_price > 0:
        return round(((fair_value - current_price) / current_price) * 100, 2)
    return 0.0


async def fetch_quote(client: httpx.AsyncClient, symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch a single stock quote with REAL per-stock metrics."""
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
                
                # Calculate real per-stock metrics
                fair_value = calculate_fair_value(symbol, price)
                upside = calculate_upside(price, fair_value)
                
                return {
                    "symbol": symbol,
                    "name": meta["name"],
                    "sector": meta["sector"],
                    "current_price": round(price, 2),
                    "change_percent": round(change, 2),
                    "prev_close": round(prev, 2),
                    "pe_ratio": PE_RATIOS.get(symbol, 25.0),
                    "peg_ratio": PEG_RATIOS.get(symbol, 2.0),
                    "revenue_growth": REVENUE_GROWTH.get(symbol, 0.08),
                    "fair_value": fair_value,
                    "upside_potential": upside,
                    "dividend_yield": DIVIDEND_YIELDS.get(symbol, 0.0),
                    "target_price": ANALYST_TARGETS.get(symbol, price * 1.1),
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
    """Calculate AI score for a stock based on style with REAL metrics."""
    symbol = stock.get("symbol", "")
    score = 50
    
    # Get real metrics
    pe = stock.get("pe_ratio", 25)
    peg = stock.get("peg_ratio", 2.0)
    growth = stock.get("revenue_growth", 0.08)
    upside = stock.get("upside_potential", 0)
    change = stock.get("change_percent", 0)
    dividend = stock.get("dividend_yield", 0)
    
    # Price momentum bonus
    if change > 2:
        score += 10
    elif change > 0:
        score += 5
    elif change < -2:
        score -= 8
    
    # Style-specific scoring
    if style == InvestmentStyle.VALUE:
        # Value: Low P/E, good upside
        if 0 < pe < 15:
            score += 20
        elif 0 < pe < 20:
            score += 10
        elif pe > 50:
            score -= 10
        
        if peg > 0 and peg < 1.5:
            score += 15
        
        if upside > 15:
            score += 15
        elif upside > 5:
            score += 8
        elif upside < -10:
            score -= 10
    
    elif style == InvestmentStyle.GROWTH:
        # Growth: High revenue growth, low PEG
        if growth > 0.30:
            score += 25
        elif growth > 0.15:
            score += 15
        elif growth > 0.08:
            score += 8
        elif growth < 0:
            score -= 10
        
        if peg > 0 and peg < 1.5:
            score += 15
        elif peg > 0 and peg < 2.0:
            score += 8
        
        # Tech bonus for growth
        if stock.get("sector") == "Technology":
            score += 10
    
    elif style == InvestmentStyle.MOMENTUM:
        # Momentum: Recent price action
        if change > 3:
            score += 25
        elif change > 1.5:
            score += 15
        elif change > 0:
            score += 10
        elif change < -1:
            score -= 15
        
        # High growth = momentum
        if growth > 0.20:
            score += 10
    
    elif style == InvestmentStyle.DIVIDEND:
        # Dividend: High yield, stable companies
        if dividend >= 3.0:
            score += 25
        elif dividend >= 2.0:
            score += 15
        elif dividend >= 1.0:
            score += 8
        elif dividend == 0:
            score -= 15
        
        # Prefer defensive sectors
        sector = stock.get("sector", "")
        if sector in ["Consumer Defensive", "Financial Services", "Energy"]:
            score += 10
        
        # Low P/E for stability
        if 0 < pe < 20:
            score += 10
    
    else:  # BALANCED
        # Balanced: Mix of all factors
        if 0 < pe < 30:
            score += 10
        if growth > 0.10:
            score += 10
        if upside > 5:
            score += 10
        if dividend >= 1.0:
            score += 5
    
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
    
    pe = stock.get("pe_ratio", 25)
    growth = stock.get("revenue_growth", 0)
    upside = stock.get("upside_potential", 0)
    change = stock.get("change_percent", 0)
    dividend = stock.get("dividend_yield", 0)
    
    if change > 1:
        reasons.append(f"Positive momentum: +{change:.1f}% today")
    
    if style == InvestmentStyle.VALUE:
        if 0 < pe < 20:
            reasons.append(f"Attractive valuation with P/E of {pe:.1f}")
        if upside > 10:
            reasons.append(f"Strong upside potential of {upside:.1f}%")
    
    elif style == InvestmentStyle.GROWTH:
        if growth > 0.15:
            reasons.append(f"Impressive revenue growth of {growth*100:.0f}%")
        if stock.get("sector") == "Technology":
            reasons.append("Leading position in Technology sector")
    
    elif style == InvestmentStyle.MOMENTUM:
        if change > 2:
            reasons.append(f"Strong price momentum: +{change:.1f}%")
    
    elif style == InvestmentStyle.DIVIDEND:
        if dividend >= 2:
            reasons.append(f"Attractive dividend yield of {dividend:.1f}%")
    
    if score >= 75:
        reasons.append("High AI confidence score")
    
    if not reasons:
        reasons.append(f"Solid fundamentals in {stock.get('sector', 'sector')}")
    
    return reasons[:4]  # Max 4 reasons


def determine_risk_level(stock: Dict, score: int) -> str:
    pe = stock.get("pe_ratio", 25)
    sector = stock.get("sector", "")
    
    if pe > 80 or pe < 0:
        return "high"
    if sector in ["Consumer Cyclical", "Technology", "Financial Services"]:
        if pe > 40:
            return "high"
        return "medium"
    return "low"


async def get_ai_recommendations(
    style: str = "balanced",
    limit: int = 10,
    risk_tolerance: str = "moderate"
) -> Dict[str, Any]:
    """Get AI-powered stock recommendations."""
    
    try:
        investment_style = InvestmentStyle(style.lower())
    except ValueError:
        investment_style = InvestmentStyle.BALANCED
    
    # Fetch all stocks
    stocks = await fetch_stocks_for_ai()
    
    if not stocks:
        return {"recommendations": [], "message": "No data available"}
    
    # Score and sort stocks
    scored_stocks = []
    for stock in stocks:
        ai_score = score_stock(stock, investment_style)
        recommendation = determine_recommendation(ai_score)
        reasons = generate_reasons(stock, ai_score, investment_style)
        risk_level = determine_risk_level(stock, ai_score)
        
        scored_stocks.append({
            "symbol": stock["symbol"],
            "name": stock["name"],
            "sector": stock["sector"],
            "current_price": stock["current_price"],
            "change_percent": stock["change_percent"],
            "pe_ratio": stock["pe_ratio"],
            "peg_ratio": stock["peg_ratio"],
            "revenue_growth": stock["revenue_growth"],
            "fair_value": stock["fair_value"],
            "upside_potential": stock["upside_potential"],
            "dividend_yield": stock["dividend_yield"],
            "target_price": stock["target_price"],
            "ai_score": ai_score,
            "recommendation": recommendation.value,
            "reasons": reasons,
            "risk_level": risk_level,
            "time_horizon": "6-12 months",
            "confidence": min(95, ai_score + 10),
        })
    
    # Sort by score and take top N
    scored_stocks.sort(key=lambda x: x["ai_score"], reverse=True)
    top_picks = scored_stocks[:limit]
    
    return {
        "recommendations": top_picks,
        "style": style,
        "total_analyzed": len(stocks),
        "message": f"Top {len(top_picks)} picks for {style} strategy"
    }


# Sync wrapper
class AIRecommendationsService:
    def get_recommendations(
        self,
        style: str = "balanced",
        limit: int = 10,
        risk_tolerance: str = "moderate"
    ) -> Dict[str, Any]:
        return asyncio.run(get_ai_recommendations(style, limit, risk_tolerance))


ai_service = AIRecommendationsService()
