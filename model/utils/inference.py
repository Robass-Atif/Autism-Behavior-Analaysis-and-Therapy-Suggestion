import torch
import numpy as np
import logging
from typing import Dict, Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.preprocessing import (
    load_npz_sequence, load_npz_sequence_3d,
    normalize_skeleton, normalize_skeleton_3d,
    pad_sequence, pad_sequence_3d,
    compute_enhanced_features, compute_enhanced_features_3d,
    defensive_preprocessing
)
from models.explainability import MultiTaskADOSExplainer

logger = logging.getLogger(__name__)

class InferencePipeline:
    """Complete inference pipeline with security features"""
    
    def __init__(self, model_data: Dict, model_type: str):
        self.model = model_data['model']
        self.scalers = model_data['scalers']
        self.mappings = model_data['mappings']
        self.config = model_data['config']
        self.model_type = model_type
        
        # Set up preprocessing functions
        if model_type == '2D':
            self.load_func = load_npz_sequence
            self.normalize_func = normalize_skeleton
            self.pad_func = pad_sequence
            self.feature_func = compute_enhanced_features
        else:
            self.load_func = load_npz_sequence_3d
            self.normalize_func = normalize_skeleton_3d
            self.pad_func = pad_sequence_3d
            self.feature_func = compute_enhanced_features_3d
        
        self.max_len = 500
    
    def predict(self, video_folder_path: str, age: float, gender: str,
                include_explainability: bool = True,
                apply_defensive_preprocessing: bool = True) -> Dict:
        """
        Run complete inference pipeline
        
        Args:
            video_folder_path: Path to folder containing .npz frame files
            age: Patient age in years
            gender: Patient gender ('M' or 'F')
            include_explainability: Whether to compute explainability
            apply_defensive_preprocessing: Whether to apply defensive preprocessing
        
        Returns:
            Dictionary with predictions and optional explainability
        """
        try:
            logger.info(f"Starting inference for {video_folder_path}")
            
            # 1. Load sequence
            sequence = self.load_func(video_folder_path)
            if sequence.shape[0] == 0:
                raise ValueError("Empty sequence loaded")
            
            original_length = sequence.shape[0]
            logger.info(f"Loaded sequence with {original_length} frames")
            
            # 2. Normalize
            sequence = self.normalize_func(sequence)
            
            # 3. Pad to max length
            sequence = self.pad_func(sequence, self.max_len)
            
            # 4. Compute enhanced features
            features = self.feature_func(sequence)
            
            # 5. Apply defensive preprocessing if requested
            if apply_defensive_preprocessing:
                features = defensive_preprocessing(features)
            
            # 6. Scale features
            features_scaled = self.scalers['sequence_scaler'].transform(
                features.reshape(-1, features.shape[-1])
            ).reshape(features.shape)
            
            # 7. Prepare demographic features
            gender_encoded = 1 if gender.upper() == 'M' else 0
            demographic_features = np.array([[age, gender_encoded]], dtype=np.float32)
            demographic_scaled = self.scalers['demographic_scaler'].transform(demographic_features)
            
            # 8. Convert to tensors
            x_seq = torch.FloatTensor(features_scaled).unsqueeze(0)  # [1, seq_len, features]
            x_demo = torch.FloatTensor(demographic_scaled)  # [1, 2]
            seq_len = torch.LongTensor([original_length])
            
            # 9. Make prediction
            self.model.eval()
            with torch.no_grad():
                outputs = self.model(x_seq, x_demo, seq_len)
            
            # 10. Inverse transform predictions
            predictions_scaled = outputs[0].cpu().numpy().reshape(1, -1)
            
            severity_pred = self.scalers['target_scalers'][0].inverse_transform(
                predictions_scaled[:, 0:1]
            )[0, 0]
            social_affect_pred = self.scalers['target_scalers'][1].inverse_transform(
                predictions_scaled[:, 1:2]
            )[0, 0]
            rrb_pred = self.scalers['target_scalers'][2].inverse_transform(
                predictions_scaled[:, 2:3]
            )[0, 0]
            comparison_pred = self.scalers['target_scalers'][3].inverse_transform(
                predictions_scaled[:, 3:4]
            )[0, 0]
            
            # Round severity and comparison to integers
            severity_pred = int(round(severity_pred))
            comparison_pred = int(round(comparison_pred))
            
            result = {
                'severity': severity_pred,
                'severity_confidence': 1.0,  # Placeholder, will be updated by explainability
                'social_affect': float(social_affect_pred),
                'rrb': float(rrb_pred),
                'comparison_score': comparison_pred,
                'comparison_confidence': 1.0,  # Placeholder
                'input_age': float(age),
                'input_gender': gender.upper(),
                'model_type': self.model_type,
                'sequence_length': original_length
            }
            
            # 11. Compute explainability if requested
            if include_explainability:
                logger.info("Computing explainability...")
                explainer = MultiTaskADOSExplainer(
                    model=self.model,
                    target_scalers=self.scalers['target_scalers'],
                    demographic_scaler=self.scalers['demographic_scaler'],
                    fps=30,
                    device='cpu'
                )
                
                explanation = explainer.explain_all_tasks(x_seq, x_demo, seq_len)
                result['explainability'] = explanation
                
                # Update confidence scores from explainability
                if 'task_explanations' in explanation:
                    if 'Severity' in explanation['task_explanations']:
                        result['severity_confidence'] = explanation['task_explanations']['Severity']['confidence']['confidence_score'] / 100.0
                    if 'Comparison Score' in explanation['task_explanations']:
                        result['comparison_confidence'] = explanation['task_explanations']['Comparison Score']['confidence']['confidence_score'] / 100.0
            
            logger.info(f"✅ Prediction successful: Severity={severity_pred}, SA={social_affect_pred:.2f}, RRB={rrb_pred:.2f}, Comparison={comparison_pred}")
            
            return result
        
        except Exception as e:
            logger.error(f"Error during inference: {str(e)}")
            raise
