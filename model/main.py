from fastapi import FastAPI, Depends, HTTPException, status, Request, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime, timedelta
import logging
import json
from pathlib import Path
import tempfile
import zipfile
import shutil
import sys

# Add current directory to path for imports
sys.path.append(str(Path(__file__).resolve().parent))

from config.settings import settings
from security.authentication import authenticate_user, create_access_token, get_current_user
from security.rate_limiting import limiter
from services import VideoProcessingService, PoseEstimationService, PredictionService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    description=settings.API_DESCRIPTION
)

# Add rate limiter to app
app.state.limiter = limiter

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
video_service = VideoProcessingService()
pose_service = PoseEstimationService(
    openpose_dir=settings.OPENPOSE_DIR,
    romp_model_path=settings.ROMP_MODEL_PATH
)
prediction_service = PredictionService(settings)

# =====================
# Pydantic Models
# =====================

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PredictionRequest(BaseModel):
    model_type: Literal["2D", "3D"] = Field(..., description="Type of model to use")
    age: float = Field(..., ge=0, le=120, description="Patient age in years")
    gender: Literal["M", "F"] = Field(..., description="Patient gender")
    include_explainability: bool = Field(default=True, description="Include explainability analysis")
    apply_defensive_preprocessing: bool = Field(default=True, description="Apply defensive preprocessing")

class PredictionResponse(BaseModel):
    predictions_2d: Optional[dict] = Field(None, description="2D model predictions")
    predictions_3d: Optional[dict] = Field(None, description="3D model predictions")
    ensemble_prediction: Optional[dict] = Field(None, description="Ensemble prediction (average of 2D and 3D)")
    input_age: float
    input_gender: str
    status: str
    processing_info: Optional[dict] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    models_loaded: dict

# =====================
# Endpoints
# =====================

@app.get("/", tags=["General"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "ADOS Multi-Task Prediction API",
        "version": settings.API_VERSION,
        "endpoints": {
            "health": "/health",
            "login": "/auth/login",
            "predict": "/predict",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Health check endpoint"""
    # Check if model files exist
    model_2d_exists = Path(settings.MODEL_2D_PATH).exists()
    model_3d_exists = Path(settings.MODEL_3D_PATH).exists()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": {
            "2D": model_2d_exists,
            "3D": model_3d_exists
        }
    }

@app.post("/auth/login", response_model=Token, tags=["Authentication"])
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def login(request: Request, login_data: LoginRequest):
    """
    Authenticate user and receive JWT token
    
    Default credentials:
    - Username: admin, Password: changeme123
    - Username: clinician, Password: clinic123
    """
    user = authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    logger.info(f"User {login_data.username} logged in successfully")
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def predict(
    request: Request,
    input_file: UploadFile = File(..., description="Video file (.mp4, .avi, .mov) or ZIP file with .npz frames"),
    age: float = Form(..., ge=0, le=120),
    gender: str = Form(...),
    include_explainability: bool = Form(default=True),
    apply_defensive_preprocessing: bool = Form(default=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Unified ADOS prediction endpoint
    
    This endpoint accepts either:
    1. Video file (.mp4, .avi, .mov) - automatically processes with BOTH 2D and 3D models
    2. ZIP file with pre-processed .npz frames - processes with specified model
    
    Processing workflow for videos:
    1. Extract frames from video
    2. Generate 2D poses using OpenPose (COCO 24 keypoints)
    3. Generate 3D poses using ROMP (COCO 24 keypoints with depth)
    4. Run preprocessing on both pose sets
    5. Make predictions with both 2D and 3D models
    6. Return predictions from both models + ensemble prediction
    
    Requires:
    - JWT authentication token in Authorization header
    - input_file: Video (.mp4, .avi, .mov) or ZIP (.zip with .npz files)
    - age: Patient age (0-120)
    - gender: M or F
    """
    # Validate gender
    if gender.upper() not in ["M", "F"]:
        raise HTTPException(status_code=400, detail="gender must be 'M' or 'F'")
    
    # Determine input type
    filename = input_file.filename.lower()
    is_video = filename.endswith(('.mp4', '.avi', '.mov'))
    is_zip = filename.endswith('.zip')
    
    if not is_video and not is_zip:
        raise HTTPException(
            status_code=400,
            detail="Input must be video file (.mp4, .avi, .mov) or ZIP file (.zip)"
        )
    
    # Create temp directories
    temp_dir = Path(tempfile.mkdtemp())
    
    try:
        if is_video:
            # ===== VIDEO PROCESSING WORKFLOW =====
            logger.info(f"🎥 Processing video file: {input_file.filename}")
            
            # Read video content
            video_content = await input_file.read()
            video_path = temp_dir / input_file.filename
            
            with open(video_path, "wb") as f:
                f.write(video_content)
            
            logger.info(f"💾 Saved video: {len(video_content) / 1024 / 1024:.2f}MB")
            
            # Validate video
            is_valid, error_msg = video_service.validate_video(
                str(video_path),
                settings.MAX_VIDEO_SIZE_MB,
                settings.MAX_VIDEO_DURATION_SEC
            )
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"Video validation failed: {error_msg}")
            
            # Step 1: Extract frames
            frames_dir = temp_dir / "frames"
            frames_dir.mkdir()
            
            logger.info("📹 Step 1/5: Extracting frames...")
            num_frames, duration, fps = video_service.extract_frames(
                str(video_path),
                str(frames_dir),
                target_fps=settings.VIDEO_FPS
            )
            
            # Step 2: Extract 2D poses
            npz_2d_dir = temp_dir / "npz_2d"
            npz_2d_dir.mkdir()
            
            logger.info("🦴 Step 2/5: Extracting 2D poses (OpenPose)...")
            try:
                num_poses_2d = pose_service.estimate_2d_poses(
                    str(frames_dir),
                    str(npz_2d_dir)
                )
            except Exception as e:
                logger.error(f"2D pose estimation failed: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"2D pose estimation failed: {e}. Ensure OpenPose is installed and configured."
                )
            
            # Step 3: Extract 3D poses
            npz_3d_dir = temp_dir / "npz_3d"
            npz_3d_dir.mkdir()
            
            logger.info("🦴 Step 3/5: Extracting 3D poses (ROMP)...")
            try:
                num_poses_3d = pose_service.estimate_3d_poses(
                    str(frames_dir),
                    str(npz_3d_dir)
                )
            except Exception as e:
                logger.error(f"3D pose estimation failed: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"3D pose estimation failed: {e}. Ensure ROMP is installed (pip install simple-romp)."
                )
            
            # Step 4 & 5: Run predictions with both models
            logger.info("🧠 Step 4/5: Running preprocessing and model inference...")
            results = prediction_service.predict_dual(
                frames_2d_dir=str(npz_2d_dir),
                frames_3d_dir=str(npz_3d_dir),
                age=age,
                gender=gender.upper(),
                include_explainability=include_explainability,
                apply_defensive_preprocessing=apply_defensive_preprocessing
            )
            
            logger.info("✅ Step 5/5: Complete!")
            
            # Add processing info
            results["processing_info"] = {
                "input_type": "video",
                "video_duration_seconds": duration,
                "original_fps": fps,
                "frames_extracted": num_frames,
                "poses_2d_extracted": num_poses_2d,
                "poses_3d_extracted": num_poses_3d
            }
            
        else:
            # ===== ZIP FILE WORKFLOW (Legacy support) =====
            logger.info(f"📦 Processing ZIP file: {input_file.filename}")
            
            zip_content = await input_file.read()
            zip_path = temp_dir / input_file.filename
            
            with open(zip_path, "wb") as f:
                f.write(zip_content)
            
            # Extract ZIP
            extract_dir = temp_dir / "extracted"
            extract_dir.mkdir()
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Find NPZ files
            npz_files = list(extract_dir.glob("**/*.npz"))
            if not npz_files:
                raise HTTPException(status_code=400, detail="No .npz files found in ZIP")
            
            frames_dir = npz_files[0].parent
            logger.info(f"Found {len(npz_files)} .npz files")
            
            # For ZIP files, we can't determine if they're 2D or 3D automatically
            # So we'll try to process with both models
            logger.info("🧠 Processing with both 2D and 3D models...")
            
            results = prediction_service.predict_dual(
                frames_2d_dir=str(frames_dir),
                frames_3d_dir=str(frames_dir),
                age=age,
                gender=gender.upper(),
                include_explainability=include_explainability,
                apply_defensive_preprocessing=apply_defensive_preprocessing
            )
            
            results["processing_info"] = {
                "input_type": "zip",
                "num_npz_files": len(npz_files)
            }
        
        # Audit log
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": current_user['username'],
            "input_type": "video" if is_video else "zip",
            "input_filename": input_file.filename,
            "age": age,
            "gender": gender,
            "predictions_2d": results.get("predictions_2d", {}).get("severity") if results.get("predictions_2d") else None,
            "predictions_3d": results.get("predictions_3d", {}).get("severity") if results.get("predictions_3d") else None,
            "ensemble": results.get("ensemble_prediction", {}).get("severity") if results.get("ensemble_prediction") else None
        }
        
        # Write to audit log
        audit_log_path = Path(settings.AUDIT_LOG_PATH)
        audit_log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(audit_log_path, 'a') as f:
            f.write(json.dumps(audit_entry) + '\n')
        
        logger.info(f"✅ Prediction complete for user {current_user['username']}")
        
        return results
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    
    finally:
        # Cleanup temp directory
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory: {e}")

@app.get("/models/info", tags=["Models"])
async def get_models_info(current_user: dict = Depends(get_current_user)):
    """Get information about loaded models"""
    models_info = {}
    
    for model_type in ["2D", "3D"]:
        model_path = settings.MODEL_2D_PATH if model_type == "2D" else settings.MODEL_3D_PATH
        model_dir = Path(model_path)
        
        if model_dir.exists():
            # Load config and metrics
            config_path = model_dir / f"{model_type.lower()}_model_config.json"
            metrics_path = model_dir / f"{model_type.lower()}_performance_metrics.json"
            
            config = {}
            metrics = {}
            
            if config_path.exists():
                with open(config_path) as f:
                    config = json.load(f)
            
            if metrics_path.exists():
                with open(metrics_path) as f:
                    metrics = json.load(f)
            
            models_info[model_type] = {
                "config": config,
                "metrics": metrics,
                "loaded": True
            }
        else:
            models_info[model_type] = {"loaded": False}
    
    return models_info

@app.on_event("startup")
async def startup_event():
    """Validate models on startup"""
    logger.info("Starting ADOS Prediction API...")
    
    try:
        # Check 2D model
        logger.info("Checking 2D model...")
        if Path(settings.MODEL_2D_PATH).exists():
            logger.info("✅ 2D model found")
        else:
            logger.warning(f"⚠️ 2D model not found at {settings.MODEL_2D_PATH}")
        
        # Check 3D model
        logger.info("Checking 3D model...")
        if Path(settings.MODEL_3D_PATH).exists():
            logger.info("✅ 3D model found")
        else:
            logger.warning(f"⚠️ 3D model not found at {settings.MODEL_3D_PATH}")
        
        # Check OpenPose
        if settings.OPENPOSE_DIR and Path(settings.OPENPOSE_DIR).exists():
            logger.info("✅ OpenPose directory found")
        else:
            logger.warning(f"⚠️ OpenPose not found at {settings.OPENPOSE_DIR}")
        
        logger.info("🚀 API ready! Models will be loaded on first use.")
    
    except Exception as e:
        logger.error(f"Startup check failed: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ADOS Prediction API...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
