import numpy as np
import os
import logging

logger = logging.getLogger(__name__)

# ===============================
# 2D Preprocessing Functions
# ===============================

def load_npz_sequence(folder_path):
    """Load 2D skeleton sequence from .npz files"""
    frame_files = sorted([f for f in os.listdir(folder_path) if f.endswith('.npz')])
    sequence = []
    for f in frame_files:
        data = np.load(os.path.join(folder_path, f))['coordinates']
        if data.shape[0] > 0:
            person_data = data[0]
            sequence.append(person_data)
    if not sequence:
        return np.empty((0, 24, 2))
    return np.array(sequence)

def normalize_skeleton(sequence):
    """Improved normalization with stability for 2D skeleton"""
    if sequence.shape[0] == 0:
        return sequence
    
    # Center around hip midpoint
    center = (sequence[:, 8:9, :] + sequence[:, 11:12, :]) / 2
    sequence = sequence - center
    
    # Normalize by torso length for scale invariance
    torso_length = np.linalg.norm(
        sequence[:, 1, :] - (sequence[:, 8, :] + sequence[:, 11, :]) / 2,
        axis=1, keepdims=True
    )
    torso_length = np.maximum(torso_length, 1e-6)  # Avoid division by zero
    sequence = sequence / (torso_length[:, :, np.newaxis] + 1e-6)
    
    return sequence

def pad_sequence(seq, max_len=100):
    """Pad 2D sequence to fixed length"""
    num_frames, num_joints, _ = seq.shape
    if num_frames >= max_len:
        return seq[:max_len]
    else:
        pad_len = max_len - num_frames
        padding = np.zeros((pad_len, num_joints, 2))
        return np.concatenate([seq, padding], axis=0)

def compute_enhanced_features(sequence):
    """
    Enhanced feature extraction with more behavioral signals for 2D
    Returns: [num_frames, 150] features
    """
    num_frames = sequence.shape[0]
    
    # 1. Flattened joint positions (48 features)
    flat_joints = sequence.reshape(num_frames, -1)
    
    # 2. Velocity (48 features)
    velocity = np.zeros_like(flat_joints)
    velocity[1:] = flat_joints[1:] - flat_joints[:-1]
    
    # 3. Acceleration (48 features)
    acceleration = np.zeros_like(flat_joints)
    acceleration[1:] = velocity[1:] - velocity[:-1]
    
    # 4. Key joint distances (behavioral indicators)
    # Hand-hand distance
    left_wrist = sequence[:, 7, :]
    right_wrist = sequence[:, 4, :]
    dist_hands = np.linalg.norm(left_wrist - right_wrist, axis=1, keepdims=True)
    
    # Elbow-elbow distance
    left_elbow = sequence[:, 6, :]
    right_elbow = sequence[:, 3, :]
    dist_elbows = np.linalg.norm(left_elbow - right_elbow, axis=1, keepdims=True)
    
    # Hand-to-body distances (self-stimulatory behaviors)
    neck = sequence[:, 1, :]
    dist_left_hand_body = np.linalg.norm(left_wrist - neck, axis=1, keepdims=True)
    dist_right_hand_body = np.linalg.norm(right_wrist - neck, axis=1, keepdims=True)
    
    # 5. Movement magnitude (overall activity level)
    movement_mag = np.linalg.norm(velocity.reshape(num_frames, -1), axis=1, keepdims=True)
    
    # 6. Symmetry features (left-right coordination)
    left_shoulder = sequence[:, 5, :]
    right_shoulder = sequence[:, 2, :]
    shoulder_symmetry = np.linalg.norm(
        (left_wrist - left_shoulder) - (right_wrist - right_shoulder),
        axis=1, keepdims=True
    )
    
    # Combine all features (48 + 48 + 48 + 1 + 1 + 1 + 1 + 1 + 1 = 150)
    features = np.concatenate([
        flat_joints,           # 48
        velocity,              # 48
        acceleration,          # 48
        dist_hands,            # 1
        dist_elbows,           # 1
        dist_left_hand_body,   # 1
        dist_right_hand_body,  # 1
        movement_mag,          # 1
        shoulder_symmetry      # 1
    ], axis=1)
    
    return features

# ===============================
# 3D Preprocessing Functions
# ===============================

def load_npz_sequence_3d(folder_path):
    """Load 3D skeleton sequence (24 joints with x, y, z coordinates)"""
    frame_files = sorted([f for f in os.listdir(folder_path) if f.endswith('.npz')])
    sequence = []
    for f in frame_files:
        data = np.load(os.path.join(folder_path, f))['coordinates']
        if data.shape[0] > 0:
            person_data = data[0]  # Take first person
            sequence.append(person_data)
    if not sequence:
        return np.empty((0, 24, 3))  # 3D coordinates
    return np.array(sequence)

def normalize_skeleton_3d(sequence):
    """Improved normalization for 3D skeleton with stability"""
    if sequence.shape[0] == 0:
        return sequence
    
    # Center around hip midpoint (3D)
    center = (sequence[:, 8:9, :] + sequence[:, 11:12, :]) / 2
    sequence = sequence - center
    
    # Normalize by torso length for scale invariance (3D distance)
    torso_length = np.linalg.norm(
        sequence[:, 1, :] - (sequence[:, 8, :] + sequence[:, 11, :]) / 2,
        axis=1, keepdims=True
    )
    torso_length = np.maximum(torso_length, 1e-6)  # Avoid division by zero
    sequence = sequence / (torso_length[:, :, np.newaxis] + 1e-6)
    
    return sequence

def pad_sequence_3d(seq, max_len=100):
    """Pad 3D sequence to fixed length"""
    num_frames, num_joints, _ = seq.shape
    if num_frames >= max_len:
        return seq[:max_len]
    else:
        pad_len = max_len - num_frames
        padding = np.zeros((pad_len, num_joints, 3))  # 3D padding
        return np.concatenate([seq, padding], axis=0)

def compute_enhanced_features_3d(sequence):
    """
    Enhanced feature extraction for 3D skeleton data
    Same behavioral signals as 2D but with 3D coordinates
    Returns: [num_frames, 222] features
    """
    num_frames = sequence.shape[0]
    
    # 1. Flattened joint positions (72 features: 24 joints * 3 coords)
    flat_joints = sequence.reshape(num_frames, -1)
    
    # 2. Velocity (72 features)
    velocity = np.zeros_like(flat_joints)
    velocity[1:] = flat_joints[1:] - flat_joints[:-1]
    
    # 3. Acceleration (72 features)
    acceleration = np.zeros_like(flat_joints)
    acceleration[1:] = velocity[1:] - velocity[:-1]
    
    # 4. Key joint distances (behavioral indicators) - 3D distances
    # Hand-hand distance
    left_wrist = sequence[:, 7, :]
    right_wrist = sequence[:, 4, :]
    dist_hands = np.linalg.norm(left_wrist - right_wrist, axis=1, keepdims=True)
    
    # Elbow-elbow distance
    left_elbow = sequence[:, 6, :]
    right_elbow = sequence[:, 3, :]
    dist_elbows = np.linalg.norm(left_elbow - right_elbow, axis=1, keepdims=True)
    
    # Hand-to-body distances (self-stimulatory behaviors)
    neck = sequence[:, 1, :]
    dist_left_hand_body = np.linalg.norm(left_wrist - neck, axis=1, keepdims=True)
    dist_right_hand_body = np.linalg.norm(right_wrist - neck, axis=1, keepdims=True)
    
    # 5. Movement magnitude (overall activity level)
    movement_mag = np.linalg.norm(velocity.reshape(num_frames, -1), axis=1, keepdims=True)
    
    # 6. Symmetry features (left-right coordination)
    left_shoulder = sequence[:, 5, :]
    right_shoulder = sequence[:, 2, :]
    shoulder_symmetry = np.linalg.norm(
        (left_wrist - left_shoulder) - (right_wrist - right_shoulder),
        axis=1, keepdims=True
    )
    
    # Combine all features (72 + 72 + 72 + 1 + 1 + 1 + 1 + 1 + 1 = 222 features)
    features = np.concatenate([
        flat_joints,           # 72
        velocity,              # 72
        acceleration,          # 72
        dist_hands,            # 1
        dist_elbows,           # 1
        dist_left_hand_body,   # 1
        dist_right_hand_body,  # 1
        movement_mag,          # 1
        shoulder_symmetry      # 1
    ], axis=1)
    
    return features

# ===============================
# Defensive Preprocessing
# ===============================

def defensive_preprocessing(features: np.ndarray, epsilon: float = 0.01) -> np.ndarray:
    """
    Apply defensive preprocessing to mitigate adversarial perturbations
    
    Args:
        features: Input features [seq_len, num_features]
        epsilon: Smoothing parameter
    
    Returns:
        Cleaned features
    """
    # 1. Temporal smoothing (moving average)
    window_size = 3
    if features.shape[0] >= window_size:
        from scipy.ndimage import uniform_filter1d
        features = uniform_filter1d(features, size=window_size, axis=0)
    
    # 2. Clip extreme values (3 standard deviations)
    mean = np.mean(features, axis=0)
    std = np.std(features, axis=0) + 1e-6
    features = np.clip(features, mean - 3*std, mean + 3*std)
    
    # 3. Add small random noise for robustness
    noise = np.random.normal(0, epsilon, features.shape)
    features = features + noise
    
    return features