
import asyncio
import logging
import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import ScreenerStock
from data.indices import FTSE100_TICKERS
import yfinance as yf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_ftse():
    db = SessionLocal()
    try:
        logger.info(f"Starting seed for {len(FTSE100_TICKERS)} FTSE 100 tickers...")
        
        # Check which exist
        existing = {s.symbol for s in db.query(ScreenerStock).filter(ScreenerStock.market == "FTSE 100").all()}
        
        to_add = [t for t in FTSE100_TICKERS if t not in existing]
        logger.info(f"Found {len(to_add)} tickers to add.")
        
        if not to_add:
            logger.info("Nothing to add.")
            return

        # Fetch data in batches or loop
        # For simplicity in seeding script, let's just create entries.
        # We rely on background updater to fill details, OR we fetch basic info now.
        # Let's fetch basic info to set name/sector.
        
        count = 0
        for symbol in to_add:
            try:
                # Try raw symbol first, then with .L if it fails or looks weird?
                # Actually, indices.py has mixed things. Let's just try as is.
                # If these are ADRs, they are fine.
                
                # Check if it already exists in DB under different market?
                # If so, just update market? No, symbol is unique.
                # If symbol exists in SP500, we skip? (Unlikely overlap except maybe global giants?)
                
                exists_any = db.query(ScreenerStock).filter(ScreenerStock.symbol == symbol).first()
                if exists_any:
                    logger.info(f"Symbol {symbol} already exists in {exists_any.market}. Skipping/Updating.")
                    if exists_any.market != "FTSE 100" and exists_any.market != "S&P 500": 
                        exists_any.market = "FTSE 100"
                    elif exists_any.market is None:
                         exists_any.market = "FTSE 100"
                    continue

                import time
                time.sleep(2) # Be polite

                # Basic info fetch
                try:
                    tick = yf.Ticker(symbol)
                    # We access a property to force fetch
                    info = tick.info
                    name = info.get('longName') or info.get('shortName') or symbol
                    sector = info.get('sector', 'Unknown')
                except Exception:
                    # Fallback if rate limited or invalid
                    logger.warning(f"Could not fetch data for {symbol}, using defaults.")
                    name = symbol
                    sector = "Unknown"
                
                stock = ScreenerStock(
                    symbol=symbol,
                    company_name=name,
                    sector=sector,
                    market="FTSE 100"
                )
                db.add(stock)
                count += 1
                if count % 5 == 0:
                    db.commit()
                    logger.info(f"Added {count} stocks...")
                    
            except Exception as e:
                logger.error(f"Failed to fetch/add {symbol}: {e}")
        
        db.commit()
        logger.info(f"Successfully seeded {count} FTSE 100 stocks.")

    except Exception as e:
        logger.error(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_ftse()
