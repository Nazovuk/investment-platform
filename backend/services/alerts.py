"""
Email Alerts Service - Price target notifications.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from services.stock_data import stock_service

logger = logging.getLogger(__name__)


class AlertType(str, Enum):
    """Types of price alerts."""
    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENT_CHANGE = "percent_change"
    FAIR_VALUE_REACHED = "fair_value_reached"
    SCORE_THRESHOLD = "score_threshold"


class AlertStatus(str, Enum):
    """Alert status."""
    ACTIVE = "active"
    TRIGGERED = "triggered"
    EXPIRED = "expired"
    DISABLED = "disabled"


@dataclass
class PriceAlert:
    """Price alert definition."""
    id: int
    user_id: int
    symbol: str
    alert_type: AlertType
    target_value: float
    current_value: Optional[float] = None
    status: AlertStatus = AlertStatus.ACTIVE
    email: Optional[str] = None
    created_at: Optional[datetime] = None
    triggered_at: Optional[datetime] = None
    message: Optional[str] = None


class EmailAlertsService:
    """Service for managing and sending price alerts."""
    
    # SMTP configuration (can be overridden via environment)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "alerts@nazovhybrid.com")
    
    def __init__(self):
        self.stock_service = stock_service
        self._alerts: Dict[int, PriceAlert] = {}
        self._alert_counter = 1
        
        # Create some demo alerts
        self._create_demo_alerts()
    
    def _create_demo_alerts(self):
        """Create demo alerts for testing."""
        demo_alerts = [
            PriceAlert(
                id=1,
                user_id=1,
                symbol="AAPL",
                alert_type=AlertType.PRICE_BELOW,
                target_value=180.00,
                email="demo@nazovhybrid.com",
                created_at=datetime.now(),
                message="Apple stock dropped below $180"
            ),
            PriceAlert(
                id=2,
                user_id=1,
                symbol="NVDA",
                alert_type=AlertType.PRICE_ABOVE,
                target_value=550.00,
                email="demo@nazovhybrid.com",
                created_at=datetime.now(),
                message="NVIDIA reached target price of $550"
            )
        ]
        
        for alert in demo_alerts:
            self._alerts[alert.id] = alert
        
        self._alert_counter = 3
    
    def create_alert(
        self,
        user_id: int,
        symbol: str,
        alert_type: AlertType,
        target_value: float,
        email: str,
        message: Optional[str] = None
    ) -> PriceAlert:
        """
        Create a new price alert.
        
        Args:
            user_id: ID of the user creating the alert
            symbol: Stock symbol to monitor
            alert_type: Type of alert condition
            target_value: Target value for the alert
            email: Email to send notification to
            message: Optional custom message
        
        Returns:
            Created alert
        """
        alert_id = self._alert_counter
        self._alert_counter += 1
        
        # Get current price
        stock = self.stock_service.get_stock_info(symbol)
        current_value = stock.get("current_price", 0)
        
        # Generate default message if not provided
        if not message:
            message = self._generate_default_message(symbol, alert_type, target_value)
        
        alert = PriceAlert(
            id=alert_id,
            user_id=user_id,
            symbol=symbol.upper(),
            alert_type=alert_type,
            target_value=target_value,
            current_value=current_value,
            email=email,
            created_at=datetime.now(),
            message=message
        )
        
        self._alerts[alert_id] = alert
        return alert
    
    def _generate_default_message(
        self,
        symbol: str,
        alert_type: AlertType,
        target_value: float
    ) -> str:
        """Generate default alert message."""
        if alert_type == AlertType.PRICE_ABOVE:
            return f"{symbol} has reached ${target_value:.2f}"
        elif alert_type == AlertType.PRICE_BELOW:
            return f"{symbol} has dropped to ${target_value:.2f}"
        elif alert_type == AlertType.PERCENT_CHANGE:
            return f"{symbol} has changed by {target_value:.1f}%"
        elif alert_type == AlertType.FAIR_VALUE_REACHED:
            return f"{symbol} has reached its fair value"
        elif alert_type == AlertType.SCORE_THRESHOLD:
            return f"{symbol} investment score reached {target_value}"
        return f"Alert triggered for {symbol}"
    
    def get_user_alerts(self, user_id: int) -> List[PriceAlert]:
        """Get all alerts for a user."""
        alerts = [a for a in self._alerts.values() if a.user_id == user_id]
        
        # Update current values
        for alert in alerts:
            stock = self.stock_service.get_stock_info(alert.symbol)
            alert.current_value = stock.get("current_price", 0)
        
        return alerts
    
    def get_alert(self, alert_id: int) -> Optional[PriceAlert]:
        """Get a specific alert."""
        return self._alerts.get(alert_id)
    
    def delete_alert(self, alert_id: int) -> bool:
        """Delete an alert."""
        if alert_id in self._alerts:
            del self._alerts[alert_id]
            return True
        return False
    
    def update_alert_status(self, alert_id: int, status: AlertStatus) -> Optional[PriceAlert]:
        """Update alert status."""
        alert = self._alerts.get(alert_id)
        if alert:
            alert.status = status
            return alert
        return None
    
    def check_alerts(self) -> List[PriceAlert]:
        """
        Check all active alerts and trigger if conditions are met.
        Returns list of triggered alerts.
        """
        triggered = []
        
        for alert in self._alerts.values():
            if alert.status != AlertStatus.ACTIVE:
                continue
            
            stock = self.stock_service.get_stock_info(alert.symbol)
            current_price = stock.get("current_price", 0)
            
            if self._should_trigger(alert, stock):
                alert.status = AlertStatus.TRIGGERED
                alert.triggered_at = datetime.now()
                alert.current_value = current_price
                triggered.append(alert)
                
                # Send email notification
                self._send_alert_email(alert, stock)
        
        return triggered
    
    def _should_trigger(self, alert: PriceAlert, stock: Dict) -> bool:
        """Check if alert should be triggered."""
        current_price = stock.get("current_price", 0)
        
        if alert.alert_type == AlertType.PRICE_ABOVE:
            return current_price >= alert.target_value
        
        elif alert.alert_type == AlertType.PRICE_BELOW:
            return current_price <= alert.target_value
        
        elif alert.alert_type == AlertType.FAIR_VALUE_REACHED:
            fair_value = stock.get("fair_value")
            if fair_value:
                return current_price >= fair_value
        
        elif alert.alert_type == AlertType.SCORE_THRESHOLD:
            score = stock.get("score", 0)
            return score >= alert.target_value
        
        return False
    
    def _send_alert_email(self, alert: PriceAlert, stock: Dict):
        """Send email notification for triggered alert."""
        if not alert.email:
            return
        
        if not self.SMTP_USER or not self.SMTP_PASSWORD:
            logger.warning("SMTP not configured, skipping email")
            return
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"🔔 Price Alert: {alert.symbol}"
            msg["From"] = self.FROM_EMAIL
            msg["To"] = alert.email
            
            # Create email body
            html_body = self._create_alert_email_html(alert, stock)
            text_body = self._create_alert_email_text(alert, stock)
            
            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))
            
            # Send email
            with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT) as server:
                server.starttls()
                server.login(self.SMTP_USER, self.SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Alert email sent to {alert.email} for {alert.symbol}")
            
        except Exception as e:
            logger.error(f"Failed to send alert email: {e}")
    
    def _create_alert_email_html(self, alert: PriceAlert, stock: Dict) -> str:
        """Create HTML email body."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background: #0a0a0f; color: #f8fafc; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #12121a; border-radius: 12px; padding: 30px; }}
                .header {{ font-size: 24px; font-weight: bold; margin-bottom: 20px; }}
                .alert-box {{ background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 20px; margin: 20px 0; }}
                .price {{ font-size: 32px; font-weight: bold; color: #6366f1; }}
                .label {{ color: #94a3b8; font-size: 14px; }}
                .metrics {{ display: flex; gap: 20px; margin-top: 20px; }}
                .metric {{ flex: 1; }}
                .metric-value {{ font-size: 18px; font-weight: bold; }}
                .footer {{ margin-top: 30px; font-size: 12px; color: #64748b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">🔔 Price Alert Triggered</div>
                
                <div class="alert-box">
                    <div class="label">Symbol</div>
                    <div class="price">{alert.symbol}</div>
                    <div style="margin-top: 10px;">{stock.get('name', alert.symbol)}</div>
                </div>
                
                <p>{alert.message}</p>
                
                <div class="metrics">
                    <div class="metric">
                        <div class="label">Current Price</div>
                        <div class="metric-value">${alert.current_value:.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="label">Target Price</div>
                        <div class="metric-value">${alert.target_value:.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="label">Fair Value</div>
                        <div class="metric-value">${stock.get('fair_value', 0):.2f}</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This alert was sent by NazovHybrid Investment Platform.</p>
                    <p>Alert created: {alert.created_at.strftime('%Y-%m-%d %H:%M') if alert.created_at else 'N/A'}</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_alert_email_text(self, alert: PriceAlert, stock: Dict) -> str:
        """Create plain text email body."""
        return f"""
🔔 Price Alert Triggered

Symbol: {alert.symbol}
Name: {stock.get('name', alert.symbol)}

{alert.message}

Current Price: ${alert.current_value:.2f}
Target Price: ${alert.target_value:.2f}
Fair Value: ${stock.get('fair_value', 0):.2f}

---
This alert was sent by NazovHybrid Investment Platform.
        """
    
    def get_alert_stats(self, user_id: int) -> Dict[str, Any]:
        """Get alert statistics for a user."""
        user_alerts = self.get_user_alerts(user_id)
        
        return {
            "total": len(user_alerts),
            "active": len([a for a in user_alerts if a.status == AlertStatus.ACTIVE]),
            "triggered": len([a for a in user_alerts if a.status == AlertStatus.TRIGGERED]),
            "symbols": list(set(a.symbol for a in user_alerts))
        }


# Singleton instance
alerts_service = EmailAlertsService()
