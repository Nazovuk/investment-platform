"""
Email Alerts API router.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from dataclasses import asdict

from services.alerts import alerts_service, AlertType, AlertStatus, PriceAlert
from routers.auth import get_current_user, require_auth
from services.auth import User


router = APIRouter()


class CreateAlertRequest(BaseModel):
    """Request to create a new alert."""
    symbol: str
    alert_type: str  # price_above, price_below, fair_value_reached, score_threshold
    target_value: float
    email: str
    message: Optional[str] = None


@router.get("/")
async def get_alerts(user: User = Depends(require_auth)):
    """
    Get all alerts for the current user.
    """
    alerts = alerts_service.get_user_alerts(user.id)
    
    return {
        "success": True,
        "count": len(alerts),
        "alerts": [asdict(a) for a in alerts]
    }


@router.post("/")
async def create_alert(
    request: CreateAlertRequest,
    user: User = Depends(require_auth)
):
    """
    Create a new price alert.
    
    Alert types:
    - price_above: Trigger when price goes above target
    - price_below: Trigger when price goes below target
    - fair_value_reached: Trigger when stock reaches fair value
    - score_threshold: Trigger when AI score reaches target
    """
    try:
        alert_type = AlertType(request.alert_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid alert type. Must be one of: {[t.value for t in AlertType]}"
        )
    
    alert = alerts_service.create_alert(
        user_id=user.id,
        symbol=request.symbol,
        alert_type=alert_type,
        target_value=request.target_value,
        email=request.email,
        message=request.message
    )
    
    return {
        "success": True,
        "message": f"Alert created for {alert.symbol}",
        "alert": asdict(alert)
    }


@router.get("/stats")
async def get_alert_stats(user: User = Depends(require_auth)):
    """
    Get alert statistics for the current user.
    """
    stats = alerts_service.get_alert_stats(user.id)
    
    return {
        "success": True,
        "stats": stats
    }


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    user: User = Depends(require_auth)
):
    """
    Delete a specific alert.
    """
    alert = alerts_service.get_alert(alert_id)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this alert")
    
    alerts_service.delete_alert(alert_id)
    
    return {
        "success": True,
        "message": "Alert deleted"
    }


@router.put("/{alert_id}/disable")
async def disable_alert(
    alert_id: int,
    user: User = Depends(require_auth)
):
    """
    Disable an alert without deleting it.
    """
    alert = alerts_service.get_alert(alert_id)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated = alerts_service.update_alert_status(alert_id, AlertStatus.DISABLED)
    
    return {
        "success": True,
        "alert": asdict(updated) if updated else None
    }


@router.put("/{alert_id}/enable")
async def enable_alert(
    alert_id: int,
    user: User = Depends(require_auth)
):
    """
    Re-enable a disabled alert.
    """
    alert = alerts_service.get_alert(alert_id)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if alert.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated = alerts_service.update_alert_status(alert_id, AlertStatus.ACTIVE)
    
    return {
        "success": True,
        "alert": asdict(updated) if updated else None
    }


@router.post("/check")
async def check_alerts():
    """
    Manually trigger alert checking.
    In production, this would be called by a scheduled job.
    """
    triggered = alerts_service.check_alerts()
    
    return {
        "success": True,
        "triggered_count": len(triggered),
        "triggered": [asdict(a) for a in triggered]
    }


@router.get("/types")
async def get_alert_types():
    """
    Get available alert types and their descriptions.
    """
    return {
        "types": [
            {
                "id": "price_above",
                "name": "Price Above",
                "description": "Alert when stock price rises above target",
                "example": "Alert me when AAPL goes above $200"
            },
            {
                "id": "price_below",
                "name": "Price Below",
                "description": "Alert when stock price drops below target",
                "example": "Alert me when AAPL drops below $180"
            },
            {
                "id": "fair_value_reached",
                "name": "Fair Value Reached",
                "description": "Alert when stock reaches its calculated fair value",
                "example": "Alert me when NVDA reaches fair value"
            },
            {
                "id": "score_threshold",
                "name": "Score Threshold",
                "description": "Alert when AI investment score reaches target",
                "example": "Alert me when any stock reaches score of 85+"
            }
        ]
    }
