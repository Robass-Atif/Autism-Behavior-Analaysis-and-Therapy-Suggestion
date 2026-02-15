import cv2
import numpy as np
import logging
import os
import tempfile
import subprocess
from pathlib import Path
from typing import Tuple, Optional, List
import json
import sys

logger = logging.getLogger(__name__)

class VideoProcessor:
    """
    Process videos to extract skeletal coordinates using OpenPose (2D) and ROMP (3D)
    """
    
    def __init__(self, openpose_dir: Optional[str] = None, romp_model_path: Optional[str] = None):
        """
        Initialize video processor
        
        Args:
            openpose_dir: Path to OpenPose installation directory
            romp_model_path: Path to ROMP model (optional, will use default if None)
        """
        self.openpose_dir = openpose_dir
        self.romp_model_path = romp_model_path
        
        # Try to import ROMP
        try:
            import romp
            self.romp_available = True
            logger.info("ROMP is available for 3D pose estimation")
        except ImportError:
            self.romp_available = False
            logger.warning("ROMP not available. 3D pose estimation will be limited.")
        
        # Check OpenPose availability
        self.openpose_available = False
        if openpose_dir and os.path.exists(openpose_dir):
            self.openpose_available = True
            logger.info(f"OpenPose directory found at: {openpose_dir}")
        else:
            logger.warning("OpenPose directory not found. Will try system-wide installation.")
    
    def extract_frames(self, video_path: str, output_dir: str, fps: Optional[int] = None) -> int:
        """
        Extract frames from video
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save frames
            fps: Target FPS (None = use video FPS)
        
        Returns:
            Number of frames extracted
        """
        os.makedirs(output_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        logger.info(f"Video: {video_fps:.2f} FPS, {total_frames} frames")
        
        # Determine frame sampling
        if fps is None:
            frame_interval = 1
        else:
            frame_interval = max(1, int(video_fps / fps))
        
        frame_count = 0
        saved_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % frame_interval == 0:
                frame_path = os.path.join(output_dir, f"frame_{saved_count:05d}.jpg")
                cv2.imwrite(frame_path, frame)
                saved_count += 1
            
            frame_count += 1
        
        cap.release()
        logger.info(f"Extracted {saved_count} frames from {frame_count} total frames")
        
        return saved_count
    
    def extract_2d_poses_openpose(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 2D skeletal coordinates using OpenPose
        
        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 2D coordinates
        
        Returns:
            Number of poses extracted
        """
        os.makedirs(output_dir, exist_ok=True)
        
        if not self.openpose_available and not self.openpose_dir:
            raise RuntimeError("OpenPose not available. Please install OpenPose and set openpose_dir.")
        
        # OpenPose command
        openpose_bin = os.path.join(self.openpose_dir, "bin", "OpenPoseDemo.exe") if self.openpose_dir else "openpose"
        
        # Output directory for OpenPose JSON
        json_output_dir = tempfile.mkdtemp()
        
        try:
            # Run OpenPose
            cmd = [
                openpose_bin,
                "--image_dir", frames_dir,
                "--write_json", json_output_dir,
                "--display", "0",
                "--render_pose", "0",
                "--model_pose", "COCO"  # 18 keypoints (we'll map to 24)
            ]
            
            logger.info(f"Running OpenPose: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"OpenPose error: {result.stderr}")
                raise RuntimeError(f"OpenPose failed with return code {result.returncode}")
            
            # Convert JSON to NPZ
            json_files = sorted([f for f in os.listdir(json_output_dir) if f.endswith('.json')])
            
            for idx, json_file in enumerate(json_files):
                json_path = os.path.join(json_output_dir, json_file)
                
                with open(json_path, 'r') as f:
                    data = json.load(f)
                
                # Extract keypoints
                if 'people' in data and len(data['people']) > 0:
                    # Get first person
                    person = data['people'][0]
                    keypoints = np.array(person['pose_keypoints_2d']).reshape(-1, 3)  # [N, 3] (x, y, confidence)
                    
                    # Convert COCO 18 to COCO 25 format (adding dummy keypoints)
                    coords_2d = self._convert_coco18_to_coco25(keypoints[:, :2])  # [25, 2]
                    
                    # Save as NPZ (format: [1, 24, 2] - 1 person, 24 keypoints, 2D coordinates)
                    npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
                    np.savez(npz_path, coordinates=coords_2d[np.newaxis, :24, :])  # Take first 24 keypoints
                else:
                    # No person detected, save empty array
                    npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
                    np.savez(npz_path, coordinates=np.zeros((1, 24, 2)))
            
            logger.info(f"Extracted 2D poses for {len(json_files)} frames")
            return len(json_files)
        
        finally:
            # Cleanup temporary JSON directory
            import shutil
            shutil.rmtree(json_output_dir, ignore_errors=True)
    
    def extract_3d_poses_romp(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 3D skeletal coordinates using ROMP
        
        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 3D coordinates
        
        Returns:
            Number of poses extracted
        """
        os.makedirs(output_dir, exist_ok=True)
        
        if not self.romp_available:
            raise RuntimeError("ROMP not available. Please install ROMP: pip install romp")
        
        import romp
        from romp import ROMP
        
        # Initialize ROMP model
        logger.info("Initializing ROMP model...")
        model = ROMP(mode='image')
        
        # Get frame files
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith(('.jpg', '.png'))])
        
        for idx, frame_file in enumerate(frame_files):
            frame_path = os.path.join(frames_dir, frame_file)
            
            # Read frame
            frame = cv2.imread(frame_path)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Run ROMP
            outputs = model(frame_rgb)
            
            if outputs is not None and len(outputs) > 0:
                # Get first person
                person_output = outputs[0]
                
                # Extract 3D keypoints (SMPL format, we need to convert to COCO format)
                if 'j3d' in person_output:
                    joints_3d = person_output['j3d']  # [N, 3]
                    
                    # Convert SMPL to COCO 24 keypoints
                    coords_3d = self._convert_smpl_to_coco24(joints_3d)
                else:
                    coords_3d = np.zeros((24, 3))
            else:
                # No person detected
                coords_3d = np.zeros((24, 3))
            
            # Save as NPZ (format: [1, 24, 3] - 1 person, 24 keypoints, 3D coordinates)
            npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
            np.savez(npz_path, coordinates=coords_3d[np.newaxis, :, :])
        
        logger.info(f"Extracted 3D poses for {len(frame_files)} frames")
        return len(frame_files)
    
    def process_video_2d(self, video_path: str, output_dir: str, fps: Optional[int] = 30) -> str:
        """
        Complete pipeline: video -> frames -> 2D poses
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save NPZ files
            fps: Target FPS for frame extraction
        
        Returns:
            Path to directory containing NPZ files
        """
        logger.info(f"Processing video for 2D pose estimation: {video_path}")
        
        # Create temporary directory for frames
        temp_frames_dir = tempfile.mkdtemp()
        
        try:
            # Step 1: Extract frames
            logger.info("Step 1: Extracting frames...")
            num_frames = self.extract_frames(video_path, temp_frames_dir, fps=fps)
            
            # Step 2: Extract 2D poses
            logger.info("Step 2: Extracting 2D poses with OpenPose...")
            num_poses = self.extract_2d_poses_openpose(temp_frames_dir, output_dir)
            
            logger.info(f"✅ 2D pose extraction complete: {num_poses} frames")
            return output_dir
        
        finally:
            # Cleanup temporary frames
            import shutil
            shutil.rmtree(temp_frames_dir, ignore_errors=True)
    
    def process_video_3d(self, video_path: str, output_dir: str, fps: Optional[int] = 30) -> str:
        """
        Complete pipeline: video -> frames -> 3D poses
        
        Args:
            video_path: Path to input video
            output_dir: Directory to save NPZ files
            fps: Target FPS for frame extraction
        
        Returns:
            Path to directory containing NPZ files
        """
        logger.info(f"Processing video for 3D pose estimation: {video_path}")
        
        # Create temporary directory for frames
        temp_frames_dir = tempfile.mkdtemp()
        
        try:
            # Step 1: Extract frames
            logger.info("Step 1: Extracting frames...")
            num_frames = self.extract_frames(video_path, temp_frames_dir, fps=fps)
            
            # Step 2: Extract 3D poses
            logger.info("Step 2: Extracting 3D poses with ROMP...")
            num_poses = self.extract_3d_poses_romp(temp_frames_dir, output_dir)
            
            logger.info(f"✅ 3D pose extraction complete: {num_poses} frames")
            return output_dir
        
        finally:
            # Cleanup temporary frames
            import shutil
            shutil.rmtree(temp_frames_dir, ignore_errors=True)
    
    def _convert_coco18_to_coco25(self, keypoints_18: np.ndarray) -> np.ndarray:
        """
        Convert COCO 18 keypoints to COCO 25 format (filling missing with zeros)
        
        COCO 18: Nose, Neck, RShoulder, RElbow, RWrist, LShoulder, LElbow, LWrist,
                 RHip, RKnee, RAnkle, LHip, LKnee, LAnkle, REye, LEye, REar, LEar
        
        COCO 25: Add MidHip, Chest, RBigToe, RSmallToe, RHeel, LBigToe, LSmallToe, LHeel, Background
        """
        keypoints_25 = np.zeros((25, 2))
        
        # Copy existing 18 keypoints
        keypoints_25[:18, :] = keypoints_18[:18, :]
        
        # Compute additional keypoints
        # MidHip (18) = average of RHip(8) and LHip(11)
        keypoints_25[18] = (keypoints_18[8] + keypoints_18[11]) / 2
        
        # Chest/Thorax (19) = average of RShoulder(2) and LShoulder(5)
        keypoints_25[19] = (keypoints_18[2] + keypoints_18[5]) / 2
        
        # Upper Neck (20) = neck position
        keypoints_25[20] = keypoints_18[1]
        
        # Head Top (21) = estimate above nose
        keypoints_25[21] = keypoints_18[0] + np.array([0, -20])
        
        # Foot keypoints (22-24) - estimate from ankle positions
        keypoints_25[22] = keypoints_18[10]  # Right foot ~ right ankle
        keypoints_25[23] = keypoints_18[13]  # Left foot ~ left ankle
        
        return keypoints_25
    
    def _convert_smpl_to_coco24(self, smpl_joints: np.ndarray) -> np.ndarray:
        """
        Convert SMPL joints to COCO 24 keypoints format
        
        SMPL has 24 joints, but ordering is different from COCO
        This is an approximation - you may need to adjust based on your ROMP version
        """
        # SMPL joint ordering (24 joints)
        # Pelvis(0), L_Hip(1), R_Hip(2), Spine1(3), L_Knee(4), R_Knee(5), Spine2(6), 
        # L_Ankle(7), R_Ankle(8), Spine3(9), L_Foot(10), R_Foot(11), Neck(12), 
        # L_Collar(13), R_Collar(14), Head(15), L_Shoulder(16), R_Shoulder(17), 
        # L_Elbow(18), R_Elbow(19), L_Wrist(20), R_Wrist(21), L_Hand(22), R_Hand(23)
        
        coco_24 = np.zeros((24, 3))
        
        # Map SMPL to COCO (this is an approximation)
        # You may need to adjust indices based on actual ROMP output
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
            coco_24[14] = smpl_joints[15]  # Right Eye (approximate with head)
            coco_24[15] = smpl_joints[15]  # Left Eye (approximate with head)
            coco_24[16] = smpl_joints[15]  # Right Ear (approximate with head)
            coco_24[17] = smpl_joints[15]  # Left Ear (approximate with head)
            coco_24[18] = smpl_joints[0]   # Pelvis
            coco_24[19] = smpl_joints[9]   # Thorax <- Spine3
            coco_24[20] = smpl_joints[12]  # Upper Neck
            coco_24[21] = smpl_joints[15]  # Head Top
            coco_24[22] = smpl_joints[11]  # Right Big Toe <- R_Foot
            coco_24[23] = smpl_joints[10]  # Left Big Toe <- L_Foot
        except IndexError:
            logger.warning("SMPL joint mapping error - using available joints")
        
        return coco_24


# Singleton instance
_video_processor = None

def get_video_processor(openpose_dir: Optional[str] = None, romp_model_path: Optional[str] = None) -> VideoProcessor:
    """Get or create video processor instance"""
    global _video_processor
    if _video_processor is None:
        _video_processor = VideoProcessor(openpose_dir, romp_model_path)
    return _video_processor