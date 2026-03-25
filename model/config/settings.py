from pydantic_settings import BaseSettings
from typing import Optional, List
from pathlib import Path
import os

# Get the base directory (ados_server/)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # API Settings
    API_TITLE: str = "ADOS Prediction API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Multi-task ADOS prediction with 2D/3D models"
    

    # Security - these will be loaded from .env file
    SECRET_KEY: str = "your-secret-key-change-this"

  
    API_KEY: str = "your-api-key-change-this-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Therapy Module (RAG System)
    GEMINI_API_KEY: str = ""
    THERAPY_MODULE_DIR: str = str(BASE_DIR / "therapy_module")

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 10
    RATE_LIMIT_PER_HOUR: int = 100
    
    # Model Settings - Updated paths to use the 2d model and 3d model folders
    MODEL_2D_PATH: str = str(BASE_DIR / "2d model")
    MODEL_3D_PATH: str = str(BASE_DIR / "3d model")
    MAX_SEQUENCE_LENGTH: int = 100
    OPENPOSE_DIR: Optional[str] = None
    
    # Feature Flags
    ENABLE_3D_PROCESSING: bool = os.getenv("ENABLE_3D_PROCESSING", "true").lower() in ("true", "1", "yes")

    
    # Video Processing Settings
    VIDEO_FPS: int = 30  # Target FPS for video processing
    MAX_VIDEO_SIZE_MB: int = 500  # Maximum video file size in MB
    MAX_VIDEO_DURATION_SEC: int = 300  # Maximum video duration in seconds (5 minutes)
    
    # Input Validation Thresholds
    # Bone length — coefficient of variation per bone across frames
    MAX_BONE_LENGTH_VARIATION_2D: float = 0.8   # MediaPipe normalized (foreshortening on rotation)
    MAX_BONE_LENGTH_VARIATION_3D: float = 0.8   # ROMP metric (more stable but occlusion adds variance)
    
    # Velocity — max joint displacement per frame
    MAX_MOVEMENT_VELOCITY_2D: float = 200       # MediaPipe: full frame ~1.0, fast motion ~0.10–0.25
    MAX_MOVEMENT_VELOCITY_3D: float = 200       # ROMP: meters/frame at 25–30fps, fast arm ~0.5–0.7
    
    # Confidence — MediaPipe visibility score
    MIN_KEYPOINT_CONFIDENCE_MEAN: float = 0.20   # Mean across all joints
    MIN_KEYPOINT_CONFIDENCE_PER_JOINT: float = 0.10  # Floor per joint (for masking, not rejection)
    MIN_VISIBLE_JOINT_RATIO: float = 0.60        # At least 60% of joints must exceed per-joint floor
    
    # Joint angles (degrees) — arccos output is [0°, 180°]
    MAX_JOINT_ANGLE: float = 181.0               # Genuine hyperextension tops out ~170°
    MIN_JOINT_ANGLE: float = 0.0                 # Near-zero guard (replaces "< 0" which is impossible)
    
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