"""
Portfolio API router.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Portfolio, Holding, Transaction, WatchlistItem
from services.stock_data import stock_service
from services.currency import currency_service


router = APIRouter()


# Pydantic models for requests/responses
class HoldingCreate(BaseModel):
    symbol: str
    shares: float
    avg_cost: float


class PortfolioCreate(BaseModel):
    name: str = "My Portfolio"
    currency: str = "USD"
    risk_profile: str = "moderate"
    holdings: List[HoldingCreate] = []


class TransactionCreate(BaseModel):
    symbol: str
    transaction_type: str  # buy, sell
    shares: float
    price: float
    currency: str = "USD"


class WatchlistCreate(BaseModel):
    symbol: str
    notes: Optional[str] = None
    target_price: Optional[float] = None


# Portfolio endpoints
@router.get("/")
async def get_portfolios(db: Session = Depends(get_db)):
    """Get all portfolios."""
    portfolios = db.query(Portfolio).all()
    return {"portfolios": [_format_portfolio(p, db) for p in portfolios]}


@router.post("/")
async def create_portfolio(portfolio: PortfolioCreate, db: Session = Depends(get_db)):
    """Create a new portfolio."""
    db_portfolio = Portfolio(
        name=portfolio.name,
        currency=portfolio.currency,
        risk_profile=portfolio.risk_profile
    )
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    
    # Add initial holdings
    for holding in portfolio.holdings:
        db_holding = Holding(
            portfolio_id=db_portfolio.id,
            symbol=holding.symbol.upper(),
            shares=holding.shares,
            avg_cost=holding.avg_cost
        )
        db.add(db_holding)
    
    db.commit()
    
    return {"success": True, "portfolio": _format_portfolio(db_portfolio, db)}


@router.get("/{portfolio_id}")
async def get_portfolio(portfolio_id: int, db: Session = Depends(get_db)):
    """Get a specific portfolio with current values."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    return _format_portfolio(portfolio, db)


@router.get("/{portfolio_id}/summary")
async def get_portfolio_summary(
    portfolio_id: int,
    target_currency: str = "USD",
    db: Session = Depends(get_db)
):
    """Get portfolio summary with values converted to target currency."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio_id).all()
    
    total_value = 0
    total_cost = 0
    positions = []
    
    for holding in holdings:
        stock_info = stock_service.get_stock_info(holding.symbol)
        current_price = stock_info.get("current_price", 0)
        stock_currency = stock_info.get("currency", "USD")
        
        # Convert to target currency if needed
        if stock_currency != target_currency:
            current_price = currency_service.convert(
                current_price, stock_currency, target_currency
            )
        
        current_value = current_price * holding.shares
        cost_basis = holding.avg_cost * holding.shares
        gain_loss = current_value - cost_basis
        gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis > 0 else 0
        
        total_value += current_value
        total_cost += cost_basis
        
        positions.append({
            "symbol": holding.symbol,
            "name": stock_info.get("name", holding.symbol),
            "shares": holding.shares,
            "avg_cost": holding.avg_cost,
            "current_price": round(current_price, 2),
            "prev_close": round(stock_info.get("previous_close", current_price), 2),
            "daily_change_pct": round(stock_info.get("change_percent", 0), 2),
            "current_value": round(current_value, 2),
            "gain_loss": round(gain_loss, 2),
            "gain_loss_pct": round(gain_loss_pct, 2)
        })
    
    # Calculate weights
    for pos in positions:
        pos["weight"] = round(pos["current_value"] / total_value * 100, 2) if total_value > 0 else 0
    
    total_gain_loss = total_value - total_cost
    total_gain_loss_pct = (total_gain_loss / total_cost * 100) if total_cost > 0 else 0
    
    # Calculate total daily change (weighted average)
    total_daily_change = sum(
        pos["daily_change_pct"] * pos["weight"] / 100 
        for pos in positions
    ) if positions else 0
    
    # Calculate daily change in dollars
    prev_total_value = sum(
        pos["shares"] * pos["prev_close"] 
        for pos in positions
    ) if positions else 0
    daily_change_value = total_value - prev_total_value
    
    return {
        "portfolio_id": portfolio_id,
        "name": portfolio.name,
        "currency": target_currency,
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_gain_loss": round(total_gain_loss, 2),
        "total_gain_loss_pct": round(total_gain_loss_pct, 2),
        "daily_change_value": round(daily_change_value, 2),
        "daily_change_pct": round(total_daily_change, 2),
        "positions": positions,
        "position_count": len(positions)
    }


@router.post("/{portfolio_id}/holdings")
async def add_holding(
    portfolio_id: int,
    holding: HoldingCreate,
    db: Session = Depends(get_db)
):
    """Add a holding to a portfolio."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Check if holding exists
    existing = db.query(Holding).filter(
        Holding.portfolio_id == portfolio_id,
        Holding.symbol == holding.symbol.upper()
    ).first()
    
    if existing:
        # Update existing holding (average cost)
        total_shares = existing.shares + holding.shares
        total_cost = (existing.shares * existing.avg_cost) + (holding.shares * holding.avg_cost)
        existing.avg_cost = total_cost / total_shares
        existing.shares = total_shares
    else:
        # Create new holding
        db_holding = Holding(
            portfolio_id=portfolio_id,
            symbol=holding.symbol.upper(),
            shares=holding.shares,
            avg_cost=holding.avg_cost
        )
        db.add(db_holding)
    
    db.commit()
    
    return {"success": True, "message": "Holding added"}


@router.post("/{portfolio_id}/transactions")
async def add_transaction(
    portfolio_id: int,
    transaction: TransactionCreate,
    db: Session = Depends(get_db)
):
    """Record a buy/sell transaction."""
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Create transaction record
    db_transaction = Transaction(
        portfolio_id=portfolio_id,
        symbol=transaction.symbol.upper(),
        transaction_type=transaction.transaction_type,
        shares=transaction.shares,
        price=transaction.price,
        trade_currency=transaction.currency
    )
    db.add(db_transaction)
    
    # Update holding
    holding = db.query(Holding).filter(
        Holding.portfolio_id == portfolio_id,
        Holding.symbol == transaction.symbol.upper()
    ).first()
    
    if transaction.transaction_type == "buy":
        if holding:
            total_shares = holding.shares + transaction.shares
            total_cost = (holding.shares * holding.avg_cost) + (transaction.shares * transaction.price)
            holding.avg_cost = total_cost / total_shares
            holding.shares = total_shares
        else:
            holding = Holding(
                portfolio_id=portfolio_id,
                symbol=transaction.symbol.upper(),
                shares=transaction.shares,
                avg_cost=transaction.price
            )
            db.add(holding)
    elif transaction.transaction_type == "sell":
        if holding:
            holding.shares -= transaction.shares
            if holding.shares <= 0:
                db.delete(holding)
    
    db.commit()
    
    return {"success": True, "message": "Transaction recorded"}


# Watchlist endpoints
@router.get("/watchlist/items")
async def get_watchlist(db: Session = Depends(get_db)):
    """Get watchlist items with current data."""
    items = db.query(WatchlistItem).all()
    
    watchlist = []
    for item in items:
        stock_info = stock_service.get_stock_info(item.symbol)
        watchlist.append({
            "id": item.id,
            "symbol": item.symbol,
            "name": stock_info.get("name", item.symbol),
            "notes": item.notes,
            "target_price": item.target_price,
            "current_price": stock_info.get("current_price"),
            "at_target": (
                stock_info.get("current_price", 0) <= item.target_price
                if item.target_price else False
            ),
            "score": stock_info.get("score"),
            "added_at": item.added_at.isoformat() if item.added_at else None
        })
    
    return {"watchlist": watchlist}


@router.post("/watchlist/items")
async def add_to_watchlist(item: WatchlistCreate, db: Session = Depends(get_db)):
    """Add a stock to watchlist."""
    db_item = WatchlistItem(
        symbol=item.symbol.upper(),
        notes=item.notes,
        target_price=item.target_price
    )
    db.add(db_item)
    db.commit()
    
    return {"success": True, "message": "Added to watchlist"}


@router.delete("/watchlist/items/{item_id}")
async def remove_from_watchlist(item_id: int, db: Session = Depends(get_db)):
    """Remove a stock from watchlist."""
    item = db.query(WatchlistItem).filter(WatchlistItem.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    db.delete(item)
    db.commit()
    
    return {"success": True, "message": "Removed from watchlist"}


def _format_portfolio(portfolio: Portfolio, db: Session) -> dict:
    """Format portfolio for API response."""
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio.id).all()
    
    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "currency": portfolio.currency,
        "risk_profile": portfolio.risk_profile,
        "holdings_count": len(holdings),
        "created_at": portfolio.created_at.isoformat() if portfolio.created_at else None,
        "holdings": [
            {
                "symbol": h.symbol,
                "shares": h.shares,
                "avg_cost": h.avg_cost
            }
            for h in holdings
        ]
    }
