"""Database models for the investment platform."""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Portfolio(Base):
    """User portfolio model."""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, default="My Portfolio")
    currency = Column(String(3), default="USD")
    risk_profile = Column(String(20), default="moderate")  # conservative, moderate, aggressive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    """Stock holding in a portfolio."""
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol = Column(String(10), nullable=False)
    shares = Column(Float, nullable=False)
    avg_cost = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")


class Transaction(Base):
    """Buy/sell transactions."""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol = Column(String(10), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # buy, sell
    shares = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")


class WatchlistItem(Base):
    """Stocks on the watchlist."""
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), nullable=False, unique=True)
    notes = Column(String(500))
    target_price = Column(Float)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


class ScreenerResult(Base):
    """Cached screener results."""
    __tablename__ = "screener_results"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), nullable=False, index=True)
    data = Column(JSON)  # Cached stock metrics
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
