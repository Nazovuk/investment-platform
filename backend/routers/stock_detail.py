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


@router.get("/{symbol}/news")
async def get_stock_news(symbol: str, limit: int = Query(10, ge=1, le=50)):
    """Get latest news for a stock using Finnhub API (more reliable than yfinance)."""
    import httpx
    import os
    from datetime import datetime, timedelta
    
    FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "d58lr11r01qvj8ihdt60d58lr11r01qvj8ihdt6g")
    
    try:
        # Use Finnhub company news endpoint
        today = datetime.now()
        from_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://finnhub.io/api/v1/company-news?symbol={symbol.upper()}&from={from_date}&to={to_date}&token={FINNHUB_API_KEY}"
            response = await client.get(url)
            
            if response.status_code == 200:
                news_data = response.json()
                
                formatted_news = []
                for item in news_data[:limit]:
                    # Finnhub has consistent structure
                    pub_time = item.get("datetime", 0)
                    pub_date = datetime.fromtimestamp(pub_time).strftime("%b %d, %Y") if pub_time > 0 else "Recently"
                    
                    formatted_news.append({
                        "title": item.get("headline", "News Article"),
                        "publisher": item.get("source", "Financial News"),
                        "link": item.get("url", ""),
                        "published": pub_time,
                        "published_date": pub_date,
                        "thumbnail": item.get("image", ""),
                        "summary": item.get("summary", "")[:300] + "..." if len(item.get("summary", "")) > 300 else item.get("summary", ""),
                        "type": "article",
                    })
                
                if formatted_news:
                    return {
                        "symbol": symbol.upper(),
                        "count": len(formatted_news),
                        "news": formatted_news
                    }
        
        # Fallback to yfinance if Finnhub fails
        ticker = yf.Ticker(symbol.upper())
        news = ticker.news or []
        
        formatted_news = []
        for item in news[:limit]:
            title = item.get("title") or item.get("headline") or "News Article"
            publisher = item.get("publisher") or item.get("source") or "Financial News"
            link = item.get("link") or item.get("url") or ""
            pub_time = item.get("providerPublishTime") or 0
            
            thumbnail = ""
            if item.get("thumbnail"):
                thumb = item["thumbnail"]
                if isinstance(thumb, dict):
                    resolutions = thumb.get("resolutions", [])
                    if resolutions:
                        thumbnail = resolutions[0].get("url", "")
                elif isinstance(thumb, str):
                    thumbnail = thumb
            
            summary = item.get("summary") or item.get("description") or title
            pub_date = datetime.fromtimestamp(pub_time).strftime("%b %d, %Y") if pub_time > 0 else "Recently"
            
            formatted_news.append({
                "title": title,
                "publisher": publisher,
                "link": link,
                "published": pub_time,
                "published_date": pub_date,
                "thumbnail": thumbnail,
                "summary": summary[:300] + "..." if len(summary) > 300 else summary,
                "type": "article",
            })
        
        return {
            "symbol": symbol.upper(),
            "count": len(formatted_news),
            "news": formatted_news
        }
        
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {e}")
        return {"symbol": symbol.upper(), "count": 0, "news": []}


@router.get("/{symbol}/earnings")
async def get_stock_earnings(symbol: str):
    """Get quarterly earnings data with EPS comparisons."""
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        
        quarters = []
        eps_history = []
        
        # Try to get quarterly income statement (most reliable)
        try:
            quarterly_income = ticker.quarterly_income_stmt
            if quarterly_income is not None and not quarterly_income.empty:
                for col in quarterly_income.columns[:8]:  # Last 8 quarters
                    period_date = str(col.date()) if hasattr(col, 'date') else str(col)[:10]
                    
                    # Get key metrics
                    revenue = None
                    earnings = None
                    eps = None
                    
                    if "Total Revenue" in quarterly_income.index:
                        val = quarterly_income.loc["Total Revenue", col]
                        revenue = float(val) if pd.notna(val) else None
                    
                    if "Net Income" in quarterly_income.index:
                        val = quarterly_income.loc["Net Income", col]
                        earnings = float(val) if pd.notna(val) else None
                    
                    # Calculate EPS if shares outstanding available
                    if "Basic EPS" in quarterly_income.index:
                        val = quarterly_income.loc["Basic EPS", col]
                        eps = float(val) if pd.notna(val) else None
                    elif "Diluted EPS" in quarterly_income.index:
                        val = quarterly_income.loc["Diluted EPS", col]
                        eps = float(val) if pd.notna(val) else None
                    
                    quarters.append({
                        "date": period_date,
                        "revenue": revenue,
                        "earnings": earnings,
                        "eps": eps,
                    })
                    
                    # Also add to eps_history
                    if eps is not None:
                        eps_history.append({
                            "date": period_date,
                            "eps_actual": eps,
                            "eps_estimate": None,  # Not available from income stmt
                            "eps_difference": None,
                            "surprise_pct": None,
                        })
        except Exception as e:
            logger.warning(f"Could not get quarterly income for {symbol}: {e}")
        
        # If no data from quarterly income, try earnings_dates for estimates
        if not quarters:
            try:
                earnings_dates = ticker.earnings_dates
                if earnings_dates is not None and not earnings_dates.empty:
                    for idx, row in earnings_dates.tail(8).iterrows():
                        date_str = str(idx)[:10] if hasattr(idx, 'strftime') else str(idx)[:10]
                        eps_history.append({
                            "date": date_str,
                            "eps_actual": row.get("Reported EPS"),
                            "eps_estimate": row.get("EPS Estimate"),
                            "eps_difference": None,
                            "surprise_pct": row.get("Surprise(%)"),
                        })
            except Exception as e:
                logger.warning(f"Could not get earnings_dates for {symbol}: {e}")
        
        # Get next earnings date
        next_earnings = None
        try:
            earnings_dates = ticker.earnings_dates
            if earnings_dates is not None and not earnings_dates.empty:
                future_dates = earnings_dates[earnings_dates.index > pd.Timestamp.now()]
                if not future_dates.empty:
                    next_earnings = str(future_dates.index[0])[:10]
        except:
            pass
        
        # Fall back to info for current EPS
        current_eps = info.get("trailingEps")
        forward_eps = info.get("forwardEps")
        
        return {
            "symbol": symbol.upper(),
            "quarters": quarters,
            "eps_history": eps_history,
            "next_earnings": next_earnings,
            "current_eps": current_eps,
            "forward_eps": forward_eps,
        }
        
    except Exception as e:
        logger.error(f"Error fetching earnings for {symbol}: {e}")
        return {"symbol": symbol.upper(), "quarters": [], "eps_history": [], "next_earnings": None}


@router.get("/{symbol}/financials")
async def get_stock_financials(symbol: str):
    """Get detailed income statement and cash flow data."""
    try:
        ticker = yf.Ticker(symbol.upper())
        
        # Get income statement - more detailed metrics
        income_stmt = ticker.income_stmt
        income_data = []
        income_rows = [
            ("Total Revenue", "total_revenue"),
            ("Cost Of Revenue", "cost_of_revenue"),
            ("Gross Profit", "gross_profit"),
            ("Operating Expense", "operating_expense"),
            ("Operating Income", "operating_income"),
            ("Interest Expense", "interest_expense"),
            ("Pretax Income", "pretax_income"),
            ("Tax Provision", "tax_provision"),
            ("Net Income", "net_income"),
            ("EBITDA", "ebitda"),
        ]
        
        if income_stmt is not None and not income_stmt.empty:
            for col in income_stmt.columns[:5]:  # Last 5 periods
                period = str(col.date()) if hasattr(col, 'date') else str(col)[:10]
                data = {"period": period}
                for row_name, key in income_rows:
                    if row_name in income_stmt.index:
                        val = income_stmt.loc[row_name, col]
                        data[key] = float(val) if pd.notna(val) else None
                    else:
                        data[key] = None
                income_data.append(data)
        
        # Get cash flow - detailed breakdown
        cash_flow = ticker.cashflow
        cashflow_data = []
        cashflow_rows = [
            ("Operating Cash Flow", "operating_cash_flow"),
            ("Investing Cash Flow", "investing_cash_flow"),
            ("Financing Cash Flow", "financing_cash_flow"),
            ("End Cash Position", "end_cash_position"),
            ("Capital Expenditure", "capital_expenditure"),
            ("Issuance Of Capital Stock", "issuance_of_capital_stock"),
            ("Issuance Of Debt", "issuance_of_debt"),
            ("Repayment Of Debt", "repayment_of_debt"),
            ("Repurchase Of Capital Stock", "repurchase_of_capital_stock"),
            ("Free Cash Flow", "free_cash_flow"),
        ]
        
        if cash_flow is not None and not cash_flow.empty:
            for col in cash_flow.columns[:5]:  # Last 5 periods
                period = str(col.date()) if hasattr(col, 'date') else str(col)[:10]
                data = {"period": period}
                for row_name, key in cashflow_rows:
                    if row_name in cash_flow.index:
                        val = cash_flow.loc[row_name, col]
                        data[key] = float(val) if pd.notna(val) else None
                    else:
                        data[key] = None
                cashflow_data.append(data)
        
        return {
            "symbol": symbol.upper(),
            "income_statement": income_data,
            "cash_flow": cashflow_data,
        }
        
    except Exception as e:
        logger.error(f"Error fetching financials for {symbol}: {e}")
        return {"symbol": symbol.upper(), "income_statement": [], "cash_flow": []}


@router.get("/{symbol}/valuation")
async def get_stock_valuation(symbol: str):
    """
    Get deterministic fair value calculation for a stock.
    
    Uses relative valuation based on:
    - P/E vs sector average
    - EV/EBITDA vs sector average
    - Revenue growth adjustment
    - Margin quality adjustment
    
    ❌ NOT investment advice
    ❌ NOT a target price
    """
    from services.fair_value import calculate_fair_value, get_valuation_explanation
    
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        
        if not info or len(info) < 5:
            return {
                "code": "STOCK_NOT_FOUND",
                "message": f"Stock {symbol} not found",
                "details": {}
            }
        
        current_price = info.get("currentPrice", info.get("regularMarketPrice", 0))
        
        if not current_price or current_price <= 0:
            return {
                "code": "FAIR_VALUE_NOT_AVAILABLE",
                "message": "Insufficient data to calculate fair value",
                "details": {"reason": "Missing current price"}
            }
        
        # Extract needed metrics
        pe_ratio = info.get("trailingPE")
        ev_ebitda = info.get("enterpriseToEbitda")
        revenue_growth = info.get("revenueGrowth")
        profit_margin = info.get("profitMargins")
        sector = info.get("sector", "Unknown")
        eps = info.get("trailingEps")
        
        # Calculate fair value
        result = calculate_fair_value(
            ticker=symbol.upper(),
            current_price=current_price,
            pe_ratio=pe_ratio,
            ev_ebitda=ev_ebitda,
            revenue_growth=revenue_growth,
            net_margin=profit_margin,
            sector=sector,
            eps=eps
        )
        
        # Add explanation
        result["explanation"] = get_valuation_explanation(result)
        
        # Add source data for transparency
        result["source_data"] = {
            "pe_ratio": pe_ratio,
            "ev_ebitda": ev_ebitda,
            "revenue_growth": round(revenue_growth * 100, 2) if revenue_growth else None,
            "profit_margin": round(profit_margin * 100, 2) if profit_margin else None,
            "sector": sector,
            "eps": eps
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error calculating valuation for {symbol}: {e}")
        return {
            "code": "VALUATION_ERROR",
            "message": "Error calculating fair value",
            "details": {"error": str(e)}
        }
