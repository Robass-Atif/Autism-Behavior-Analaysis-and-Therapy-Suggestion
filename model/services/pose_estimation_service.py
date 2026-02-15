"""
Service for pose estimation using MediaPipe (2D) and ROMP (3D)
"""
import cv2
import numpy as np
import logging
import os
import json 
import warnings 
from pathlib import Path
from typing import Optional, Tuple
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

logger = logging.getLogger(__name__)

class PoseEstimationService:
    """Handles 2D and 3D pose estimation"""
    
    def __init__(self, openpose_dir: Optional[str] = None, romp_model_path: Optional[str] = None):
        """
        Initialize pose estimation service
        
        Args:
            openpose_dir: Deprecated - kept for compatibility
            romp_model_path: Path to ROMP model (optional)
        """
        # Check MediaPipe availability
        self.mediapipe_available = False
        try:
            import mediapipe as mp
            from mediapipe.tasks import python
            from mediapipe.tasks.python import vision
            self.mp = mp
            self.mp_vision = vision
            self.mediapipe_available = True
            logger.info(f"✅ MediaPipe {mp.__version__} available for 2D pose estimation")
        except (ImportError, AttributeError) as e:
            logger.warning(f"⚠️  MediaPipe not available: {e}. 2D pose estimation will not work. Install: pip install mediapipe")
        
        # Check ROMP availability
        # Note: The package is installed as 'simple-romp' but imports as 'romp'
        self.romp_available = False
        try:
            import romp
            self.romp_available = True
            logger.info("✅ Simple-ROMP available for 3D pose estimation")
        except ImportError:
            logger.warning("⚠️  Simple-ROMP not installed. 3D pose estimation will not work. Install: pip install simple-romp")
    
    def estimate_2d_poses(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 2D poses using MediaPipe
        
        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 2D coordinates
        
        Returns:
            Number of poses extracted
        """
        if not self.mediapipe_available:
            raise RuntimeError("MediaPipe not available. Install: pip install mediapipe")
        
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info("🔄 Running MediaPipe for 2D pose estimation...")
        
        # Get frame files
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith(('.jpg', '.png'))])
        
        if not frame_files:
            logger.warning("No frame files found in directory")
            return 0
        
        # Download pose landmarker model if needed
        model_path = self._get_pose_landmarker_model()
        
        # Initialize MediaPipe Pose Landmarker (0.10.x API)
        from mediapipe.tasks.python import BaseOptions
        
        base_options = BaseOptions(model_asset_path=model_path)
        options = self.mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=self.mp_vision.RunningMode.IMAGE,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        with self.mp_vision.PoseLandmarker.create_from_options(options) as pose:
            
            for idx, frame_file in enumerate(frame_files):
                frame_path = os.path.join(frames_dir, frame_file)
                
                try:
                    # Read frame
                    frame = cv2.imread(frame_path)
                    if frame is None:
                        logger.warning(f"Failed to read frame: {frame_file}")
                        coords_2d = np.zeros((24, 2))
                    else:
                        # Convert to RGB
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        
                        # Ensure frame is contiguous in memory
                        frame_rgb = np.ascontiguousarray(frame_rgb)
                        
                        # Create MediaPipe Image
                        mp_image = self.mp.Image(
                            image_format=self.mp.ImageFormat.SRGB,
                            data=frame_rgb
                        )
                        
                        # Process with MediaPipe
                        results = pose.detect(mp_image)
                        
                        if results.pose_landmarks and len(results.pose_landmarks) > 0:
                            # Convert MediaPipe landmarks to COCO 24 format
                            coords_2d = self._convert_mediapipe_to_coco24(
                                results.pose_landmarks[0],  # First person
                                frame.shape[1],  # width
                                frame.shape[0]   # height
                            )
                        else:
                            # No person detected
                            logger.debug(f"No pose detected in frame {idx}")
                            coords_2d = np.zeros((24, 2))
                
                except Exception as e:
                    logger.warning(f"Error processing frame {idx} ({frame_file}): {e}")
                    coords_2d = np.zeros((24, 2))
                
                # Save as NPZ
                npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
                np.savez(npz_path, coordinates=coords_2d[np.newaxis, :, :])
        
        logger.info(f"✅ Extracted 2D poses for {len(frame_files)} frames")
        return len(frame_files)
    
    def _get_pose_landmarker_model(self) -> str:
        """
        Download MediaPipe pose landmarker model if not present
        
        Returns:
            Path to the model file
        """
        model_dir = Path(__file__).parent.parent / "models" / "mediapipe"
        model_dir.mkdir(parents=True, exist_ok=True)
        
        model_path = model_dir / "pose_landmarker_heavy.task"
        
        if not model_path.exists():
            logger.info("📥 Downloading MediaPipe pose landmarker model...")
            try:
                import urllib.request
                model_url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
                
                urllib.request.urlretrieve(model_url, str(model_path))
                logger.info(f"✅ Model downloaded to {model_path}")
            except Exception as e:
                logger.error(f"Failed to download model: {e}")
                raise RuntimeError(f"Failed to download MediaPipe model: {e}")
        
        return str(model_path)
    
    def estimate_3d_poses(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 3D poses using Simple-ROMP

        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 3D coordinates

        Returns:
            Number of poses extracted
        """
        import os
        import numpy as np
        import warnings
        from pathlib import Path

        if not self.romp_available:
            raise RuntimeError("ROMP not available. Install: pip install simple-romp")

        os.makedirs(output_dir, exist_ok=True)

        logger.info("🔄 Running Simple-ROMP for 3D pose estimation...")

        # Get frame files
        frame_files = sorted(
            f for f in os.listdir(frames_dir)
            if f.lower().endswith((".jpg", ".png"))
        )

        if not frame_files:
            logger.warning("No frame files found in directory")
            return 0

        # -------------------------------
        # Initialize Simple-ROMP model
        # -------------------------------
        try:
            warnings.filterwarnings("ignore", category=FutureWarning)

            import romp
            
            # Use default settings from simple-romp
            settings = romp.main.default_settings
            settings.mode = 'image'
            
            # Initialize ROMP model
            romp_model = romp.ROMP(settings)

            logger.info("✅ Simple-ROMP model loaded successfully")

        except Exception as e:
            logger.exception("Failed to initialize Simple-ROMP")
            raise RuntimeError(f"ROMP initialization failed: {e}")

        # -------------------------------
        # Run inference on frames
        # -------------------------------
        pose_count = 0

        for frame_file in frame_files:
            frame_path = os.path.join(frames_dir, frame_file)

            try:
                # Read image in BGR format as required by ROMP
                image = cv2.imread(frame_path)
                if image is None:
                    logger.warning(f"Failed to read image: {frame_file}")
                    continue
                    
                results = romp_model(image)
                
                if results is None:
                    logger.warning(f"No person detected in {frame_file}")
                    continue

                # ROMP outputs contain 'smpl_thetas', 'smpl_betas', 'cam', 'verts', 'joints', etc.
                # 'joints' contains 2D/3D position of 71 joints
                joints = results.get('joints', None) if isinstance(results, dict) else getattr(results, 'joints', None)
                verts = results.get('verts', None) if isinstance(results, dict) else getattr(results, 'verts', None)

                if joints is None:
                    logger.warning(f"No 3D joints detected in {frame_file}")
                    continue
                
                # Convert ROMP 71 joints to COCO 24 format for compatibility with model
                # ROMP joints shape: (num_people, 71, 3) - take first 24 SMPL joints
                if len(joints.shape) == 3:
                    # Multiple people detected, take first person
                    joints_24 = joints[0, :24, :]  # First 24 are SMPL joints
                elif len(joints.shape) == 2:
                    joints_24 = joints[:24, :]
                else:
                    logger.warning(f"Unexpected joints shape in {frame_file}: {joints.shape}")
                    continue
                
                # Convert to COCO 24 format expected by the model
                coords_3d = self._convert_smpl_to_coco24(joints_24)
                
                output_path = os.path.join(
                    output_dir,
                    Path(frame_file).stem + ".npz"
                )

                # Save with 'coordinates' key to match load_npz_sequence_3d expectation
                np.savez(
                    output_path,
                    coordinates=coords_3d[np.newaxis, :, :],  # Add batch dimension (1, 24, 3)
                )

                pose_count += 1

            except Exception as e:
                logger.warning(f"Failed processing frame {frame_file}: {e}")
                continue

        logger.info(f"✅ 3D pose extraction completed. Total poses: {pose_count}")
        return pose_count


    def _convert_mediapipe_to_coco24(self, landmarks, width: int, height: int) -> np.ndarray:
        """
        Convert MediaPipe 33 landmarks to COCO 24 keypoints format
        
        MediaPipe indices: https://google.github.io/mediapipe/solutions/pose.html
        COCO 24 format matches the 2D model training format
        """
        coco_24 = np.zeros((24, 2))
        
        try:
            # MediaPipe to COCO mapping
            mp_to_coco = {
                0: 0,   # Nose
                1: 1,   # Neck (approximate from shoulders)
                2: 12,  # Right Shoulder
                3: 14,  # Right Elbow
                4: 16,  # Right Wrist
                5: 11,  # Left Shoulder
                6: 13,  # Left Elbow
                7: 15,  # Left Wrist
                8: 24,  # Right Hip
                9: 26,  # Right Knee
                10: 28, # Right Ankle
                11: 23, # Left Hip
                12: 25, # Left Knee
                13: 27, # Left Ankle
                14: 5,  # Right Eye (inner)
                15: 2,  # Left Eye (inner)
                16: 8,  # Right Ear
                17: 7,  # Left Ear
                18: None,  # Pelvis (computed)
                19: None,  # Thorax (computed)
                20: None,  # Upper Neck (computed)
                21: None,  # Head Top (computed)
                22: 32, # Right Foot (toe)
                23: 31, # Left Foot (toe)
            }
            
            # Extract landmarks with bounds checking
            for coco_idx, mp_idx in mp_to_coco.items():
                if mp_idx is not None and mp_idx < len(landmarks):
                    lm = landmarks[mp_idx]
                    # Clamp coordinates to image bounds
                    x = np.clip(lm.x * width, 0, width - 1)
                    y = np.clip(lm.y * height, 0, height - 1)
                    coco_24[coco_idx] = [x, y]
            
            # Compute derived keypoints
            # Neck (1) - midpoint between shoulders
            if np.any(coco_24[2]) and np.any(coco_24[5]):
                coco_24[1] = (coco_24[2] + coco_24[5]) / 2
            
            # Pelvis (18) - midpoint between hips
            if np.any(coco_24[8]) and np.any(coco_24[11]):
                coco_24[18] = (coco_24[8] + coco_24[11]) / 2
            
            # Thorax (19) - midpoint between neck and pelvis
            if np.any(coco_24[1]) and np.any(coco_24[18]):
                coco_24[19] = (coco_24[1] + coco_24[18]) / 2
            
            # Upper Neck (20) - slightly above neck
            if np.any(coco_24[1]) and np.any(coco_24[0]):
                coco_24[20] = coco_24[1] + (coco_24[0] - coco_24[1]) * 0.5
            
            # Head Top (21) - above nose
            if np.any(coco_24[0]):
                head_top_y = max(0, coco_24[0][1] - 20)
                coco_24[21] = np.array([coco_24[0][0], head_top_y])
        
        except Exception as e:
            logger.warning(f"Error converting MediaPipe landmarks to COCO24: {e}")
        
        return coco_24
    
    def _convert_smpl_to_coco24(self, smpl_joints: np.ndarray) -> np.ndarray:
        """Convert SMPL joints to COCO 24 keypoints"""
        coco_24 = np.zeros((24, 3))
        
        try:
            coco_24[0] = smpl_joints[15]   # Nose <- Head
            coco_24[1] = smpl_joints[12]   # Neck
            coco_24[2] = smpl_joints[17]   # Right Shoulder
            coco_24[3] = smpl_joints[19]   # Right Elbow
            coco_24[4] = smpl_joints[21]   # Right Wrist
            coco_24[5] = smpl_joints[16]   # Left Shoulder
            coco_24[6] = smpl_joints[18]   # Left Elbow
            coco_24[7] = smpl_joints[20]   # Left Wrist
            coco_24[8] = smpl_joints[2]    # Right Hip
            coco_24[9] = smpl_joints[5]    # Right Knee
            coco_24[10] = smpl_joints[8]   # Right Ankle
            coco_24[11] = smpl_joints[1]   # Left Hip
            coco_24[12] = smpl_joints[4]   # Left Knee
            coco_24[13] = smpl_joints[7]   # Left Ankle
            coco_24[14] = smpl_joints[15]  # Right Eye
            coco_24[15] = smpl_joints[15]  # Left Eye
            coco_24[16] = smpl_joints[15]  # Right Ear
            coco_24[17] = smpl_joints[15]  # Left Ear
            coco_24[18] = smpl_joints[0]   # Pelvis
            coco_24[19] = smpl_joints[9]   # Thorax
            coco_24[20] = smpl_joints[12]  # Upper Neck
            coco_24[21] = smpl_joints[15]  # Head Top
            coco_24[22] = smpl_joints[11]  # Right Big Toe
            coco_24[23] = smpl_joints[10]  # Left Big Toe
        except IndexError:
            logger.warning("SMPL joint mapping error - using available joints")
        
        return coco_24
