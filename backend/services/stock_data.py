"""
Stock data service - yfinance wrapper with aggressive caching and async fetching.
Optimized for Render free tier - data is pre-fetched at startup.
"""

import yfinance as yf
import pandas as pd
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
import threading
import time

logger = logging.getLogger(__name__)


class StockDataService:
    """Service for fetching stock data from yfinance with aggressive caching."""
    
    # Cache timeout in seconds (1 hour for production stability)
    CACHE_TIMEOUT = 3600
    
    # Default stock universe - reduced for faster loading
    DEFAULT_UNIVERSE = [
        # Top 20 most traded stocks
        "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
        "JPM", "V", "JNJ", "UNH", "HD", "PG", "MA",
        "XOM", "BAC", "KO", "PFE", "WMT", "DIS"
    ]
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_time: Dict[str, datetime] = {}
        self._is_loading = False
        self._load_lock = threading.Lock()
        
        # Pre-load data in background
        self._preload_data()
    
    def _preload_data(self):
        """Pre-load all stock data in background thread."""
        def load():
            with self._load_lock:
                if self._is_loading:
                    return
                self._is_loading = True
            
            logger.info("🚀 Pre-loading stock data...")
            try:
                self._fetch_all_stocks_concurrent()
                logger.info(f"✅ Pre-loaded {len(self._cache)} stocks")
            except Exception as e:
                logger.error(f"Error pre-loading: {e}")
                # Use fallback data if yfinance fails
                self._load_fallback_data()
            finally:
                self._is_loading = False
        
        # Start background thread
        thread = threading.Thread(target=load, daemon=True)
        thread.start()
    
    def _fetch_all_stocks_concurrent(self):
        """Fetch all stocks concurrently using ThreadPoolExecutor."""
        symbols = self.DEFAULT_UNIVERSE
        
        # Use yfinance batch download for efficiency
        try:
            tickers = yf.Tickers(" ".join(symbols))
            
            for symbol in symbols:
                try:
                    ticker = tickers.tickers[symbol]
                    info = ticker.info
                    
                    if info and len(info) > 5:  # Valid data
                        data = self._process_ticker_info(symbol, info)
                        self._cache[symbol] = data
                        self._cache_time[symbol] = datetime.now()
                except Exception as e:
                    logger.warning(f"Failed to fetch {symbol}: {e}")
                    # Use fallback for this symbol
                    fallback = self._get_fallback_data(symbol)
                    if fallback:
                        self._cache[symbol] = fallback
                        self._cache_time[symbol] = datetime.now()
        except Exception as e:
            logger.error(f"Batch fetch failed: {e}")
            self._load_fallback_data()
    
    def _process_ticker_info(self, symbol: str, info: Dict) -> Dict[str, Any]:
        """Process raw yfinance info into our format."""
        current_price = info.get("currentPrice", info.get("regularMarketPrice", 0))
        
        data = {
            "symbol": symbol,
            "name": info.get("shortName", info.get("longName", symbol)),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "currency": info.get("currency", "USD"),
            "current_price": current_price,
            "previous_close": info.get("previousClose", 0),
            "market_cap": info.get("marketCap", 0),
            "volume": info.get("volume", 0),
            "avg_volume": info.get("averageVolume", 0),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "price_to_sales": info.get("priceToSalesTrailing12Months"),
            "revenue_growth": info.get("revenueGrowth"),
            "earnings_growth": info.get("earningsGrowth"),
            "revenue_per_share": info.get("revenuePerShare"),
            "profit_margin": info.get("profitMargins"),
            "operating_margin": info.get("operatingMargins"),
            "return_on_equity": info.get("returnOnEquity"),
            "return_on_assets": info.get("returnOnAssets"),
            "dividend_yield": info.get("dividendYield"),
            "dividend_rate": info.get("dividendRate"),
            "payout_ratio": info.get("payoutRatio"),
            "debt_to_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "quick_ratio": info.get("quickRatio"),
            "target_price": info.get("targetMeanPrice"),
            "target_high": info.get("targetHighPrice"),
            "target_low": info.get("targetLowPrice"),
            "recommendation": info.get("recommendationKey"),
            "analyst_count": info.get("numberOfAnalystOpinions"),
            "beta": info.get("beta"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        }
        
        # Calculate fair value
        data["fair_value"] = self._calculate_fair_value(info)
        
        # Calculate upside
        if data["fair_value"] and current_price:
            data["upside_potential"] = ((data["fair_value"] - current_price) / current_price) * 100
        else:
            data["upside_potential"] = None
        
        # Calculate score
        data["score"] = self._calculate_score(data)
        
        return data
    
    def _load_fallback_data(self):
        """Load all fallback demo data."""
        logger.info("Loading fallback demo data...")
        for symbol in self.DEFAULT_UNIVERSE:
            fallback = self._get_fallback_data(symbol)
            if fallback:
                self._cache[symbol] = fallback
                self._cache_time[symbol] = datetime.now()
        logger.info(f"Loaded {len(self._cache)} stocks from fallback")
    
    def _is_cache_valid(self, symbol: str) -> bool:
        """Check if cached data is still valid."""
        if symbol not in self._cache_time:
            return False
        elapsed = (datetime.now() - self._cache_time[symbol]).total_seconds()
        return elapsed < self.CACHE_TIMEOUT
    
    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """Get stock information - from cache if available."""
        # Return cached data if valid
        if symbol in self._cache and self._is_cache_valid(symbol):
            return self._cache[symbol]
        
        # Try to fetch fresh data
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if info and len(info) > 5:
                data = self._process_ticker_info(symbol, info)
                self._cache[symbol] = data
                self._cache_time[symbol] = datetime.now()
                return data
        except Exception as e:
            logger.warning(f"Error fetching {symbol}: {e}")
        
        # Return cached data even if stale
        if symbol in self._cache:
            return self._cache[symbol]
        
        # Return fallback
        return self._get_fallback_data(symbol)
    
    def _get_fallback_data(self, symbol: str) -> Dict[str, Any]:
        """Return demo data when yfinance fails."""
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
            "HD": {"name": "The Home Depot Inc.", "sector": "Consumer Cyclical", "price": 348.90, "pe": 22.5, "peg": 2.0, "growth": 0.08, "fair_value": 380, "score": 73},
            "PG": {"name": "Procter & Gamble Co.", "sector": "Consumer Defensive", "price": 158.30, "pe": 26.4, "peg": 3.2, "growth": 0.04, "fair_value": 170, "score": 66},
            "MA": {"name": "Mastercard Inc.", "sector": "Financial Services", "price": 425.80, "pe": 35.2, "peg": 1.8, "growth": 0.14, "fair_value": 480, "score": 77},
            "XOM": {"name": "Exxon Mobil Corporation", "sector": "Energy", "price": 105.40, "pe": 12.1, "peg": 1.4, "growth": -0.05, "fair_value": 115, "score": 71},
            "BAC": {"name": "Bank of America Corp", "sector": "Financial Services", "price": 33.85, "pe": 10.8, "peg": 1.6, "growth": 0.06, "fair_value": 38, "score": 69},
            "KO": {"name": "The Coca-Cola Company", "sector": "Consumer Defensive", "price": 59.25, "pe": 22.6, "peg": 3.5, "growth": 0.04, "fair_value": 65, "score": 62},
            "PFE": {"name": "Pfizer Inc.", "sector": "Healthcare", "price": 28.45, "pe": 45.2, "peg": 2.8, "growth": -0.15, "fair_value": 32, "score": 55},
            "WMT": {"name": "Walmart Inc.", "sector": "Consumer Defensive", "price": 163.80, "pe": 28.4, "peg": 3.1, "growth": 0.06, "fair_value": 175, "score": 65},
            "DIS": {"name": "The Walt Disney Company", "sector": "Communication Services", "price": 91.50, "pe": 68.2, "peg": 2.4, "growth": 0.08, "fair_value": 105, "score": 60},
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
                "market_cap": 500000000000,
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
        """Calculate fair value using analyst target and Graham number."""
        try:
            target = info.get("targetMeanPrice")
            
            eps = info.get("trailingEps", 0)
            book_value = info.get("bookValue", 0)
            graham = None
            if eps and book_value and eps > 0 and book_value > 0:
                graham = (22.5 * eps * book_value) ** 0.5
            
            values = []
            weights = []
            
            if target and target > 0:
                values.append(target)
                weights.append(0.6)
            if graham and graham > 0:
                values.append(graham)
                weights.append(0.4)
            
            if values:
                total_weight = sum(weights[:len(values)])
                return sum(v * w for v, w in zip(values, weights)) / total_weight
            
            return None
        except Exception:
            return None
    
    def _calculate_score(self, data: Dict) -> int:
        """Calculate investment score (0-100)."""
        score = 50
        
        if data.get("pe_ratio"):
            pe = data["pe_ratio"]
            if pe < 15:
                score += 10
            elif pe < 20:
                score += 5
            elif pe > 35:
                score -= 10
        
        if data.get("peg_ratio"):
            peg = data["peg_ratio"]
            if peg < 1:
                score += 10
            elif peg < 1.5:
                score += 5
            elif peg > 2.5:
                score -= 5
        
        if data.get("revenue_growth"):
            growth = data["revenue_growth"] * 100
            if growth > 20:
                score += 10
            elif growth > 10:
                score += 5
            elif growth < 0:
                score -= 5
        
        if data.get("upside_potential"):
            upside = data["upside_potential"]
            if upside > 30:
                score += 15
            elif upside > 15:
                score += 10
            elif upside > 0:
                score += 5
        
        if data.get("profit_margin") and data["profit_margin"] > 0.15:
            score += 5
        if data.get("return_on_equity") and data["return_on_equity"] > 0.15:
            score += 5
        
        return max(0, min(100, score))
    
    def get_historical_data(self, symbol: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
        """Get historical price data."""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            return df
        except Exception as e:
            logger.error(f"Error fetching history for {symbol}: {e}")
            return pd.DataFrame()
    
    def get_multiple_stocks(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Get data for multiple stocks - from cache."""
        results = []
        for symbol in symbols:
            data = self.get_stock_info(symbol)
            if data and "error" not in data:
                results.append(data)
        return results
    
    def get_universe(self) -> List[str]:
        """Get the default stock universe."""
        return self.DEFAULT_UNIVERSE.copy()


# Singleton instance
stock_service = StockDataService()
