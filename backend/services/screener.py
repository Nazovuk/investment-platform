"""
Screener service - Filters stocks using async concurrent data fetching.
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
import os

logger = logging.getLogger(__name__)

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d58lr11r01qvj8ihdt60d58lr11r01qvj8ihdt6g")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# Stock universe - top 50 for faster loading
DEFAULT_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
    "JPM", "V", "MA", "BAC", "BRK.B", "UNH", "JNJ", "LLY",
    "HD", "PG", "KO", "PEP", "WMT", "COST", "MCD",
    "XOM", "CVX", "CAT", "BA", "GE", "HON", "RTX", "LMT",
    "DIS", "NFLX", "CRM", "ORCL", "ADBE", "AMD", "INTC", "AVGO", "QCOM",
    "PYPL", "SQ", "COIN", "PLTR", "SNOW", "CRWD", "NET", "ZS",
    "RIVN", "NIO", "ENPH"
]

# Static metadata for all stocks
STOCK_METADATA = {
    "AAPL": {"name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics"},
    "MSFT": {"name": "Microsoft Corporation", "sector": "Technology", "industry": "Software"},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology", "industry": "Internet Services"},
    "AMZN": {"name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "industry": "E-Commerce"},
    "META": {"name": "Meta Platforms Inc.", "sector": "Technology", "industry": "Social Media"},
    "NVDA": {"name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors"},
    "TSLA": {"name": "Tesla Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "JPM": {"name": "JPMorgan Chase & Co.", "sector": "Financial Services", "industry": "Banking"},
    "V": {"name": "Visa Inc.", "sector": "Financial Services", "industry": "Payment Processing"},
    "MA": {"name": "Mastercard Inc.", "sector": "Financial Services", "industry": "Payment Processing"},
    "BAC": {"name": "Bank of America Corp", "sector": "Financial Services", "industry": "Banking"},
    "BRK.B": {"name": "Berkshire Hathaway B", "sector": "Financial Services", "industry": "Insurance"},
    "UNH": {"name": "UnitedHealth Group", "sector": "Healthcare", "industry": "Health Insurance"},
    "JNJ": {"name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "LLY": {"name": "Eli Lilly and Company", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "HD": {"name": "The Home Depot Inc.", "sector": "Consumer Cyclical", "industry": "Home Improvement"},
    "PG": {"name": "Procter & Gamble Co.", "sector": "Consumer Defensive", "industry": "Household Products"},
    "KO": {"name": "The Coca-Cola Company", "sector": "Consumer Defensive", "industry": "Beverages"},
    "PEP": {"name": "PepsiCo Inc.", "sector": "Consumer Defensive", "industry": "Beverages"},
    "WMT": {"name": "Walmart Inc.", "sector": "Consumer Defensive", "industry": "Retail"},
    "COST": {"name": "Costco Wholesale Corp", "sector": "Consumer Defensive", "industry": "Retail"},
    "MCD": {"name": "McDonald's Corporation", "sector": "Consumer Cyclical", "industry": "Restaurants"},
    "XOM": {"name": "Exxon Mobil Corporation", "sector": "Energy", "industry": "Oil & Gas"},
    "CVX": {"name": "Chevron Corporation", "sector": "Energy", "industry": "Oil & Gas"},
    "CAT": {"name": "Caterpillar Inc.", "sector": "Industrials", "industry": "Machinery"},
    "BA": {"name": "Boeing Company", "sector": "Industrials", "industry": "Aerospace"},
    "GE": {"name": "GE Aerospace", "sector": "Industrials", "industry": "Aerospace"},
    "HON": {"name": "Honeywell International", "sector": "Industrials", "industry": "Conglomerates"},
    "RTX": {"name": "RTX Corporation", "sector": "Industrials", "industry": "Aerospace & Defense"},
    "LMT": {"name": "Lockheed Martin Corp", "sector": "Industrials", "industry": "Aerospace & Defense"},
    "DIS": {"name": "The Walt Disney Company", "sector": "Communication Services", "industry": "Entertainment"},
    "NFLX": {"name": "Netflix Inc.", "sector": "Communication Services", "industry": "Streaming"},
    "CRM": {"name": "Salesforce Inc.", "sector": "Technology", "industry": "Software"},
    "ORCL": {"name": "Oracle Corporation", "sector": "Technology", "industry": "Software"},
    "ADBE": {"name": "Adobe Inc.", "sector": "Technology", "industry": "Software"},
    "AMD": {"name": "Advanced Micro Devices", "sector": "Technology", "industry": "Semiconductors"},
    "INTC": {"name": "Intel Corporation", "sector": "Technology", "industry": "Semiconductors"},
    "AVGO": {"name": "Broadcom Inc.", "sector": "Technology", "industry": "Semiconductors"},
    "QCOM": {"name": "Qualcomm Inc.", "sector": "Technology", "industry": "Semiconductors"},
    "PYPL": {"name": "PayPal Holdings Inc.", "sector": "Financial Services", "industry": "Digital Payments"},
    "SQ": {"name": "Block Inc.", "sector": "Financial Services", "industry": "Fintech"},
    "COIN": {"name": "Coinbase Global Inc.", "sector": "Financial Services", "industry": "Cryptocurrency"},
    "PLTR": {"name": "Palantir Technologies", "sector": "Technology", "industry": "Data Analytics"},
    "SNOW": {"name": "Snowflake Inc.", "sector": "Technology", "industry": "Cloud Computing"},
    "CRWD": {"name": "CrowdStrike Holdings", "sector": "Technology", "industry": "Cybersecurity"},
    "NET": {"name": "Cloudflare Inc.", "sector": "Technology", "industry": "Cloud Infrastructure"},
    "ZS": {"name": "Zscaler Inc.", "sector": "Technology", "industry": "Cybersecurity"},
    "RIVN": {"name": "Rivian Automotive Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "NIO": {"name": "NIO Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "ENPH": {"name": "Enphase Energy Inc.", "sector": "Technology", "industry": "Solar"},
}

# Cache for stock data
_cache: Dict[str, Dict[str, Any]] = {}
_cache_time: Dict[str, datetime] = {}
CACHE_TIMEOUT = 120  # 2 minutes


@dataclass
class ScreenerFilters:
    """Screener filter criteria."""
    max_pe: Optional[float] = 100
    max_peg: Optional[float] = 5.0
    min_upside: Optional[float] = None
    min_score: Optional[int] = 0
    min_revenue_growth: Optional[float] = None
    min_earnings_growth: Optional[float] = None
    min_dividend_yield: Optional[float] = None
    max_debt_to_equity: Optional[float] = None
    sectors: Optional[List[str]] = None


def _is_cache_valid(symbol: str) -> bool:
    if symbol not in _cache_time:
        return False
    elapsed = (datetime.now() - _cache_time[symbol]).total_seconds()
    return elapsed < CACHE_TIMEOUT


def _get_metadata(symbol: str) -> Dict[str, str]:
    return STOCK_METADATA.get(symbol, {"name": symbol, "sector": "Unknown", "industry": "Unknown"})


def _calculate_score(symbol: str, current: float, prev: float) -> int:
    """Calculate simple investment score."""
    score = 60
    if current > prev:
        score += 10
    if symbol in ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]:
        score += 15
    elif symbol in ["META", "TSLA", "NFLX", "CRM", "AMD"]:
        score += 10
    return min(100, max(0, score))


async def fetch_stock_quote(client: httpx.AsyncClient, symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch single stock quote asynchronously."""
    if _is_cache_valid(symbol):
        return _cache[symbol]
    
    try:
        response = await client.get(
            f"{FINNHUB_BASE_URL}/quote",
            params={"symbol": symbol, "token": FINNHUB_API_KEY}
        )
        
        if response.status_code == 200:
            quote = response.json()
            current_price = quote.get("c", 0)
            prev_close = quote.get("pc", 0)
            
            if current_price > 0:
                meta = _get_metadata(symbol)
                change_pct = ((current_price - prev_close) / prev_close * 100) if prev_close > 0 else 0
                
                data = {
                    "symbol": symbol,
                    "name": meta["name"],
                    "sector": meta["sector"],
                    "industry": meta["industry"],
                    "current_price": round(current_price, 2),
                    "previous_close": round(prev_close, 2),
                    "change_percent": round(change_pct, 2),
                    "high": round(quote.get("h", current_price), 2),
                    "low": round(quote.get("l", current_price), 2),
                    "market_cap": int(current_price * 1e9),  # Simplified
                    "pe_ratio": 25.0,  # Placeholder
                    "peg_ratio": 2.0,  # Placeholder
                    "revenue_growth": 0.08,  # Placeholder
                    "fair_value": round(current_price * 1.1, 2),
                    "upside_potential": 10.0,
                    "score": _calculate_score(symbol, current_price, prev_close),
                    "dividend_yield": 0.01,
                }
                
                _cache[symbol] = data
                _cache_time[symbol] = datetime.now()
                return data
    except Exception as e:
        logger.warning(f"Error fetching {symbol}: {e}")
    
    return None


async def fetch_all_stocks(symbols: List[str]) -> List[Dict[str, Any]]:
    """Fetch all stocks concurrently."""
    async with httpx.AsyncClient(timeout=5.0) as client:
        tasks = [fetch_stock_quote(client, symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    stocks = []
    for result in results:
        if isinstance(result, dict) and result.get("current_price", 0) > 0:
            stocks.append(result)
    
    return stocks


def passes_filters(stock: Dict[str, Any], filters: ScreenerFilters) -> bool:
    """Check if stock passes all filters."""
    if filters.max_pe is not None:
        pe = stock.get("pe_ratio")
        if pe is not None and (pe > filters.max_pe or pe < 0):
            return False
    
    if filters.max_peg is not None:
        peg = stock.get("peg_ratio")
        if peg is not None and (peg > filters.max_peg or peg < 0):
            return False
    
    if filters.min_score is not None:
        score = stock.get("score", 0)
        if score < filters.min_score:
            return False
    
    if filters.min_revenue_growth is not None:
        growth = stock.get("revenue_growth", 0)
        if growth < filters.min_revenue_growth:
            return False
    
    if filters.min_upside is not None:
        upside = stock.get("upside_potential", 0)
        if upside < filters.min_upside:
            return False
    
    return True


async def screen_stocks(filters: ScreenerFilters) -> List[Dict[str, Any]]:
    """Screen stocks with filters - main async entry point."""
    all_stocks = await fetch_all_stocks(DEFAULT_UNIVERSE)
    
    filtered = [s for s in all_stocks if passes_filters(s, filters)]
    filtered.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    return filtered


def get_universe() -> List[str]:
    """Get stock universe."""
    return DEFAULT_UNIVERSE.copy()


# Sync wrapper for compatibility
class ScreenerService:
    """Sync wrapper for screener operations."""
    
    def screen(self, filters: ScreenerFilters, symbols: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        return asyncio.run(screen_stocks(filters))
    
    def get_top_picks(self, count: int = 10) -> List[Dict[str, Any]]:
        stocks = asyncio.run(fetch_all_stocks(DEFAULT_UNIVERSE))
        return sorted(stocks, key=lambda x: x.get("score", 0), reverse=True)[:count]


screener_service = ScreenerService()
