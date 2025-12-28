"""
Currency service - Multi-currency support and FX rates.
"""

import httpx
from typing import Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


class CurrencyService:
    """Service for currency conversion and FX rates."""
    
    # Free FX API (no key required)
    FX_API_BASE = "https://api.exchangerate-api.com/v4/latest"
    
    # Supported currencies
    SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "TRY", "JPY", "CHF", "CAD", "AUD"]
    
    # Cache for rates
    _rates_cache: Dict[str, Dict[str, float]] = {}
    _cache_time: Optional[datetime] = None
    CACHE_DURATION = timedelta(hours=1)
    
    def __init__(self):
        pass
    
    async def get_rates(self, base: str = "USD") -> Dict[str, float]:
        """
        Get current exchange rates for a base currency.
        
        Args:
            base: Base currency code (default: USD)
        
        Returns:
            Dict of currency -> rate
        """
        # Check cache
        if (
            self._cache_time
            and datetime.now() - self._cache_time < self.CACHE_DURATION
            and base in self._rates_cache
        ):
            return self._rates_cache[base]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.FX_API_BASE}/{base}")
                response.raise_for_status()
                data = response.json()
                
                rates = {
                    currency: data["rates"].get(currency, 1.0)
                    for currency in self.SUPPORTED_CURRENCIES
                }
                
                # Update cache
                self._rates_cache[base] = rates
                self._cache_time = datetime.now()
                
                return rates
                
        except Exception as e:
            logger.error(f"Error fetching FX rates: {e}")
            # Return fallback rates
            return self._get_fallback_rates(base)
    
    def get_rates_sync(self, base: str = "USD") -> Dict[str, float]:
        """Synchronous version of get_rates."""
        # Check cache
        if (
            self._cache_time
            and datetime.now() - self._cache_time < self.CACHE_DURATION
            and base in self._rates_cache
        ):
            return self._rates_cache[base]
        
        try:
            with httpx.Client() as client:
                response = client.get(f"{self.FX_API_BASE}/{base}")
                response.raise_for_status()
                data = response.json()
                
                rates = {
                    currency: data["rates"].get(currency, 1.0)
                    for currency in self.SUPPORTED_CURRENCIES
                }
                
                # Update cache
                self._rates_cache[base] = rates
                self._cache_time = datetime.now()
                
                return rates
                
        except Exception as e:
            logger.error(f"Error fetching FX rates: {e}")
            return self._get_fallback_rates(base)
    
    def _get_fallback_rates(self, base: str) -> Dict[str, float]:
        """Fallback rates when API is unavailable."""
        # Approximate rates as of 2024
        usd_rates = {
            "USD": 1.0,
            "EUR": 0.92,
            "GBP": 0.79,
            "TRY": 32.5,
            "JPY": 149.0,
            "CHF": 0.88,
            "CAD": 1.36,
            "AUD": 1.53
        }
        
        if base == "USD":
            return usd_rates
        
        # Convert to requested base
        base_rate = usd_rates.get(base, 1.0)
        return {
            currency: rate / base_rate
            for currency, rate in usd_rates.items()
        }
    
    def convert(
        self,
        amount: float,
        from_currency: str,
        to_currency: str,
        rates: Optional[Dict[str, float]] = None
    ) -> float:
        """
        Convert an amount from one currency to another.
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
            rates: Optional pre-fetched rates (base: from_currency)
        
        Returns:
            Converted amount
        """
        if from_currency == to_currency:
            return amount
        
        if rates is None:
            rates = self.get_rates_sync(from_currency)
        
        rate = rates.get(to_currency, 1.0)
        return round(amount * rate, 2)
    
    def convert_portfolio_values(
        self,
        values: Dict[str, float],
        from_currency: str,
        to_currency: str
    ) -> Dict[str, float]:
        """
        Convert all portfolio values to a target currency.
        
        Args:
            values: Dict of symbol -> value in from_currency
            from_currency: Current currency
            to_currency: Target currency
        
        Returns:
            Dict of symbol -> value in to_currency
        """
        if from_currency == to_currency:
            return values
        
        rates = self.get_rates_sync(from_currency)
        rate = rates.get(to_currency, 1.0)
        
        return {
            symbol: round(value * rate, 2)
            for symbol, value in values.items()
        }
    
    def get_supported_currencies(self) -> list:
        """Get list of supported currencies."""
        return self.SUPPORTED_CURRENCIES.copy()
    
    def format_currency(
        self,
        amount: float,
        currency: str,
        locale: str = "en_US"
    ) -> str:
        """Format amount with currency symbol."""
        symbols = {
            "USD": "$",
            "EUR": "€",
            "GBP": "£",
            "TRY": "₺",
            "JPY": "¥",
            "CHF": "CHF ",
            "CAD": "C$",
            "AUD": "A$"
        }
        
        symbol = symbols.get(currency, currency + " ")
        
        # Format with thousands separator
        if amount >= 1000:
            formatted = f"{amount:,.2f}"
        else:
            formatted = f"{amount:.2f}"
        
        return f"{symbol}{formatted}"


# Singleton instance
currency_service = CurrencyService()
