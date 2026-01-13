"""
Screener service - Filters stocks using Hybrid Database + Live Price strategy.
"""

import asyncio
import csv
import logging
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import SessionLocal
from models import ScreenerStock
from data.indices import DEFAULT_UNIVERSE, SP500_TICKERS
import math

logger = logging.getLogger(__name__)


def _sanitize_value(val):
    """Convert NaN/Inf to None for JSON compatibility."""
    if val is None:
        return None
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


def _sanitize_dict(d: Dict) -> Dict:
    """Sanitize all values in a dict for JSON serialization."""
    return {k: _sanitize_value(v) for k, v in d.items()}

@dataclass
class ScreenerFilters:
    min_pe: Optional[float] = None
    max_pe: Optional[float] = None
    max_peg: Optional[float] = None
    min_revenue_growth: Optional[float] = None
    min_upside: Optional[float] = None
    min_score: Optional[int] = None
    sectors: Optional[List[str]] = None
    market: Optional[str] = None


async def initialize_screener_data():
    """Seeds the database with S&P 500 tickers if empty."""
    db = SessionLocal()
    try:
        count = db.query(ScreenerStock).count()
        if count > 10:
            logger.info(f"Screener database already initialized with {count} stocks.")
            # Trigger background update anyway to ensure freshness
            asyncio.create_task(update_fundamentals_background())
            return

        logger.info("Seeding screener database from S&P 500 CSV...")
        csv_path = "data/sp500.csv"
        
        if not os.path.exists(csv_path):
            logger.error(f"CSV file not found at {csv_path}. Skipping seed.")
            return

        added_count = 0
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # Skip header
            
            for row in reader:
                if not row: continue
                symbol = row[0].strip()
                sector = row[2].strip() if len(row) > 2 else "Unknown"
                name = row[1].strip() if len(row) > 1 else symbol

                existing = db.query(ScreenerStock).filter(ScreenerStock.symbol == symbol).first()
                if not existing:
                    stock = ScreenerStock(
                        symbol=symbol,
                        company_name=name,
                        sector=sector,
                        market="S&P 500"
                    )
                    db.add(stock)
                    added_count += 1
        
        db.commit()
        logger.info(f"Seeded {added_count} stocks to DB.")
        
        # Start initial data fetch in background
        asyncio.create_task(update_fundamentals_background())

    except Exception as e:
        logger.error(f"Failed to initialize screener data: {e}")
    finally:
        db.close()


async def update_fundamentals_background():
    """Background task to fetch fundamental data (slow) for all stocks."""
    logger.info("Starting background fundamental data update...")
    db = SessionLocal()
    try:
        stocks = db.query(ScreenerStock).all()
        # Process in chunks of 20
        chunk_size = 20
        for i in range(0, len(stocks), chunk_size):
            chunk = stocks[i:i + chunk_size]
            symbols = [s.symbol for s in chunk]
            
            try:
                # We use yfinance Tickers to batch basic info access if possible
                # Unfortunately .info is per-ticker property that triggers request
                # But we can try concurrent access? yfinance is synchronous. 
                # We run it in executor to not block main loop.
                await asyncio.to_thread(_update_chunk, db, symbols)
                logger.info(f"Updated chunk {i}-{i+len(chunk)}")
            except Exception as e:
                logger.error(f"Error updating chunk {symbols}: {e}")
            
            await asyncio.sleep(2) # rate limit politeness

        logger.info("Background update completed.")
    except Exception as e:
        logger.error(f"Background update failed: {e}")
    finally:
        db.close()

def _update_chunk(db: Session, symbols: List[str]):
    """Synchronous function to update a chunk of stocks."""
    # Create fresh session for thread safety if needed, but we passed one.
    # Actually reusing session across threads is risky. Better to create new one or be careful.
    # Since we await to_thread, it's serialized effectively.
    
    # We fetch tickers one by one or via Tickers object.
    # .info attribute access fetches data.
    
    tickers = yf.Tickers(" ".join(symbols))
    
    for symbol in symbols:
        try:
            ticker_obj = tickers.tickers[symbol]
            info = ticker_obj.info
            
            # Find stock in DB (must query again or merge)
            stock = db.query(ScreenerStock).filter(ScreenerStock.symbol == symbol).first()
            if not stock: continue
            
            # Update fields
            stock.pe_ratio = info.get('trailingPE') or info.get('forwardPE')
            stock.peg_ratio = info.get('pegRatio')
            stock.eps_ttm = info.get('trailingEps')
            stock.market_cap = info.get('marketCap')
            stock.revenue_growth = info.get('revenueGrowth')
            stock.current_price = info.get('currentPrice') or info.get('regularMarketPrice')
            
            # Calculate mock score if not present
            stock.score = _calculate_score(stock)
            stock.upside_potential = _calculate_upside(stock, info)
            
            stock.last_updated = datetime.now()
            db.commit()
            
        except Exception as e:
            # logger.warning(f"Failed update for {symbol}: {e}")
            pass

def _calculate_score(stock: ScreenerStock) -> float:
    score = 50.0
    if stock.pe_ratio and stock.pe_ratio < 25: score += 10
    if stock.revenue_growth and stock.revenue_growth > 0.1: score += 10
    if stock.peg_ratio and stock.peg_ratio < 1.5: score += 10
    return min(100.0, score)

def _calculate_upside(stock: ScreenerStock, info: Dict) -> float:
    target = info.get('targetMeanPrice')
    current = stock.current_price
    if target and current:
        return ((target - current) / current) * 100
    return 0.0


async def screen_stocks(filters: ScreenerFilters) -> List[Dict[str, Any]]:
    """
    Screen stocks using DB cache + Live Price refinement.
    """
    db = SessionLocal()
    try:
        query = db.query(ScreenerStock)
        
        # 1. Apply static filters (Sector, Market)
        if filters.market:
            # If market is S&P 500, we filter by market column (if populated) or just return all
            # Since we seeded only SP500, existing data is SP500.
            # But we might expand later.
            if "S&P" in filters.market:
                query = query.filter(ScreenerStock.market == "S&P 500")
            elif "NASDAQ" in filters.market:
                # We haven't seeded NASDAQ yet, but logic is here
                pass 
                
        if filters.sectors and filters.sectors[0]:
            # Use LIKE for partial matching (e.g., "Technology" matches "Information Technology")
            query = query.filter(ScreenerStock.sector.ilike(f"%{filters.sectors[0]}%"))

        candidates = query.all()
        
        # 2. Convert to Dict and Fetch Live Prices for accuracy
        results = []
        
        # Optimization: cache live prices for 1 minute
        # For now, we trust DB 'current_price' if it's recent (background job runs).
        # But user wants "Simultaneous" update.
        # If DB data is old (> 1 hour), we might want to fetch live price.
        # However, fetching 500 live prices here takes time.
        # compromise: We use DB price which is updated by background job.
        # AND we implement a 'quick check' for the top results?
        
        # The user said "1 min wait is fine".
        # So we relying on the background job is acceptable IF it runs fast enough.
        # BUT the background job takes ~10 mins to cycle.
        
        # Alternate: We rely on yf.download(batch) for ALL candidates.
        symbols = [s.symbol for s in candidates]
        if symbols:
            # Batch fetch prices - this is FAST (2-3s for 500 stocks)
            try:
                # Only last price
                df = await asyncio.to_thread(yf.download, symbols, period="1d", interval="1d", progress=False)
                # 'Close' column has data.
                # Process df to get latest price map
                if not df.empty and 'Close' in df:
                    # df['Close'] might be MultiIndex if many symbols, or Series if 1.
                    latest_prices = df['Close'].iloc[-1] # Last row
                else:
                    latest_prices = None
            except Exception as e:
                logger.error(f"Batch price fetch failed: {e}")
                latest_prices = None
        else:
            latest_prices = None
            
        for stock in candidates:
            # Update price from live batch if available
            live_price = None
            if latest_prices is not None:
                try:
                    val = latest_prices[stock.symbol]
                    # Handle if it's a scalar or Series (pandas quirks)
                    live_price = float(val) if val else None
                except:
                    pass
            
            final_price = live_price if live_price else stock.current_price
            
            # Recalculate P/E using live price
            pe = stock.pe_ratio
            if final_price and stock.eps_ttm:
                pe = final_price / stock.eps_ttm
            
            stock_data = {
                "symbol": stock.symbol,
                "name": stock.company_name,
                "price": final_price,
                "pe": pe,
                "peg": stock.peg_ratio,
                "score": stock.score or 50,
                "upside": stock.upside_potential,
                "sector": stock.sector,
                "market_cap": stock.market_cap,
                "revenue_growth": stock.revenue_growth
            }
            
            
            # Sanitize data for JSON serialization (handles NaN, Inf)
            stock_data = _sanitize_dict(stock_data)
            
            # 3. Apply numeric filters on Final Data
            if _passes_filters(stock_data, filters):
                results.append(stock_data)

        return results

    except Exception as e:
        logger.error(f"Screening failed: {e}")
        return []
    finally:
        db.close()


def _passes_filters(stock: Dict, filters: ScreenerFilters) -> bool:
    if filters.min_pe and (not stock.get("pe") or stock["pe"] < filters.min_pe): return False
    if filters.max_pe and (not stock.get("pe") or stock["pe"] > filters.max_pe): return False
    if filters.max_peg and (not stock.get("peg") or stock["peg"] > filters.max_peg): return False
    if filters.min_score and (stock.get("score", 0) < filters.min_score): return False
    if filters.min_upside and (stock.get("upside", 0) < filters.min_upside): return False
    if filters.min_revenue_growth and (stock.get("revenue_growth", 0) < filters.min_revenue_growth): return False
    return True


async def fetch_all_stocks(symbols: List[str]) -> List[Dict[str, Any]]:
    """Fetch stock data for a list of symbols using yfinance."""
    if not symbols:
        return []
    
    results = []
    try:
        # Batch download prices
        df = await asyncio.to_thread(yf.download, symbols, period="5d", interval="1d", progress=False)
        
        for symbol in symbols:
            try:
                # Get latest price from batch download
                if len(symbols) == 1:
                    price = float(df['Close'].iloc[-1]) if not df.empty else None
                else:
                    price = float(df['Close'][symbol].iloc[-1]) if symbol in df['Close'].columns else None
                
                # Try to get info from DB first
                db = SessionLocal()
                cached = db.query(ScreenerStock).filter(ScreenerStock.symbol == symbol).first()
                db.close()
                
                stock_data = {
                    "symbol": symbol,
                    "name": cached.company_name if cached else symbol,
                    "current_price": price,
                    "pe_ratio": cached.pe_ratio if cached else None,
                    "peg_ratio": cached.peg_ratio if cached else None,
                    "score": cached.score if cached else 50,
                    "upside_potential": cached.upside_potential if cached else 0,
                    "sector": cached.sector if cached else "Unknown",
                    "market_cap": cached.market_cap if cached else None
                }
                results.append(stock_data)
            except Exception as e:
                logger.warning(f"Failed to process {symbol}: {e}")
                continue
                
    except Exception as e:
        logger.error(f"Batch fetch failed: {e}")
    
    return results


async def fetch_single_stock(symbol: str) -> Optional[Dict[str, Any]]:
    """Fetch a single stock's data using yfinance."""
    try:
        ticker = await asyncio.to_thread(lambda: yf.Ticker(symbol))
        info = await asyncio.to_thread(lambda: ticker.info)
        
        if not info or info.get('regularMarketPrice') is None:
            return None
        
        return {
            "symbol": symbol,
            "name": info.get('shortName', symbol),
            "current_price": info.get('regularMarketPrice') or info.get('currentPrice'),
            "pe_ratio": info.get('trailingPE') or info.get('forwardPE'),
            "peg_ratio": info.get('pegRatio'),
            "score": 50,  # Default score for new lookups
            "upside_potential": _calc_upside(info),
            "sector": info.get('sector', 'Unknown'),
            "market_cap": info.get('marketCap')
        }
    except Exception as e:
        logger.error(f"Failed to fetch {symbol}: {e}")
        return None


def _calc_upside(info: Dict) -> float:
    target = info.get('targetMeanPrice')
    current = info.get('regularMarketPrice') or info.get('currentPrice')
    if target and current:
        return ((target - current) / current) * 100
    return 0.0
