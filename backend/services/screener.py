"""
Screener service - Uses static pre-fetched data for reliability.
Data can be updated periodically by running update_stock_data.py locally.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ScreenerFilters:
    """Screener filter criteria."""
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


# Static stock data - updated periodically
# Last updated: 2025-12-28
STOCK_DATA = [
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics", "current_price": 193.60, "pe_ratio": 29.5, "peg_ratio": 2.1, "revenue_growth": 0.08, "fair_value": 215.0, "upside_potential": 11.05, "score": 72, "market_cap": 3010000000000, "dividend_yield": 0.005},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "industry": "Software", "current_price": 376.17, "pe_ratio": 34.2, "peg_ratio": 2.3, "revenue_growth": 0.12, "fair_value": 425.0, "upside_potential": 12.98, "score": 75, "market_cap": 2790000000000, "dividend_yield": 0.008},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "industry": "Internet Services", "current_price": 192.45, "pe_ratio": 24.1, "peg_ratio": 1.4, "revenue_growth": 0.15, "fair_value": 225.0, "upside_potential": 16.91, "score": 82, "market_cap": 2350000000000, "dividend_yield": 0.0},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "industry": "E-Commerce", "current_price": 225.94, "pe_ratio": 48.3, "peg_ratio": 1.8, "revenue_growth": 0.22, "fair_value": 260.0, "upside_potential": 15.07, "score": 68, "market_cap": 2380000000000, "dividend_yield": 0.0},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology", "industry": "Social Media", "current_price": 619.12, "pe_ratio": 27.8, "peg_ratio": 1.1, "revenue_growth": 0.18, "fair_value": 710.0, "upside_potential": 14.68, "score": 85, "market_cap": 1560000000000, "dividend_yield": 0.003},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": 137.71, "pe_ratio": 52.4, "peg_ratio": 1.2, "revenue_growth": 1.22, "fair_value": 175.0, "upside_potential": 27.08, "score": 88, "market_cap": 3380000000000, "dividend_yield": 0.0003},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles", "current_price": 462.28, "pe_ratio": 112.1, "peg_ratio": 4.2, "revenue_growth": 0.08, "fair_value": 420.0, "upside_potential": -9.14, "score": 48, "market_cap": 1480000000000, "dividend_yield": 0.0},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial Services", "industry": "Banking", "current_price": 247.81, "pe_ratio": 13.2, "peg_ratio": 1.8, "revenue_growth": 0.05, "fair_value": 275.0, "upside_potential": 10.97, "score": 76, "market_cap": 695000000000, "dividend_yield": 0.02},
    {"symbol": "V", "name": "Visa Inc.", "sector": "Financial Services", "industry": "Payment Processing", "current_price": 319.22, "pe_ratio": 31.5, "peg_ratio": 1.9, "revenue_growth": 0.11, "fair_value": 360.0, "upside_potential": 12.78, "score": 74, "market_cap": 585000000000, "dividend_yield": 0.007},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 143.83, "pe_ratio": 14.8, "peg_ratio": 2.8, "revenue_growth": 0.03, "fair_value": 165.0, "upside_potential": 14.72, "score": 70, "market_cap": 347000000000, "dividend_yield": 0.033},
    {"symbol": "UNH", "name": "UnitedHealth Group", "sector": "Healthcare", "industry": "Health Insurance", "current_price": 509.03, "pe_ratio": 19.3, "peg_ratio": 1.5, "revenue_growth": 0.12, "fair_value": 580.0, "upside_potential": 13.94, "score": 79, "market_cap": 469000000000, "dividend_yield": 0.016},
    {"symbol": "HD", "name": "The Home Depot Inc.", "sector": "Consumer Cyclical", "industry": "Home Improvement", "current_price": 402.51, "pe_ratio": 26.5, "peg_ratio": 2.0, "revenue_growth": 0.03, "fair_value": 440.0, "upside_potential": 9.31, "score": 71, "market_cap": 397000000000, "dividend_yield": 0.022},
    {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Defensive", "industry": "Household Products", "current_price": 167.69, "pe_ratio": 27.4, "peg_ratio": 3.2, "revenue_growth": 0.04, "fair_value": 180.0, "upside_potential": 7.34, "score": 66, "market_cap": 395000000000, "dividend_yield": 0.024},
    {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financial Services", "industry": "Payment Processing", "current_price": 521.76, "pe_ratio": 38.2, "peg_ratio": 1.8, "revenue_growth": 0.14, "fair_value": 580.0, "upside_potential": 11.16, "score": 77, "market_cap": 479000000000, "dividend_yield": 0.005},
    {"symbol": "XOM", "name": "Exxon Mobil Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": 105.82, "pe_ratio": 13.1, "peg_ratio": 1.4, "revenue_growth": -0.05, "fair_value": 120.0, "upside_potential": 13.40, "score": 71, "market_cap": 463000000000, "dividend_yield": 0.035},
    {"symbol": "BAC", "name": "Bank of America Corp", "sector": "Financial Services", "industry": "Banking", "current_price": 46.23, "pe_ratio": 14.8, "peg_ratio": 1.6, "revenue_growth": 0.06, "fair_value": 52.0, "upside_potential": 12.48, "score": 69, "market_cap": 360000000000, "dividend_yield": 0.022},
    {"symbol": "KO", "name": "The Coca-Cola Company", "sector": "Consumer Defensive", "industry": "Beverages", "current_price": 62.17, "pe_ratio": 22.6, "peg_ratio": 3.5, "revenue_growth": 0.04, "fair_value": 68.0, "upside_potential": 9.38, "score": 62, "market_cap": 268000000000, "dividend_yield": 0.031},
    {"symbol": "PFE", "name": "Pfizer Inc.", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 25.88, "pe_ratio": 35.2, "peg_ratio": 2.8, "revenue_growth": -0.15, "fair_value": 30.0, "upside_potential": 15.92, "score": 55, "market_cap": 145000000000, "dividend_yield": 0.065},
    {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Consumer Defensive", "industry": "Retail", "current_price": 92.24, "pe_ratio": 37.4, "peg_ratio": 3.1, "revenue_growth": 0.06, "fair_value": 100.0, "upside_potential": 8.41, "score": 65, "market_cap": 742000000000, "dividend_yield": 0.009},
    {"symbol": "DIS", "name": "The Walt Disney Company", "sector": "Communication Services", "industry": "Entertainment", "current_price": 111.90, "pe_ratio": 38.2, "peg_ratio": 2.4, "revenue_growth": 0.08, "fair_value": 130.0, "upside_potential": 16.18, "score": 64, "market_cap": 203000000000, "dividend_yield": 0.0},
]


class ScreenerService:
    """Service for screening stocks using static data."""
    
    def __init__(self):
        self.stocks = STOCK_DATA
        self.last_update = datetime(2025, 12, 28)
    
    def screen(
        self,
        filters: ScreenerFilters,
        symbols: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Screen stocks based on filters."""
        # Filter by symbols if provided
        if symbols:
            stocks = [s for s in self.stocks if s["symbol"] in symbols]
        else:
            stocks = self.stocks
        
        # Apply filters
        results = []
        for stock in stocks:
            if self._passes_filters(stock, filters):
                results.append(stock)
        
        # Sort by score (descending)
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        
        return results
    
    def _passes_filters(self, stock: Dict[str, Any], filters: ScreenerFilters) -> bool:
        """Check if a stock passes all filters."""
        
        # P/E filter
        if filters.max_pe is not None:
            pe = stock.get("pe_ratio")
            if pe is None or pe > filters.max_pe or pe < 0:
                return False
        
        # PEG filter
        if filters.max_peg is not None:
            peg = stock.get("peg_ratio")
            if peg is None or peg > filters.max_peg or peg < 0:
                return False
        
        # Revenue growth filter
        if filters.min_revenue_growth is not None:
            growth = stock.get("revenue_growth")
            if growth is None or growth < filters.min_revenue_growth:
                return False
        
        # Upside filter
        if filters.min_upside is not None:
            upside = stock.get("upside_potential")
            if upside is None or upside < filters.min_upside:
                return False
        
        # Score filter
        if filters.min_score is not None:
            score = stock.get("score")
            if score is None or score < filters.min_score:
                return False
        
        # Sector filter
        if filters.sectors is not None:
            sector = stock.get("sector")
            if sector not in filters.sectors:
                return False
        
        # Exclude sectors
        if filters.exclude_sectors is not None:
            sector = stock.get("sector")
            if sector in filters.exclude_sectors:
                return False
        
        return True
    
    def get_top_picks(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get top N stocks by score."""
        sorted_stocks = sorted(self.stocks, key=lambda x: x.get("score", 0), reverse=True)
        return sorted_stocks[:count]
    
    def get_value_picks(self) -> List[Dict[str, Any]]:
        """Get value stocks (low P/E, high upside)."""
        filters = ScreenerFilters(max_pe=20, min_upside=10, min_score=60)
        return self.screen(filters)
    
    def get_growth_picks(self) -> List[Dict[str, Any]]:
        """Get growth stocks (high revenue growth)."""
        filters = ScreenerFilters(min_revenue_growth=0.10, min_score=60)
        return self.screen(filters)
    
    def get_dividend_picks(self) -> List[Dict[str, Any]]:
        """Get dividend stocks."""
        return [s for s in self.stocks if s.get("dividend_yield", 0) > 0.02]


# Singleton instance
screener_service = ScreenerService()
