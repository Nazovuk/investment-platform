"""
Screener service - Filters stocks using live data from stock_data service.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from services.stock_data import stock_service


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


class ScreenerService:
    """Service for screening stocks using live data."""
    
    def __init__(self):
        self.stock_service = stock_service
    
    def screen(
        self,
        filters: ScreenerFilters,
        symbols: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Screen stocks based on filters using live data."""
        # Get symbols to screen
        if symbols is None:
            symbols = self.stock_service.get_universe()
        
        # Fetch live data for all symbols
        all_stocks = self.stock_service.get_multiple_stocks(symbols)
        
        # Apply filters
        results = []
        for stock in all_stocks:
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
            if pe is not None and (pe > filters.max_pe or pe < 0):
                return False
        
        # PEG filter
        if filters.max_peg is not None:
            peg = stock.get("peg_ratio")
            if peg is not None and (peg > filters.max_peg or peg < 0):
                return False
        
        # Revenue growth filter
        if filters.min_revenue_growth is not None:
            growth = stock.get("revenue_growth")
            if growth is not None and growth < filters.min_revenue_growth:
                return False
        
        # Upside filter
        if filters.min_upside is not None:
            upside = stock.get("upside_potential")
            if upside is not None and upside < filters.min_upside:
                return False
        
        # Score filter
        if filters.min_score is not None:
            score = stock.get("score")
            if score is not None and score < filters.min_score:
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
        all_stocks = self.stock_service.get_multiple_stocks(
            self.stock_service.get_universe()
        )
        sorted_stocks = sorted(all_stocks, key=lambda x: x.get("score", 0), reverse=True)
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
        all_stocks = self.stock_service.get_multiple_stocks(
            self.stock_service.get_universe()
        )
        return [s for s in all_stocks if s.get("dividend_yield", 0) > 0.02]


# Singleton instance
screener_service = ScreenerService()
