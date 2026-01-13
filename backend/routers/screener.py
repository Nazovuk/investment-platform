"""
Screener API router - Full functionality with dynamic search.
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from pydantic import BaseModel
import yfinance as yf

from services.screener import screen_stocks, fetch_all_stocks, fetch_single_stock, ScreenerFilters, DEFAULT_UNIVERSE


router = APIRouter()


class ScreenerRequest(BaseModel):
    """Request body for custom screening."""
    min_pe: Optional[float] = None
    max_pe: Optional[float] = None  # None = no limit
    max_peg: Optional[float] = None
    min_revenue_growth: Optional[float] = None
    min_upside: Optional[float] = None
    min_score: Optional[int] = None
    sectors: Optional[List[str]] = None


@router.get("/")
async def get_screener_results(
    search: Optional[str] = Query(None, description="Search symbol or name"),
    min_pe: Optional[float] = Query(None, description="Minimum P/E ratio"),
    max_pe: Optional[float] = Query(None, description="Maximum P/E ratio"),
    max_peg: Optional[float] = Query(None, description="Maximum PEG ratio"),
    min_revenue_growth: Optional[float] = Query(None, description="Minimum revenue growth"),
    min_upside: Optional[float] = Query(None, description="Minimum upside potential (%)"),
    min_score: Optional[int] = Query(None, description="Minimum investment score"),
    sector: Optional[str] = Query(None, description="Filter by sector")
):
    """
    Get screened stocks. No filters by default = returns ALL stocks.
    Use search to find specific symbols (supports any valid ticker).
    """
    # If searching for a specific symbol
    if search:
        search_upper = search.upper().strip()
        
        # Check if in our universe first
        matching = [s for s in DEFAULT_UNIVERSE if search_upper in s.upper()]
        
        if matching:
            # Found in universe - fetch those stocks
            results = await fetch_all_stocks(matching[:20])  # Limit to 20 matches
        else:
            # Not in universe - try yfinance directly
            stock_data = await fetch_single_stock(search_upper)
            if stock_data:
                results = [stock_data]
            else:
                results = []
        
        return {
            "count": len(results),
            "search": search,
            "results": results
        }
    
    # No search - apply filters to full universe
    sectors = [sector] if sector else None
    filters = ScreenerFilters(
        min_pe=min_pe,
        max_pe=max_pe,
        max_peg=max_peg,
        min_revenue_growth=min_revenue_growth,
        min_upside=min_upside,
        min_score=min_score,
        sectors=sectors
    )
    
    results = await screen_stocks(filters)
    
    return {
        "count": len(results),
        "filters": {
            "min_pe": min_pe,
            "max_pe": max_pe,
            "max_peg": max_peg,
            "min_revenue_growth": min_revenue_growth,
            "min_upside": min_upside,
            "min_score": min_score,
            "sector": sector
        },
        "results": results
    }


@router.get("/search/{symbol}")
async def search_stock(symbol: str):
    """
    Search for any stock by symbol - works with ANY valid ticker.
    Uses yfinance to fetch real-time data.
    """
    stock_data = await fetch_single_stock(symbol.upper())
    
    if stock_data:
        return {"found": True, "data": stock_data}
    else:
        return {"found": False, "symbol": symbol, "message": "Stock not found"}


@router.get("/top-picks")
async def get_top_picks(count: int = Query(10, ge=1, le=50)):
    """Get top investment picks - optimized for fast loading."""
    TOP_QUALITY_STOCKS = [
        "NVDA", "META", "GOOGL", "LLY", "AMZN", "MSFT", "NFLX", "AMD", "CRM", "UNH",
        "MA", "V", "JPM", "COST", "AVGO"
    ]
    
    all_stocks = await fetch_all_stocks(TOP_QUALITY_STOCKS)
    sorted_stocks = sorted(all_stocks, key=lambda x: x.get("score", 0), reverse=True)
    results = sorted_stocks[:count]
    return {"count": len(results), "results": results}


@router.get("/full")
async def get_full_screener():
    """Get full screener with all 200+ stocks."""
    all_stocks = await fetch_all_stocks(DEFAULT_UNIVERSE)
    sorted_stocks = sorted(all_stocks, key=lambda x: x.get("score", 0), reverse=True)
    return {"count": len(sorted_stocks), "results": sorted_stocks}


@router.get("/universe")
async def get_universe():
    """Get all available stocks in the universe."""
    return {"symbols": DEFAULT_UNIVERSE, "count": len(DEFAULT_UNIVERSE)}
