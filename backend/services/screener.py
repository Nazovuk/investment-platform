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
    # Mega Cap Tech
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics", "current_price": 193.60, "pe_ratio": 29.5, "peg_ratio": 2.1, "revenue_growth": 0.08, "fair_value": 215.0, "upside_potential": 11.05, "score": 72, "market_cap": 3010000000000, "dividend_yield": 0.005},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "industry": "Software", "current_price": 376.17, "pe_ratio": 34.2, "peg_ratio": 2.3, "revenue_growth": 0.12, "fair_value": 425.0, "upside_potential": 12.98, "score": 75, "market_cap": 2790000000000, "dividend_yield": 0.008},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "industry": "Internet Services", "current_price": 192.45, "pe_ratio": 24.1, "peg_ratio": 1.4, "revenue_growth": 0.15, "fair_value": 225.0, "upside_potential": 16.91, "score": 82, "market_cap": 2350000000000, "dividend_yield": 0.0},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "industry": "E-Commerce", "current_price": 225.94, "pe_ratio": 48.3, "peg_ratio": 1.8, "revenue_growth": 0.22, "fair_value": 260.0, "upside_potential": 15.07, "score": 68, "market_cap": 2380000000000, "dividend_yield": 0.0},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology", "industry": "Social Media", "current_price": 619.12, "pe_ratio": 27.8, "peg_ratio": 1.1, "revenue_growth": 0.18, "fair_value": 710.0, "upside_potential": 14.68, "score": 85, "market_cap": 1560000000000, "dividend_yield": 0.003},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": 137.71, "pe_ratio": 52.4, "peg_ratio": 1.2, "revenue_growth": 1.22, "fair_value": 175.0, "upside_potential": 27.08, "score": 88, "market_cap": 3380000000000, "dividend_yield": 0.0003},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles", "current_price": 462.28, "pe_ratio": 112.1, "peg_ratio": 4.2, "revenue_growth": 0.08, "fair_value": 420.0, "upside_potential": -9.14, "score": 48, "market_cap": 1480000000000, "dividend_yield": 0.0},
    # Finance
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial Services", "industry": "Banking", "current_price": 247.81, "pe_ratio": 13.2, "peg_ratio": 1.8, "revenue_growth": 0.05, "fair_value": 275.0, "upside_potential": 10.97, "score": 76, "market_cap": 695000000000, "dividend_yield": 0.02},
    {"symbol": "V", "name": "Visa Inc.", "sector": "Financial Services", "industry": "Payment Processing", "current_price": 319.22, "pe_ratio": 31.5, "peg_ratio": 1.9, "revenue_growth": 0.11, "fair_value": 360.0, "upside_potential": 12.78, "score": 74, "market_cap": 585000000000, "dividend_yield": 0.007},
    {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financial Services", "industry": "Payment Processing", "current_price": 521.76, "pe_ratio": 38.2, "peg_ratio": 1.8, "revenue_growth": 0.14, "fair_value": 580.0, "upside_potential": 11.16, "score": 77, "market_cap": 479000000000, "dividend_yield": 0.005},
    {"symbol": "BAC", "name": "Bank of America Corp", "sector": "Financial Services", "industry": "Banking", "current_price": 46.23, "pe_ratio": 14.8, "peg_ratio": 1.6, "revenue_growth": 0.06, "fair_value": 52.0, "upside_potential": 12.48, "score": 69, "market_cap": 360000000000, "dividend_yield": 0.022},
    {"symbol": "WFC", "name": "Wells Fargo & Co.", "sector": "Financial Services", "industry": "Banking", "current_price": 71.25, "pe_ratio": 13.8, "peg_ratio": 1.5, "revenue_growth": 0.04, "fair_value": 82.0, "upside_potential": 15.09, "score": 72, "market_cap": 245000000000, "dividend_yield": 0.021},
    {"symbol": "GS", "name": "Goldman Sachs Group", "sector": "Financial Services", "industry": "Investment Banking", "current_price": 592.45, "pe_ratio": 17.2, "peg_ratio": 1.3, "revenue_growth": 0.12, "fair_value": 650.0, "upside_potential": 9.71, "score": 74, "market_cap": 192000000000, "dividend_yield": 0.018},
    {"symbol": "MS", "name": "Morgan Stanley", "sector": "Financial Services", "industry": "Investment Banking", "current_price": 125.80, "pe_ratio": 18.5, "peg_ratio": 1.4, "revenue_growth": 0.10, "fair_value": 145.0, "upside_potential": 15.26, "score": 73, "market_cap": 204000000000, "dividend_yield": 0.028},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway B", "sector": "Financial Services", "industry": "Insurance", "current_price": 465.12, "pe_ratio": 10.2, "peg_ratio": 1.8, "revenue_growth": 0.08, "fair_value": 520.0, "upside_potential": 11.80, "score": 78, "market_cap": 1020000000000, "dividend_yield": 0.0},
    # Healthcare
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 143.83, "pe_ratio": 14.8, "peg_ratio": 2.8, "revenue_growth": 0.03, "fair_value": 165.0, "upside_potential": 14.72, "score": 70, "market_cap": 347000000000, "dividend_yield": 0.033},
    {"symbol": "UNH", "name": "UnitedHealth Group", "sector": "Healthcare", "industry": "Health Insurance", "current_price": 509.03, "pe_ratio": 19.3, "peg_ratio": 1.5, "revenue_growth": 0.12, "fair_value": 580.0, "upside_potential": 13.94, "score": 79, "market_cap": 469000000000, "dividend_yield": 0.016},
    {"symbol": "PFE", "name": "Pfizer Inc.", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 25.88, "pe_ratio": 35.2, "peg_ratio": 2.8, "revenue_growth": -0.15, "fair_value": 30.0, "upside_potential": 15.92, "score": 55, "market_cap": 145000000000, "dividend_yield": 0.065},
    {"symbol": "LLY", "name": "Eli Lilly and Company", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 782.50, "pe_ratio": 78.5, "peg_ratio": 1.6, "revenue_growth": 0.28, "fair_value": 900.0, "upside_potential": 15.02, "score": 76, "market_cap": 744000000000, "dividend_yield": 0.007},
    {"symbol": "ABBV", "name": "AbbVie Inc.", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 178.92, "pe_ratio": 65.2, "peg_ratio": 2.1, "revenue_growth": -0.06, "fair_value": 195.0, "upside_potential": 8.99, "score": 63, "market_cap": 316000000000, "dividend_yield": 0.035},
    {"symbol": "MRK", "name": "Merck & Co.", "sector": "Healthcare", "industry": "Pharmaceuticals", "current_price": 99.62, "pe_ratio": 14.2, "peg_ratio": 1.2, "revenue_growth": 0.08, "fair_value": 115.0, "upside_potential": 15.43, "score": 75, "market_cap": 252000000000, "dividend_yield": 0.031},
    {"symbol": "TMO", "name": "Thermo Fisher Scientific", "sector": "Healthcare", "industry": "Diagnostics", "current_price": 532.80, "pe_ratio": 28.5, "peg_ratio": 1.9, "revenue_growth": 0.05, "fair_value": 600.0, "upside_potential": 12.62, "score": 72, "market_cap": 204000000000, "dividend_yield": 0.003},
    # Consumer
    {"symbol": "HD", "name": "The Home Depot Inc.", "sector": "Consumer Cyclical", "industry": "Home Improvement", "current_price": 402.51, "pe_ratio": 26.5, "peg_ratio": 2.0, "revenue_growth": 0.03, "fair_value": 440.0, "upside_potential": 9.31, "score": 71, "market_cap": 397000000000, "dividend_yield": 0.022},
    {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Defensive", "industry": "Household Products", "current_price": 167.69, "pe_ratio": 27.4, "peg_ratio": 3.2, "revenue_growth": 0.04, "fair_value": 180.0, "upside_potential": 7.34, "score": 66, "market_cap": 395000000000, "dividend_yield": 0.024},
    {"symbol": "KO", "name": "The Coca-Cola Company", "sector": "Consumer Defensive", "industry": "Beverages", "current_price": 62.17, "pe_ratio": 22.6, "peg_ratio": 3.5, "revenue_growth": 0.04, "fair_value": 68.0, "upside_potential": 9.38, "score": 62, "market_cap": 268000000000, "dividend_yield": 0.031},
    {"symbol": "PEP", "name": "PepsiCo Inc.", "sector": "Consumer Defensive", "industry": "Beverages", "current_price": 152.80, "pe_ratio": 21.5, "peg_ratio": 2.8, "revenue_growth": 0.05, "fair_value": 170.0, "upside_potential": 11.26, "score": 68, "market_cap": 210000000000, "dividend_yield": 0.034},
    {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Consumer Defensive", "industry": "Retail", "current_price": 92.24, "pe_ratio": 37.4, "peg_ratio": 3.1, "revenue_growth": 0.06, "fair_value": 100.0, "upside_potential": 8.41, "score": 65, "market_cap": 742000000000, "dividend_yield": 0.009},
    {"symbol": "COST", "name": "Costco Wholesale Corp", "sector": "Consumer Defensive", "industry": "Retail", "current_price": 956.72, "pe_ratio": 55.2, "peg_ratio": 4.1, "revenue_growth": 0.09, "fair_value": 1020.0, "upside_potential": 6.61, "score": 61, "market_cap": 425000000000, "dividend_yield": 0.005},
    {"symbol": "MCD", "name": "McDonald's Corporation", "sector": "Consumer Cyclical", "industry": "Restaurants", "current_price": 291.45, "pe_ratio": 24.8, "peg_ratio": 2.9, "revenue_growth": 0.07, "fair_value": 320.0, "upside_potential": 9.80, "score": 67, "market_cap": 209000000000, "dividend_yield": 0.024},
    {"symbol": "NKE", "name": "Nike Inc.", "sector": "Consumer Cyclical", "industry": "Apparel", "current_price": 76.25, "pe_ratio": 22.8, "peg_ratio": 1.9, "revenue_growth": -0.02, "fair_value": 88.0, "upside_potential": 15.41, "score": 64, "market_cap": 113000000000, "dividend_yield": 0.019},
    {"symbol": "SBUX", "name": "Starbucks Corporation", "sector": "Consumer Cyclical", "industry": "Restaurants", "current_price": 91.82, "pe_ratio": 26.5, "peg_ratio": 2.2, "revenue_growth": 0.05, "fair_value": 105.0, "upside_potential": 14.36, "score": 66, "market_cap": 104000000000, "dividend_yield": 0.025},
    # Energy
    {"symbol": "XOM", "name": "Exxon Mobil Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": 105.82, "pe_ratio": 13.1, "peg_ratio": 1.4, "revenue_growth": -0.05, "fair_value": 120.0, "upside_potential": 13.40, "score": 71, "market_cap": 463000000000, "dividend_yield": 0.035},
    {"symbol": "CVX", "name": "Chevron Corporation", "sector": "Energy", "industry": "Oil & Gas", "current_price": 144.50, "pe_ratio": 12.8, "peg_ratio": 1.5, "revenue_growth": -0.08, "fair_value": 165.0, "upside_potential": 14.19, "score": 69, "market_cap": 265000000000, "dividend_yield": 0.044},
    {"symbol": "COP", "name": "ConocoPhillips", "sector": "Energy", "industry": "Oil & Gas", "current_price": 103.25, "pe_ratio": 11.5, "peg_ratio": 1.2, "revenue_growth": -0.10, "fair_value": 120.0, "upside_potential": 16.22, "score": 70, "market_cap": 120000000000, "dividend_yield": 0.019},
    # Industrial
    {"symbol": "CAT", "name": "Caterpillar Inc.", "sector": "Industrials", "industry": "Machinery", "current_price": 372.45, "pe_ratio": 18.2, "peg_ratio": 1.6, "revenue_growth": 0.08, "fair_value": 420.0, "upside_potential": 12.76, "score": 74, "market_cap": 179000000000, "dividend_yield": 0.014},
    {"symbol": "BA", "name": "Boeing Company", "sector": "Industrials", "industry": "Aerospace", "current_price": 178.92, "pe_ratio": -15.2, "peg_ratio": 0.0, "revenue_growth": 0.15, "fair_value": 220.0, "upside_potential": 22.96, "score": 58, "market_cap": 109000000000, "dividend_yield": 0.0},
    {"symbol": "GE", "name": "GE Aerospace", "sector": "Industrials", "industry": "Aerospace", "current_price": 175.80, "pe_ratio": 35.2, "peg_ratio": 1.5, "revenue_growth": 0.18, "fair_value": 200.0, "upside_potential": 13.76, "score": 73, "market_cap": 191000000000, "dividend_yield": 0.006},
    {"symbol": "HON", "name": "Honeywell International", "sector": "Industrials", "industry": "Conglomerates", "current_price": 223.45, "pe_ratio": 21.5, "peg_ratio": 2.1, "revenue_growth": 0.04, "fair_value": 250.0, "upside_potential": 11.88, "score": 70, "market_cap": 146000000000, "dividend_yield": 0.020},
    {"symbol": "RTX", "name": "RTX Corporation", "sector": "Industrials", "industry": "Aerospace & Defense", "current_price": 119.82, "pe_ratio": 35.8, "peg_ratio": 1.8, "revenue_growth": 0.08, "fair_value": 138.0, "upside_potential": 15.17, "score": 68, "market_cap": 158000000000, "dividend_yield": 0.021},
    {"symbol": "LMT", "name": "Lockheed Martin Corp", "sector": "Industrials", "industry": "Aerospace & Defense", "current_price": 512.30, "pe_ratio": 21.8, "peg_ratio": 2.5, "revenue_growth": 0.05, "fair_value": 560.0, "upside_potential": 9.31, "score": 71, "market_cap": 124000000000, "dividend_yield": 0.024},
    {"symbol": "UPS", "name": "United Parcel Service", "sector": "Industrials", "industry": "Logistics", "current_price": 127.45, "pe_ratio": 18.5, "peg_ratio": 2.0, "revenue_growth": -0.02, "fair_value": 145.0, "upside_potential": 13.77, "score": 66, "market_cap": 109000000000, "dividend_yield": 0.051},
    # Communication Services
    {"symbol": "DIS", "name": "The Walt Disney Company", "sector": "Communication Services", "industry": "Entertainment", "current_price": 111.90, "pe_ratio": 38.2, "peg_ratio": 2.4, "revenue_growth": 0.08, "fair_value": 130.0, "upside_potential": 16.18, "score": 64, "market_cap": 203000000000, "dividend_yield": 0.0},
    {"symbol": "NFLX", "name": "Netflix Inc.", "sector": "Communication Services", "industry": "Streaming", "current_price": 915.25, "pe_ratio": 48.5, "peg_ratio": 1.4, "revenue_growth": 0.15, "fair_value": 1050.0, "upside_potential": 14.72, "score": 75, "market_cap": 393000000000, "dividend_yield": 0.0},
    {"symbol": "CMCSA", "name": "Comcast Corporation", "sector": "Communication Services", "industry": "Telecom", "current_price": 37.82, "pe_ratio": 10.5, "peg_ratio": 1.2, "revenue_growth": 0.02, "fair_value": 45.0, "upside_potential": 18.98, "score": 71, "market_cap": 147000000000, "dividend_yield": 0.033},
    {"symbol": "T", "name": "AT&T Inc.", "sector": "Communication Services", "industry": "Telecom", "current_price": 22.85, "pe_ratio": 15.2, "peg_ratio": 1.8, "revenue_growth": 0.01, "fair_value": 26.0, "upside_potential": 13.79, "score": 62, "market_cap": 163000000000, "dividend_yield": 0.049},
    {"symbol": "VZ", "name": "Verizon Communications", "sector": "Communication Services", "industry": "Telecom", "current_price": 40.12, "pe_ratio": 9.8, "peg_ratio": 1.5, "revenue_growth": 0.01, "fair_value": 46.0, "upside_potential": 14.66, "score": 67, "market_cap": 169000000000, "dividend_yield": 0.066},
    # Tech (More)
    {"symbol": "CRM", "name": "Salesforce Inc.", "sector": "Technology", "industry": "Software", "current_price": 340.25, "pe_ratio": 48.5, "peg_ratio": 1.8, "revenue_growth": 0.11, "fair_value": 390.0, "upside_potential": 14.62, "score": 72, "market_cap": 328000000000, "dividend_yield": 0.004},
    {"symbol": "ORCL", "name": "Oracle Corporation", "sector": "Technology", "industry": "Software", "current_price": 175.80, "pe_ratio": 38.2, "peg_ratio": 1.5, "revenue_growth": 0.09, "fair_value": 205.0, "upside_potential": 16.61, "score": 74, "market_cap": 490000000000, "dividend_yield": 0.009},
    {"symbol": "ADBE", "name": "Adobe Inc.", "sector": "Technology", "industry": "Software", "current_price": 445.62, "pe_ratio": 42.5, "peg_ratio": 1.8, "revenue_growth": 0.10, "fair_value": 520.0, "upside_potential": 16.69, "score": 73, "market_cap": 197000000000, "dividend_yield": 0.0},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "sector": "Technology", "industry": "Semiconductors", "current_price": 125.45, "pe_ratio": 102.5, "peg_ratio": 1.3, "revenue_growth": 0.45, "fair_value": 155.0, "upside_potential": 23.55, "score": 78, "market_cap": 203000000000, "dividend_yield": 0.0},
    {"symbol": "INTC", "name": "Intel Corporation", "sector": "Technology", "industry": "Semiconductors", "current_price": 20.12, "pe_ratio": -8.5, "peg_ratio": 0.0, "revenue_growth": -0.15, "fair_value": 25.0, "upside_potential": 24.25, "score": 45, "market_cap": 86000000000, "dividend_yield": 0.025},
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
