
import asyncio
import logging
import sys
import os
import time

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import ScreenerStock
from data.indices import NASDAQ100_TICKERS
import yfinance as yf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_nasdaq():
    db = SessionLocal()
    try:
        logger.info(f"Starting seed for {len(NASDAQ100_TICKERS)} NASDAQ 100 tickers...")
        
        # Check which exist
        existing_nasdaq = {s.symbol for s in db.query(ScreenerStock).filter(ScreenerStock.market == "NASDAQ 100").all()}
        
        to_add = [t for t in NASDAQ100_TICKERS if t not in existing_nasdaq]
        logger.info(f"Found {len(to_add)} tickers to add.")
        
        count = 0
        skipped = 0
        updated = 0
        
        for symbol in to_add:
            try:
                # Check for existence in OTHER markets (many NASDAQ stocks are in S&P 500)
                exists_any = db.query(ScreenerStock).filter(ScreenerStock.symbol == symbol).first()
                if exists_any:
                    # If it exists, we don't want to duplicate it.
                    # But if the user filters by NASDAQ, they want to see it.
                    # Our simple model has a SINGLE "market" field.
                    # Ideally, we should support multiple markets or tags.
                    # FOR NOW: We will NOT change the market if it's already "S&P 500".
                    # We will only add if it's completely new.
                    # OR we could update it to "S&P 500, NASDAQ 100" string if we want partial match?
                    # The filter uses EXACT match for S&P 500. 
                    
                    # Strategy: If it's already in S&P 500, we skip adding a new row.
                    # However, this means "NASDAQ 100" filter will miss S&P 500 overlaps (like AAPL).
                    # FIX: We should update the filter logic to handle overlaps, OR update the column to be a list/CSV.
                    # Let's check how many overlap.
                    skipped += 1
                    continue

                time.sleep(1) # Be polite

                # Basic info fetch
                try:
                    tick = yf.Ticker(symbol)
                    info = tick.info
                    name = info.get('longName') or info.get('shortName') or symbol
                    sector = info.get('sector', 'Unknown')
                except Exception:
                    logger.warning(f"Could not fetch data for {symbol}, using defaults.")
                    name = symbol
                    sector = "Unknown"
                
                stock = ScreenerStock(
                    symbol=symbol,
                    company_name=name,
                    sector=sector,
                    market="NASDAQ 100"
                )
                db.add(stock)
                count += 1
                if count % 5 == 0:
                    db.commit()
                    logger.info(f"Added {count} new NASDAQ stocks...")
                    
            except Exception as e:
                logger.error(f"Failed to fetch/add {symbol}: {e}")
        
        db.commit()
        logger.info(f"Seeding complete. Added {count} new unique NASDAQ stocks. Skipped {skipped} existing (S&P 500 overlaps).")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_nasdaq()
