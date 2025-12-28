"""
Screener service - Filter stocks based on investment criteria.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from services.stock_data import stock_service


@dataclass
class ScreenerFilters:
    """Screener filter criteria."""
    # Valuation
    max_pe: Optional[float] = 25
    max_peg: Optional[float] = 1.5
    max_price_to_book: Optional[float] = None
    
    # Growth
    min_revenue_growth: Optional[float] = 0.10  # 10%
    min_earnings_growth: Optional[float] = None
    
    # Fair Value
    min_upside: Optional[float] = 15  # 15% upside
    
    # Quality
    min_score: Optional[int] = 60
    min_profit_margin: Optional[float] = None
    min_roe: Optional[float] = None
    
    # Dividends
    min_dividend_yield: Optional[float] = None
    
    # Risk
    max_beta: Optional[float] = None
    max_debt_to_equity: Optional[float] = None
    
    # Sectors
    sectors: Optional[List[str]] = None
    exclude_sectors: Optional[List[str]] = None


class ScreenerService:
    """Service for screening stocks based on criteria."""
    
    def __init__(self):
        self.stock_service = stock_service
    
    def screen(
        self,
        filters: ScreenerFilters,
        symbols: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Screen stocks based on filters.
        Returns list of stocks that pass all criteria.
        """
        # Use default universe if no symbols provided
        if symbols is None:
            symbols = self.stock_service.get_universe()
        
        # Fetch data for all symbols
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
            if pe is None or pe > filters.max_pe or pe < 0:
                return False
        
        # PEG filter
        if filters.max_peg is not None:
            peg = stock.get("peg_ratio")
            if peg is None or peg > filters.max_peg or peg < 0:
                return False
        
        # Price-to-Book filter
        if filters.max_price_to_book is not None:
            pb = stock.get("price_to_book")
            if pb is None or pb > filters.max_price_to_book:
                return False
        
        # Revenue growth filter
        if filters.min_revenue_growth is not None:
            growth = stock.get("revenue_growth")
            if growth is None or growth < filters.min_revenue_growth:
                return False
        
        # Earnings growth filter
        if filters.min_earnings_growth is not None:
            growth = stock.get("earnings_growth")
            if growth is None or growth < filters.min_earnings_growth:
                return False
        
        # Upside potential filter
        if filters.min_upside is not None:
            upside = stock.get("upside_potential")
            if upside is None or upside < filters.min_upside:
                return False
        
        # Score filter
        if filters.min_score is not None:
            score = stock.get("score")
            if score is None or score < filters.min_score:
                return False
        
        # Profit margin filter
        if filters.min_profit_margin is not None:
            margin = stock.get("profit_margin")
            if margin is None or margin < filters.min_profit_margin:
                return False
        
        # ROE filter
        if filters.min_roe is not None:
            roe = stock.get("return_on_equity")
            if roe is None or roe < filters.min_roe:
                return False
        
        # Dividend yield filter
        if filters.min_dividend_yield is not None:
            div = stock.get("dividend_yield")
            if div is None or div < filters.min_dividend_yield:
                return False
        
        # Beta filter
        if filters.max_beta is not None:
            beta = stock.get("beta")
            if beta is not None and beta > filters.max_beta:
                return False
        
        # Debt-to-equity filter
        if filters.max_debt_to_equity is not None:
            de = stock.get("debt_to_equity")
            if de is not None and de > filters.max_debt_to_equity:
                return False
        
        # Sector filter
        if filters.sectors is not None:
            sector = stock.get("sector")
            if sector not in filters.sectors:
                return False
        
        # Exclude sectors filter
        if filters.exclude_sectors is not None:
            sector = stock.get("sector")
            if sector in filters.exclude_sectors:
                return False
        
        return True
    
    def get_top_picks(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get top N stocks based on default quality filters."""
        filters = ScreenerFilters(
            max_pe=25,
            max_peg=1.5,
            min_revenue_growth=0.05,
            min_upside=10,
            min_score=55
        )
        results = self.screen(filters)
        return results[:count]
    
    def get_value_picks(self) -> List[Dict[str, Any]]:
        """Get value stocks (low P/E, high upside)."""
        filters = ScreenerFilters(
            max_pe=15,
            min_upside=20,
            min_score=50
        )
        return self.screen(filters)
    
    def get_growth_picks(self) -> List[Dict[str, Any]]:
        """Get growth stocks (high revenue growth)."""
        filters = ScreenerFilters(
            min_revenue_growth=0.20,
            min_earnings_growth=0.15,
            min_score=50
        )
        return self.screen(filters)
    
    def get_dividend_picks(self) -> List[Dict[str, Any]]:
        """Get dividend stocks."""
        filters = ScreenerFilters(
            min_dividend_yield=0.02,
            max_debt_to_equity=1.0,
            min_score=50
        )
        return self.screen(filters)


# Singleton instance
screener_service = ScreenerService()
