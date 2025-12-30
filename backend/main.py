"""
NazovHybrid Investment Platform - FastAPI Backend
Hedge fund-style portfolio management API
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from routers import screener, optimizer, backtest, portfolio, currency, auth, ai_recommendations, alerts, stock_detail
from database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup: Create database tables
    Base.metadata.create_all(bind=engine)
    print("🚀 NazovHybrid API is starting up...")
    yield
    # Shutdown
    print("👋 NazovHybrid API is shutting down...")


app = FastAPI(
    title="NazovHybrid Investment Platform",
    description="Hedge fund-style portfolio management and stock screening API",
    version="8.0.0",
    lifespan=lifespan
)

# CORS Configuration - include production Vercel URL
default_origins = "http://localhost:3000,https://investment-platform-tawny-omega.vercel.app"
origins = os.getenv("CORS_ORIGINS", default_origins).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(screener.router, prefix="/api/screener", tags=["Screener"])
app.include_router(stock_detail.router, prefix="/api/stock", tags=["Stock Detail"])
app.include_router(optimizer.router, prefix="/api/optimizer", tags=["Optimizer"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["Backtest"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(currency.router, prefix="/api/currency", tags=["Currency"])
app.include_router(ai_recommendations.router, prefix="/api/ai", tags=["AI Recommendations"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Email Alerts"])


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "NazovHybrid Investment Platform",
        "version": "8.0.0",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "nazovhybrid-api"}
