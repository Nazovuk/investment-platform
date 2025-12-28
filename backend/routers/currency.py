"""
Currency API router.
"""

from fastapi import APIRouter, Query
from typing import Optional

from services.currency import currency_service


router = APIRouter()


@router.get("/rates")
async def get_exchange_rates(base: str = Query("USD", description="Base currency")):
    """
    Get current exchange rates.
    """
    rates = currency_service.get_rates_sync(base)
    
    return {
        "base": base,
        "rates": rates,
        "supported_currencies": currency_service.get_supported_currencies()
    }


@router.get("/convert")
async def convert_amount(
    amount: float = Query(..., description="Amount to convert"),
    from_currency: str = Query("USD", description="Source currency"),
    to_currency: str = Query("EUR", description="Target currency")
):
    """
    Convert an amount from one currency to another.
    """
    converted = currency_service.convert(amount, from_currency, to_currency)
    
    return {
        "original": {
            "amount": amount,
            "currency": from_currency,
            "formatted": currency_service.format_currency(amount, from_currency)
        },
        "converted": {
            "amount": converted,
            "currency": to_currency,
            "formatted": currency_service.format_currency(converted, to_currency)
        }
    }


@router.get("/supported")
async def get_supported_currencies():
    """
    Get list of supported currencies.
    """
    currencies = currency_service.get_supported_currencies()
    
    currency_info = {
        "USD": {"name": "US Dollar", "symbol": "$"},
        "EUR": {"name": "Euro", "symbol": "€"},
        "GBP": {"name": "British Pound", "symbol": "£"},
        "TRY": {"name": "Turkish Lira", "symbol": "₺"},
        "JPY": {"name": "Japanese Yen", "symbol": "¥"},
        "CHF": {"name": "Swiss Franc", "symbol": "CHF"},
        "CAD": {"name": "Canadian Dollar", "symbol": "C$"},
        "AUD": {"name": "Australian Dollar", "symbol": "A$"}
    }
    
    return {
        "currencies": [
            {
                "code": code,
                "name": currency_info.get(code, {}).get("name", code),
                "symbol": currency_info.get(code, {}).get("symbol", code)
            }
            for code in currencies
        ]
    }
