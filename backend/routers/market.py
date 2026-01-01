"""
Market data router - Indices and currency rates.
"""

from fastapi import APIRouter
import httpx
import os
from typing import Dict, Any

router = APIRouter()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d58lr11r01qvj8ihdt60d58lr11r01qvj8ihdt6g")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"


async def fetch_quote(symbol: str) -> Dict[str, Any]:
    """Fetch quote for a symbol."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{FINNHUB_BASE_URL}/quote",
                params={"symbol": symbol, "token": FINNHUB_API_KEY}
            )
            if response.status_code == 200:
                data = response.json()
                current = data.get("c", 0)
                prev = data.get("pc", 0)
                change = current - prev
                change_pct = ((change / prev) * 100) if prev > 0 else 0
                return {
                    "symbol": symbol,
                    "price": round(current, 2),
                    "change": round(change, 2),
                    "change_percent": round(change_pct, 2),
                }
    except Exception:
        pass
    return {"symbol": symbol, "price": 0, "change": 0, "change_percent": 0}


async def fetch_forex(pair: str) -> Dict[str, Any]:
    """Fetch forex rate."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Finnhub forex endpoint
            response = await client.get(
                f"{FINNHUB_BASE_URL}/forex/rates",
                params={"base": "USD", "token": FINNHUB_API_KEY}
            )
            if response.status_code == 200:
                data = response.json()
                rates = data.get("quote", {})
                
                # Parse pair like EUR/USD
                from_curr = pair[:3]
                to_curr = pair[3:] if len(pair) > 3 else "USD"
                
                if to_curr == "USD" and from_curr in rates:
                    rate = 1 / rates[from_curr] if rates[from_curr] > 0 else 0
                    return {
                        "pair": f"{from_curr}/{to_curr}",
                        "rate": round(rate, 4),
                        "change_percent": 0.0,  # Simplified
                    }
    except Exception:
        pass
    
    # Fallback static rates
    fallback_rates = {
        "EUR": {"rate": 1.08, "change": 0.12},
        "GBP": {"rate": 1.27, "change": -0.08},
        "TRY": {"rate": 0.029, "change": -0.15},
    }
    base = pair[:3]
    if base in fallback_rates:
        return {
            "pair": f"{base}/USD",
            "rate": fallback_rates[base]["rate"],
            "change_percent": fallback_rates[base]["change"],
        }
    return {"pair": pair, "rate": 0, "change_percent": 0}


@router.get("/indices")
async def get_market_indices():
    """Get major market indices."""
    # Use ETFs as proxies for indices
    index_symbols = {
        "SPY": {"name": "S&P 500", "emoji": "📊"},
        "QQQ": {"name": "NASDAQ 100", "emoji": "💻"},
        "DIA": {"name": "Dow Jones", "emoji": "🏭"},
        "IWM": {"name": "Russell 2000", "emoji": "📈"},
    }
    
    # VIX needs special handling (CBOE)
    vix_data = {"symbol": "VIX", "name": "VIX", "emoji": "⚡", "price": 18.5, "change": 0.3, "change_percent": 1.6}
    
    results = []
    for symbol, info in index_symbols.items():
        quote = await fetch_quote(symbol)
        results.append({
            "symbol": symbol,
            "name": info["name"],
            "emoji": info["emoji"],
            "price": quote["price"],
            "change": quote["change"],
            "change_percent": quote["change_percent"],
        })
    
    # Add VIX (mock for now - requires different API)
    results.append(vix_data)
    
    return {"indices": results}


@router.get("/currencies")
async def get_currencies():
    """Get major currency rates vs USD."""
    currencies = [
        {"code": "EUR", "name": "Euro", "emoji": "🇪🇺"},
        {"code": "GBP", "name": "British Pound", "emoji": "🇬🇧"},
        {"code": "TRY", "name": "Turkish Lira", "emoji": "🇹🇷"},
    ]
    
    results = []
    for curr in currencies:
        rate_data = await fetch_forex(curr["code"])
        results.append({
            "code": curr["code"],
            "name": curr["name"],
            "emoji": curr["emoji"],
            "rate": rate_data["rate"],
            "change_percent": rate_data["change_percent"],
        })
    
    return {"currencies": results}


@router.get("/summary")
async def get_market_summary():
    """Get combined market summary - indices + currencies."""
    indices_data = await get_market_indices()
    currencies_data = await get_currencies()
    
    return {
        "indices": indices_data["indices"],
        "currencies": currencies_data["currencies"],
    }
