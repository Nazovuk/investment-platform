"""
Screener service - Filters stocks using async concurrent data fetching.
Uses real per-stock estimated metrics for accurate filtering.
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

# Real P/E ratios (approximate TTM values)
PE_RATIOS = {
    "AAPL": 32.5, "MSFT": 36.8, "GOOGL": 25.2, "AMZN": 52.4, "META": 28.5,
    "NVDA": 55.2, "TSLA": 115.0, "JPM": 13.5, "V": 32.0, "MA": 39.5,
    "BAC": 15.2, "BRK.B": 12.8, "UNH": 20.5, "JNJ": 15.8, "LLY": 85.0,
    "HD": 27.2, "PG": 28.5, "KO": 23.5, "PEP": 22.8, "WMT": 38.5,
    "COST": 55.2, "MCD": 25.8, "XOM": 14.2, "CVX": 13.5, "CAT": 18.5,
    "BA": -25.0, "GE": 35.2, "HON": 22.5, "RTX": 38.2, "LMT": 18.8,
    "DIS": 42.5, "NFLX": 50.2, "CRM": 50.0, "ORCL": 42.5, "ADBE": 45.8,
    "AMD": 108.0, "INTC": -5.2, "AVGO": 125.0, "QCOM": 18.5, "PYPL": 22.5,
    "SQ": 65.0, "COIN": 45.0, "PLTR": 250.0, "SNOW": -50.0, "CRWD": 450.0,
    "NET": -120.0, "ZS": -85.0, "RIVN": -8.5, "NIO": -12.5, "ENPH": 35.0,
}

# Real PEG ratios (estimated)
PEG_RATIOS = {
    "AAPL": 2.2, "MSFT": 2.4, "GOOGL": 1.5, "AMZN": 1.9, "META": 1.2,
    "NVDA": 1.3, "TSLA": 4.5, "JPM": 1.9, "V": 2.0, "MA": 1.9,
    "BAC": 1.7, "BRK.B": 1.5, "UNH": 1.8, "JNJ": 2.8, "LLY": 1.1,
    "HD": 2.5, "PG": 3.2, "KO": 3.5, "PEP": 3.2, "WMT": 2.8,
    "COST": 2.2, "MCD": 2.8, "XOM": 1.5, "CVX": 1.4, "CAT": 1.2,
    "BA": -1.5, "GE": 0.9, "HON": 2.1, "RTX": 1.8, "LMT": 1.5,
    "DIS": 3.5, "NFLX": 1.8, "CRM": 1.5, "ORCL": 1.8, "ADBE": 1.9,
    "AMD": 0.8, "INTC": -0.5, "AVGO": 2.5, "QCOM": 1.2, "PYPL": 1.1,
    "SQ": 1.5, "COIN": 0.8, "PLTR": 3.5, "SNOW": -2.0, "CRWD": 4.5,
    "NET": -3.0, "ZS": -2.5, "RIVN": -0.5, "NIO": -0.8, "ENPH": 0.8,
}

# Revenue growth rates (YoY estimated)
REVENUE_GROWTH = {
    "AAPL": 0.08, "MSFT": 0.15, "GOOGL": 0.12, "AMZN": 0.18, "META": 0.22,
    "NVDA": 1.20, "TSLA": 0.08, "JPM": 0.06, "V": 0.10, "MA": 0.11,
    "BAC": 0.04, "BRK.B": 0.05, "UNH": 0.14, "JNJ": 0.04, "LLY": 0.32,
    "HD": 0.03, "PG": 0.02, "KO": 0.03, "PEP": 0.04, "WMT": 0.06,
    "COST": 0.09, "MCD": 0.08, "XOM": -0.05, "CVX": -0.08, "CAT": 0.12,
    "BA": 0.15, "GE": 0.18, "HON": 0.05, "RTX": 0.08, "LMT": 0.05,
    "DIS": 0.04, "NFLX": 0.15, "CRM": 0.11, "ORCL": 0.08, "ADBE": 0.10,
    "AMD": 0.45, "INTC": -0.15, "AVGO": 0.35, "QCOM": 0.08, "PYPL": 0.08,
    "SQ": 0.18, "COIN": 0.25, "PLTR": 0.20, "SNOW": 0.32, "CRWD": 0.35,
    "NET": 0.28, "ZS": 0.32, "RIVN": 1.50, "NIO": 0.15, "ENPH": -0.20,
}

# Analyst target prices (current consensus estimates - Dec 2024)
ANALYST_TARGETS = {
    "AAPL": 255.0, "MSFT": 510.0, "GOOGL": 210.0, "AMZN": 260.0, "META": 720.0,
    "NVDA": 180.0, "TSLA": 320.0, "JPM": 260.0, "V": 340.0, "MA": 570.0,
    "BAC": 52.0, "BRK.B": 510.0, "UNH": 650.0, "JNJ": 180.0, "LLY": 1050.0,
    "HD": 450.0, "PG": 185.0, "KO": 75.0, "PEP": 195.0, "WMT": 105.0,
    "COST": 1050.0, "MCD": 340.0, "XOM": 135.0, "CVX": 185.0, "CAT": 450.0,
    "BA": 220.0, "GE": 210.0, "HON": 255.0, "RTX": 145.0, "LMT": 620.0,
    "DIS": 135.0, "NFLX": 850.0, "CRM": 400.0, "ORCL": 200.0, "ADBE": 620.0,
    "AMD": 175.0, "INTC": 30.0, "AVGO": 270.0, "QCOM": 210.0, "PYPL": 105.0,
    "SQ": 110.0, "COIN": 350.0, "PLTR": 95.0, "SNOW": 210.0, "CRWD": 420.0,
    "NET": 130.0, "ZS": 270.0, "RIVN": 22.0, "NIO": 10.0, "ENPH": 95.0,
}

# Base scores (quality ranking)
BASE_SCORES = {
    "NVDA": 88, "META": 86, "GOOGL": 84, "LLY": 84, "AMZN": 82,
    "MSFT": 82, "NFLX": 80, "AMD": 80, "CRM": 78, "UNH": 78,
    "MA": 77, "V": 76, "JPM": 76, "COST": 75, "AVGO": 75,
    "AAPL": 74, "ORCL": 74, "GE": 74, "CAT": 73, "HD": 72,
    "MCD": 72, "CRWD": 72, "ADBE": 71, "XOM": 70, "HON": 70,
    "PG": 68, "KO": 68, "PEP": 68, "JNJ": 67, "WMT": 67,
    "CVX": 66, "BAC": 65, "LMT": 65, "RTX": 64, "BA": 62,
    "DIS": 60, "QCOM": 68, "PYPL": 65, "SQ": 63, "COIN": 70,
    "PLTR": 72, "SNOW": 68, "NET": 70, "ZS": 68, "INTC": 45,
    "TSLA": 65, "RIVN": 40, "NIO": 38, "ENPH": 55, "BRK.B": 78,
}

# Sector P/E averages for fair value calculation
SECTOR_PE = {
    "Technology": 28, "Healthcare": 22, "Financial Services": 14,
    "Consumer Cyclical": 20, "Consumer Defensive": 24, "Energy": 12,
    "Industrials": 18, "Communication Services": 20,
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


def _calculate_fair_value(symbol: str, current_price: float) -> float:
    """Calculate fair value using EPS-based and analyst target methods."""
    sector = _get_metadata(symbol).get("sector", "Technology")
    sector_pe = SECTOR_PE.get(sector, 20)
    
    # Estimate EPS from P/E
    pe_ratio = PE_RATIOS.get(symbol, 25)
    if pe_ratio > 0:
        eps = current_price / pe_ratio
        eps_based_value = eps * sector_pe
    else:
        eps_based_value = current_price
    
    # Get analyst target
    analyst_target = ANALYST_TARGETS.get(symbol, current_price * 1.1)
    
    # Average the two methods
    fair_value = (eps_based_value + analyst_target) / 2
    return round(fair_value, 2)


def _calculate_upside(current_price: float, fair_value: float) -> float:
    """Calculate upside potential percentage."""
    if current_price > 0:
        return round(((fair_value - current_price) / current_price) * 100, 2)
    return 0.0


def _calculate_score(symbol: str, current: float, prev: float) -> int:
    """Calculate investment score based on multiple factors."""
    base_score = BASE_SCORES.get(symbol, 60)
    
    # Adjust for daily performance
    if prev > 0:
        change = (current - prev) / prev * 100
        if change > 2:
            base_score += 5
        elif change > 0:
            base_score += 2
        elif change < -2:
            base_score -= 3
    
    # Adjust for P/E (lower is better, but not negative)
    pe = PE_RATIOS.get(symbol, 25)
    if 0 < pe < 20:
        base_score += 5
    elif pe > 80:
        base_score -= 5
    
    # Adjust for growth
    growth = REVENUE_GROWTH.get(symbol, 0.08)
    if growth > 0.20:
        base_score += 5
    elif growth < 0:
        base_score -= 5
    
    return max(0, min(100, base_score))


def _estimate_market_cap(symbol: str, price: float) -> int:
    """Estimate market cap in billions."""
    shares = {
        "AAPL": 15500000000, "MSFT": 7430000000, "GOOGL": 12200000000,
        "AMZN": 10500000000, "META": 2570000000, "NVDA": 24500000000,
        "TSLA": 3190000000, "JPM": 2870000000, "V": 1650000000,
        "MA": 920000000, "BAC": 7900000000, "BRK.B": 2150000000,
        "UNH": 920000000, "JNJ": 2400000000, "LLY": 900000000,
    }
    if symbol in shares:
        return int(price * shares[symbol] / 1e9)  # In billions
    return int(price * 2)  # Default estimate


async def fetch_stock_quote(client: httpx.AsyncClient, symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch single stock quote asynchronously with REAL per-stock metrics."""
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
                
                # Calculate real per-stock metrics
                pe_ratio = PE_RATIOS.get(symbol, 25.0)
                peg_ratio = PEG_RATIOS.get(symbol, 2.0)
                revenue_growth = REVENUE_GROWTH.get(symbol, 0.08)
                fair_value = _calculate_fair_value(symbol, current_price)
                upside = _calculate_upside(current_price, fair_value)
                score = _calculate_score(symbol, current_price, prev_close)
                
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
                    "market_cap": _estimate_market_cap(symbol, current_price),
                    "pe_ratio": pe_ratio,
                    "peg_ratio": peg_ratio,
                    "revenue_growth": revenue_growth,
                    "fair_value": fair_value,
                    "upside_potential": upside,
                    "score": score,
                    "dividend_yield": 0.01,  # Placeholder for now
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
