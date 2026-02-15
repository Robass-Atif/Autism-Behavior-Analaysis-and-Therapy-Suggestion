from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

# API Key scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# API Key database - in production, store in database
API_KEYS_DB = {
    settings.API_KEY: {
        "api_key": settings.API_KEY,
        "name": "Default API Key",
        "role": "admin",
        "rate_limit": 1000,
        "active": True
    }
}

async def get_current_user(api_key: str = Depends(api_key_header)):
    """Verify API key and return current user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
        headers={"WWW-Authenticate": "ApiKey"},
    )
    
    if not api_key:
        raise credentials_exception
    
    # Check if API key exists and is active
    user_data = API_KEYS_DB.get(api_key)
    if not user_data or not user_data.get("active", False):
        logger.warning(f"Invalid API key attempted: {api_key[:8]}...")
        raise credentials_exception
    
    logger.debug(f"API key authenticated successfully for role: {user_data['role']}")
    return user_data

def get_api_key_info():
    """Get API key information for documentation"""
    return {
        "api_key": settings.API_KEY,
        "description": "Set this in the X-API-Key header for API authentication"
    }