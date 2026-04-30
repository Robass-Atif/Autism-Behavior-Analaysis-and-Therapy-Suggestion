import numpy as np
import logging
from enum import Enum
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Action grouping — determines which 2D bone CV threshold to apply.
#
# WHY THIS EXISTS:
#   MediaPipe 2D bone lengths are projections, not true 3D lengths. When a
#   limb moves toward or away from the camera the projected bone length
#   shrinks or grows even though the real bone is rigid. This "foreshortening"
#   inflates the coefficient of variation (CV) for arm bones during any
#   action that swings the arms in a 3D arc (clap, swing, maracas, etc.).
#   A single fixed CV threshold cannot work across all action types.
# ---------------------------------------------------------------------------

class ActionGroup(Enum):
    # Arms stay mostly in the frontal plane — minimal foreshortening
    LOW_FORESHORTEN  = "low_foreshorten"
    # Arms swing in 3D arcs — severe 2D projection variance expected
    HIGH_FORESHORTEN = "high_foreshorten"
    # Whole-body rotation — even torso bones foreshorten significantly
    FULL_BODY_ROTATE = "full_body_rotate"


# Map action label strings → ActionGroup.
# Matching is done after lowercasing + replacing spaces/hyphens with "_".
ACTION_GROUP_MAP: dict[str, ActionGroup] = {
    "arm_swing_left_right":   ActionGroup.HIGH_FORESHORTEN,
    "sing_and_clap":          ActionGroup.HIGH_FORESHORTEN,
    "clap":                   ActionGroup.HIGH_FORESHORTEN,
    "twist_pose":             ActionGroup.FULL_BODY_ROTATE,
    "tree_pose":              ActionGroup.LOW_FORESHORTEN,
    "drumming":               ActionGroup.HIGH_FORESHORTEN,
    "squat":                  ActionGroup.LOW_FORESHORTEN,
    "body_swing":             ActionGroup.HIGH_FORESHORTEN,
    "chest_expansion":        ActionGroup.HIGH_FORESHORTEN,
    "frog_pose":              ActionGroup.LOW_FORESHORTEN,
    "marcas_shaking":         ActionGroup.HIGH_FORESHORTEN,
    "marcas_forward_shaking": ActionGroup.HIGH_FORESHORTEN,
}

# 2D bone CV (p95) thresholds per ActionGroup — stable, in-frame bones only.
#
# Rationale per group:
#   LOW_FORESHORTEN  : torso/leg-dominant, static poses — very low variance expected
#   HIGH_FORESHORTEN : arm-dominant actions — foreshortening is expected and severe
#   FULL_BODY_ROTATE : whole-body twist — even torso foreshortens noticeably
#   None (fallback)  : unknown action — conservative but not over-strict
BONE_CV_THRESHOLD_2D: dict[Optional[ActionGroup], float] = {
    ActionGroup.LOW_FORESHORTEN:  0.35,
    ActionGroup.HIGH_FORESHORTEN: 2.50,
    ActionGroup.FULL_BODY_ROTATE: 1.80,
    None:                         1.50,
}


# ---------------------------------------------------------------------------
# Bone definitions for COCO-style 14-joint layout.
#
# Joint index → anatomical landmark:
#   0: nose          1: neck
#   2: r_shoulder    3: r_elbow    4: r_wrist
#   5: l_shoulder    6: l_elbow    7: l_wrist
#   8: r_hip         9: r_knee    10: r_ankle
#  11: l_hip        12: l_knee    13: l_ankle
#
# Bone index matches the order in SkeletalInputValidator.BONES:
#   0 : nose→neck             — stable torso/head
#   1 : neck→r_shoulder       — stable torso
#   2 : r_shoulder→r_elbow    — UNSTABLE (arm foreshortening)
#   3 : r_elbow→r_wrist       — UNSTABLE (worst during clap/swing)
#   4 : neck→l_shoulder       — stable torso
#   5 : l_shoulder→l_elbow    — UNSTABLE (arm foreshortening)
#   6 : l_elbow→l_wrist       — UNSTABLE (worst during clap/swing)
#   7 : neck→r_hip            — stable torso core
#   8 : r_hip→r_knee          — leg (excluded when legs off-screen)
#   9 : r_knee→r_ankle        — leg (excluded when legs off-screen)
#  10 : neck→l_hip            — stable torso core
#  11 : l_hip→l_knee          — leg (excluded when legs off-screen)
#  12 : l_knee→l_ankle        — leg (excluded when legs off-screen)
# ---------------------------------------------------------------------------

BONE_NAMES = [
    "nose→neck",
    "neck→r_shoulder",
    "r_shoulder→r_elbow",   # arm — always excluded from CV
    "r_elbow→r_wrist",      # arm — always excluded from CV
    "neck→l_shoulder",
    "l_shoulder→l_elbow",   # arm — always excluded from CV
    "l_elbow→l_wrist",      # arm — always excluded from CV
    "neck→r_hip",
    "r_hip→r_knee",         # leg — excluded when off-screen
    "r_knee→r_ankle",       # leg — excluded when off-screen
    "neck→l_hip",
    "l_hip→l_knee",         # leg — excluded when off-screen
    "l_knee→l_ankle",       # leg — excluded when off-screen
]

# Base stable set — arm bones (2, 3, 5, 6) always excluded.
# Leg bones (8, 9, 11, 12) included here but removed dynamically
# when detected as out-of-frame (see _get_visible_stable_indices).
BASE_STABLE_2D_BONE_INDICES = [0, 1, 4, 7, 8, 9, 10, 11, 12]

# Each bone's joint pair — used to exclude bones whose joints are off-screen.
BONE_JOINT_MAP: dict[int, tuple[int, int]] = {
    0:  (0,  1),
    1:  (1,  2),
    2:  (2,  3),
    3:  (3,  4),
    4:  (1,  5),
    5:  (5,  6),
    6:  (6,  7),
    7:  (1,  8),
    8:  (8,  9),
    9:  (9,  10),
    10: (1,  11),
    11: (11, 12),
    12: (12, 13),
}

# Lower-body joints that go off-screen in seated / upper-body-only recordings.
LEG_JOINT_INDICES = {8, 9, 10, 11, 12, 13}   # r_hip…r_ankle, l_hip…l_ankle

# Positional CV threshold for out-of-frame detection.
# A joint whose pixel coordinates jump wildly across frames (high std / mean)
# is almost certainly being hallucinated by MediaPipe.
OOF_JOINT_POSITION_CV_THRESHOLD = 0.5


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
            config:      Application settings containing threshold constants.
            coord_space: 'pixel_2d' for MediaPipe raw output (pixel coords, ~0–640)
                         'metric_3d' for ROMP output (meters, ~0.3–2.0m bone lengths)
        """
        if coord_space not in self.COORD_SPACES:
            raise ValueError(
                f"coord_space must be one of {self.COORD_SPACES}, got '{coord_space}'"
            )

        self.coord_space = coord_space

        if coord_space == "pixel_2d":
            self.max_bone_var = config.MAX_BONE_LENGTH_VARIATION_2D
            self.max_velocity = config.MAX_MOVEMENT_VELOCITY_2D
        else:
            self.max_bone_var = config.MAX_BONE_LENGTH_VARIATION_3D
            self.max_velocity = config.MAX_MOVEMENT_VELOCITY_3D

        self.min_conf_mean      = config.MIN_KEYPOINT_CONFIDENCE_MEAN
        self.min_conf_per_joint = config.MIN_KEYPOINT_CONFIDENCE_PER_JOINT
        self.min_visible_ratio  = config.MIN_VISIBLE_JOINT_RATIO
        self.max_joint_angle    = config.MAX_JOINT_ANGLE
        self.min_joint_angle    = config.MIN_JOINT_ANGLE

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
        expected   = 2 if self.coord_space == "pixel_2d" else 3

        if n_features == expected:
            return sequence

        if n_features < expected:
            raise ValueError(
                f"Sequence has only {n_features} feature column(s) but "
                f"{expected} spatial coordinates are required for {self.coord_space}."
            )

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

    def _normalize_action_label(self, action_label: Optional[str]) -> Optional[str]:
        """
        Lowercase + underscore-normalize an action label for dict lookup.

        Also catches the common bug where Python passes the string "None"
        (from str(None) or an unguarded f-string) instead of the value None.
        """
        if action_label is None:
            return None
        stripped = action_label.strip()
        # Catch str(None) → "None" which logs as action='None' in your pipeline
        if stripped.lower() == "none" or stripped == "":
            return None
        return stripped.lower().replace(" ", "_").replace("-", "_")

    def _get_bone_cv_threshold_2d(self, action_label: Optional[str]) -> float:
        """
        Return the appropriate 2D bone CV (p95) threshold for the given action.
        Falls back gracefully when the action label is unknown or None.
        """
        key   = self._normalize_action_label(action_label)
        group = ACTION_GROUP_MAP.get(key) if key else None

        if key is not None and group is None:
            logger.warning(
                f"Unknown action label '{action_label}' — using fallback "
                f"CV threshold {BONE_CV_THRESHOLD_2D[None]:.2f}"
            )

        return BONE_CV_THRESHOLD_2D.get(group, BONE_CV_THRESHOLD_2D[None])

    def _detect_oof_joints(self, coord_seq: np.ndarray) -> set:
        """
        Detect leg joints that are out-of-frame / hallucinated by MediaPipe.

        When a joint is not visible, MediaPipe extrapolates randomly, producing
        large frame-to-frame jumps. We detect this by measuring the positional
        CV (std / mean) of each leg joint's pixel coordinates across all frames.
        A high positional CV means the joint is jumping around — hallucination.

        Only leg joints are tested because those are the ones that go off-screen
        in seated or upper-body-only recordings.

        Args:
            coord_seq: [seq_len, num_joints, 2] pixel coords

        Returns:
            Set of joint indices considered out-of-frame.
        """
        oof      = set()
        n_joints = coord_seq.shape[1]

        for j in LEG_JOINT_INDICES:
            if j >= n_joints:
                continue

            joint_coords = coord_seq[:, j, :]                         # [seq_len, 2]
            mean_pos     = np.mean(np.abs(joint_coords), axis=0)      # [2]
            std_pos      = np.std(joint_coords,          axis=0)       # [2]
            pos_cv       = float(np.mean(std_pos / (mean_pos + 1e-8)))

            if pos_cv > OOF_JOINT_POSITION_CV_THRESHOLD:
                logger.info(
                    f"Joint {j} flagged as out-of-frame "
                    f"(positional CV={pos_cv:.3f} > {OOF_JOINT_POSITION_CV_THRESHOLD})"
                )
                oof.add(j)

        return oof

    def _get_visible_stable_indices(
        self,
        coord_seq: np.ndarray,
        confidence: Optional[np.ndarray],
        num_bones: int,
    ) -> list:
        """
        Return the subset of BASE_STABLE_2D_BONE_INDICES whose joints are
        confidently in-frame.

        Two exclusion mechanisms work together:

          1. Confidence-based: MediaPipe visibility score below
             min_conf_per_joint for a leg joint → bone dropped.

          2. Position-spread-based: leg joint whose pixel coordinates jump
             erratically across frames (high positional CV) → bone dropped.
             This catches hallucinated joints even when confidence scores
             are not passed in.

        Both mechanisms target only LEG_JOINT_INDICES — upper-body bones
        (torso, shoulders) are never removed by this function.

        Args:
            coord_seq:  [seq_len, num_joints, 2] spatial coords
            confidence: [seq_len, num_joints] visibility scores, or None
            num_bones:  total number of computed bones (bounds check)

        Returns:
            List of bone indices to include in the CV check.
        """
        candidate_bones = [i for i in BASE_STABLE_2D_BONE_INDICES if i < num_bones]

        # --- Mechanism 1: confidence-based ---
        low_conf_joints: set = set()
        if confidence is not None:
            mean_conf_per_joint = np.nanmean(confidence, axis=0)   # [num_joints]
            for j, c in enumerate(mean_conf_per_joint):
                if j in LEG_JOINT_INDICES and c < self.min_conf_per_joint:
                    low_conf_joints.add(j)
                    logger.info(
                        f"Joint {j} excluded from bone CV "
                        f"(mean confidence {c:.3f} < {self.min_conf_per_joint})"
                    )

        # --- Mechanism 2: positional-spread-based ---
        oof_joints = self._detect_oof_joints(coord_seq)

        excluded_joints = low_conf_joints | oof_joints

        if excluded_joints:
            logger.info(
                f"Out-of-frame / low-confidence joints excluded from CV: "
                f"{sorted(excluded_joints)}"
            )

        # Keep a bone only if neither of its joints is excluded
        visible_bones = [
            bone_idx for bone_idx in candidate_bones
            if not (set(BONE_JOINT_MAP[bone_idx]) & excluded_joints)
        ]

        if not visible_bones:
            # Absolute fallback for very tight crops (face + chest only):
            # nose→neck, neck→r_shoulder, neck→l_shoulder are almost always visible.
            logger.warning(
                "All stable bones excluded (heavily cropped frame?). "
                "Falling back to nose/neck/shoulder bones only."
            )
            visible_bones = [i for i in [0, 1, 4] if i < num_bones]

        logger.info(
            f"Bones used for 2D CV check: "
            f"{[BONE_NAMES[i] for i in visible_bones]}"
        )
        return visible_bones

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
        n_joints     = coord_seq.shape[1]
        bone_lengths = []

        for frame in coord_seq:
            frame_bones = []
            for j1, j2 in self.BONES:
                if j1 < n_joints and j2 < n_joints:
                    frame_bones.append(np.linalg.norm(frame[j1] - frame[j2]))
            bone_lengths.append(frame_bones)

        return np.array(bone_lengths)  # [seq_len, num_valid_bones]

    def compute_joint_angles(self, coord_seq: np.ndarray) -> np.ndarray:
        """
        Compute joint angles in degrees for defined triplets.

        Args:
            coord_seq: [seq_len, num_joints, 2 or 3] — spatial coords ONLY.
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

        n_joints     = coord_seq.shape[1]
        n_triplets   = len(self.ANGLE_TRIPLETS)
        angles       = []

        for frame in coord_seq:
            # Pre-fill with NaN so every frame always has exactly n_triplets
            # entries. Skipped triplets (out-of-range joints or degenerate
            # bone vectors) stay NaN and are ignored by np.nanmax/np.nanmin.
            frame_angles = [np.nan] * n_triplets
            for idx, (j1, vertex, j2) in enumerate(self.ANGLE_TRIPLETS):
                if j1 >= n_joints or vertex >= n_joints or j2 >= n_joints:
                    continue
                v1    = frame[j1]     - frame[vertex]
                v2    = frame[j2]     - frame[vertex]
                denom = np.linalg.norm(v1) * np.linalg.norm(v2)
                if denom < 1e-6:
                    # Bone vector too short — joint fully collapsed, leave NaN
                    continue
                cos_a = np.clip(np.dot(v1, v2) / denom, -1.0, 1.0)
                frame_angles[idx] = np.degrees(np.arccos(cos_a))
            angles.append(frame_angles)

        # angles is now always shape [seq_len, n_triplets] — no ragged rows
        angles_arr = np.array(angles, dtype=np.float64)   # [seq_len, n_triplets]

        # If every value is NaN (e.g. all joints out of range), return empty
        if np.all(np.isnan(angles_arr)):
            return np.zeros((coord_seq.shape[0], 0))

        return angles_arr

    # ------------------------------------------------------------------
    # Bone CV validation (split by coord space)
    # ------------------------------------------------------------------

    def _validate_bone_cv_2d(
        self,
        coord_seq: np.ndarray,
        action_label: Optional[str],
        confidence: Optional[np.ndarray],
    ) -> Tuple[bool, str]:
        """
        Bone length CV check for 2D MediaPipe pixel coordinates.

        Design decisions:
          1. VISIBLE STABLE BONES ONLY — arm bones always excluded (foreshortening).
             Leg bones excluded dynamically when off-screen (seated subject, tight crop).
          2. p95 CV not max CV — one jittery frame won't fail the whole clip.
          3. ACTION-AWARE THRESHOLD — acceptable CV scales with expected arm motion.
        """
        bone_lengths = self.compute_bone_lengths(coord_seq)

        if bone_lengths.size == 0:
            return True, "Valid input"

        num_bones     = bone_lengths.shape[1]
        check_indices = self._get_visible_stable_indices(coord_seq, confidence, num_bones)

        if not check_indices:
            logger.warning("No bones available for CV check — skipping")
            return True, "Valid input"

        stable_lengths = bone_lengths[:, check_indices]

        mean_per_bone = np.mean(stable_lengths, axis=0)
        std_per_bone  = np.std(stable_lengths,  axis=0)
        cv_per_bone   = std_per_bone / (mean_per_bone + 1e-8)

        for local_i, bone_idx in enumerate(check_indices):
            cv_val    = cv_per_bone[local_i]
            bone_name = BONE_NAMES[bone_idx] if bone_idx < len(BONE_NAMES) else str(bone_idx)
            if cv_val > 0.3:
                logger.debug(
                    f"[2D] Bone '{bone_name}' (idx={bone_idx}): "
                    f"mean={mean_per_bone[local_i]:.2f}px  "
                    f"std={std_per_bone[local_i]:.2f}px  "
                    f"CV={cv_val:.3f}"
                )

        p95_cv    = float(np.percentile(cv_per_bone, 95))
        threshold = self._get_bone_cv_threshold_2d(action_label)

        logger.info(
            f"[2D] Bone CV p95 (visible stable bones): {p95_cv:.3f} "
            f"| threshold: {threshold:.2f} "
            f"| action: '{action_label}' "
            f"| bones: {[BONE_NAMES[i] for i in check_indices]}"
        )

        if p95_cv > threshold:
            worst_local = int(np.argmax(cv_per_bone))
            worst_idx   = check_indices[worst_local]
            worst_name  = BONE_NAMES[worst_idx] if worst_idx < len(BONE_NAMES) else str(worst_idx)
            worst_cv    = float(cv_per_bone[worst_local])
            logger.warning(
                f"[2D] Bone CV FAILED — worst bone: '{worst_name}' "
                f"CV={worst_cv:.3f} "
                f"(p95={p95_cv:.3f} > threshold={threshold:.2f}, "
                f"action='{action_label}')"
            )
            return False, (
                f"Unstable skeleton detected (visible torso/leg bones): "
                f"CV(p95)={p95_cv:.3f} exceeds {threshold:.2f} "
                f"for action '{action_label}'. "
                f"Worst offending bone: '{worst_name}' (CV={worst_cv:.3f}). "
                f"This indicates a tracking failure, not normal motion."
            )

        return True, "Valid input"

    def _validate_bone_cv_3d(self, coord_seq: np.ndarray) -> Tuple[bool, str]:
        """
        Bone length CV check for 3D ROMP metric coordinates.

        3D bones are true metric distances — foreshortening does not apply.
        ROMP always estimates the full body so no visibility exclusion is needed.
        We use p95 CV to tolerate isolated bad ROMP frames (scale drift).
        """
        bone_lengths = self.compute_bone_lengths(coord_seq)

        if bone_lengths.size == 0:
            return True, "Valid input"

        mean_per_bone = np.mean(bone_lengths, axis=0)
        std_per_bone  = np.std(bone_lengths,  axis=0)
        cv_per_bone   = std_per_bone / (mean_per_bone + 1e-8)

        for bone_idx, cv_val in enumerate(cv_per_bone):
            bone_name = BONE_NAMES[bone_idx] if bone_idx < len(BONE_NAMES) else str(bone_idx)
            if cv_val > 0.4:
                logger.debug(
                    f"[3D] Bone '{bone_name}' (idx={bone_idx}): "
                    f"mean={mean_per_bone[bone_idx]:.3f}m  "
                    f"std={std_per_bone[bone_idx]:.3f}m  "
                    f"CV={cv_val:.3f}"
                )

        p95_cv    = float(np.percentile(cv_per_bone, 95))
        threshold = self.max_bone_var   # MAX_BONE_LENGTH_VARIATION_3D from config

        logger.info(
            f"[3D] Bone CV p95 (all bones): {p95_cv:.3f} "
            f"| threshold: {threshold:.2f}"
        )

        if p95_cv > threshold:
            worst_idx  = int(np.argmax(cv_per_bone))
            worst_name = BONE_NAMES[worst_idx] if worst_idx < len(BONE_NAMES) else str(worst_idx)
            worst_cv   = float(cv_per_bone[worst_idx])
            logger.warning(
                f"[3D] Bone CV FAILED — worst bone: '{worst_name}' "
                f"CV={worst_cv:.3f} "
                f"(p95={p95_cv:.3f} > threshold={threshold:.2f})"
            )
            return False, (
                f"Inconsistent 3D bone lengths: CV(p95)={p95_cv:.3f} "
                f"exceeds {threshold:.2f} ({self.coord_space}). "
                f"Worst bone: '{worst_name}' (CV={worst_cv:.3f}). "
                f"Likely ROMP scale drift or severe occlusion."
            )

        return True, "Valid input"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(
        self,
        sequence: np.ndarray,
        confidence: Optional[np.ndarray] = None,
        action_label: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Validate a raw skeletal sequence from load_npz_sequence[_3d].

        Args:
            sequence:     Raw array from load_npz_sequence / load_npz_sequence_3d.
                          Shape [seq_len, num_joints, features].
                          Extra columns (angles/flags) stripped automatically.
            confidence:   Optional [seq_len, num_joints] MediaPipe visibility
                          scores. Used both for overall confidence gating (step 4)
                          and to exclude off-screen joints from the bone CV check
                          (step 5).
            action_label: Optional string identifying the exercise/action
                          (e.g. 'clap', 'squat'). Used to select the correct
                          2D bone CV threshold.

                          IMPORTANT: pass Python None, not the string "None".
                          If your pipeline does str(label) anywhere, guard with:
                              action_label = label if label != "None" else None

        Returns:
            (is_valid, message)
        """
        try:
            # 1. Basic shape sanity
            shape_err = self._check_shape(sequence)
            if shape_err:
                return False, shape_err

            # 2. NaN / Inf guard — check full array including metadata cols
            if np.any(np.isnan(sequence)) or np.any(np.isinf(sequence)):
                return False, "Invalid values (NaN or Inf) detected in input data"

            # 3. Extract spatial coordinates only
            coord_seq = self._extract_coords(sequence)

            logger.info(
                f"[{self.coord_space}] Validating: raw={sequence.shape}, "
                f"coords={coord_seq.shape}, action='{action_label}'"
            )

            # 3b. Blank / empty-video guard.
            #
            # When a blank, fully dark, or subject-free video is submitted,
            # MediaPipe produces all-zero coordinate arrays for every frame.
            # All-zero sequences trivially pass every downstream check:
            #   - bone CV  → std=0, mean=0, CV=0  (well below any threshold)
            #   - angles   → degenerate vectors → all NaN → check skipped
            #   - velocity → frame diff=0          (well below any threshold)
            # So we must detect and reject this case explicitly here.
            #
            # A frame is "blank" when every spatial coordinate in that frame
            # is exactly zero.  We tolerate up to 70% blank frames (e.g. a
            # clip that briefly loses tracking), but reject beyond that.
            blank_frames = int(np.sum(np.all(coord_seq == 0, axis=(1, 2))))
            blank_ratio  = blank_frames / coord_seq.shape[0]
            BLANK_FRAME_TOLERANCE = 0.70

            if blank_ratio >= 1.0:
                return False, (
                    "All pose keypoints are zero across every frame — "
                    "no person was detected in the video. "
                    "The video may be blank, too dark, or contain no visible subject."
                )

            if blank_ratio > BLANK_FRAME_TOLERANCE:
                return False, (
                    f"{blank_ratio:.1%} of frames contain no detected pose "
                    f"({blank_frames}/{coord_seq.shape[0]} frames). "
                    f"Maximum allowed is {BLANK_FRAME_TOLERANCE:.0%}. "
                    "The video appears to have the subject out of frame for most of its duration."
                )

            if blank_frames > 0:
                logger.info(
                    f"[{self.coord_space}] {blank_frames}/{coord_seq.shape[0]} frames "
                    f"({blank_ratio:.1%}) are zero (no detection) — within tolerance."
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

            # 5. Bone length consistency
            #    2D: visible stable bones only, action-aware threshold, p95 CV
            #    3D: all bones, config threshold, p95 CV
            if self.coord_space == "pixel_2d":
                bone_ok, bone_msg = self._validate_bone_cv_2d(
                    coord_seq, action_label, confidence
                )
            else:
                bone_ok, bone_msg = self._validate_bone_cv_3d(coord_seq)

            if not bone_ok:
                return False, bone_msg

            # 6. Joint angles — computed from spatial coords only.
            #    NaN entries represent skipped triplets (collapsed bones /
            #    out-of-range joints) and are ignored via nanmax / nanmin.
            angles = self.compute_joint_angles(coord_seq)
            if angles.size > 0 and not np.all(np.isnan(angles)):
                max_angle = float(np.nanmax(angles))
                min_angle = float(np.nanmin(angles))
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
                # Apply noise reduction (Median Filter) to suppress single-frame spikes
                try:
                    import scipy.signal
                    cleaned_coords = scipy.signal.medfilt(coord_seq, kernel_size=(3, 1, 1))
                except ImportError:
                    cleaned_coords = coord_seq

                frame_velocities = np.max(
                    np.abs(np.diff(cleaned_coords, axis=0)), axis=(1, 2)
                )  # [seq_len - 1]

                HARD_CAP               = 35000.0
                SOFT_THRESHOLD         = self.max_velocity
                SPIKE_FRAME_TOLERANCE  = max(3, int(0.05 * len(frame_velocities)))

                hard_violations = int(np.sum(frame_velocities > HARD_CAP))
                soft_violations = int(np.sum(frame_velocities > SOFT_THRESHOLD))

                if hard_violations > 0:
                    worst = float(np.max(frame_velocities))
                    logger.warning(
                        f"Hard velocity cap exceeded: {worst:.1f} in "
                        f"{hard_violations} frame(s)"
                    )
                    return False, (
                        f"Tracking failure detected: joint velocity {worst:.1f}/frame "
                        f"exceeds hard cap {HARD_CAP} ({hard_violations} frame(s))"
                    )

                if soft_violations > SPIKE_FRAME_TOLERANCE:
                    worst = float(np.max(frame_velocities))
                    logger.warning(
                        f"Sustained high velocity: {soft_violations} frames > "
                        f"{SOFT_THRESHOLD} (tolerance {SPIKE_FRAME_TOLERANCE})"
                    )
                    return False, (
                        f"Sustained unrealistic movement: {soft_violations} frames "
                        f"exceed {SOFT_THRESHOLD:.0f}/frame "
                        f"(max {SPIKE_FRAME_TOLERANCE} allowed)"
                    )

            logger.info(
                f"[{self.coord_space}] Validation passed — "
                f"{coord_seq.shape[0]} frames, {coord_seq.shape[1]} joints, "
                f"action='{action_label}'"
            )
            return True, "Valid input"

        except Exception as e:
            logger.error(f"Validation error: {e}", exc_info=True)
            return False, f"Validation error: {str(e)}"