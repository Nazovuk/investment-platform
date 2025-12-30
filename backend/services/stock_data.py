"""
Stock data service using Finnhub API for live data.
Falls back to static data if API fails.
"""

import httpx
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Finnhub API configuration
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d58lr11r01qvj8ihdt60d58lr11r01qvj8ihdt6g")
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# Stock universe - 110+ stocks (S&P 100 + Growth Stocks)
DEFAULT_UNIVERSE = [
    # Mega Cap Tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
    # Finance - Banking & Payments
    "JPM", "V", "MA", "BAC", "WFC", "GS", "MS", "BRK.B", "C", "AXP", "SCHW", "BLK", "PYPL", "SQ",
    # Healthcare - Pharma & Biotech
    "JNJ", "UNH", "PFE", "LLY", "ABBV", "MRK", "TMO", "ABT", "BMY", "AMGN", "GILD", "ISRG", "VRTX", "REGN", "MRNA", "BIIB",
    # Consumer - Retail & Staples
    "HD", "PG", "KO", "PEP", "WMT", "COST", "MCD", "NKE", "SBUX", "TGT", "LOW", "TJX", "LULU", "YUM", "CMG", "DG", "DLTR",
    # Energy
    "XOM", "CVX", "COP", "SLB", "EOG", "PXD", "MPC", "VLO", "OXY",
    # Industrial & Aerospace
    "CAT", "BA", "GE", "HON", "RTX", "LMT", "UPS", "FDX", "DE", "MMM", "EMR", "NOC", "GD",
    # Communication & Entertainment
    "DIS", "NFLX", "CMCSA", "T", "VZ", "TMUS", "CHTR", "WBD", "PARA", "EA", "ATVI", "TTWO",
    # Software & Cloud
    "CRM", "ORCL", "ADBE", "NOW", "SNOW", "PLTR", "MDB", "DDOG", "ZS", "CRWD", "NET", "OKTA", "SPLK", "WDAY", "TEAM", "HUBS",
    # Semiconductors
    "AMD", "INTC", "AVGO", "QCOM", "TXN", "MU", "LRCX", "AMAT", "KLAC", "MRVL", "ON", "ADI",
    # Fintech & Crypto
    "COIN", "HOOD", "AFRM", "SOFI", "UPST",
    # AI & Growth
    "NBIS", "PATH", "AI", "BBAI", "SOUN", "IONQ",
    # EVs & Clean Energy
    "RIVN", "LCID", "NIO", "LI", "XPEV", "ENPH", "SEDG", "FSLR",
    # Real Estate
    "AMT", "PLD", "CCI", "EQIX", "SPG", "O",
]

# Static metadata (company info)
STOCK_METADATA = {
    # Mega Cap Tech
    "AAPL": {"name": "Apple Inc.", "sector": "Technology", "industry": "Consumer Electronics"},
    "MSFT": {"name": "Microsoft Corporation", "sector": "Technology", "industry": "Software"},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology", "industry": "Internet Services"},
    "AMZN": {"name": "Amazon.com Inc.", "sector": "Consumer Cyclical", "industry": "E-Commerce"},
    "META": {"name": "Meta Platforms Inc.", "sector": "Technology", "industry": "Social Media"},
    "NVDA": {"name": "NVIDIA Corporation", "sector": "Technology", "industry": "Semiconductors"},
    "TSLA": {"name": "Tesla Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    # Finance
    "JPM": {"name": "JPMorgan Chase & Co.", "sector": "Financial Services", "industry": "Banking"},
    "V": {"name": "Visa Inc.", "sector": "Financial Services", "industry": "Payment Processing"},
    "MA": {"name": "Mastercard Inc.", "sector": "Financial Services", "industry": "Payment Processing"},
    "BAC": {"name": "Bank of America Corp", "sector": "Financial Services", "industry": "Banking"},
    "WFC": {"name": "Wells Fargo & Co.", "sector": "Financial Services", "industry": "Banking"},
    "GS": {"name": "Goldman Sachs Group", "sector": "Financial Services", "industry": "Investment Banking"},
    "MS": {"name": "Morgan Stanley", "sector": "Financial Services", "industry": "Investment Banking"},
    "BRK.B": {"name": "Berkshire Hathaway B", "sector": "Financial Services", "industry": "Insurance"},
    "C": {"name": "Citigroup Inc.", "sector": "Financial Services", "industry": "Banking"},
    "AXP": {"name": "American Express Co.", "sector": "Financial Services", "industry": "Credit Services"},
    "SCHW": {"name": "Charles Schwab Corp", "sector": "Financial Services", "industry": "Brokerage"},
    "BLK": {"name": "BlackRock Inc.", "sector": "Financial Services", "industry": "Asset Management"},
    "PYPL": {"name": "PayPal Holdings Inc.", "sector": "Financial Services", "industry": "Digital Payments"},
    "SQ": {"name": "Block Inc.", "sector": "Financial Services", "industry": "Fintech"},
    # Healthcare
    "JNJ": {"name": "Johnson & Johnson", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "UNH": {"name": "UnitedHealth Group", "sector": "Healthcare", "industry": "Health Insurance"},
    "PFE": {"name": "Pfizer Inc.", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "LLY": {"name": "Eli Lilly and Company", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "ABBV": {"name": "AbbVie Inc.", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "MRK": {"name": "Merck & Co.", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "TMO": {"name": "Thermo Fisher Scientific", "sector": "Healthcare", "industry": "Diagnostics"},
    "ABT": {"name": "Abbott Laboratories", "sector": "Healthcare", "industry": "Medical Devices"},
    "BMY": {"name": "Bristol-Myers Squibb", "sector": "Healthcare", "industry": "Pharmaceuticals"},
    "AMGN": {"name": "Amgen Inc.", "sector": "Healthcare", "industry": "Biotechnology"},
    "GILD": {"name": "Gilead Sciences Inc.", "sector": "Healthcare", "industry": "Biotechnology"},
    "ISRG": {"name": "Intuitive Surgical Inc.", "sector": "Healthcare", "industry": "Medical Devices"},
    "VRTX": {"name": "Vertex Pharmaceuticals", "sector": "Healthcare", "industry": "Biotechnology"},
    "REGN": {"name": "Regeneron Pharmaceuticals", "sector": "Healthcare", "industry": "Biotechnology"},
    "MRNA": {"name": "Moderna Inc.", "sector": "Healthcare", "industry": "Biotechnology"},
    "BIIB": {"name": "Biogen Inc.", "sector": "Healthcare", "industry": "Biotechnology"},
    # Consumer
    "HD": {"name": "The Home Depot Inc.", "sector": "Consumer Cyclical", "industry": "Home Improvement"},
    "PG": {"name": "Procter & Gamble Co.", "sector": "Consumer Defensive", "industry": "Household Products"},
    "KO": {"name": "The Coca-Cola Company", "sector": "Consumer Defensive", "industry": "Beverages"},
    "PEP": {"name": "PepsiCo Inc.", "sector": "Consumer Defensive", "industry": "Beverages"},
    "WMT": {"name": "Walmart Inc.", "sector": "Consumer Defensive", "industry": "Retail"},
    "COST": {"name": "Costco Wholesale Corp", "sector": "Consumer Defensive", "industry": "Retail"},
    "MCD": {"name": "McDonald's Corporation", "sector": "Consumer Cyclical", "industry": "Restaurants"},
    "NKE": {"name": "Nike Inc.", "sector": "Consumer Cyclical", "industry": "Apparel"},
    "SBUX": {"name": "Starbucks Corporation", "sector": "Consumer Cyclical", "industry": "Restaurants"},
    "TGT": {"name": "Target Corporation", "sector": "Consumer Defensive", "industry": "Retail"},
    "LOW": {"name": "Lowe's Companies Inc.", "sector": "Consumer Cyclical", "industry": "Home Improvement"},
    "TJX": {"name": "TJX Companies Inc.", "sector": "Consumer Cyclical", "industry": "Retail"},
    "LULU": {"name": "Lululemon Athletica", "sector": "Consumer Cyclical", "industry": "Apparel"},
    "YUM": {"name": "Yum! Brands Inc.", "sector": "Consumer Cyclical", "industry": "Restaurants"},
    "CMG": {"name": "Chipotle Mexican Grill", "sector": "Consumer Cyclical", "industry": "Restaurants"},
    "DG": {"name": "Dollar General Corp", "sector": "Consumer Defensive", "industry": "Discount Stores"},
    "DLTR": {"name": "Dollar Tree Inc.", "sector": "Consumer Defensive", "industry": "Discount Stores"},
    # Energy
    "XOM": {"name": "Exxon Mobil Corporation", "sector": "Energy", "industry": "Oil & Gas"},
    "CVX": {"name": "Chevron Corporation", "sector": "Energy", "industry": "Oil & Gas"},
    "COP": {"name": "ConocoPhillips", "sector": "Energy", "industry": "Oil & Gas"},
    "SLB": {"name": "Schlumberger Limited", "sector": "Energy", "industry": "Oil Services"},
    "EOG": {"name": "EOG Resources Inc.", "sector": "Energy", "industry": "Oil & Gas"},
    "PXD": {"name": "Pioneer Natural Resources", "sector": "Energy", "industry": "Oil & Gas"},
    "MPC": {"name": "Marathon Petroleum Corp", "sector": "Energy", "industry": "Refining"},
    "VLO": {"name": "Valero Energy Corp", "sector": "Energy", "industry": "Refining"},
    "OXY": {"name": "Occidental Petroleum", "sector": "Energy", "industry": "Oil & Gas"},
    # Industrial
    "CAT": {"name": "Caterpillar Inc.", "sector": "Industrials", "industry": "Machinery"},
    "BA": {"name": "Boeing Company", "sector": "Industrials", "industry": "Aerospace"},
    "GE": {"name": "GE Aerospace", "sector": "Industrials", "industry": "Aerospace"},
    "HON": {"name": "Honeywell International", "sector": "Industrials", "industry": "Conglomerates"},
    "RTX": {"name": "RTX Corporation", "sector": "Industrials", "industry": "Aerospace & Defense"},
    "LMT": {"name": "Lockheed Martin Corp", "sector": "Industrials", "industry": "Aerospace & Defense"},
    "UPS": {"name": "United Parcel Service", "sector": "Industrials", "industry": "Logistics"},
    "FDX": {"name": "FedEx Corporation", "sector": "Industrials", "industry": "Logistics"},
    "DE": {"name": "Deere & Company", "sector": "Industrials", "industry": "Farm Machinery"},
    "MMM": {"name": "3M Company", "sector": "Industrials", "industry": "Conglomerates"},
    "EMR": {"name": "Emerson Electric Co.", "sector": "Industrials", "industry": "Industrial Automation"},
    "NOC": {"name": "Northrop Grumman Corp", "sector": "Industrials", "industry": "Aerospace & Defense"},
    "GD": {"name": "General Dynamics Corp", "sector": "Industrials", "industry": "Aerospace & Defense"},
    # Communication
    "DIS": {"name": "The Walt Disney Company", "sector": "Communication Services", "industry": "Entertainment"},
    "NFLX": {"name": "Netflix Inc.", "sector": "Communication Services", "industry": "Streaming"},
    "CMCSA": {"name": "Comcast Corporation", "sector": "Communication Services", "industry": "Telecom"},
    "T": {"name": "AT&T Inc.", "sector": "Communication Services", "industry": "Telecom"},
    "VZ": {"name": "Verizon Communications", "sector": "Communication Services", "industry": "Telecom"},
    "TMUS": {"name": "T-Mobile US Inc.", "sector": "Communication Services", "industry": "Telecom"},
    "CHTR": {"name": "Charter Communications", "sector": "Communication Services", "industry": "Cable"},
    "WBD": {"name": "Warner Bros. Discovery", "sector": "Communication Services", "industry": "Entertainment"},
    "PARA": {"name": "Paramount Global", "sector": "Communication Services", "industry": "Entertainment"},
    "EA": {"name": "Electronic Arts Inc.", "sector": "Communication Services", "industry": "Gaming"},
    "ATVI": {"name": "Activision Blizzard", "sector": "Communication Services", "industry": "Gaming"},
    "TTWO": {"name": "Take-Two Interactive", "sector": "Communication Services", "industry": "Gaming"},
    # Software & Cloud
    "CRM": {"name": "Salesforce Inc.", "sector": "Technology", "industry": "Software"},
    "ORCL": {"name": "Oracle Corporation", "sector": "Technology", "industry": "Software"},
    "ADBE": {"name": "Adobe Inc.", "sector": "Technology", "industry": "Software"},
    "NOW": {"name": "ServiceNow Inc.", "sector": "Technology", "industry": "Software"},
    "SNOW": {"name": "Snowflake Inc.", "sector": "Technology", "industry": "Cloud Computing"},
    "PLTR": {"name": "Palantir Technologies", "sector": "Technology", "industry": "Data Analytics"},
    "MDB": {"name": "MongoDB Inc.", "sector": "Technology", "industry": "Database"},
    "DDOG": {"name": "Datadog Inc.", "sector": "Technology", "industry": "Cloud Monitoring"},
    "ZS": {"name": "Zscaler Inc.", "sector": "Technology", "industry": "Cybersecurity"},
    "CRWD": {"name": "CrowdStrike Holdings", "sector": "Technology", "industry": "Cybersecurity"},
    "NET": {"name": "Cloudflare Inc.", "sector": "Technology", "industry": "Cloud Infrastructure"},
    "OKTA": {"name": "Okta Inc.", "sector": "Technology", "industry": "Identity Management"},
    "SPLK": {"name": "Splunk Inc.", "sector": "Technology", "industry": "Data Analytics"},
    "WDAY": {"name": "Workday Inc.", "sector": "Technology", "industry": "HR Software"},
    "TEAM": {"name": "Atlassian Corporation", "sector": "Technology", "industry": "Software"},
    "HUBS": {"name": "HubSpot Inc.", "sector": "Technology", "industry": "Marketing Software"},
    # Semiconductors
    "AMD": {"name": "Advanced Micro Devices", "sector": "Technology", "industry": "Semiconductors"},
    "INTC": {"name": "Intel Corporation", "sector": "Technology", "industry": "Semiconductors"},
    "AVGO": {"name": "Broadcom Inc.", "sector": "Technology", "industry": "Semiconductors"},
    "QCOM": {"name": "Qualcomm Inc.", "sector": "Technology", "industry": "Semiconductors"},
    "TXN": {"name": "Texas Instruments Inc.", "sector": "Technology", "industry": "Semiconductors"},
    "MU": {"name": "Micron Technology Inc.", "sector": "Technology", "industry": "Memory"},
    "LRCX": {"name": "Lam Research Corp", "sector": "Technology", "industry": "Semiconductor Equipment"},
    "AMAT": {"name": "Applied Materials Inc.", "sector": "Technology", "industry": "Semiconductor Equipment"},
    "KLAC": {"name": "KLA Corporation", "sector": "Technology", "industry": "Semiconductor Equipment"},
    "MRVL": {"name": "Marvell Technology", "sector": "Technology", "industry": "Semiconductors"},
    "ON": {"name": "ON Semiconductor Corp", "sector": "Technology", "industry": "Semiconductors"},
    "ADI": {"name": "Analog Devices Inc.", "sector": "Technology", "industry": "Semiconductors"},
    # Fintech & Crypto
    "COIN": {"name": "Coinbase Global Inc.", "sector": "Financial Services", "industry": "Cryptocurrency"},
    "HOOD": {"name": "Robinhood Markets Inc.", "sector": "Financial Services", "industry": "Brokerage"},
    "AFRM": {"name": "Affirm Holdings Inc.", "sector": "Financial Services", "industry": "Buy Now Pay Later"},
    "SOFI": {"name": "SoFi Technologies Inc.", "sector": "Financial Services", "industry": "Digital Banking"},
    "UPST": {"name": "Upstart Holdings Inc.", "sector": "Financial Services", "industry": "AI Lending"},
    # AI & Growth
    "NBIS": {"name": "Nebius Group N.V.", "sector": "Technology", "industry": "AI Infrastructure"},
    "PATH": {"name": "UiPath Inc.", "sector": "Technology", "industry": "Automation"},
    "AI": {"name": "C3.ai Inc.", "sector": "Technology", "industry": "Enterprise AI"},
    "BBAI": {"name": "BigBear.ai Holdings", "sector": "Technology", "industry": "AI Analytics"},
    "SOUN": {"name": "SoundHound AI Inc.", "sector": "Technology", "industry": "Voice AI"},
    "IONQ": {"name": "IonQ Inc.", "sector": "Technology", "industry": "Quantum Computing"},
    # EVs & Clean Energy
    "RIVN": {"name": "Rivian Automotive Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "LCID": {"name": "Lucid Group Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "NIO": {"name": "NIO Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "LI": {"name": "Li Auto Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "XPEV": {"name": "XPeng Inc.", "sector": "Consumer Cyclical", "industry": "Electric Vehicles"},
    "ENPH": {"name": "Enphase Energy Inc.", "sector": "Technology", "industry": "Solar"},
    "SEDG": {"name": "SolarEdge Technologies", "sector": "Technology", "industry": "Solar"},
    "FSLR": {"name": "First Solar Inc.", "sector": "Technology", "industry": "Solar"},
    # Real Estate
    "AMT": {"name": "American Tower Corp", "sector": "Real Estate", "industry": "REITs"},
    "PLD": {"name": "Prologis Inc.", "sector": "Real Estate", "industry": "Industrial REITs"},
    "CCI": {"name": "Crown Castle Inc.", "sector": "Real Estate", "industry": "Tower REITs"},
    "EQIX": {"name": "Equinix Inc.", "sector": "Real Estate", "industry": "Data Center REITs"},
    "SPG": {"name": "Simon Property Group", "sector": "Real Estate", "industry": "Retail REITs"},
    "O": {"name": "Realty Income Corp", "sector": "Real Estate", "industry": "Retail REITs"},
}


class StockDataService:
    """Service for fetching live stock data from Finnhub."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_time: Dict[str, datetime] = {}
        self._cache_timeout = 60  # 1 minute cache
    
    def _is_cache_valid(self, symbol: str) -> bool:
        if symbol not in self._cache_time:
            return False
        elapsed = (datetime.now() - self._cache_time[symbol]).total_seconds()
        return elapsed < self._cache_timeout
    
    def get_stock_info(self, symbol: str) -> Dict[str, Any]:
        """Get live stock data from Finnhub."""
        if self._is_cache_valid(symbol):
            return self._cache[symbol]
        
        try:
            # Get quote from Finnhub
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{FINNHUB_BASE_URL}/quote",
                    params={"symbol": symbol, "token": FINNHUB_API_KEY}
                )
                
                if response.status_code == 200:
                    quote = response.json()
                    
                    # c = current price, pc = previous close, h = high, l = low
                    current_price = quote.get("c", 0)
                    prev_close = quote.get("pc", 0)
                    
                    if current_price > 0:
                        # Get metadata
                        meta = STOCK_METADATA.get(symbol, {
                            "name": symbol,
                            "sector": "Unknown",
                            "industry": "Unknown"
                        })
                        
                        # Calculate change
                        change_pct = ((current_price - prev_close) / prev_close * 100) if prev_close > 0 else 0
                        
                        # Estimate metrics (simplified)
                        data = {
                            "symbol": symbol,
                            "name": meta["name"],
                            "sector": meta["sector"],
                            "industry": meta["industry"],
                            "currency": "USD",
                            "current_price": round(current_price, 2),
                            "previous_close": round(prev_close, 2),
                            "change_percent": round(change_pct, 2),
                            "high": round(quote.get("h", current_price), 2),
                            "low": round(quote.get("l", current_price), 2),
                            "market_cap": self._estimate_market_cap(symbol, current_price),
                            "pe_ratio": self._estimate_pe(symbol),
                            "peg_ratio": self._estimate_peg(symbol),
                            "revenue_growth": self._estimate_growth(symbol),
                            "fair_value": round(current_price * 1.12, 2),  # Simplified
                            "upside_potential": 12.0,  # Simplified
                            "score": self._calculate_score(symbol, current_price, prev_close),
                            "dividend_yield": self._estimate_dividend(symbol),
                            "last_updated": datetime.now().isoformat(),
                        }
                        
                        self._cache[symbol] = data
                        self._cache_time[symbol] = datetime.now()
                        return data
        except Exception as e:
            logger.error(f"Error fetching {symbol} from Finnhub: {e}")
        
        # Return cached data if available
        if symbol in self._cache:
            return self._cache[symbol]
        
        # Return minimal data
        return self._get_fallback(symbol)
    
    def _estimate_market_cap(self, symbol: str, price: float) -> int:
        """Estimate market cap based on known shares outstanding."""
        shares = {
            "AAPL": 15500000000, "MSFT": 7430000000, "GOOGL": 12200000000,
            "AMZN": 10500000000, "META": 2570000000, "NVDA": 24500000000,
            "TSLA": 3190000000, "JPM": 2870000000, "V": 1650000000,
        }
        if symbol in shares:
            return int(price * shares[symbol])
        return int(price * 1000000000)  # Default 1B shares
    
    def _estimate_pe(self, symbol: str) -> float:
        """Return estimated P/E ratio."""
        pe_estimates = {
            "AAPL": 32.5, "MSFT": 36.8, "GOOGL": 25.2, "AMZN": 52.4,
            "META": 28.5, "NVDA": 55.2, "TSLA": 115.0, "JPM": 13.5,
            "V": 32.0, "MA": 39.5, "BAC": 15.2, "JNJ": 15.8,
            "UNH": 20.5, "HD": 27.2, "WMT": 38.5, "XOM": 14.2,
            "CVX": 13.5, "PFE": 38.0, "KO": 23.5, "PEP": 22.8,
            "NFLX": 50.2, "DIS": 42.5, "CRM": 50.0, "AMD": 108.0,
        }
        return pe_estimates.get(symbol, 25.0)
    
    def _estimate_peg(self, symbol: str) -> float:
        """Return estimated PEG ratio."""
        peg_estimates = {
            "AAPL": 2.2, "MSFT": 2.4, "GOOGL": 1.5, "AMZN": 1.9,
            "META": 1.2, "NVDA": 1.3, "TSLA": 4.5, "JPM": 1.9,
            "V": 2.0, "MA": 1.9, "BAC": 1.7, "XOM": 1.5,
        }
        return peg_estimates.get(symbol, 2.0)
    
    def _estimate_growth(self, symbol: str) -> float:
        """Return estimated revenue growth."""
        growth_estimates = {
            "AAPL": 0.08, "MSFT": 0.15, "GOOGL": 0.12, "AMZN": 0.18,
            "META": 0.22, "NVDA": 1.20, "TSLA": 0.08, "JPM": 0.06,
        }
        return growth_estimates.get(symbol, 0.08)
    
    def _estimate_dividend(self, symbol: str) -> float:
        """Return estimated dividend yield."""
        div_estimates = {
            "AAPL": 0.005, "MSFT": 0.007, "JPM": 0.022, "BAC": 0.024,
            "JNJ": 0.032, "KO": 0.031, "PEP": 0.028, "XOM": 0.035,
            "CVX": 0.042, "VZ": 0.065, "T": 0.055,
        }
        return div_estimates.get(symbol, 0.01)
    
    def _calculate_score(self, symbol: str, price: float, prev_close: float) -> int:
        """Calculate investment score."""
        base_scores = {
            "NVDA": 88, "META": 85, "GOOGL": 82, "AMD": 80, "UNH": 79,
            "BRK.B": 78, "MA": 77, "JPM": 76, "MSFT": 76, "MRK": 75,
            "NFLX": 75, "V": 74, "ORCL": 74, "GS": 74, "CAT": 74,
            "ADBE": 73, "GE": 73, "MS": 73, "WFC": 72, "AAPL": 72,
            "CRM": 72, "TMO": 72, "HD": 71, "XOM": 71, "CMCSA": 71,
            "LMT": 71, "JNJ": 70, "HON": 70, "COP": 70, "BAC": 69,
        }
        
        score = base_scores.get(symbol, 65)
        
        # Adjust for daily performance
        if prev_close > 0:
            change = (price - prev_close) / prev_close * 100
            if change > 2:
                score += 3
            elif change > 0:
                score += 1
            elif change < -2:
                score -= 3
        
        return max(0, min(100, score))
    
    def _get_fallback(self, symbol: str) -> Dict[str, Any]:
        """Return fallback data."""
        meta = STOCK_METADATA.get(symbol, {"name": symbol, "sector": "Unknown", "industry": "Unknown"})
        return {
            "symbol": symbol,
            "name": meta["name"],
            "sector": meta["sector"],
            "industry": meta["industry"],
            "currency": "USD",
            "current_price": 0,
            "previous_close": 0,
            "pe_ratio": 25,
            "peg_ratio": 2.0,
            "revenue_growth": 0.08,
            "fair_value": 0,
            "upside_potential": 0,
            "score": 50,
            "error": "Unable to fetch live data"
        }
    
    def get_multiple_stocks(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Fetch data for multiple stocks."""
        results = []
        for symbol in symbols:
            data = self.get_stock_info(symbol)
            if data.get("current_price", 0) > 0:
                results.append(data)
        return results
    
    def get_historical_data(self, symbol: str, period: str = "1y") -> "pd.DataFrame":
        """
        Get historical price data for a symbol.
        Uses Finnhub candles API or generates simulated data if unavailable.
        """
        import pandas as pd
        import numpy as np
        from datetime import datetime, timedelta
        
        # Calculate date range
        period_days = {
            "1m": 30, "3m": 90, "6m": 180, 
            "1y": 365, "2y": 730, "5y": 1825
        }
        days = period_days.get(period, 365)
        
        end_time = int(datetime.now().timestamp())
        start_time = int((datetime.now() - timedelta(days=days)).timestamp())
        
        try:
            # Try Finnhub candles API
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{FINNHUB_BASE_URL}/stock/candle",
                    params={
                        "symbol": symbol,
                        "resolution": "D",  # Daily
                        "from": start_time,
                        "to": end_time,
                        "token": FINNHUB_API_KEY
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("s") == "ok" and data.get("c"):
                        dates = pd.to_datetime(data["t"], unit="s")
                        df = pd.DataFrame({
                            "Open": data["o"],
                            "High": data["h"],
                            "Low": data["l"],
                            "Close": data["c"],
                            "Volume": data["v"]
                        }, index=dates)
                        return df
        except Exception as e:
            logger.warning(f"Failed to fetch Finnhub candles for {symbol}: {e}")
        
        # Fallback: Generate simulated historical data based on current price
        logger.info(f"Generating simulated historical data for {symbol}")
        
        # Get current price as reference
        stock_info = self.get_stock_info(symbol)
        current_price = stock_info.get("current_price", 100)
        
        if current_price <= 0:
            current_price = 100
        
        # Generate dates
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        
        # Generate random walk with drift
        np.random.seed(hash(symbol) % 2**32)  # Consistent per symbol
        daily_returns = np.random.normal(0.0003, 0.015, days)  # slight positive drift, 1.5% daily vol
        
        # Work backwards from current price
        prices = np.zeros(days)
        prices[-1] = current_price
        for i in range(days - 2, -1, -1):
            prices[i] = prices[i + 1] / (1 + daily_returns[i + 1])
        
        # Add some noise for OHLC
        df = pd.DataFrame({
            "Open": prices * (1 + np.random.normal(0, 0.003, days)),
            "High": prices * (1 + np.abs(np.random.normal(0, 0.01, days))),
            "Low": prices * (1 - np.abs(np.random.normal(0, 0.01, days))),
            "Close": prices,
            "Volume": np.random.randint(1000000, 50000000, days)
        }, index=dates)
        
        return df
    
    def get_universe(self) -> List[str]:
        """Get the default stock universe."""
        return DEFAULT_UNIVERSE.copy()


# Singleton instance
stock_service = StockDataService()
