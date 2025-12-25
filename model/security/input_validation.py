import numpy as np
from typing import Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class SkeletalInputValidator:
    """Validates skeletal input data to prevent adversarial attacks"""
    
    def __init__(self, config):
        self.max_bone_length_var = config.MAX_BONE_LENGTH_VARIATION
        self.max_velocity = config.MAX_MOVEMENT_VELOCITY
        self.min_confidence = config.MIN_KEYPOINT_CONFIDENCE
        self.max_joint_angle = config.MAX_JOINT_ANGLE
    
    def compute_bone_lengths(self, sequence: np.ndarray) -> np.ndarray:
        """
        Compute bone lengths across sequence
        Args:
            sequence: [seq_len, num_joints, 2 or 3]
        Returns:
            bone_lengths: [seq_len, num_bones]
        """
        # Define bone connections (COCO format)
        bones = [
            (0, 1),   # nose to neck
            (1, 2),   # neck to right shoulder
            (2, 3),   # right shoulder to right elbow
            (3, 4),   # right elbow to right wrist
            (1, 5),   # neck to left shoulder
            (5, 6),   # left shoulder to left elbow
            (6, 7),   # left elbow to left wrist
            (1, 8),   # neck to right hip
            (8, 9),   # right hip to right knee
            (9, 10),  # right knee to right ankle
            (1, 11),  # neck to left hip
            (11, 12), # left hip to left knee
            (12, 13), # left knee to left ankle
        ]
        
        bone_lengths = []
        for frame in sequence:
            frame_bones = []
            for joint1, joint2 in bones:
                if joint1 < len(frame) and joint2 < len(frame):
                    length = np.linalg.norm(frame[joint1] - frame[joint2])
                    frame_bones.append(length)
            bone_lengths.append(frame_bones)
        
        return np.array(bone_lengths)
    
    def compute_joint_angles(self, sequence: np.ndarray) -> np.ndarray:
        """
        Compute joint angles across sequence
        Returns angles in degrees
        """
        # Define angle triplets (joint1, vertex, joint2)
        angle_triplets = [
            (2, 3, 4),   # right elbow
            (5, 6, 7),   # left elbow
            (8, 9, 10),  # right knee
            (11, 12, 13),# left knee
        ]
        
        angles = []
        for frame in sequence:
            frame_angles = []
            for j1, vertex, j2 in angle_triplets:
                if j1 < len(frame) and vertex < len(frame) and j2 < len(frame):
                    v1 = frame[j1] - frame[vertex]
                    v2 = frame[j2] - frame[vertex]
                    
                    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-8)
                    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
                    frame_angles.append(np.degrees(angle))
            angles.append(frame_angles)
        
        return np.array(angles)
    
    def validate(self, sequence: np.ndarray, 
                 confidence: Optional[np.ndarray] = None) -> Tuple[bool, str]:
        """
        Validate skeletal sequence
        
        Args:
            sequence: [seq_len, num_joints, features]
            confidence: [seq_len, num_joints] (optional)
        
        Returns:
            (is_valid, error_message)
        """
        try:
            # Check 1: Empty sequence
            if sequence.shape[0] == 0:
                return False, "Empty sequence"
            
            # Check 2: Confidence scores (if provided)
            if confidence is not None:
                mean_confidence = np.mean(confidence)
                if mean_confidence < self.min_confidence:
                    logger.warning(f"Low keypoint confidence: {mean_confidence:.3f}")
                    return False, f"Low keypoint detection confidence: {mean_confidence:.3f}"
            
            # Check 3: Bone length consistency
            bone_lengths = self.compute_bone_lengths(sequence)
            bone_std = np.std(bone_lengths, axis=0)
            bone_mean = np.mean(bone_lengths, axis=0)
            
            # Coefficient of variation for each bone
            cv = bone_std / (bone_mean + 1e-8)
            if np.any(cv > self.max_bone_length_var):
                max_cv = np.max(cv)
                logger.warning(f"Unrealistic bone length variation: {max_cv:.3f}")
                return False, f"Unrealistic bone length variation: {max_cv:.3f}"
            
            # Check 4: Joint angles
            angles = self.compute_joint_angles(sequence)
            if np.any(angles > self.max_joint_angle) or np.any(angles < 0):
                return False, "Impossible joint angles detected"
            
            # Check 5: Movement velocity
            if sequence.shape[0] > 1:
                velocities = np.diff(sequence, axis=0)
                max_velocity = np.max(np.abs(velocities))
                if max_velocity > self.max_velocity:
                    logger.warning(f"Unrealistic movement velocity: {max_velocity:.3f}")
                    return False, f"Unrealistic movement speed: {max_velocity:.3f}"
            
            # Check 6: NaN or Inf values
            if np.any(np.isnan(sequence)) or np.any(np.isinf(sequence)):
                return False, "Invalid values (NaN or Inf) detected"
            
            return True, "Valid input"
        
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False, f"Validation error: {str(e)}"
