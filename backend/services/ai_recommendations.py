"""
AI-Powered Stock Recommendations Service.
Uses machine learning and scoring algorithms for intelligent stock picks.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import random

from services.stock_data import stock_service
from services.screener import screener_service, ScreenerFilters


class RecommendationType(str, Enum):
    """Types of stock recommendations."""
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class InvestmentStyle(str, Enum):
    """Investment style preferences."""
    VALUE = "value"
    GROWTH = "growth"
    DIVIDEND = "dividend"
    MOMENTUM = "momentum"
    BALANCED = "balanced"


@dataclass
class StockRecommendation:
    """AI-generated stock recommendation."""
    symbol: str
    name: str
    recommendation: RecommendationType
    confidence: float  # 0-100
    reasons: List[str]
    target_price: Optional[float]
    upside_potential: float
    risk_level: str
    time_horizon: str
    ai_score: int


class AIRecommendationService:
    """
    AI-powered stock recommendation engine.
    Combines multiple factors for intelligent stock analysis.
    """
    
    # Weights for different factors (can be tuned)
    FACTOR_WEIGHTS = {
        "valuation": 0.25,
        "growth": 0.20,
        "momentum": 0.15,
        "quality": 0.20,
        "sentiment": 0.10,
        "risk": 0.10
    }
    
    def __init__(self):
        self.stock_service = stock_service
        self.screener_service = screener_service
    
    def get_recommendations(
        self,
        style: InvestmentStyle = InvestmentStyle.BALANCED,
        count: int = 10,
        risk_tolerance: str = "moderate"
    ) -> List[StockRecommendation]:
        """
        Get AI-powered stock recommendations based on investment style.
        
        Args:
            style: Investment style preference
            count: Number of recommendations to return
            risk_tolerance: Risk tolerance level (low, moderate, high)
        
        Returns:
            List of AI-generated recommendations
        """
        # Get base stock universe
        symbols = self.stock_service.get_universe()
        
        # Apply style-based filters
        filters = self._get_style_filters(style)
        screened = self.screener_service.screen(filters, symbols)
        
        # Calculate AI scores for each stock
        recommendations = []
        for stock in screened[:count * 2]:  # Get extra to allow filtering
            rec = self._analyze_stock(stock, style, risk_tolerance)
            if rec:
                recommendations.append(rec)
        
        # Sort by AI score and return top N
        recommendations.sort(key=lambda x: x.ai_score, reverse=True)
        return recommendations[:count]
    
    def _get_style_filters(self, style: InvestmentStyle) -> ScreenerFilters:
        """Get screener filters based on investment style."""
        if style == InvestmentStyle.VALUE:
            return ScreenerFilters(
                max_pe=20,
                max_peg=1.2,
                min_upside=15,
                min_score=50
            )
        elif style == InvestmentStyle.GROWTH:
            return ScreenerFilters(
                min_revenue_growth=0.15,
                min_earnings_growth=0.10,
                min_score=50
            )
        elif style == InvestmentStyle.DIVIDEND:
            return ScreenerFilters(
                min_dividend_yield=0.02,
                max_debt_to_equity=1.0,
                min_score=50
            )
        elif style == InvestmentStyle.MOMENTUM:
            return ScreenerFilters(
                min_revenue_growth=0.10,
                min_score=60
            )
        else:  # BALANCED
            return ScreenerFilters(
                max_pe=30,
                max_peg=2.0,
                min_revenue_growth=0.05,
                min_upside=10,
                min_score=55
            )
    
    def _analyze_stock(
        self,
        stock: Dict[str, Any],
        style: InvestmentStyle,
        risk_tolerance: str
    ) -> Optional[StockRecommendation]:
        """
        Perform AI analysis on a stock.
        Combines multiple factors into a recommendation.
        """
        try:
            # Calculate factor scores
            valuation_score = self._score_valuation(stock)
            growth_score = self._score_growth(stock)
            quality_score = self._score_quality(stock)
            momentum_score = self._score_momentum(stock)
            sentiment_score = self._score_sentiment(stock)
            risk_score = self._score_risk(stock, risk_tolerance)
            
            # Weighted AI score
            ai_score = int(
                valuation_score * self.FACTOR_WEIGHTS["valuation"] +
                growth_score * self.FACTOR_WEIGHTS["growth"] +
                quality_score * self.FACTOR_WEIGHTS["quality"] +
                momentum_score * self.FACTOR_WEIGHTS["momentum"] +
                sentiment_score * self.FACTOR_WEIGHTS["sentiment"] +
                risk_score * self.FACTOR_WEIGHTS["risk"]
            )
            
            # Determine recommendation type
            recommendation = self._determine_recommendation(ai_score)
            
            # Generate reasons
            reasons = self._generate_reasons(stock, style, {
                "valuation": valuation_score,
                "growth": growth_score,
                "quality": quality_score,
                "momentum": momentum_score
            })
            
            # Calculate confidence
            confidence = self._calculate_confidence(stock, ai_score)
            
            # Determine time horizon
            time_horizon = self._determine_time_horizon(style, stock)
            
            # Determine risk level
            risk_level = self._determine_risk_level(stock)
            
            return StockRecommendation(
                symbol=stock["symbol"],
                name=stock.get("name", stock["symbol"]),
                recommendation=recommendation,
                confidence=confidence,
                reasons=reasons,
                target_price=stock.get("fair_value"),
                upside_potential=stock.get("upside_potential", 0) or 0,
                risk_level=risk_level,
                time_horizon=time_horizon,
                ai_score=ai_score
            )
            
        except Exception:
            return None
    
    def _score_valuation(self, stock: Dict) -> float:
        """Score stock based on valuation metrics."""
        score = 50  # Base score
        
        pe = stock.get("pe_ratio")
        if pe:
            if pe < 15:
                score += 30
            elif pe < 20:
                score += 20
            elif pe < 25:
                score += 10
            elif pe > 40:
                score -= 20
        
        peg = stock.get("peg_ratio")
        if peg:
            if peg < 1:
                score += 20
            elif peg < 1.5:
                score += 10
            elif peg > 2:
                score -= 10
        
        upside = stock.get("upside_potential", 0) or 0
        if upside > 30:
            score += 20
        elif upside > 20:
            score += 15
        elif upside > 10:
            score += 10
        elif upside < -10:
            score -= 15
        
        return min(100, max(0, score))
    
    def _score_growth(self, stock: Dict) -> float:
        """Score stock based on growth metrics."""
        score = 50
        
        rev_growth = stock.get("revenue_growth")
        if rev_growth:
            if rev_growth > 0.20:
                score += 30
            elif rev_growth > 0.15:
                score += 20
            elif rev_growth > 0.10:
                score += 10
            elif rev_growth < 0:
                score -= 20
        
        earn_growth = stock.get("earnings_growth")
        if earn_growth:
            if earn_growth > 0.20:
                score += 20
            elif earn_growth > 0.10:
                score += 10
            elif earn_growth < 0:
                score -= 15
        
        return min(100, max(0, score))
    
    def _score_quality(self, stock: Dict) -> float:
        """Score stock based on quality metrics."""
        score = 50
        
        roe = stock.get("return_on_equity")
        if roe:
            if roe > 0.20:
                score += 20
            elif roe > 0.15:
                score += 10
            elif roe < 0.05:
                score -= 10
        
        margin = stock.get("profit_margin")
        if margin:
            if margin > 0.20:
                score += 15
            elif margin > 0.10:
                score += 10
            elif margin < 0:
                score -= 20
        
        de = stock.get("debt_to_equity")
        if de is not None:
            if de < 0.5:
                score += 15
            elif de < 1:
                score += 10
            elif de > 2:
                score -= 15
        
        return min(100, max(0, score))
    
    def _score_momentum(self, stock: Dict) -> float:
        """Score stock based on momentum indicators."""
        score = 50
        
        # Use analyst recommendation as proxy for momentum
        rec = stock.get("recommendation", "").lower()
        if rec in ["strong_buy", "strongbuy"]:
            score += 25
        elif rec == "buy":
            score += 15
        elif rec == "hold":
            score += 0
        elif rec == "sell":
            score -= 15
        elif rec in ["strong_sell", "strongsell"]:
            score -= 25
        
        # 52-week position
        current = stock.get("current_price", 0)
        high = stock.get("fifty_two_week_high", 0)
        low = stock.get("fifty_two_week_low", 0)
        
        if high and low and current and high > low:
            position = (current - low) / (high - low)
            if position < 0.3:  # Near 52-week low
                score += 15  # Potential bounce
            elif position > 0.9:  # Near 52-week high
                score -= 5  # May be extended
        
        return min(100, max(0, score))
    
    def _score_sentiment(self, stock: Dict) -> float:
        """Score based on analyst sentiment."""
        score = 50
        
        analyst_count = stock.get("analyst_count", 0)
        if analyst_count:
            if analyst_count > 20:
                score += 10  # Well covered
            elif analyst_count < 5:
                score -= 5  # Less coverage
        
        return min(100, max(0, score))
    
    def _score_risk(self, stock: Dict, risk_tolerance: str) -> float:
        """Score based on risk alignment."""
        score = 50
        
        beta = stock.get("beta", 1)
        
        if risk_tolerance == "low":
            if beta and beta < 0.8:
                score += 20
            elif beta and beta > 1.2:
                score -= 20
        elif risk_tolerance == "high":
            if beta and beta > 1.2:
                score += 15
            elif beta and beta < 0.8:
                score -= 10
        
        return min(100, max(0, score))
    
    def _determine_recommendation(self, ai_score: int) -> RecommendationType:
        """Determine recommendation type based on AI score."""
        if ai_score >= 80:
            return RecommendationType.STRONG_BUY
        elif ai_score >= 65:
            return RecommendationType.BUY
        elif ai_score >= 45:
            return RecommendationType.HOLD
        elif ai_score >= 30:
            return RecommendationType.SELL
        else:
            return RecommendationType.STRONG_SELL
    
    def _generate_reasons(
        self,
        stock: Dict,
        style: InvestmentStyle,
        scores: Dict[str, float]
    ) -> List[str]:
        """Generate human-readable reasons for recommendation."""
        reasons = []
        
        # Valuation reasons
        if scores["valuation"] >= 70:
            pe = stock.get("pe_ratio")
            if pe:
                reasons.append(f"Attractive valuation with P/E of {pe:.1f}")
            upside = stock.get("upside_potential", 0)
            if upside and upside > 15:
                reasons.append(f"Fair value analysis suggests {upside:.1f}% upside")
        
        # Growth reasons
        if scores["growth"] >= 70:
            rev = stock.get("revenue_growth")
            if rev:
                reasons.append(f"Strong revenue growth of {rev*100:.1f}%")
        
        # Quality reasons
        if scores["quality"] >= 70:
            margin = stock.get("profit_margin")
            if margin:
                reasons.append(f"High profit margin of {margin*100:.1f}%")
            roe = stock.get("return_on_equity")
            if roe:
                reasons.append(f"Solid ROE of {roe*100:.1f}%")
        
        # Style-specific reasons
        if style == InvestmentStyle.DIVIDEND:
            div = stock.get("dividend_yield")
            if div:
                reasons.append(f"Dividend yield of {div*100:.2f}%")
        
        # Analyst sentiment
        rec = stock.get("recommendation", "")
        if rec and rec.lower() in ["buy", "strong_buy", "strongbuy"]:
            count = stock.get("analyst_count", 0)
            if count:
                reasons.append(f"Positive analyst consensus ({count} analysts)")
        
        # If no reasons found, add generic
        if not reasons:
            sector = stock.get("sector", "")
            reasons.append(f"Solid fundamentals in {sector} sector")
        
        return reasons[:4]  # Max 4 reasons
    
    def _calculate_confidence(self, stock: Dict, ai_score: int) -> float:
        """Calculate confidence level for recommendation."""
        base_confidence = min(95, ai_score + 10)
        
        # Reduce confidence if data is incomplete
        if not stock.get("pe_ratio"):
            base_confidence -= 10
        if not stock.get("revenue_growth"):
            base_confidence -= 5
        if not stock.get("fair_value"):
            base_confidence -= 5
        
        return max(40, min(95, base_confidence))
    
    def _determine_time_horizon(self, style: InvestmentStyle, stock: Dict) -> str:
        """Determine recommended time horizon."""
        if style == InvestmentStyle.MOMENTUM:
            return "1-3 months"
        elif style == InvestmentStyle.GROWTH:
            return "1-3 years"
        elif style == InvestmentStyle.DIVIDEND:
            return "3-5 years"
        elif style == InvestmentStyle.VALUE:
            return "6-18 months"
        else:
            return "6-12 months"
    
    def _determine_risk_level(self, stock: Dict) -> str:
        """Determine risk level for the stock."""
        beta = stock.get("beta", 1)
        
        if beta is None:
            return "Medium"
        elif beta < 0.8:
            return "Low"
        elif beta < 1.2:
            return "Medium"
        elif beta < 1.5:
            return "High"
        else:
            return "Very High"
    
    def get_portfolio_recommendations(
        self,
        current_holdings: Dict[str, float],
        investment_amount: float = 10000
    ) -> Dict[str, Any]:
        """
        Get recommendations specific to a portfolio.
        Suggests rebalancing and new positions.
        """
        recommendations = {
            "add": [],
            "reduce": [],
            "hold": [],
            "watch": []
        }
        
        # Analyze current holdings
        for symbol, shares in current_holdings.items():
            stock = self.stock_service.get_stock_info(symbol)
            if "error" not in stock:
                rec = self._analyze_stock(stock, InvestmentStyle.BALANCED, "moderate")
                if rec:
                    if rec.recommendation in [RecommendationType.STRONG_BUY, RecommendationType.BUY]:
                        recommendations["hold"].append({
                            "symbol": symbol,
                            "action": "Hold or add more",
                            "reason": rec.reasons[0] if rec.reasons else ""
                        })
                    elif rec.recommendation in [RecommendationType.SELL, RecommendationType.STRONG_SELL]:
                        recommendations["reduce"].append({
                            "symbol": symbol,
                            "action": "Consider reducing",
                            "reason": rec.reasons[0] if rec.reasons else ""
                        })
        
        # Get new recommendations not in portfolio
        new_recs = self.get_recommendations(count=5)
        for rec in new_recs:
            if rec.symbol not in current_holdings:
                recommendations["watch"].append({
                    "symbol": rec.symbol,
                    "name": rec.name,
                    "ai_score": rec.ai_score,
                    "upside": rec.upside_potential
                })
        
        return recommendations


# Singleton instance
ai_service = AIRecommendationService()
