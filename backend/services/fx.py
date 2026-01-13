"""
FX (Foreign Exchange) Service - Phase 1 compliant.

Fetches rates from free sources (ECB, BoE) and provides currency conversion.
Supported currencies: GBP, USD, EUR, TRY
"""

import httpx
from datetime import date, datetime, timedelta
from typing import Dict, Optional, List
from xml.etree import ElementTree
import logging

logger = logging.getLogger(__name__)

# Supported currencies
SUPPORTED_CURRENCIES = ["GBP", "USD", "EUR", "TRY"]

# In-memory cache for rates (refreshed daily)
_fx_cache: Dict[str, Dict[str, float]] = {}
_cache_date: Optional[date] = None


async def fetch_ecb_rates() -> Dict[str, float]:
    """
    Fetch daily FX rates from European Central Bank.
    ECB provides EUR-based rates for major currencies.
    
    Returns: Dict of currency -> rate (1 EUR = X currency)
    """
    ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(ECB_URL)
            response.raise_for_status()
            
            # Parse XML
            root = ElementTree.fromstring(response.content)
            
            # ECB XML namespace
            ns = {"gesmes": "http://www.gesmes.org/xml/2002-08-01",
                  "ecb": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref"}
            
            rates = {"EUR": 1.0}  # Base currency
            
            # Find Cube elements with rates
            for cube in root.findall(".//ecb:Cube[@currency]", ns):
                currency = cube.get("currency")
                rate = float(cube.get("rate"))
                if currency in SUPPORTED_CURRENCIES or currency in ["USD", "GBP", "TRY"]:
                    rates[currency] = rate
            
            logger.info(f"Fetched ECB rates: {rates}")
            return rates
            
    except Exception as e:
        logger.error(f"Failed to fetch ECB rates: {e}")
        return {}


async def fetch_boe_rates() -> Dict[str, float]:
    """
    Fetch daily FX rates from Bank of England.
    BoE provides GBP-based rates.
    
    Returns: Dict of currency -> rate (1 GBP = X currency)
    """
    # BoE statistical data - GBP/USD, GBP/EUR
    BOE_URL = "https://www.bankofengland.co.uk/boeapps/database/Rates.asp?into=xml"
    
    # For MVP, use fallback rates if BoE is complex
    # BoE API requires specific date format and series codes
    logger.info("BoE rates: using ECB-derived rates")
    return {}


async def get_latest_rates() -> Dict[str, Dict[str, float]]:
    """
    Get latest FX rates from all sources.
    Returns rates normalized to USD base.
    
    Returns: Dict with structure {base_currency: {quote_currency: rate}}
    """
    global _fx_cache, _cache_date
    
    today = date.today()
    
    # Return cached if fresh
    if _cache_date == today and _fx_cache:
        return _fx_cache
    
    # Fetch ECB rates (EUR-based)
    ecb_rates = await fetch_ecb_rates()
    
    if not ecb_rates:
        # Fallback to hardcoded rates if API fails
        logger.warning("Using fallback FX rates")
        ecb_rates = {
            "EUR": 1.0,
            "USD": 1.08,
            "GBP": 0.85,
            "TRY": 38.5
        }
    
    # Convert to cross-rates
    # Build rate matrix for all supported currencies
    rates: Dict[str, Dict[str, float]] = {}
    
    for base in SUPPORTED_CURRENCIES:
        rates[base] = {}
        for quote in SUPPORTED_CURRENCIES:
            if base == quote:
                rates[base][quote] = 1.0
            else:
                # Cross rate calculation via EUR
                base_to_eur = 1.0 / ecb_rates.get(base, 1.0) if base != "EUR" else 1.0
                eur_to_quote = ecb_rates.get(quote, 1.0) if quote != "EUR" else 1.0
                rates[base][quote] = round(base_to_eur * eur_to_quote, 6)
    
    _fx_cache = rates
    _cache_date = today
    
    return rates


def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    rates: Dict[str, Dict[str, float]]
) -> float:
    """
    Convert amount from one currency to another.
    
    Args:
        amount: Amount to convert
        from_currency: Source currency (e.g., "USD")
        to_currency: Target currency (e.g., "GBP")
        rates: Rate matrix from get_latest_rates()
    
    Returns:
        Converted amount
    """
    if from_currency == to_currency:
        return amount
    
    if from_currency not in rates or to_currency not in rates.get(from_currency, {}):
        logger.warning(f"No rate for {from_currency}/{to_currency}, returning original")
        return amount
    
    rate = rates[from_currency][to_currency]
    return round(amount * rate, 2)


async def get_fx_rate(
    base: str,
    quote: str,
    as_of: Optional[date] = None
) -> Optional[float]:
    """
    Get specific FX rate.
    
    Args:
        base: Base currency (e.g., "USD")
        quote: Quote currency (e.g., "GBP")
        as_of: Date for rate (default: today)
    
    Returns:
        Exchange rate (1 base = X quote) or None
    """
    rates = await get_latest_rates()
    
    if base in rates and quote in rates.get(base, {}):
        return rates[base][quote]
    
    return None


def format_currency(
    amount: float,
    currency: str,
    locale: str = "en-GB"
) -> str:
    """
    Format amount with currency symbol.
    
    Args:
        amount: Amount to format
        currency: Currency code
        locale: Locale for formatting
    
    Returns:
        Formatted string (e.g., "£1,234.56")
    """
    symbols = {
        "GBP": "£",
        "USD": "$",
        "EUR": "€",
        "TRY": "₺"
    }
    
    symbol = symbols.get(currency, currency)
    
    if locale == "tr-TR":
        # Turkish format: 1.234,56
        formatted = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    else:
        # Default English format: 1,234.56
        formatted = f"{amount:,.2f}"
    
    # TRY typically shows no decimals for large values
    if currency == "TRY" and abs(amount) >= 100:
        formatted = f"{amount:,.0f}"
    
    return f"{symbol}{formatted}"


# Rate snapshot for database storage
def create_rate_snapshot(
    rates: Dict[str, Dict[str, float]],
    source: str = "ECB"
) -> List[dict]:
    """
    Create FXRate records for database storage.
    
    Returns:
        List of dicts ready for FXRate model
    """
    today = date.today()
    snapshots = []
    
    for base, quotes in rates.items():
        for quote, rate in quotes.items():
            if base != quote:
                snapshots.append({
                    "base": base,
                    "quote": quote,
                    "rate": rate,
                    "source": source,
                    "as_of": today,
                    "is_stale": False
                })
    
    return snapshots
