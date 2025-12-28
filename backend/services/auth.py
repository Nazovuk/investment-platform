"""
Authentication service - JWT + OAuth support.
"""

from datetime import datetime, timedelta
from typing import Optional
import os
import secrets
import hashlib

from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


class Token(BaseModel):
    """JWT Token response model."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Decoded token data."""
    user_id: Optional[int] = None
    email: Optional[str] = None
    exp: Optional[datetime] = None


class UserCreate(BaseModel):
    """User registration model."""
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    """User login model."""
    email: EmailStr
    password: str


class User(BaseModel):
    """User response model."""
    id: int
    email: str
    name: str
    is_active: bool = True
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AuthService:
    """Authentication service for user management and JWT tokens."""
    
    # In-memory user store (replace with database in production)
    _users: dict = {}
    _user_id_counter: int = 1
    
    def __init__(self):
        # Create a default demo user
        self._create_demo_user()
    
    def _create_demo_user(self):
        """Create a demo user for testing."""
        if "demo@nazovhybrid.com" not in self._users:
            self._users["demo@nazovhybrid.com"] = {
                "id": 1,
                "email": "demo@nazovhybrid.com",
                "name": "Demo User",
                "password_hash": self._hash_password("demo123"),
                "is_active": True,
                "created_at": datetime.now()
            }
            self._user_id_counter = 2
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256 with salt."""
        salt = SECRET_KEY[:16]
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return self._hash_password(plain_password) == hashed_password
    
    def register(self, user_data: UserCreate) -> Optional[User]:
        """Register a new user."""
        if user_data.email in self._users:
            return None  # Email already exists
        
        user_id = self._user_id_counter
        self._user_id_counter += 1
        
        user = {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "password_hash": self._hash_password(user_data.password),
            "is_active": True,
            "created_at": datetime.now()
        }
        
        self._users[user_data.email] = user
        
        return User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
    
    def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password."""
        user = self._users.get(email)
        
        if not user:
            return None
        
        if not self._verify_password(password, user["password_hash"]):
            return None
        
        return User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            is_active=user["is_active"],
            created_at=user["created_at"]
        )
    
    def create_access_token(self, user: User) -> Token:
        """Create JWT access token for user."""
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": str(user.id),
            "email": user.email,
            "name": user.name,
            "exp": expire
        }
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        return Token(
            access_token=encoded_jwt,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = int(payload.get("sub"))
            email = payload.get("email")
            exp = datetime.fromtimestamp(payload.get("exp"))
            
            if datetime.utcnow() > exp:
                return None  # Token expired
            
            return TokenData(user_id=user_id, email=email, exp=exp)
            
        except JWTError:
            return None
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        for user in self._users.values():
            if user["id"] == user_id:
                return User(
                    id=user["id"],
                    email=user["email"],
                    name=user["name"],
                    is_active=user["is_active"],
                    created_at=user["created_at"]
                )
        return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        user = self._users.get(email)
        if user:
            return User(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                is_active=user["is_active"],
                created_at=user["created_at"]
            )
        return None


# OAuth providers configuration
class OAuthProvider:
    """OAuth provider configuration."""
    
    GOOGLE = {
        "name": "google",
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scopes": ["openid", "email", "profile"]
    }
    
    GITHUB = {
        "name": "github",
        "client_id": os.getenv("GITHUB_CLIENT_ID", ""),
        "client_secret": os.getenv("GITHUB_CLIENT_SECRET", ""),
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scopes": ["user:email"]
    }


# Singleton instance
auth_service = AuthService()
