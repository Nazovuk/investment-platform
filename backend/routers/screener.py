"""
Screener API router.
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from pydantic import BaseModel

from services.screener import screener_service, ScreenerFilters


router = APIRouter()


class ScreenerRequest(BaseModel):
    """Request body for custom screening."""
    max_pe: Optional[float] = 100
    max_peg: Optional[float] = 5.0
    max_price_to_book: Optional[float] = None
    min_revenue_growth: Optional[float] = None
    min_earnings_growth: Optional[float] = None
    min_upside: Optional[float] = None
    min_score: Optional[int] = 0
    min_profit_margin: Optional[float] = None
    min_roe: Optional[float] = None
    min_dividend_yield: Optional[float] = None
    max_beta: Optional[float] = None
    max_debt_to_equity: Optional[float] = None
    sectors: Optional[List[str]] = None
    exclude_sectors: Optional[List[str]] = None
    symbols: Optional[List[str]] = None


@router.get("/")
async def get_screener_results(
    max_pe: Optional[float] = Query(100, description="Maximum P/E ratio"),
    max_peg: Optional[float] = Query(5.0, description="Maximum PEG ratio"),
    min_revenue_growth: Optional[float] = Query(None, description="Minimum revenue growth (0.10 = 10%)"),
    min_upside: Optional[float] = Query(None, description="Minimum upside potential (%)"),
    min_score: Optional[int] = Query(0, description="Minimum investment score (0-100)")
):
    """
    Get screened stocks based on filters.
    Uses default filter values if not specified.
    """
    filters = ScreenerFilters(
        max_pe=max_pe,
        max_peg=max_peg,
        min_revenue_growth=min_revenue_growth,
        min_upside=min_upside,
        min_score=min_score
    )
    
    results = screener_service.screen(filters)
    
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
        max_price_to_book=request.max_price_to_book,
        min_revenue_growth=request.min_revenue_growth,
        min_earnings_growth=request.min_earnings_growth,
        min_upside=request.min_upside,
        min_score=request.min_score,
        min_profit_margin=request.min_profit_margin,
        min_roe=request.min_roe,
        min_dividend_yield=request.min_dividend_yield,
        max_beta=request.max_beta,
        max_debt_to_equity=request.max_debt_to_equity,
        sectors=request.sectors,
        exclude_sectors=request.exclude_sectors
    )
    
    results = screener_service.screen(filters, symbols=request.symbols)
    
    return {
        "count": len(results),
        "results": results
    }


@router.get("/top-picks")
async def get_top_picks(count: int = Query(10, ge=1, le=50)):
    """Get top investment picks based on quality filters."""
    results = screener_service.get_top_picks(count)
    return {"count": len(results), "results": results}


@router.get("/value")
async def get_value_picks():
    """Get value stocks (low P/E, high upside)."""
    results = screener_service.get_value_picks()
    return {"count": len(results), "results": results}


@router.get("/growth")
async def get_growth_picks():
    """Get growth stocks (high revenue growth)."""
    results = screener_service.get_growth_picks()
    return {"count": len(results), "results": results}


@router.get("/dividend")
async def get_dividend_picks():
    """Get dividend stocks."""
    results = screener_service.get_dividend_picks()
    return {"count": len(results), "results": results}
