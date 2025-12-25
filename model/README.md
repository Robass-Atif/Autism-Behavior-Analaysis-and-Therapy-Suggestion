# ADOS Multi-Task Prediction API

FastAPI server for ADOS (Autism Diagnostic Observation Schedule) prediction using 2D/3D skeletal data.

## Features

- **Multi-task prediction**: Severity, Social Affect, RRB, Comparison Score
- **2D and 3D models**: Support for both 2D and 3D skeletal data
- **Video Processing**: Direct MP4 upload with automatic pose extraction (OpenPose/ROMP)
- **Explainability**: Integrated Gradients for model interpretability
- **Security**: JWT authentication, rate limiting, input validation
- **Production-ready**: Logging, monitoring, defensive preprocessing

## Installation

### Prerequisites

- Python 3.8+
- PyTorch
- FastAPI

### Setup

1. **Install dependencies**:
```bash
cd ados_server
pip install -r requirements.txt
```

2. **Configure environment**:
Edit `.env` file with your settings:
```env
SECRET_KEY=your-super-secret-key-change-this
RATE_LIMIT_PER_MINUTE=10
MIN_PREDICTION_CONFIDENCE=0.6
LOG_LEVEL=INFO
```

3. **Verify model files**:
Ensure models are in the correct directories:
- `../2d model/` - Contains 2D model files
- `../3d model/` - Contains 3D model files

4. **(Optional) Install video processing**:
For direct video upload support, install OpenPose and/or ROMP:
- See [VIDEO_PROCESSING_SETUP.md](VIDEO_PROCESSING_SETUP.md) for detailed instructions
- OpenPose: For 2D pose estimation
- ROMP: For 3D pose estimation

## Running the Server

### Development

```bash
cd ados_server
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: `http://localhost:8000`

## API Usage

### 1. Authentication

Get an access token:

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "changeme123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Default Credentials**:
- Admin: `username: admin`, `password: changeme123`
- Clinician: `username: clinician`, `password: clinic123`

⚠️ **Change these passwords in production!**

### 2. Make Predictions

The unified `/predict` endpoint accepts both video files and pre-processed NPZ files, automatically processing them through **both 2D and 3D models** to provide comprehensive predictions.

#### Workflow

```
Video Upload → Frame Extraction → 2D Poses (OpenPose) → 2D Model Prediction
                                 ↓
                              3D Poses (ROMP) → 3D Model Prediction
                                 ↓
                            Ensemble Prediction (Average)
```

#### API Call

```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "input_file=@patient_video.mp4" \
  -F "age=8.5" \
  -F "gender=M" \
  -F "include_explainability=true"
```

**Parameters**:
- `input_file`: **Video file** (.mp4, .avi, .mov) or **ZIP file** with .npz frames
- `age`: Patient age (0-120)
- `gender`: M or F
- `include_explainability`: true/false (default: true)
- `apply_defensive_preprocessing`: true/false (default: true)

**Video Requirements**:
- Format: MP4, AVI, or MOV
- Max size: 500MB (configurable)
- Max duration: 300 seconds (configurable)
- Automatically processed at 30 FPS

**ZIP File Format** (Legacy support):
```
frames.zip
└── frame_0001.npz  # coordinates: [num_persons, 24, 2/3]
└── frame_0002.npz
└── frame_0003.npz
...
```

**Response**:
```json
{
  "predictions_2d": {
    "severity": 1,
    "severity_confidence": 0.85,
    "social_affect": 12.3,
    "rrb": 8.7,
    "comparison_score": 7,
    "comparison_confidence": 0.78,
    "explainability": {
      "predictions": {...},
      "top_contributing_frames": [45, 89, 123],
      "task_explanations": {...}
    }
  },
  "predictions_3d": {
    "severity": 1,
    "severity_confidence": 0.82,
    "social_affect": 11.8,
    "rrb": 9.1,
    "comparison_score": 7,
    "comparison_confidence": 0.76,
    "explainability": {...}
  },
  "ensemble_prediction": {
    "severity": 1,
    "severity_confidence": 0.835,
    "social_affect": 12.05,
    "rrb": 8.9,
    "comparison_score": 7,
    "comparison_confidence": 0.77
  },
  "input_age": 8.5,
  "input_gender": "M",
  "status": "success",
  "processing_info": {
    "input_type": "video",
    "video_duration_seconds": 45.2,
    "original_fps": 29.97,
    "frames_extracted": 1356,
    "poses_2d_extracted": 1356,
    "poses_3d_extracted": 1356
  }
}
```

**Key Features**:
- 🎥 **Dual Processing**: Automatically runs both 2D and 3D models
- 🎯 **Ensemble Prediction**: Combines predictions from both models
- 🔍 **Separate Explainability**: Understand each model's decision-making
- 📊 **Processing Info**: Track the entire video-to-prediction pipeline
- ⚡ **Automatic Pose Extraction**: No manual pre-processing needed

**Note**: Requires OpenPose and ROMP to be installed for video processing. See [VIDEO_PROCESSING_SETUP.md](VIDEO_PROCESSING_SETUP.md)


### 3. Health Check

```bash
curl "http://localhost:8000/health"
```

### 4. Get Model Info

```bash
curl "http://localhost:8000/models/info" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Input Data Format

The video data should be a **ZIP file** containing `.npz` files, one per frame:

```
frames.zip
└── frame_0001.npz
└── frame_0002.npz
└── frame_0003.npz
...
```

Each `.npz` file should contain:
- `coordinates`: numpy array of shape `[num_persons, 24, 2]` for 2D or `[num_persons, 24, 3]` for 3D
- Joint order: COCO format (24 keypoints)

## API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Security Features

### 1. Authentication
- JWT-based token authentication
- Configurable token expiration

### 2. Rate Limiting
- Per-minute and per-hour limits
- Configurable in `.env`

### 3. Input Validation
- Bone length consistency checks
- Movement velocity limits
- Joint angle validation
- Confidence threshold filtering

### 4. Defensive Preprocessing
- Temporal smoothing
- Outlier clipping
- Noise injection for robustness

## Model Types

### 2D Model
- Input: 2D skeletal coordinates (x, y)
- Features: 150 per frame
- Use case: Single-camera setups

### 3D Model
- Input: 3D skeletal coordinates (x, y, z)
- Features: 222 per frame
- Use case: Multi-camera or depth-sensing setups

## Explainability

When `include_explainability=true`, the API returns:

1. **Joint Contributions**: Which body parts influenced the prediction
2. **Temporal Segments**: Critical time windows in the video
3. **Confidence Scores**: Prediction uncertainty estimates
4. **Demographic Impact**: How age/gender affected predictions

## Monitoring

### Logs
- Application logs: Console output
- Audit logs: `logs/audit.log`

### Metrics
Each prediction is logged with:
- Timestamp
- User
- Model type
- Input demographics
- Predictions

## Error Handling

The API returns standard HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid input)
- `401`: Unauthorized (invalid/missing token)
- `429`: Too many requests (rate limit exceeded)
- `500`: Internal server error

## Configuration

All settings in `config/settings.py`:

```python
# Model paths
MODEL_2D_PATH: Path to 2D model directory
MODEL_3D_PATH: Path to 3D model directory

# Security
SECRET_KEY: JWT secret key
RATE_LIMIT_PER_MINUTE: Request limit per minute
MIN_PREDICTION_CONFIDENCE: Minimum confidence threshold

# Validation
MAX_BONE_LENGTH_VARIATION: 0.3 (30%)
MAX_MOVEMENT_VELOCITY: 5.0
MIN_KEYPOINT_CONFIDENCE: 0.3
```

## Troubleshooting

### Models not loading
- Check model paths in `config/settings.py`
- Verify all required files exist (.pth, .pkl, .json)
- Check logs for specific errors

### Authentication failing
- Verify token is included in Authorization header
- Check token hasn't expired
- Ensure SECRET_KEY is set correctly

### Validation errors
- Check input data format (.npz files)
- Verify skeleton has 24 joints
- Ensure data quality meets thresholds

## License

[Your License Here]

## Contact

[Your Contact Information]
