"""
Service for coordinating predictions from both 2D and 3D models
"""
import logging
import sys
from pathlib import Path
from typing import Dict, Optional
import numpy as np

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from utils.model_loader import model_manager
from utils.inference import InferencePipeline
from security.input_validation import SkeletalInputValidator
from models.preprocessing import load_npz_sequence, load_npz_sequence_3d

logger = logging.getLogger(__name__)

class PredictionService:
    """Coordinates predictions from both 2D and 3D models"""
    
    def __init__(self, settings):
        """
        Initialize prediction service
        
        Args:
            settings: Application settings object
        """
        self.settings = settings
        self.validator_2d = SkeletalInputValidator(settings)
        self.validator_3d = SkeletalInputValidator(settings)
    
    def predict_dual(
        self,
        frames_2d_dir: str,
        frames_3d_dir: str,
        age: float,
        gender: str,
        include_explainability: bool = True,
        apply_defensive_preprocessing: bool = True
    ) -> Dict:
        """
        Make predictions using both 2D and 3D models
        
        Args:
            frames_2d_dir: Directory containing 2D NPZ files
            frames_3d_dir: Directory containing 3D NPZ files
            age: Patient age
            gender: Patient gender (M/F)
            include_explainability: Include explainability analysis
            apply_defensive_preprocessing: Apply defensive preprocessing
        
        Returns:
            Dictionary with predictions from both models
        """
        logger.info("🔄 Running dual model prediction (2D + 3D)...")
        
        results = {
            "predictions_2d": None,
            "predictions_3d": None,
            "input_age": age,
            "input_gender": gender.upper(),
            "status": "success"
        }
        
        # Predict with 2D model
        try:
            logger.info("📊 Processing with 2D model...")
            results["predictions_2d"] = self._predict_single_model(
                model_type="2D",
                frames_dir=frames_2d_dir,
                age=age,
                gender=gender,
                include_explainability=include_explainability,
                apply_defensive_preprocessing=apply_defensive_preprocessing
            )
            logger.info("✅ 2D model prediction complete")
        except Exception as e:
            logger.error(f"❌ 2D model prediction failed: {e}")
            results["predictions_2d"] = {"error": str(e)}
        
        # Predict with 3D model
        try:
            logger.info("📊 Processing with 3D model...")
            results["predictions_3d"] = self._predict_single_model(
                model_type="3D",
                frames_dir=frames_3d_dir,
                age=age,
                gender=gender,
                include_explainability=include_explainability,
                apply_defensive_preprocessing=apply_defensive_preprocessing
            )
            logger.info("✅ 3D model prediction complete")
        except Exception as e:
            logger.error(f"❌ 3D model prediction failed: {e}")
            results["predictions_3d"] = {"error": str(e)}
        
        # Add ensemble prediction (average of both models)
        if results["predictions_2d"] and results["predictions_3d"]:
            if "error" not in results["predictions_2d"] and "error" not in results["predictions_3d"]:
                results["ensemble_prediction"] = self._compute_ensemble(
                    results["predictions_2d"],
                    results["predictions_3d"]
                )
                logger.info("✅ Ensemble prediction computed")
        
        logger.info("✅ Dual model prediction complete")
        return results
    
    def _predict_single_model(
        self,
        model_type: str,
        frames_dir: str,
        age: float,
        gender: str,
        include_explainability: bool,
        apply_defensive_preprocessing: bool
    ) -> Dict:
        """
        Make prediction with a single model
        
        Args:
            model_type: '2D' or '3D'
            frames_dir: Directory containing NPZ files
            age: Patient age
            gender: Patient gender
            include_explainability: Include explainability
            apply_defensive_preprocessing: Apply defensive preprocessing
        
        Returns:
            Prediction results
        """
        # Load sequence
        if model_type == "2D":
            sequence = load_npz_sequence(frames_dir)
            validator = self.validator_2d
        else:
            sequence = load_npz_sequence_3d(frames_dir)
            validator = self.validator_3d
        
        # Validate sequence
        is_valid, error_msg = validator.validate(sequence)
        if not is_valid:
            raise ValueError(f"Invalid {model_type} pose data: {error_msg}")
        
        logger.info(f"✅ {model_type} pose validation passed: {sequence.shape[0]} frames")
        
        # Load model
        model_path = self.settings.MODEL_2D_PATH if model_type == "2D" else self.settings.MODEL_3D_PATH
        model_data = model_manager.load_model(model_type, model_path)
        
        # Create inference pipeline
        pipeline = InferencePipeline(model_data, model_type)
        
        # Make prediction
        result = pipeline.predict(
            frames_dir,
            age=age,
            gender=gender.upper(),
            include_explainability=include_explainability,
            apply_defensive_preprocessing=apply_defensive_preprocessing
        )
        
        return result
    
    def _compute_ensemble(self, pred_2d: Dict, pred_3d: Dict) -> Dict:
        """
        Compute ensemble prediction by averaging 2D and 3D model outputs
        
        Args:
            pred_2d: 2D model predictions
            pred_3d: 3D model predictions
        
        Returns:
            Ensemble predictions
        """
        ensemble = {
            "severity": int(round((pred_2d["severity"] + pred_3d["severity"]) / 2)),
            "severity_confidence": (pred_2d["severity_confidence"] + pred_3d["severity_confidence"]) / 2,
            "social_affect": (pred_2d["social_affect"] + pred_3d["social_affect"]) / 2,
            "rrb": (pred_2d["rrb"] + pred_3d["rrb"]) / 2,
            "comparison_score": int(round((pred_2d["comparison_score"] + pred_3d["comparison_score"]) / 2)),
            "comparison_confidence": (pred_2d["comparison_confidence"] + pred_3d["comparison_confidence"]) / 2,
            "method": "average"
        }
        
        return ensemble
