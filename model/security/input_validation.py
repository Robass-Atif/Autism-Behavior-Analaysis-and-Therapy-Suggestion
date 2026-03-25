import numpy as np
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class SkeletalInputValidator:
    """
    Validates raw skeletal input data from NPZ files.

    Coordinate space reality (from preprocessing.py):
    - load_npz_sequence    → [seq_len, 24, 4], raw pixel coords, NOT normalized
    - load_npz_sequence_3d → [seq_len, 24, 3], raw metric coords from ROMP

    The validator receives data BEFORE normalize_skeleton() is called.
    Thresholds must match raw coordinate ranges, not [0,1] normalized ranges.

    NPZ column layout for 2D:
        col 0: x  (pixel space, typically 0–640)
        col 1: y  (pixel space, typically 0–480)
        col 2: pre-computed angle or flag (0.0 or 180.0) — IGNORED in geometry
        col 3: pre-computed angle or flag (0.0 or 180.0) — IGNORED in geometry
    """

    # Bone connections in COCO-style 14-joint layout
    BONES = [
        (0, 1),   # nose → neck
        (1, 2),   # neck → right shoulder
        (2, 3),   # right shoulder → right elbow
        (3, 4),   # right elbow → right wrist
        (1, 5),   # neck → left shoulder
        (5, 6),   # left shoulder → left elbow
        (6, 7),   # left elbow → left wrist
        (1, 8),   # neck → right hip
        (8, 9),   # right hip → right knee
        (9, 10),  # right knee → right ankle
        (1, 11),  # neck → left hip
        (11, 12), # left hip → left knee
        (12, 13), # left knee → left ankle
    ]

    # Joint angle triplets (j1, vertex, j2)
    ANGLE_TRIPLETS = [
        (2, 3, 4),    # right elbow
        (5, 6, 7),    # left elbow
        (8, 9, 10),   # right knee
        (11, 12, 13), # left knee
    ]

    COORD_SPACES = ("pixel_2d", "metric_3d")

    def __init__(self, config, coord_space: str = "pixel_2d"):
        """
        Args:
            config:      Application settings containing threshold constants
            coord_space: 'pixel_2d' for MediaPipe raw output (pixel coords, ~0–640)
                         'metric_3d' for ROMP output (meters, ~0.3–2.0m bone lengths)
        """
        if coord_space not in self.COORD_SPACES:
            raise ValueError(
                f"coord_space must be one of {self.COORD_SPACES}, got '{coord_space}'"
            )

        self.coord_space = coord_space

        # Select thresholds for the correct coordinate space
        if coord_space == "pixel_2d":
            self.max_bone_var  = config.MAX_BONE_LENGTH_VARIATION_2D
            self.max_velocity  = config.MAX_MOVEMENT_VELOCITY_2D
        else:
            self.max_bone_var  = config.MAX_BONE_LENGTH_VARIATION_3D
            self.max_velocity  = config.MAX_MOVEMENT_VELOCITY_3D

        self.min_conf_mean       = config.MIN_KEYPOINT_CONFIDENCE_MEAN
        self.min_conf_per_joint  = config.MIN_KEYPOINT_CONFIDENCE_PER_JOINT
        self.min_visible_ratio   = config.MIN_VISIBLE_JOINT_RATIO
        self.max_joint_angle     = config.MAX_JOINT_ANGLE
        self.min_joint_angle     = config.MIN_JOINT_ANGLE

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_coords(self, sequence: np.ndarray) -> np.ndarray:
        """
        Strip non-coordinate columns from raw NPZ data.

        2D NPZ files have shape [seq_len, num_joints, 4] where only the
        first 2 columns are spatial coords. Columns 2–3 are pre-computed
        angle/flag values (always 0.0 or 180.0) and must not enter any
        geometric computation.

        3D ROMP files have shape [seq_len, num_joints, 3] — all coords.

        Returns:
            coord_seq: [seq_len, num_joints, 2] for pixel_2d
                       [seq_len, num_joints, 3] for metric_3d
        """
        n_features = sequence.shape[-1]
        expected    = 2 if self.coord_space == "pixel_2d" else 3

        if n_features == expected:
            return sequence  # already clean

        if n_features < expected:
            raise ValueError(
                f"Sequence has only {n_features} feature column(s) but "
                f"{expected} spatial coordinates are required for {self.coord_space}."
            )

        # Slice to spatial coords only and log what was stripped
        coord_seq = sequence[..., :expected]
        logger.info(
            f"Stripped {n_features - expected} non-coordinate column(s) "
            f"from shape {sequence.shape} → {coord_seq.shape} "
            f"(coord_space={self.coord_space})"
        )
        return coord_seq

    def _check_shape(self, sequence: np.ndarray) -> Optional[str]:
        """Validate overall array shape before any math."""
        if sequence.ndim != 3:
            return (
                f"Expected 3-D array [seq_len, num_joints, features], "
                f"got shape {sequence.shape}"
            )
        if sequence.shape[0] == 0:
            return "Empty sequence (0 frames)"
        if sequence.shape[1] == 0:
            return "Sequence has 0 joints"
        return None

    # ------------------------------------------------------------------
    # Geometry
    # ------------------------------------------------------------------

    def compute_bone_lengths(self, coord_seq: np.ndarray) -> np.ndarray:
        """
        Compute per-frame bone lengths for all defined bones.

        Args:
            coord_seq: [seq_len, num_joints, 2 or 3] — spatial coords ONLY
        Returns:
            bone_lengths: [seq_len, num_bones]
        """
        n_joints = coord_seq.shape[1]
        bone_lengths = []

        for frame in coord_seq:
            frame_bones = []
            for j1, j2 in self.BONES:
                if j1 < n_joints and j2 < n_joints:
                    length = np.linalg.norm(frame[j1] - frame[j2])
                    frame_bones.append(length)
            bone_lengths.append(frame_bones)

        return np.array(bone_lengths)   # [seq_len, num_valid_bones]

    def compute_joint_angles(self, coord_seq: np.ndarray) -> np.ndarray:
        """
        Compute joint angles in degrees for defined triplets.

        Args:
            coord_seq: [seq_len, num_joints, 2 or 3] — spatial coords ONLY
                       Must NOT contain pre-computed angle columns.
        Returns:
            angles: [seq_len, num_valid_triplets] in degrees
        """
        n_features = coord_seq.shape[-1]
        if n_features not in (2, 3):
            raise ValueError(
                f"compute_joint_angles requires 2 or 3 spatial dimensions, "
                f"got {n_features}. Call _extract_coords() first."
            )

        n_joints = coord_seq.shape[1]
        angles = []

        for frame in coord_seq:
            frame_angles = []
            for j1, vertex, j2 in self.ANGLE_TRIPLETS:
                if j1 >= n_joints or vertex >= n_joints or j2 >= n_joints:
                    continue
                v1 = frame[j1]     - frame[vertex]
                v2 = frame[j2]     - frame[vertex]
                denom = np.linalg.norm(v1) * np.linalg.norm(v2)
                if denom < 1e-6:
                    # Bone vector too short — joint fully collapsed, skip
                    continue
                cos_a = np.clip(np.dot(v1, v2) / denom, -1.0, 1.0)
                frame_angles.append(np.degrees(np.arccos(cos_a)))
            angles.append(frame_angles)

        # Guard against empty (all joints below index threshold)
        if not angles or not any(angles):
            return np.zeros((coord_seq.shape[0], 0))
        return np.array(angles)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(
        self,
        sequence: np.ndarray,
        confidence: Optional[np.ndarray] = None
    ) -> Tuple[bool, str]:
        """
        Validate a raw skeletal sequence from load_npz_sequence[_3d].

        Args:
            sequence:   Raw array straight from load_npz_sequence or
                        load_npz_sequence_3d. Shape [seq_len, num_joints, features].
                        Extra columns (angles/flags) are stripped automatically.
            confidence: Optional [seq_len, num_joints] MediaPipe visibility scores.

        Returns:
            (is_valid, message)
        """
        try:
            # 1. Basic shape sanity
            shape_err = self._check_shape(sequence)
            if shape_err:
                return False, shape_err

            # 2. NaN / Inf guard — check the whole array including metadata cols
            if np.any(np.isnan(sequence)) or np.any(np.isinf(sequence)):
                return False, "Invalid values (NaN or Inf) detected in input data"

            # 3. Extract spatial coordinates only — all geometry uses coord_seq
            coord_seq = self._extract_coords(sequence)

            logger.info(
                f"[{self.coord_space}] Validating: raw={sequence.shape}, "
                f"coords={coord_seq.shape}"
            )

            # 4. Keypoint confidence (MediaPipe visibility scores)
            if confidence is not None:
                mean_conf = float(np.nanmean(confidence))
                if mean_conf < self.min_conf_mean:
                    logger.warning(f"Low mean confidence: {mean_conf:.3f}")
                    return False, (
                        f"Mean keypoint confidence too low: {mean_conf:.3f} "
                        f"(minimum {self.min_conf_mean})"
                    )
                visible_ratio = float(np.mean(confidence >= self.min_conf_per_joint))
                if visible_ratio < self.min_visible_ratio:
                    logger.warning(f"Visible joint ratio: {visible_ratio:.1%}")
                    return False, (
                        f"Only {visible_ratio:.1%} of joints are visible "
                        f"(need ≥ {self.min_visible_ratio:.0%})"
                    )

            # 5. Bone length consistency (coefficient of variation per bone)
            bone_lengths = self.compute_bone_lengths(coord_seq)
            if bone_lengths.size > 0:
                cv = np.std(bone_lengths, axis=0) / (np.mean(bone_lengths, axis=0) + 1e-8)
                max_cv = float(np.max(cv))
                if max_cv > self.max_bone_var:
                    logger.warning(
                        f"Bone CV={max_cv:.3f} > threshold {self.max_bone_var} "
                        f"({self.coord_space})"
                    )
                    return False, (
                        f"Inconsistent bone lengths across frames: CV={max_cv:.3f} "
                        f"(max {self.max_bone_var} for {self.coord_space})"
                    )

            # 6. Joint angles — computed from spatial coords only
            angles = self.compute_joint_angles(coord_seq)
            if angles.size > 0:
                max_angle = float(np.max(angles))
                min_angle = float(np.min(angles))
                if max_angle > self.max_joint_angle:
                    logger.warning(f"Max joint angle: {max_angle:.1f}°")
                    return False, (
                        f"Impossible joint angle: {max_angle:.1f}° "
                        f"(max allowed {self.max_joint_angle}°)"
                    )
                if min_angle < self.min_joint_angle:
                    logger.warning(f"Min joint angle: {min_angle:.1f}°")
                    return False, (
                        f"Near-zero joint angle: {min_angle:.1f}° "
                        f"(min allowed {self.min_joint_angle}°)"
                    )

            # 7. Frame-to-frame velocity
            if coord_seq.shape[0] > 1:
                frame_velocities = np.max(np.abs(np.diff(coord_seq, axis=0)), axis=(1, 2))  # [seq_len-1]
                
                # Hard cap: single-frame velocity above this is always a tracking error
                HARD_CAP = 200.0  # px — physically impossible for a child in a single frame
                
                # Soft threshold: allows up to 2% of frames to exceed it (isolated glitches)
                SOFT_THRESHOLD = self.max_velocity   # 150.0 px
                SPIKE_FRAME_TOLERANCE = max(2, int(0.02 * len(frame_velocities)))
                
                hard_violations = int(np.sum(frame_velocities > HARD_CAP))
                soft_violations = int(np.sum(frame_velocities > SOFT_THRESHOLD))
                
                if hard_violations > 0:
                    worst = float(np.max(frame_velocities))
                    logger.warning(f"Hard velocity cap exceeded: {worst:.1f}px in {hard_violations} frame(s)")
                    return False, (
                        f"Tracking failure detected: joint velocity {worst:.1f}px/frame "
                        f"exceeds hard cap {HARD_CAP}px ({hard_violations} frame(s))"
                    )
                
                if soft_violations > SPIKE_FRAME_TOLERANCE:
                    worst = float(np.max(frame_velocities))
                    logger.warning(
                        f"Sustained high velocity: {soft_violations} frames > {SOFT_THRESHOLD}px "
                        f"(tolerance {SPIKE_FRAME_TOLERANCE})"
                    )
                    return False, (
                        f"Sustained unrealistic movement: {soft_violations} frames exceed "
                        f"{SOFT_THRESHOLD:.0f}px/frame (max {SPIKE_FRAME_TOLERANCE} allowed)"
                    )

            logger.info(
                f"[{self.coord_space}] Validation passed — "
                f"{coord_seq.shape[0]} frames, {coord_seq.shape[1]} joints"
            )
            return True, "Valid input"

        except Exception as e:
            logger.error(f"Validation error: {e}", exc_info=True)
            return False, f"Validation error: {str(e)}"