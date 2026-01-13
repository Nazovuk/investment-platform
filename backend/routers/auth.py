"""
Authentication API router.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional

from services.auth import (
    auth_service, 
    UserCreate, 
    UserLogin, 
    User, 
    Token, 
    TokenData
)


router = APIRouter()


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Dependency to get current authenticated user from JWT token."""
    if not authorization:
        return None
    
    # Extract token from "Bearer <token>" format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    token_data = auth_service.verify_token(token)
    
    if not token_data:
        return None
    
    return auth_service.get_user_by_id(token_data.user_id)


async def require_auth(authorization: Optional[str] = Header(None)) -> User:
    """Dependency that requires authentication."""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    """
    Register a new user account.
    """
    user = auth_service.register(user_data)
    
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create token for new user
    token = auth_service.create_access_token(user)
    
    return {
        "success": True,
        "message": "Registration successful",
        "user": user.model_dump(),
        "token": token.model_dump()
    }


@router.post("/login", response_model=dict)
async def login(credentials: UserLogin):
    """
    Login with email and password.
    Returns JWT access token.
    """
    user = auth_service.authenticate(credentials.email, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    
    token = auth_service.create_access_token(user)
    
    return {
        "success": True,
        "message": "Login successful",
        "user": user.model_dump(),
        "token": token.model_dump()
    }


@router.get("/me", response_model=dict)
async def get_current_user_info(user: User = Depends(require_auth)):
    """
    Get current authenticated user info.
    Requires valid JWT token in Authorization header.
    """
    return {
        "success": True,
        "user": user.model_dump()
    }


@router.post("/refresh", response_model=dict)
async def refresh_token(user: User = Depends(require_auth)):
    """
    Refresh the access token.
    """
    token = auth_service.create_access_token(user)
    
    return {
        "success": True,
        "token": token.model_dump()
    }


@router.get("/oauth/providers")
async def get_oauth_providers():
    """
    Get available OAuth providers for social login.
    
    Note: OAuth is disabled in MVP (FREE-FIRST).
    Email/password auth is the only supported method.
    """
    return {
        "providers": [],
        "message": "OAuth providers are disabled in MVP. Use email/password authentication."
    }


from pydantic import BaseModel
from typing import Literal

class UserPreferencesUpdate(BaseModel):
    """User preferences update schema."""
    preferred_locale: Literal["en-GB", "tr-TR"] | None = None
    preferred_reporting_currency: Literal["GBP", "USD", "EUR", "TRY"] | None = None


@router.patch("/me/preferences")
async def update_user_preferences(
    preferences: UserPreferencesUpdate,
    user: User = Depends(require_auth)
):
    """
    Update user preferences (locale and reporting currency).
    """
    updated_fields = {}
    
    if preferences.preferred_locale:
        updated_fields["preferred_locale"] = preferences.preferred_locale
    
    if preferences.preferred_reporting_currency:
        updated_fields["preferred_reporting_currency"] = preferences.preferred_reporting_currency
    
    if not updated_fields:
        return {
            "code": "NO_CHANGES",
            "message": "No preference fields provided",
            "details": {}
        }
    
    # Update user preferences (in-memory for MVP)
    for key, value in updated_fields.items():
        setattr(user, key, value)
    
    return {
        "success": True,
        "message": "Preferences updated",
        "user": {
            "id": user.id,
            "email": user.email,
            "preferred_locale": getattr(user, "preferred_locale", "en-GB"),
            "preferred_reporting_currency": getattr(user, "preferred_reporting_currency", "GBP")
        }
    }


@router.post("/logout")
async def logout(user: User = Depends(require_auth)):
    """
    Logout (client should discard the token).
    """
    return {
        "success": True,
        "message": "Logged out successfully"
    }

