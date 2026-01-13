"""Database models for the investment platform - Phase 1 compliant."""

from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, JSON, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum

from database import Base


# ============ ENUMS ============

class ValuationStatus(str, Enum):
    UNDERVALUED = "UNDERVALUED"
    FAIRLY_VALUED = "FAIRLY_VALUED"
    OVERVALUED = "OVERVALUED"


class RiskLevel(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


# ============ USER ============

class User(Base):
    """User model with preferences."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    preferred_locale = Column(String(10), default="en-GB")  # en-GB, tr-TR
    preferred_reporting_currency = Column(String(3), default="GBP")  # GBP, USD, EUR, TRY
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    screeners = relationship("SavedScreener", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


# ============ INSTRUMENTS ============

class Instrument(Base):
    """Financial instrument (stock, ETF, etc.)."""
    __tablename__ = "instruments"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    exchange = Column(String(20), default="NYSE")  # NYSE, NASDAQ, LSE, etc.
    name = Column(String(255))
    native_currency = Column(String(3), default="USD")  # Native trading currency
    sector = Column(String(100))
    industry = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Unique constraint on ticker + exchange
    __table_args__ = (
        # UniqueConstraint('ticker', 'exchange', name='uix_ticker_exchange'),
    )


# ============ MARKET DATA ============

class MarketDailyOHLC(Base):
    """Daily OHLC market data snapshot."""
    __tablename__ = "market_daily_ohlc"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    adj_close = Column(Float)
    
    __table_args__ = (
        # UniqueConstraint('ticker', 'date', name='uix_ohlc_ticker_date'),
    )


class IndicatorsDaily(Base):
    """Daily technical indicators snapshot."""
    __tablename__ = "indicators_daily"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    sma_20 = Column(Float)
    sma_50 = Column(Float)
    sma_200 = Column(Float)
    rsi_14 = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    bollinger_upper = Column(Float)
    bollinger_lower = Column(Float)


# ============ FUNDAMENTALS ============

class FundamentalsSnapshot(Base):
    """Fundamental data snapshot for a stock."""
    __tablename__ = "fundamentals_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    as_of = Column(Date, nullable=False, index=True)
    market_cap = Column(Float)
    pe_ratio = Column(Float)
    forward_pe = Column(Float)
    peg_ratio = Column(Float)
    price_to_book = Column(Float)
    eps = Column(Float)
    dividend_yield = Column(Float)
    beta = Column(Float)
    shares_outstanding = Column(Float)


class FinancialsSnapshot(Base):
    """Financial statement snapshot."""
    __tablename__ = "financials_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    period = Column(String(10), nullable=False)  # Q1, Q2, Q3, Q4, FY
    fiscal_year = Column(Integer, nullable=False)
    as_of = Column(Date, nullable=False)
    
    # Income Statement
    revenue = Column(Float)
    gross_profit = Column(Float)
    operating_income = Column(Float)
    ebitda = Column(Float)
    net_income = Column(Float)
    
    # Balance Sheet
    total_assets = Column(Float)
    total_liabilities = Column(Float)
    total_equity = Column(Float)
    cash_and_equivalents = Column(Float)
    total_debt = Column(Float)
    
    # Cash Flow
    operating_cash_flow = Column(Float)
    capital_expenditure = Column(Float)
    free_cash_flow = Column(Float)


# ============ FAIR VALUE ============

class FairValueSnapshot(Base):
    """Deterministic fair value calculation snapshot."""
    __tablename__ = "fair_value_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    as_of = Column(Date, nullable=False, index=True)
    
    # Values
    fair_value = Column(Float, nullable=False)  # In native currency
    current_price = Column(Float)
    upside_pct = Column(Float)  # (fair_value - current_price) / current_price * 100
    status = Column(String(20))  # UNDERVALUED, FAIRLY_VALUED, OVERVALUED
    
    # Methodology
    methodology_version = Column(String(20), default="1.0")
    pe_vs_sector = Column(Float)  # Stock P/E compared to sector average
    ev_ebitda_vs_sector = Column(Float)  # EV/EBITDA compared to sector
    revenue_growth_adj = Column(Float)
    margin_quality_adj = Column(Float)
    
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ FX RATES ============

class FXRate(Base):
    """Foreign exchange rate snapshot."""
    __tablename__ = "fx_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    base = Column(String(3), nullable=False, index=True)  # e.g., USD
    quote = Column(String(3), nullable=False, index=True)  # e.g., GBP
    rate = Column(Float, nullable=False)  # 1 base = rate quote
    source = Column(String(20), default="ECB")  # ECB, BOE
    as_of = Column(Date, nullable=False, index=True)
    is_stale = Column(Boolean, default=False)
    
    __table_args__ = (
        # UniqueConstraint('base', 'quote', 'as_of', name='uix_fx_rate'),
    )


# ============ NEWS ============

class NewsItem(Base):
    """News article for a stock."""
    __tablename__ = "news_items"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    headline = Column(String(500), nullable=False)
    summary = Column(Text)
    source = Column(String(100))
    url = Column(String(500))
    thumbnail = Column(String(500))
    published_at = Column(DateTime(timezone=True))
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ PORTFOLIO ============

class Portfolio(Base):
    """User portfolio model."""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for backward compat
    name = Column(String(100), nullable=False, default="My Portfolio")
    currency = Column(String(3), default="GBP")  # Keep as currency for backward compat
    risk_profile = Column(String(20), default="moderate")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    """Stock holding in a portfolio - DERIVED, recalculated from transactions."""
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol = Column(String(20), nullable=False)  # Keep as symbol for backward compat
    shares = Column(Float, nullable=False)
    avg_cost = Column(Float, nullable=False)  # In instrument native currency
    cost_currency = Column(String(3), default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")


class Transaction(Base):
    """Buy/sell transactions - Source of truth for holdings."""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol = Column(String(20), nullable=False)  # Keep as symbol for backward compat
    transaction_type = Column(String(10), nullable=False)  # buy, sell
    shares = Column(Float, nullable=False)
    price = Column(Float, nullable=False)  # In trade_currency
    trade_currency = Column(String(3), default="USD")  # Currency of the trade
    fee = Column(Float, default=0)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    idempotency_key = Column(String(100), unique=True, nullable=True)  # For idempotent submissions
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")


# ============ SCREENER ============

class SavedScreener(Base):
    """User-saved screener configuration."""
    __tablename__ = "saved_screeners"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False)
    filters = Column(JSON)  # Serialized filter configuration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="screeners")


class ScreenerResult(Base):
    """Cached screener results."""
    __tablename__ = "screener_results"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    data = Column(JSON)  # Cached stock metrics
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ============ ALERTS ============

class Alert(Base):
    """User price/condition alert."""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ticker = Column(String(20), nullable=False, index=True)
    condition_type = Column(String(20), nullable=False)  # price_above, price_below, percent_change
    threshold = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="alerts")


# ============ AUDIT ============

class AuditLog(Base):
    """Audit trail for important actions."""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)  # login, logout, transaction_add, alert_create, etc.
    entity_type = Column(String(50))  # portfolio, transaction, alert
    entity_id = Column(Integer)
    details = Column(JSON)  # Additional context
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ WATCHLIST (Legacy) ============

class WatchlistItem(Base):
    """Stocks on the watchlist."""
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ticker = Column(String(20), nullable=False)
    notes = Column(String(500))
    added_at = Column(DateTime(timezone=True), server_default=func.now())


# ============ SCREENER CACHE ============

class ScreenerStock(Base):
    """Cached stock data for screener to avoid API rate limits."""
    __tablename__ = "screener_stocks"

    symbol = Column(String(20), primary_key=True, index=True)
    company_name = Column(String(255))
    sector = Column(String(100), index=True)
    market = Column(String(50), index=True)  # SP500, NASDAQ100, UK
    
    current_price = Column(Float)
    pe_ratio = Column(Float)
    peg_ratio = Column(Float)
    eps_ttm = Column(Float)  # Added for live P/E calc
    revenue_growth = Column(Float)
    market_cap = Column(Float)
    score = Column(Float)
    upside_potential = Column(Float)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

