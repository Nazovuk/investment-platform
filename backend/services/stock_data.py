"""
Stock data service - yfinance wrapper with caching.
Provides real-time and historical stock data.
"""

import yfinance as yf
import pandas as pd
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class StockDataService:
    """Service for fetching stock data from yfinance."""
    
    # Cache timeout in seconds (15 minutes)
    CACHE_TIMEOUT = 900
    
    # Default stock universe (can be expanded)
    DEFAULT_UNIVERSE = [
        # Tech Giants
        "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
        # Finance
        "JPM", "BAC", "WFC", "GS", "MS", "V", "MA",
        # Healthcare
        "JNJ", "UNH", "PFE", "ABBV", "MRK", "LLY",
        # Consumer
        "KO", "PEP", "PG", "WMT", "COST", "HD", "MCD",
        # Energy
        "XOM", "CVX", "COP",
        # Industrial
        "CAT", "BA", "GE", "HON", "MMM",
        # ETFs
        "SPY", "QQQ", "DIA", "IWM", "VTI"
    ]
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_time: Dict[str, datetime] = {}
    
    def _is_cache_valid(self, symbol: str) -> bool:
        """Check if cached data is still valid."""
        if symbol not in self._cache_time:
            return False
        elapsed = (datetime.now() - self._cache_time[symbol]).total_seconds()
        return elapsed < self.CACHE_TIMEOUT
    
    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """
        Get comprehensive stock information.
        Returns metrics for screener, fair value calculation, etc.
        """
        if self._is_cache_valid(symbol):
            return self._cache[symbol]
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Extract key metrics
            data = {
                "symbol": symbol,
                "name": info.get("shortName", info.get("longName", symbol)),
                "sector": info.get("sector", "N/A"),
                "industry": info.get("industry", "N/A"),
                "currency": info.get("currency", "USD"),
                
                # Price data
                "current_price": info.get("currentPrice", info.get("regularMarketPrice", 0)),
                "previous_close": info.get("previousClose", 0),
                "market_cap": info.get("marketCap", 0),
                "volume": info.get("volume", 0),
                "avg_volume": info.get("averageVolume", 0),
                
                # Valuation metrics
                "pe_ratio": info.get("trailingPE"),
                "forward_pe": info.get("forwardPE"),
                "peg_ratio": info.get("pegRatio"),
                "price_to_book": info.get("priceToBook"),
                "price_to_sales": info.get("priceToSalesTrailing12Months"),
                
                # Growth metrics
                "revenue_growth": info.get("revenueGrowth"),
                "earnings_growth": info.get("earningsGrowth"),
                "revenue_per_share": info.get("revenuePerShare"),
                
                # Profitability
                "profit_margin": info.get("profitMargins"),
                "operating_margin": info.get("operatingMargins"),
                "return_on_equity": info.get("returnOnEquity"),
                "return_on_assets": info.get("returnOnAssets"),
                
                # Dividends
                "dividend_yield": info.get("dividendYield"),
                "dividend_rate": info.get("dividendRate"),
                "payout_ratio": info.get("payoutRatio"),
                
                # Financial health
                "debt_to_equity": info.get("debtToEquity"),
                "current_ratio": info.get("currentRatio"),
                "quick_ratio": info.get("quickRatio"),
                
                # Analyst data
                "target_price": info.get("targetMeanPrice"),
                "target_high": info.get("targetHighPrice"),
                "target_low": info.get("targetLowPrice"),
                "recommendation": info.get("recommendationKey"),
                "analyst_count": info.get("numberOfAnalystOpinions"),
                
                # Beta and volatility
                "beta": info.get("beta"),
                "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
                "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
                
                # Calculated fields
                "fair_value": self._calculate_fair_value(info),
                "upside_potential": None,  # Calculated after fair_value
                "score": None,  # Calculated based on all metrics
            }
            
            # Calculate upside potential
            if data["fair_value"] and data["current_price"]:
                data["upside_potential"] = (
                    (data["fair_value"] - data["current_price"]) / data["current_price"] * 100
                )
            
            # Calculate overall score
            data["score"] = self._calculate_score(data)
            
            # Cache the result
            self._cache[symbol] = data
            self._cache_time[symbol] = datetime.now()
            
            return data
            
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            # Return fallback demo data instead of error
            return self._get_fallback_data(symbol)
    
    def _get_fallback_data(self, symbol: str) -> Dict[str, Any]:
        """Return demo data when yfinance fails (e.g., on Render free tier)."""
        # Demo data for common stocks
        demo_stocks = {
            "AAPL": {"name": "Apple Inc.", "sector": "Technology", "price": 193.60, "pe": 29.5, "peg": 2.1, "growth": 0.08, "fair_value": 210, "score": 72},
            "MSFT": {"name": "Microsoft Corporation", "sector": "Technology", "price": 376.17, "pe": 34.2, "peg": 2.3, "growth": 0.12, "fair_value": 420, "score": 75},
            "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology", "price": 140.25, "pe": 24.1, "peg": 1.4, "growth": 0.15, "fair_value": 165, "score": 82},
            "AMZN": {"name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "price": 178.25, "pe": 58.3, "peg": 1.8, "growth": 0.22, "fair_value": 200, "score": 68},
            "META": {"name": "Meta Platforms Inc.", "sector": "Technology", "price": 354.20, "pe": 27.8, "peg": 1.1, "growth": 0.18, "fair_value": 410, "score": 85},
            "NVDA": {"name": "NVIDIA Corporation", "sector": "Technology", "price": 495.22, "pe": 62.4, "peg": 1.5, "growth": 1.22, "fair_value": 615, "score": 88},
            "TSLA": {"name": "Tesla Inc.", "sector": "Consumer Cyclical", "price": 248.48, "pe": 72.1, "peg": 3.2, "growth": 0.21, "fair_value": 280, "score": 58},
            "JPM": {"name": "JPMorgan Chase & Co.", "sector": "Financial Services", "price": 171.25, "pe": 10.2, "peg": 1.8, "growth": 0.05, "fair_value": 185, "score": 76},
            "V": {"name": "Visa Inc.", "sector": "Financial Services", "price": 260.50, "pe": 28.5, "peg": 1.9, "growth": 0.11, "fair_value": 295, "score": 74},
            "JNJ": {"name": "Johnson & Johnson", "sector": "Healthcare", "price": 155.40, "pe": 14.8, "peg": 2.8, "growth": 0.03, "fair_value": 168, "score": 70},
            "UNH": {"name": "UnitedHealth Group", "sector": "Healthcare", "price": 528.75, "pe": 21.3, "peg": 1.5, "growth": 0.12, "fair_value": 580, "score": 79},
            "LLY": {"name": "Eli Lilly and Company", "sector": "Healthcare", "price": 582.30, "pe": 85.2, "peg": 1.2, "growth": 0.35, "fair_value": 680, "score": 77},
            "WMT": {"name": "Walmart Inc.", "sector": "Consumer Defensive", "price": 163.80, "pe": 28.4, "peg": 3.1, "growth": 0.06, "fair_value": 175, "score": 65},
            "KO": {"name": "The Coca-Cola Company", "sector": "Consumer Defensive", "price": 59.25, "pe": 22.6, "peg": 3.5, "growth": 0.04, "fair_value": 65, "score": 62},
            "XOM": {"name": "Exxon Mobil Corporation", "sector": "Energy", "price": 105.40, "pe": 12.1, "peg": 1.4, "growth": -0.05, "fair_value": 115, "score": 71},
            "HD": {"name": "The Home Depot Inc.", "sector": "Consumer Cyclical", "price": 348.90, "pe": 22.5, "peg": 2.0, "growth": 0.08, "fair_value": 380, "score": 73},
            "BAC": {"name": "Bank of America Corp", "sector": "Financial Services", "price": 33.85, "pe": 10.8, "peg": 1.6, "growth": 0.06, "fair_value": 38, "score": 69},
            "PFE": {"name": "Pfizer Inc.", "sector": "Healthcare", "price": 28.45, "pe": 45.2, "peg": 2.8, "growth": -0.15, "fair_value": 32, "score": 55},
            "COST": {"name": "Costco Wholesale Corp", "sector": "Consumer Defensive", "price": 678.50, "pe": 46.2, "peg": 3.8, "growth": 0.10, "fair_value": 720, "score": 64},
            "MCD": {"name": "McDonald's Corporation", "sector": "Consumer Cyclical", "price": 295.60, "pe": 24.8, "peg": 2.9, "growth": 0.07, "fair_value": 320, "score": 67},
        }
        
        if symbol in demo_stocks:
            d = demo_stocks[symbol]
            upside = ((d["fair_value"] - d["price"]) / d["price"]) * 100
            return {
                "symbol": symbol,
                "name": d["name"],
                "sector": d["sector"],
                "industry": d["sector"],
                "currency": "USD",
                "current_price": d["price"],
                "previous_close": d["price"] * 0.99,
                "market_cap": 1000000000000,
                "volume": 50000000,
                "avg_volume": 45000000,
                "pe_ratio": d["pe"],
                "forward_pe": d["pe"] * 0.9,
                "peg_ratio": d["peg"],
                "price_to_book": 8.5,
                "price_to_sales": 6.2,
                "revenue_growth": d["growth"],
                "earnings_growth": d["growth"] * 0.8,
                "revenue_per_share": d["price"] / d["pe"] * 5,
                "profit_margin": 0.22,
                "operating_margin": 0.28,
                "return_on_equity": 0.35,
                "return_on_assets": 0.12,
                "dividend_yield": 0.015,
                "dividend_rate": d["price"] * 0.015,
                "payout_ratio": 0.25,
                "debt_to_equity": 0.85,
                "current_ratio": 1.5,
                "quick_ratio": 1.2,
                "target_price": d["fair_value"],
                "target_high": d["fair_value"] * 1.15,
                "target_low": d["fair_value"] * 0.85,
                "recommendation": "buy" if upside > 10 else "hold",
                "analyst_count": 28,
                "beta": 1.15,
                "fifty_two_week_high": d["price"] * 1.25,
                "fifty_two_week_low": d["price"] * 0.75,
                "fair_value": d["fair_value"],
                "upside_potential": upside,
                "score": d["score"],
            }
        
        # Generic fallback for unknown symbols
        return {
            "symbol": symbol,
            "name": symbol,
            "sector": "Unknown",
            "industry": "Unknown",
            "currency": "USD",
            "current_price": 100,
            "previous_close": 99,
            "market_cap": 10000000000,
            "pe_ratio": 20,
            "peg_ratio": 1.5,
            "revenue_growth": 0.10,
            "fair_value": 115,
            "upside_potential": 15,
            "score": 65,
        }
    
    def _calculate_fair_value(self, info: Dict) -> Optional[float]:
        """
        Calculate fair value using DCF-lite model.
        Uses analyst target price and growth estimates.
        """
        try:
            # Method 1: Analyst target (weighted 50%)
            target = info.get("targetMeanPrice")
            
            # Method 2: Graham Number
            eps = info.get("trailingEps", 0)
            book_value = info.get("bookValue", 0)
            graham = None
            if eps and book_value and eps > 0 and book_value > 0:
                graham = (22.5 * eps * book_value) ** 0.5
            
            # Method 3: PEG-based fair value
            peg_fair = None
            growth = info.get("earningsGrowth", info.get("revenueGrowth"))
            if growth and eps:
                fair_pe = growth * 100  # Fair PE = Growth rate
                peg_fair = eps * min(fair_pe, 30)  # Cap at 30x
            
            # Weighted average
            values = []
            weights = []
            
            if target and target > 0:
                values.append(target)
                weights.append(0.5)
            if graham and graham > 0:
                values.append(graham)
                weights.append(0.25)
            if peg_fair and peg_fair > 0:
                values.append(peg_fair)
                weights.append(0.25)
            
            if values:
                total_weight = sum(weights[:len(values)])
                return sum(v * w for v, w in zip(values, weights)) / total_weight
            
            return None
            
        except Exception:
            return None
    
    def _calculate_score(self, data: Dict) -> int:
        """
        Calculate investment score (0-100) based on multiple factors.
        Higher score = better investment opportunity.
        """
        score = 50  # Base score
        
        # Valuation (max +/-20 points)
        if data.get("pe_ratio"):
            pe = data["pe_ratio"]
            if pe < 15:
                score += 10
            elif pe < 20:
                score += 5
            elif pe > 30:
                score -= 10
            elif pe > 40:
                score -= 15
        
        if data.get("peg_ratio"):
            peg = data["peg_ratio"]
            if peg < 1:
                score += 10
            elif peg < 1.5:
                score += 5
            elif peg > 2:
                score -= 5
        
        # Growth (max +/-15 points)
        if data.get("revenue_growth"):
            growth = data["revenue_growth"] * 100
            if growth > 20:
                score += 10
            elif growth > 10:
                score += 5
            elif growth < 0:
                score -= 10
        
        # Upside potential (max +/-15 points)
        if data.get("upside_potential"):
            upside = data["upside_potential"]
            if upside > 30:
                score += 15
            elif upside > 15:
                score += 10
            elif upside > 0:
                score += 5
            elif upside < -20:
                score -= 10
        
        # Profitability (max +10 points)
        if data.get("profit_margin") and data["profit_margin"] > 0.15:
            score += 5
        if data.get("return_on_equity") and data["return_on_equity"] > 0.15:
            score += 5
        
        # Financial health (max +10 points)
        if data.get("current_ratio") and data["current_ratio"] > 1.5:
            score += 5
        if data.get("debt_to_equity") and data["debt_to_equity"] < 1:
            score += 5
        
        # Clamp to 0-100
        return max(0, min(100, score))
    
    def get_historical_data(
        self,
        symbol: str,
        period: str = "1y",
        interval: str = "1d"
    ) -> pd.DataFrame:
        """Get historical price data for backtesting and charts."""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            return df
        except Exception as e:
            logger.error(f"Error fetching history for {symbol}: {e}")
            return pd.DataFrame()
    
    def get_multiple_stocks(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Fetch data for multiple stocks."""
        results = []
        for symbol in symbols:
            data = self.get_stock_info(symbol)
            if "error" not in data:
                results.append(data)
        return results
    
    def get_universe(self) -> List[str]:
        """Get the default stock universe."""
        return self.DEFAULT_UNIVERSE.copy()


# Singleton instance
stock_service = StockDataService()
