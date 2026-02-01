from pydantic_settings import BaseSettings
from typing import Optional, List
import os
from pathlib import Path

# Get the base directory (ados_server/)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # API Settings
    API_TITLE: str = "ADOS Prediction API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Multi-task ADOS prediction with 2D/3D models"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 10
    RATE_LIMIT_PER_HOUR: int = 100
    
    # Model Settings - Updated paths to use the 2d model and 3d model folders
    MODEL_2D_PATH: str = str(BASE_DIR / "2d model")
    MODEL_3D_PATH: str = str(BASE_DIR / "3d model")
    OPENPOSE_DIR: Optional[str] = None
    MAX_SEQUENCE_LENGTH: int = 100
    
    # Feature Flags
    ENABLE_3D_PROCESSING: bool = os.getenv("ENABLE_3D_PROCESSING", "true").lower() in ("true", "1", "yes")
    
    # Video Processing Settings
    VIDEO_FPS: int = 30  # Target FPS for video processing
    MAX_VIDEO_SIZE_MB: int = 500  # Maximum video file size in MB
    MAX_VIDEO_DURATION_SEC: int = 300  # Maximum video duration in seconds (5 minutes)
    
    # Input Validation Thresholds
    MAX_BONE_LENGTH_VARIATION: float = 0.3  # 30%
    MAX_MOVEMENT_VELOCITY: float = 50.0  # Increased for MediaPipe pixel coordinates
    MIN_KEYPOINT_CONFIDENCE: float = 0.3
    MAX_JOINT_ANGLE: float = 180.0
    
    # Confidence Thresholds
    MIN_PREDICTION_CONFIDENCE: float = 0.6
    
    # Logging
    LOG_LEVEL: str = "INFO"
    AUDIT_LOG_PATH: str = str(BASE_DIR / "logs" / "audit.log")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://yourdomain.com", "http://localhost:8000"]
    
    class Config:
        env_file = ".env"

settings = Settings()
