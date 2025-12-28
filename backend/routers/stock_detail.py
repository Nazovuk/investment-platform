"""
Stock detail router - Provides detailed stock info and historical data.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{symbol}")
async def get_stock_detail(symbol: str):
    """Get detailed stock information."""
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        
        if not info or len(info) < 5:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        # Get current quote
        current_price = info.get("currentPrice", info.get("regularMarketPrice", 0))
        prev_close = info.get("previousClose", 0)
        change_pct = ((current_price - prev_close) / prev_close * 100) if prev_close else 0
        
        return {
            "symbol": symbol.upper(),
            "name": info.get("shortName", info.get("longName", symbol)),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "description": info.get("longBusinessSummary", ""),
            "website": info.get("website", ""),
            "employees": info.get("fullTimeEmployees", 0),
            
            # Price data
            "current_price": round(current_price, 2),
            "previous_close": round(prev_close, 2),
            "change_percent": round(change_pct, 2),
            "open": round(info.get("open", 0), 2),
            "high": round(info.get("dayHigh", 0), 2),
            "low": round(info.get("dayLow", 0), 2),
            "volume": info.get("volume", 0),
            "avg_volume": info.get("averageVolume", 0),
            
            # Valuation
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "peg_ratio": info.get("pegRatio"),
            "price_to_book": info.get("priceToBook"),
            "price_to_sales": info.get("priceToSalesTrailing12Months"),
            "enterprise_value": info.get("enterpriseValue"),
            "ev_to_ebitda": info.get("enterpriseToEbitda"),
            
            # Financials
            "revenue": info.get("totalRevenue"),
            "revenue_growth": info.get("revenueGrowth"),
            "gross_profit": info.get("grossProfits"),
            "ebitda": info.get("ebitda"),
            "net_income": info.get("netIncomeToCommon"),
            "eps": info.get("trailingEps"),
            "forward_eps": info.get("forwardEps"),
            
            # Margins
            "gross_margin": info.get("grossMargins"),
            "operating_margin": info.get("operatingMargins"),
            "profit_margin": info.get("profitMargins"),
            
            # Returns
            "roe": info.get("returnOnEquity"),
            "roa": info.get("returnOnAssets"),
            
            # Dividend
            "dividend_yield": info.get("dividendYield"),
            "dividend_rate": info.get("dividendRate"),
            "payout_ratio": info.get("payoutRatio"),
            "ex_dividend_date": info.get("exDividendDate"),
            
            # Balance sheet
            "total_cash": info.get("totalCash"),
            "total_debt": info.get("totalDebt"),
            "debt_to_equity": info.get("debtToEquity"),
            "current_ratio": info.get("currentRatio"),
            "quick_ratio": info.get("quickRatio"),
            
            # Analyst
            "target_high": info.get("targetHighPrice"),
            "target_low": info.get("targetLowPrice"),
            "target_mean": info.get("targetMeanPrice"),
            "recommendation": info.get("recommendationKey"),
            "num_analysts": info.get("numberOfAnalystOpinions"),
            
            # Volatility
            "beta": info.get("beta"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            "fifty_day_avg": info.get("fiftyDayAverage"),
            "two_hundred_day_avg": info.get("twoHundredDayAverage"),
            
            "last_updated": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/history")
async def get_stock_history(
    symbol: str,
    period: str = Query("6mo", description="1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, max"),
    interval: str = Query("1d", description="1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo")
):
    """Get historical price data for charts."""
    try:
        ticker = yf.Ticker(symbol.upper())
        df = ticker.history(period=period, interval=interval)
        
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No history for {symbol}")
        
        # Calculate moving averages
        df['SMA20'] = df['Close'].rolling(window=20).mean()
        df['SMA50'] = df['Close'].rolling(window=50).mean()
        df['SMA200'] = df['Close'].rolling(window=200).mean()
        
        # Calculate RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Convert to list of records
        records = []
        for idx, row in df.iterrows():
            records.append({
                "date": idx.isoformat(),
                "open": round(row['Open'], 2),
                "high": round(row['High'], 2),
                "low": round(row['Low'], 2),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume']),
                "sma20": round(row['SMA20'], 2) if pd.notna(row['SMA20']) else None,
                "sma50": round(row['SMA50'], 2) if pd.notna(row['SMA50']) else None,
                "sma200": round(row['SMA200'], 2) if pd.notna(row['SMA200']) else None,
                "rsi": round(row['RSI'], 2) if pd.notna(row['RSI']) else None,
            })
        
        return {
            "symbol": symbol.upper(),
            "period": period,
            "interval": interval,
            "count": len(records),
            "data": records
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
