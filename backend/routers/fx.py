"""
FX Router - Phase 1 compliant.

Provides FX rate endpoints:
- GET /fx/latest - Latest rates for all supported currencies
- GET /fx/rates - Rates for specific date
"""

from fastapi import APIRouter, Query
from typing import Optional
from datetime import date

from services.fx import get_latest_rates, get_fx_rate, SUPPORTED_CURRENCIES

router = APIRouter()


@router.get("/latest")
async def get_latest_fx_rates():
    """
    Get latest FX rates for all supported currencies.
    
    Returns cross-rate matrix for GBP, USD, EUR, TRY.
    """
    rates = await get_latest_rates()
    
    return {
        "as_of": date.today().isoformat(),
        "base_currencies": SUPPORTED_CURRENCIES,
        "rates": rates,
        "source": "ECB",
        "is_stale": False
    }


@router.get("/rates")
async def get_fx_rate_for_pair(
    base: str = Query(..., description="Base currency (e.g., USD)"),
    quote: str = Query(..., description="Quote currency (e.g., GBP)"),
    as_of_date: Optional[str] = Query(None, alias="date", description="Date in YYYY-MM-DD format")
):
    """
    Get FX rate for a specific currency pair.
    
    Example: GET /fx/rates?base=USD&quote=GBP
    Returns: 1 USD = X GBP
    """
    base = base.upper()
    quote = quote.upper()
    
    if base not in SUPPORTED_CURRENCIES:
        return {
            "code": "UNSUPPORTED_CURRENCY",
            "message": f"Currency {base} is not supported",
            "details": {"supported": SUPPORTED_CURRENCIES}
        }
    
    if quote not in SUPPORTED_CURRENCIES:
        return {
            "code": "UNSUPPORTED_CURRENCY", 
            "message": f"Currency {quote} is not supported",
            "details": {"supported": SUPPORTED_CURRENCIES}
        }
    
    # For MVP, we only support current day rates
    # Historical rates would require database storage
    rate_date = date.today()
    if as_of_date:
        try:
            rate_date = date.fromisoformat(as_of_date)
        except ValueError:
            pass
    
    rate = await get_fx_rate(base, quote)
    
    if rate is None:
        return {
            "code": "RATE_NOT_AVAILABLE",
            "message": f"No rate available for {base}/{quote}",
            "details": {}
        }
    
    return {
        "base": base,
        "quote": quote,
        "rate": rate,
        "as_of": rate_date.isoformat(),
        "source": "ECB",
        "is_stale": rate_date != date.today()
    }


@router.get("/convert")
async def convert_amount(
    amount: float = Query(..., description="Amount to convert"),
    from_ccy: str = Query(..., alias="from", description="Source currency"),
    to_ccy: str = Query(..., alias="to", description="Target currency")
):
    """
    Convert an amount between currencies.
    
    Example: GET /fx/convert?amount=1000&from=USD&to=GBP
    """
    from_ccy = from_ccy.upper()
    to_ccy = to_ccy.upper()
    
    rates = await get_latest_rates()
    
    if from_ccy not in rates:
        return {
            "code": "UNSUPPORTED_CURRENCY",
            "message": f"Currency {from_ccy} is not supported"
        }
    
    if to_ccy not in rates.get(from_ccy, {}):
        return {
            "code": "UNSUPPORTED_CURRENCY",
            "message": f"Currency {to_ccy} is not supported"
        }
    
    rate = rates[from_ccy][to_ccy]
    converted = round(amount * rate, 2)
    
    return {
        "original": {
            "amount": amount,
            "currency": from_ccy
        },
        "converted": {
            "amount": converted,
            "currency": to_ccy
        },
        "rate": rate,
        "as_of": date.today().isoformat()
    }
