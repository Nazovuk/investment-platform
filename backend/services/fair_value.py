"""
Fair Value Service - Phase 1 compliant.

Deterministic relative valuation based on:
- P/E vs sector average
- EV/EBITDA vs sector average
- Revenue growth adjustment
- Margin quality adjustment

❌ NOT investment advice
❌ NOT a target price
"""

from datetime import date, datetime
from typing import Dict, Optional, Tuple
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ValuationStatus(str, Enum):
    UNDERVALUED = "UNDERVALUED"
    FAIRLY_VALUED = "FAIRLY_VALUED"
    OVERVALUED = "OVERVALUED"


# Sector average P/E ratios (based on historical averages)
SECTOR_PE_AVERAGES: Dict[str, float] = {
    "Technology": 28.0,
    "Healthcare": 22.0,
    "Financial Services": 14.0,
    "Consumer Cyclical": 20.0,
    "Consumer Defensive": 22.0,
    "Industrials": 20.0,
    "Energy": 12.0,
    "Utilities": 18.0,
    "Real Estate": 40.0,
    "Communication Services": 18.0,
    "Basic Materials": 15.0,
    "Unknown": 20.0
}

# Sector average EV/EBITDA ratios
SECTOR_EV_EBITDA_AVERAGES: Dict[str, float] = {
    "Technology": 18.0,
    "Healthcare": 14.0,
    "Financial Services": 10.0,
    "Consumer Cyclical": 12.0,
    "Consumer Defensive": 14.0,
    "Industrials": 11.0,
    "Energy": 6.0,
    "Utilities": 10.0,
    "Real Estate": 16.0,
    "Communication Services": 10.0,
    "Basic Materials": 8.0,
    "Unknown": 12.0
}

# Revenue growth benchmark (annualized %)
REVENUE_GROWTH_BENCHMARK = 10.0

# Net margin benchmark (%)
MARGIN_BENCHMARK = 15.0


def calculate_fair_value(
    ticker: str,
    current_price: float,
    pe_ratio: Optional[float],
    ev_ebitda: Optional[float],
    revenue_growth: Optional[float],
    net_margin: Optional[float],
    sector: str = "Unknown",
    eps: Optional[float] = None
) -> Dict:
    """
    Calculate deterministic fair value using relative valuation.
    
    Methodology:
    1. Compare P/E to sector average → if below, stock is cheap
    2. Compare EV/EBITDA to sector average → if below, stock is cheap
    3. Adjust for revenue growth (above avg = premium)
    4. Adjust for margin quality (above avg = premium)
    
    Returns:
        Dict with fair_value, upside_pct, status, and methodology details
    """
    
    # Get sector benchmarks
    sector_pe = SECTOR_PE_AVERAGES.get(sector, SECTOR_PE_AVERAGES["Unknown"])
    sector_ev_ebitda = SECTOR_EV_EBITDA_AVERAGES.get(sector, SECTOR_EV_EBITDA_AVERAGES["Unknown"])
    
    # Initialize adjustments
    pe_adjustment = 0.0
    ev_ebitda_adjustment = 0.0
    growth_adjustment = 0.0
    margin_adjustment = 0.0
    
    # 1. P/E Valuation Component
    if pe_ratio is not None and pe_ratio > 0:
        # How much cheaper/expensive vs sector
        # If P/E is 50% of sector avg, stock trades at 50% discount
        pe_vs_sector = pe_ratio / sector_pe
        # Adjustment: if trading at 0.8x sector P/E, +20% upside
        pe_adjustment = (1 - pe_vs_sector) * 0.5  # 50% weight to P/E
    else:
        pe_adjustment = 0.0
        pe_vs_sector = None
    
    # 2. EV/EBITDA Valuation Component
    if ev_ebitda is not None and ev_ebitda > 0:
        ev_vs_sector = ev_ebitda / sector_ev_ebitda
        ev_ebitda_adjustment = (1 - ev_vs_sector) * 0.3  # 30% weight
    else:
        ev_ebitda_adjustment = 0.0
        ev_vs_sector = None
    
    # 3. Revenue Growth Adjustment
    if revenue_growth is not None:
        growth_pct = revenue_growth * 100 if revenue_growth < 1 else revenue_growth
        growth_vs_benchmark = growth_pct / REVENUE_GROWTH_BENCHMARK
        # Premium for higher growth, discount for lower
        growth_adjustment = (growth_vs_benchmark - 1) * 0.15  # 15% weight
    
    # 4. Margin Quality Adjustment
    if net_margin is not None:
        margin_pct = net_margin * 100 if net_margin < 1 else net_margin
        if margin_pct > 0:
            margin_vs_benchmark = margin_pct / MARGIN_BENCHMARK
            margin_adjustment = (margin_vs_benchmark - 1) * 0.05  # 5% weight
    
    # Total adjustment (capped at +/- 50%)
    total_adjustment = pe_adjustment + ev_ebitda_adjustment + growth_adjustment + margin_adjustment
    total_adjustment = max(-0.5, min(0.5, total_adjustment))
    
    # Calculate fair value
    fair_value = current_price * (1 + total_adjustment)
    fair_value = round(fair_value, 2)
    
    # Calculate upside
    upside_pct = ((fair_value - current_price) / current_price) * 100 if current_price > 0 else 0
    upside_pct = round(upside_pct, 2)
    
    # Determine status
    if upside_pct >= 15:
        status = ValuationStatus.UNDERVALUED
    elif upside_pct <= -15:
        status = ValuationStatus.OVERVALUED
    else:
        status = ValuationStatus.FAIRLY_VALUED
    
    return {
        "ticker": ticker,
        "current_price": current_price,
        "fair_value": fair_value,
        "upside_pct": upside_pct,
        "status": status.value,
        "methodology_version": "1.0",
        "calculated_at": datetime.utcnow().isoformat(),
        "as_of": date.today().isoformat(),
        
        # Detailed breakdown for explainability
        "methodology": {
            "sector": sector,
            "sector_pe_avg": sector_pe,
            "sector_ev_ebitda_avg": sector_ev_ebitda,
            "pe_vs_sector": round(pe_vs_sector, 2) if pe_vs_sector else None,
            "ev_ebitda_vs_sector": round(ev_vs_sector, 2) if ev_vs_sector else None,
            "adjustments": {
                "pe_adj": round(pe_adjustment * 100, 2),
                "ev_ebitda_adj": round(ev_ebitda_adjustment * 100, 2),
                "growth_adj": round(growth_adjustment * 100, 2),
                "margin_adj": round(margin_adjustment * 100, 2),
                "total_adj": round(total_adjustment * 100, 2)
            }
        },
        
        # Disclaimers
        "disclaimers": [
            "This is a relative valuation estimate, not investment advice.",
            "Fair value is based on sector peer comparisons.",
            "Past performance does not guarantee future results.",
            "Always conduct your own research before investing."
        ]
    }


def get_valuation_explanation(result: Dict) -> str:
    """
    Generate human-readable explanation of valuation.
    """
    ticker = result["ticker"]
    status = result["status"]
    upside = result["upside_pct"]
    method = result["methodology"]
    
    explanation_parts = [
        f"**{ticker} Valuation Summary**",
        f"Status: {status}",
        f"Fair Value: ${result['fair_value']:.2f} ({upside:+.1f}% from current price)",
        "",
        "**Methodology Breakdown:**"
    ]
    
    if method["pe_vs_sector"]:
        pe_status = "below" if method["pe_vs_sector"] < 1 else "above"
        explanation_parts.append(
            f"- P/E Ratio: Trading {pe_status} sector average ({method['pe_vs_sector']:.2f}x)"
        )
    
    if method["ev_ebitda_vs_sector"]:
        ev_status = "below" if method["ev_ebitda_vs_sector"] < 1 else "above"
        explanation_parts.append(
            f"- EV/EBITDA: Trading {ev_status} sector average ({method['ev_ebitda_vs_sector']:.2f}x)"
        )
    
    adjs = method["adjustments"]
    explanation_parts.extend([
        "",
        "**Adjustment Factors:**",
        f"- P/E Discount/Premium: {adjs['pe_adj']:+.1f}%",
        f"- EV/EBITDA Discount/Premium: {adjs['ev_ebitda_adj']:+.1f}%",
        f"- Growth Premium: {adjs['growth_adj']:+.1f}%",
        f"- Margin Quality: {adjs['margin_adj']:+.1f}%",
        f"- **Net Adjustment: {adjs['total_adj']:+.1f}%**"
    ])
    
    return "\n".join(explanation_parts)
