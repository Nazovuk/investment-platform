"""
Screener API router - Async version for fast concurrent data fetching.
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from pydantic import BaseModel

from services.screener import screen_stocks, fetch_all_stocks, ScreenerFilters, DEFAULT_UNIVERSE


router = APIRouter()


class ScreenerRequest(BaseModel):
    """Request body for custom screening."""
    min_pe: Optional[float] = None  # Minimum P/E ratio
    max_pe: Optional[float] = 500  # Maximum P/E ratio (expanded to 500)
    max_peg: Optional[float] = 5.0
    min_revenue_growth: Optional[float] = None
    min_upside: Optional[float] = None
    min_score: Optional[int] = 0
    sectors: Optional[List[str]] = None


@router.get("/")
async def get_screener_results(
    min_pe: Optional[float] = Query(None, description="Minimum P/E ratio"),
    max_pe: Optional[float] = Query(500, description="Maximum P/E ratio (up to 500)"),
    max_peg: Optional[float] = Query(5.0, description="Maximum PEG ratio"),
    min_revenue_growth: Optional[float] = Query(None, description="Minimum revenue growth (0.10 = 10%)"),
    min_upside: Optional[float] = Query(None, description="Minimum upside potential (%)"),
    min_score: Optional[int] = Query(0, description="Minimum investment score (0-100)"),
    sector: Optional[str] = Query(None, description="Filter by sector")
):
    """
    Get screened stocks based on filters.
    Uses async concurrent requests for fast response.
    """
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
            "max_pe": max_pe,
            "max_peg": max_peg,
            "min_revenue_growth": min_revenue_growth,
            "min_upside": min_upside,
            "min_score": min_score
        },
        "results": results
    }


@router.post("/custom")
async def custom_screen(request: ScreenerRequest):
    """
    Custom screening with all available filters.
    """
    filters = ScreenerFilters(
        max_pe=request.max_pe,
        max_peg=request.max_peg,
        min_revenue_growth=request.min_revenue_growth,
        min_upside=request.min_upside,
        min_score=request.min_score,
        sectors=request.sectors
    )
    
    results = await screen_stocks(filters)
    
    return {
        "count": len(results),
        "results": results
    }


@router.get("/top-picks")
async def get_top_picks(count: int = Query(10, ge=1, le=50)):
    """Get top investment picks - optimized for fast loading."""
    # For dashboard speed: only fetch top 15 quality stocks instead of full universe
    TOP_QUALITY_STOCKS = [
        "NVDA", "META", "GOOGL", "LLY", "AMZN", "MSFT", "NFLX", "AMD", "CRM", "UNH",
        "MA", "V", "JPM", "COST", "AVGO"
    ]
    
    # Fetch only essential stocks for fast response (< 3 seconds)
    all_stocks = await fetch_all_stocks(TOP_QUALITY_STOCKS)
    sorted_stocks = sorted(all_stocks, key=lambda x: x.get("score", 0), reverse=True)
    results = sorted_stocks[:count]
    return {"count": len(results), "results": results}


@router.get("/full")
async def get_full_screener():
    """Get full screener with all 200+ stocks - slower but complete."""
    all_stocks = await fetch_all_stocks(DEFAULT_UNIVERSE)
    sorted_stocks = sorted(all_stocks, key=lambda x: x.get("score", 0), reverse=True)
    return {"count": len(sorted_stocks), "results": sorted_stocks}


@router.get("/universe")
async def get_universe():
    """Get all available stocks in the universe."""
    return {"symbols": DEFAULT_UNIVERSE, "count": len(DEFAULT_UNIVERSE)}
