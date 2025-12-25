import torch
import pickle
import json
import logging
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.model_architecture import Model

logger = logging.getLogger(__name__)

class ModelManager:
    """Manages loading and caching of 2D and 3D models"""
    
    def __init__(self):
        self.models_cache = {}
    
    def load_model(self, model_type: str, model_path: str):
        """
        Load model and all dependencies
        
        Args:
            model_type: '2D' or '3D'
            model_path: Path to model export directory
        
        Returns:
            Dictionary with model, scalers, mappings, config
        """
        cache_key = f"{model_type}_model"
        
        # Return cached model if available
        if cache_key in self.models_cache:
            logger.info(f"Using cached {model_type} model")
            return self.models_cache[cache_key]
        
        logger.info(f"Loading {model_type} model from {model_path}")
        
        try:
            model_path = Path(model_path)
            
            # Load configuration
            config_file = model_path / f"{model_type.lower()}_model_config.json"
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            logger.info(f"Loaded config: {config}")
            
            # Load scalers
            scalers_file = model_path / f"{model_type.lower()}_scalers.pkl"
            with open(scalers_file, 'rb') as f:
                scalers = pickle.load(f)
            
            logger.info(f"Loaded scalers")
            
            # Load mappings
            mappings_file = model_path / f"{model_type.lower()}_mappings.json"
            with open(mappings_file, 'r') as f:
                mappings = json.load(f)
            
            logger.info(f"Loaded mappings")
            
            # Initialize model
            model = Model(
                sequence_input_size=config['sequence_input_size'],
                demographic_input_size=config['demographic_input_size'],
                hidden_size=config['hidden_size'],
                num_layers=config['num_layers'],
                dropout=config['dropout'],
                num_outputs=config['num_outputs']
            )
            
            # Load model weights
            model_file = model_path / f"{model_type.lower()}_model.pth"
            model.load_state_dict(torch.load(model_file, map_location='cpu'))
            model.eval()
            
            logger.info(f"Loaded model weights")
            
            # Load performance metrics (optional)
            metrics_file = model_path / f"{model_type.lower()}_performance_metrics.json"
            metrics = None
            if metrics_file.exists():
                with open(metrics_file, 'r') as f:
                    metrics = json.load(f)
                logger.info(f"Loaded performance metrics")
            
            loaded_data = {
                'model': model,
                'scalers': scalers,
                'mappings': mappings,
                'config': config,
                'metrics': metrics
            }
            
            # Cache the loaded model
            self.models_cache[cache_key] = loaded_data
            
            logger.info(f"✅ Successfully loaded {model_type} model")
            
            return loaded_data
        
        except Exception as e:
            logger.error(f"Error loading {model_type} model: {str(e)}")
            raise

# Global model manager instance
model_manager = ModelManager()
