"""
Economic Calendar Router - FREE-FIRST compliant.

Provides economic calendar endpoints:
- GET /economic/calendar - Upcoming economic events
"""

from fastapi import APIRouter, Query
from typing import Optional

from services.economic import get_economic_calendar

router = APIRouter()


@router.get("/calendar")
async def get_calendar(
    days: int = Query(30, ge=1, le=90, description="Days to fetch"),
    country: Optional[str] = Query(None, description="Filter by country (US, UK, EU)")
):
    """
    Get economic calendar with upcoming events.
    
    Shows: FOMC, NFP, CPI, GDP, Unemployment, PMI, etc.
    
    Returns:
        List of economic events with expected, actual, previous values
    """
    calendar = await get_economic_calendar(days=days, country=country)
    return calendar


@router.get("/calendar/today")
async def get_today_events():
    """
    Get economic events for today only.
    """
    calendar = await get_economic_calendar(days=1)
    return calendar


@router.get("/calendar/high-impact")
async def get_high_impact_events(
    days: int = Query(14, ge=1, le=30)
):
    """
    Get only high-impact economic events.
    """
    calendar = await get_economic_calendar(days=days)
    
    # Filter high impact
    high_impact_events = [
        e for e in calendar.get("events", [])
        if e.get("impact") == "high"
    ]
    
    return {
        "events": high_impact_events,
        "total_count": len(high_impact_events),
        "source": calendar.get("source"),
        "as_of": calendar.get("as_of"),
        "date_range": calendar.get("date_range")
    }
