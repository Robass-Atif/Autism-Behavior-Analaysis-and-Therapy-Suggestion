# 🚀 Quick Start Guide - ADOS Prediction API

## ✅ Complete Setup Checklist

### 1. Verify Installation

Your FastAPI application has been created with the following structure:

```
ados_server/
├── config/
│   ├── __init__.py
│   └── settings.py          # Configuration settings
├── security/
│   ├── __init__.py
│   ├── authentication.py    # JWT authentication
│   ├── input_validation.py  # Input data validation
│   └── rate_limiting.py     # Rate limiting
├── models/
│   ├── __init__.py
│   ├── model_architecture.py  # ImprovedADOSModel class
│   ├── preprocessing.py       # 2D/3D preprocessing functions
│   └── explainability.py      # MultiTaskADOSExplainer
├── utils/
│   ├── __init__.py
│   ├── model_loader.py       # Model loading and caching
│   └── inference.py          # Inference pipeline
├── logs/                     # Log files (created automatically)
├── .env                      # Environment variables
├── requirements.txt          # Python dependencies
├── main.py                   # FastAPI application
├── run_server.py            # Server startup script
├── test_api.py              # API test script
└── README.md                # Full documentation
```

### 2. Install Dependencies

```powershell
python -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
```

### 3. Verify Model Files

Ensure these directories exist and contain model files:
- `../2d model/` should contain:
  - `2d_model.pth`
  - `2d_scalers.pkl`
  - `2d_model_config.json`
  - `2d_mappings.json`
  - `2d_performance_metrics.json`

- `../3d model/` should contain:
  - `3d_model.pth`
  - `3d_scalers.pkl`
  - `3d_model_config.json`
  - `3d_mappings.json`
  - `3d_performance_metrics.json`

✅ **Your models are already in place!**

### 4. Start the Server

**Option A: Using Python directly**
```powershell
python main.py
```

**Option B: Using the run script**
```powershell
python run_server.py --host localhost --port 8000
```

**Option C: Using uvicorn directly**
```powershell
uvicorn main:app --reload --host localhost --port 8000
```

The server will start on: **http://localhost:8000**

### 5. Test the API

**Quick Test**
```powershell
python test_api.py
```

**Health Check**
```powershell
curl http://localhost:8000/health
```

Or open in browser: http://localhost:8000/docs

### 6. Access Interactive Documentation

Once the server is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 Default Login Credentials

```
Admin Account:
  Username: admin
  Password: changeme123

Clinician Account:
  Username: clinician
  Password: clinic123
```

⚠️ **IMPORTANT**: Change these passwords in production by editing `security/authentication.py`

## 📝 Making Your First Prediction

The unified `/predict` endpoint automatically processes videos through **both 2D and 3D models** to provide comprehensive predictions!

### Step 1: Get Authentication Token

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:8000/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"changeme123"}'
$token = $response.access_token
```

### Step 2: Prepare Your Input

**Option A: Video File (Recommended)**
- Format: MP4, AVI, or MOV
- Max size: 500MB
- Max duration: 300 seconds
- Automatically processed through both 2D and 3D pipelines!

**Option B: Pre-processed NPZ Files (Legacy)**
- ZIP file containing `.npz` frame files
- Each NPZ: `coordinates` array [num_persons, 24, 2/3]
- COCO 24 keypoint format

### Step 3: Make Prediction

**From Video:**
```powershell
# Using curl (PowerShell)
curl -X POST "http://localhost:8000/predict" `
  -H "Authorization: Bearer $token" `
  -F "input_file=@path/to/patient_video.mp4" `
  -F "age=8.5" `
  -F "gender=M" `
  -F "include_explainability=true"
```

**From ZIP:**
```powershell
curl -X POST "http://localhost:8000/predict" `
  -H "Authorization: Bearer $token" `
  -F "input_file=@path/to/frames.zip" `
  -F "age=8.5" `
  -F "gender=M" `
  -F "include_explainability=true"
```

### Step 4: Review Results

The API returns predictions from **both models** plus an ensemble:

```json
{
  "predictions_2d": {
    "severity": 1,
    "severity_confidence": 0.85,
    "social_affect": 12.3,
    "rrb": 8.7,
    "comparison_score": 7,
    "explainability": {
      "top_contributing_frames": [45, 89, 123]
    }
  },
  "predictions_3d": {
    "severity": 1,
    "severity_confidence": 0.82,
    "social_affect": 11.8,
    "rrb": 9.1,
    "comparison_score": 7,
    "explainability": {
      "top_contributing_frames": [42, 91, 128]
    }
  },
  "ensemble_prediction": {
    "severity": 1,
    "severity_confidence": 0.835,
    "social_affect": 12.05,
    "rrb": 8.9,
    "comparison_score": 7
  },
  "processing_info": {
    "input_type": "video",
    "video_duration_seconds": 45.2,
    "frames_extracted": 1356,
    "poses_2d_extracted": 1356,
    "poses_3d_extracted": 1356
  },
  "status": "success"
}
```

**Key Benefits:**
- 🎥 **Dual Processing**: Automatic 2D and 3D analysis
- 🎯 **Ensemble Prediction**: More reliable combined result
- 🔍 **Dual Explainability**: Understand each model's reasoning
- ⚡ **Automatic Pipeline**: Video → Frames → Poses → Predictions

### Step 5: Using the Test Script

For easier testing:
```powershell
python test_unified_endpoint.py
```

This interactive script will:
1. Check API health
2. Authenticate
3. Test video prediction
4. Test ZIP prediction
5. Display comprehensive results


## 🛠️ Configuration

### Environment Variables (.env)

```env
SECRET_KEY=your-super-secret-key-change-this-in-production
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
MIN_PREDICTION_CONFIDENCE=0.6
LOG_LEVEL=INFO
```

### Settings (config/settings.py)

Key configuration options:
- `MODEL_2D_PATH`: Path to 2D model directory
- `MODEL_3D_PATH`: Path to 3D model directory
- `RATE_LIMIT_PER_MINUTE`: API rate limit
- `ALLOWED_ORIGINS`: CORS allowed origins
- Input validation thresholds

## 🔧 Troubleshooting

### Issue: "ModuleNotFoundError"
**Solution**: Install dependencies
```powershell
pip install -r requirements.txt
```

### Issue: "Model not found"
**Solution**: Verify model paths in `config/settings.py`
```python
MODEL_2D_PATH: str = str(BASE_DIR.parent / "2d model")
MODEL_3D_PATH: str = str(BASE_DIR.parent / "3d model")
```

### Issue: "Authentication failed"
**Solution**: Check credentials and token
- Verify username/password
- Ensure token is in Authorization header: `Bearer <token>`

### Issue: "Port already in use"
**Solution**: Use a different port
```powershell
python run_server.py --port 8001
```

## 📊 Monitoring

### View Logs
```powershell
# Real-time logs
Get-Content logs/audit.log -Wait

# Application logs
# Check console output where server is running
```

### Check API Status
```powershell
curl http://localhost:8000/health
```

## 🚀 Production Deployment

### 1. Update Security Settings
- Change SECRET_KEY in `.env`
- Change default passwords in `security/authentication.py`
- Update ALLOWED_ORIGINS in `config/settings.py`

### 2. Run with Multiple Workers
```powershell
python run_server.py --workers 4
```

### 3. Use a Process Manager
```powershell
# Using PM2 (install first: npm install -g pm2)
pm2 start "python run_server.py --workers 4" --name ados-api
```

### 4. Set Up Reverse Proxy (Nginx/Apache)
Configure nginx to proxy requests to your FastAPI server.

## 📖 Additional Resources

- **Full Documentation**: See `README.md`
- **API Reference**: http://localhost:8000/docs
- **Deployment Guide**: See `FASTAPI_SERVER_DEPLOYMENT_GUIDE.md`

## ✅ Next Steps

1. ✅ Install dependencies (`pip install -r requirements.txt`)
2. ✅ Start the server (`python main.py`)
3. ✅ Test the API (`python test_api.py`)
4. ✅ Open Swagger UI (http://localhost:8000/docs)
5. ✅ Make your first prediction!

## 🎉 You're All Set!

Your ADOS Prediction API is ready to use. The server will automatically:
- Load both 2D and 3D models on startup
- Validate all inputs for security
- Apply rate limiting
- Log all predictions to audit log
- Provide explainability for predictions

Happy coding! 🚀
