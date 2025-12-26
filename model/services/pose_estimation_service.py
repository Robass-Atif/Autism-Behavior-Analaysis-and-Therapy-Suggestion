"""
Service for pose estimation using OpenPose (2D) and ROMP (3D)
"""
import cv2
import numpy as np
import logging
import os
import tempfile
import subprocess
import json
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
            openpose_dir: Path to OpenPose installation
            romp_model_path: Path to ROMP model (optional)
        """
        self.openpose_dir = openpose_dir
        self.romp_model_path = romp_model_path
        
        # Check OpenPose availability
        self.openpose_available = False
        if openpose_dir and os.path.exists(openpose_dir):
            self.openpose_available = True
            logger.info(f"✅ OpenPose available at: {openpose_dir}")
        else:
            logger.warning("⚠️  OpenPose not configured. 2D pose estimation will not work.")
        
        # Check ROMP availability
        self.romp_available = False
        try:
            import romp
            self.romp_available = True
            logger.info("✅ ROMP available for 3D pose estimation")
        except ImportError:
            logger.warning("⚠️  ROMP not installed. 3D pose estimation will not work.")
    
    def estimate_2d_poses(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 2D poses using OpenPose
        
        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 2D coordinates
        
        Returns:
            Number of poses extracted
        """
        if not self.openpose_available:
            raise RuntimeError("OpenPose not available. Please install and configure OPENPOSE_DIR.")
        
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info("🔄 Running OpenPose for 2D pose estimation...")
        
        # OpenPose command
        openpose_bin = os.path.join(self.openpose_dir, "bin", "OpenPoseDemo.exe")
        
        # Temporary directory for JSON output
        json_output_dir = tempfile.mkdtemp()
        
        try:
            # Run OpenPose from its root directory
            cmd = [
                openpose_bin,
                "--image_dir", frames_dir,
                "--write_json", json_output_dir,
                "--display", "0",
                "--render_pose", "0",
                "--model_pose", "COCO"
            ]
            
            logger.info(f"Executing: {' '.join(cmd)}")
            # IMPORTANT: Run from OpenPose root directory
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600, cwd=self.openpose_dir)
            
            if result.returncode != 0:
                logger.error(f"OpenPose error: {result.stderr}")
                raise RuntimeError(f"OpenPose failed: {result.stderr}")
            
            # Convert JSON to NPZ
            json_files = sorted([f for f in os.listdir(json_output_dir) if f.endswith('.json')])
            
            for idx, json_file in enumerate(json_files):
                json_path = os.path.join(json_output_dir, json_file)
                
                with open(json_path, 'r') as f:
                    data = json.load(f)
                
                # Extract keypoints
                if 'people' in data and len(data['people']) > 0:
                    person = data['people'][0]
                    keypoints = np.array(person['pose_keypoints_2d']).reshape(-1, 3)
                    
                    # Convert COCO 18 to COCO 25 and take first 24
                    coords_2d = self._convert_coco18_to_coco25(keypoints[:, :2])
                    coords_2d = coords_2d[:24, :]  # Take first 24 keypoints
                else:
                    # No person detected
                    coords_2d = np.zeros((24, 2))
                
                # Save as NPZ
                npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
                np.savez(npz_path, coordinates=coords_2d[np.newaxis, :, :])
            
            logger.info(f"✅ Extracted 2D poses for {len(json_files)} frames")
            return len(json_files)
        
        finally:
            # Cleanup
            import shutil
            shutil.rmtree(json_output_dir, ignore_errors=True)
    
    def estimate_3d_poses(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 3D poses using ROMP
        
        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 3D coordinates
        
        Returns:
            Number of poses extracted
        """
        if not self.romp_available:
            raise RuntimeError("ROMP not available. Install: pip install simple-romp")
        
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info("🔄 Running ROMP for 3D pose estimation...")
        
        import romp
        from romp import ROMP
        
        # Initialize ROMP
        model = ROMP(mode='image')
        
        # Get frame files
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith(('.jpg', '.png'))])
        
        for idx, frame_file in enumerate(frame_files):
            frame_path = os.path.join(frames_dir, frame_file)
            
            # Read frame
            frame = cv2.imread(frame_path)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Run ROMP
            try:
                outputs = model(frame_rgb)
                
                if outputs is not None and len(outputs) > 0:
                    person_output = outputs[0]
                    
                    # Extract 3D joints
                    if 'j3d' in person_output:
                        joints_3d = person_output['j3d']
                        coords_3d = self._convert_smpl_to_coco24(joints_3d)
                    else:
                        coords_3d = np.zeros((24, 3))
                else:
                    coords_3d = np.zeros((24, 3))
            except Exception as e:
                logger.warning(f"ROMP failed for frame {idx}: {e}")
                coords_3d = np.zeros((24, 3))
            
            # Save as NPZ
            npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
            np.savez(npz_path, coordinates=coords_3d[np.newaxis, :, :])
        
        logger.info(f"✅ Extracted 3D poses for {len(frame_files)} frames")
        return len(frame_files)
    
    def _convert_coco18_to_coco25(self, keypoints_18: np.ndarray) -> np.ndarray:
        """Convert COCO 18 keypoints to COCO 25 format"""
        keypoints_25 = np.zeros((25, 2))
        
        # Copy existing 18 keypoints
        keypoints_25[:18, :] = keypoints_18[:18, :]
        
        # Compute additional keypoints
        keypoints_25[18] = (keypoints_18[8] + keypoints_18[11]) / 2  # MidHip
        keypoints_25[19] = (keypoints_18[2] + keypoints_18[5]) / 2   # Chest
        keypoints_25[20] = keypoints_18[1]                            # Upper Neck
        keypoints_25[21] = keypoints_18[0] + np.array([0, -20])      # Head Top
        keypoints_25[22] = keypoints_18[10]                           # Right foot
        keypoints_25[23] = keypoints_18[13]                           # Left foot
        
        return keypoints_25
    
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
