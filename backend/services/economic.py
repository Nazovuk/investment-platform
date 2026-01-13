"""
Economic Calendar Service - FREE-FIRST compliant.

Uses free data sources:
1. Finnhub economic calendar (free tier)
2. Static fallback for major events

Shows: Event name, Date, Expected, Actual, Previous, Impact level
"""

import httpx
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional
import logging
import os

logger = logging.getLogger(__name__)

# Finnhub API key (free tier)
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")

# Major economic events (static fallback)
MAJOR_EVENTS = [
    {"event": "FOMC Interest Rate Decision", "country": "US", "impact": "high", "frequency": "6 weeks"},
    {"event": "Non-Farm Payrolls", "country": "US", "impact": "high", "frequency": "monthly"},
    {"event": "CPI (Inflation)", "country": "US", "impact": "high", "frequency": "monthly"},
    {"event": "GDP Growth Rate", "country": "US", "impact": "high", "frequency": "quarterly"},
    {"event": "Unemployment Rate", "country": "US", "impact": "medium", "frequency": "monthly"},
    {"event": "Retail Sales", "country": "US", "impact": "medium", "frequency": "monthly"},
    {"event": "PPI (Producer Prices)", "country": "US", "impact": "medium", "frequency": "monthly"},
    {"event": "Consumer Confidence", "country": "US", "impact": "medium", "frequency": "monthly"},
    {"event": "PMI Manufacturing", "country": "US", "impact": "medium", "frequency": "monthly"},
    {"event": "ECB Interest Rate Decision", "country": "EU", "impact": "high", "frequency": "6 weeks"},
    {"event": "BoE Interest Rate Decision", "country": "UK", "impact": "high", "frequency": "6 weeks"},
    {"event": "UK CPI", "country": "UK", "impact": "high", "frequency": "monthly"},
]


async def fetch_finnhub_calendar() -> List[Dict]:
    """
    Fetch economic calendar from Finnhub (free tier).
    Returns list of upcoming economic events.
    """
    if not FINNHUB_API_KEY:
        logger.warning("Finnhub API key not set, using fallback data")
        return []
    
    try:
        today = date.today()
        from_date = today.strftime("%Y-%m-%d")
        to_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        
        url = f"https://finnhub.io/api/v1/calendar/economic?from={from_date}&to={to_date}&token={FINNHUB_API_KEY}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            events = []
            for item in data.get("economicCalendar", [])[:50]:  # Limit to 50
                events.append({
                    "date": item.get("time", "")[:10],
                    "time": item.get("time", "")[11:16] if len(item.get("time", "")) > 10 else "",
                    "country": item.get("country", ""),
                    "event": item.get("event", ""),
                    "impact": item.get("impact", "medium"),
                    "expected": item.get("estimate"),
                    "actual": item.get("actual"),
                    "previous": item.get("prev"),
                    "unit": item.get("unit", ""),
                })
            
            return events
            
    except Exception as e:
        logger.error(f"Failed to fetch Finnhub calendar: {e}")
        return []


def generate_fallback_calendar() -> List[Dict]:
    """
    Generate static fallback calendar for next 30 days.
    Shows typical release schedule for major events.
    """
    today = date.today()
    events = []
    
    # Generate mock dates for major events
    for i, event_info in enumerate(MAJOR_EVENTS):
        # Distribute events across next 30 days
        event_date = today + timedelta(days=(i * 3) % 30)
        
        events.append({
            "date": event_date.strftime("%Y-%m-%d"),
            "time": f"{8 + (i % 8):02d}:30",
            "country": event_info["country"],
            "event": event_info["event"],
            "impact": event_info["impact"],
            "expected": None,  # No data in fallback
            "actual": None,
            "previous": None,
            "unit": "",
            "is_estimate": True  # Flag as estimated date
        })
    
    # Sort by date
    events.sort(key=lambda x: x["date"])
    
    return events


async def get_economic_calendar(days: int = 30, country: Optional[str] = None) -> Dict:
    """
    Get economic calendar with events for next N days.
    
    Args:
        days: Number of days to fetch (default 30)
        country: Filter by country code (US, UK, EU, etc.)
    
    Returns:
        Dictionary with events and metadata
    """
    # Try Finnhub first
    events = await fetch_finnhub_calendar()
    source = "finnhub"
    
    # Fallback to static data
    if not events:
        events = generate_fallback_calendar()
        source = "fallback"
    
    # Filter by country if specified
    if country:
        events = [e for e in events if e.get("country", "").upper() == country.upper()]
    
    # Filter by date range
    today = date.today()
    end_date = today + timedelta(days=days)
    events = [
        e for e in events 
        if today.strftime("%Y-%m-%d") <= e.get("date", "") <= end_date.strftime("%Y-%m-%d")
    ]
    
    # Categorize by impact
    high_impact = [e for e in events if e.get("impact") == "high"]
    
    return {
        "events": events,
        "total_count": len(events),
        "high_impact_count": len(high_impact),
        "source": source,
        "as_of": datetime.utcnow().isoformat(),
        "date_range": {
            "from": today.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d")
        }
    }


def get_impact_color(impact: str) -> str:
    """Get CSS color for impact level."""
    colors = {
        "high": "#ef4444",    # Red
        "medium": "#f59e0b",  # Orange
        "low": "#10b981"      # Green
    }
    return colors.get(impact, "#94a3b8")
