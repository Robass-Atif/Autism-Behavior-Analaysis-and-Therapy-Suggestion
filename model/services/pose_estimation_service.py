"""
Service for pose estimation using OpenPose (2D primary), MediaPipe (2D fallback),
and ROMP (3D)
"""
import cv2
import numpy as np
import logging
import os
import json
import shutil
import subprocess
import tempfile
import warnings
from pathlib import Path
from typing import Optional, Tuple
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

logger = logging.getLogger(__name__)

MIN_DETECTION_RATE = 0.30
LOW_DETECTION_ERROR = (
    "Video is too dark, blank, or has no visible subject. "
    "Please provide a clearer recording."
)

class PoseEstimationService:
    """Handles 2D and 3D pose estimation"""
    
    def __init__(self, openpose_dir: Optional[str] = None, romp_model_path: Optional[str] = None):
        """
        Initialize pose estimation service

        Args:
            openpose_dir: Path to CMU OpenPose Windows portable install (the
                folder containing bin/OpenPoseDemo.exe and models/). If None,
                falls back to settings.OPENPOSE_DIR, then to OpenPoseDemo.exe
                on PATH. When unavailable, MediaPipe is used instead.
            romp_model_path: Path to ROMP model (optional)
        """
        # Load settings once for both OpenPose and remote-pose resolution.
        try:
            from config.settings import settings as _settings
        except Exception:
            _settings = None

        # Resolve OpenPose location: explicit arg > settings > PATH
        if openpose_dir is None and _settings is not None:
            openpose_dir = _settings.OPENPOSE_DIR

        # Optional remote (Colab) pose service.
        self.remote_client = None
        if _settings is not None and getattr(_settings, "REMOTE_POSE_URL", None):
            try:
                from services.remote_pose_client import RemotePoseClient
                self.remote_client = RemotePoseClient(
                    base_url=_settings.REMOTE_POSE_URL,
                    timeout_sec=_settings.REMOTE_POSE_TIMEOUT_SEC,
                )
                logger.info(f"🌐 Remote pose service configured: {_settings.REMOTE_POSE_URL}")
            except Exception as e:
                logger.warning(f"⚠️  REMOTE_POSE_URL set but client init failed: {e}")

        self.openpose_dir: Optional[str] = None
        self.openpose_bin: Optional[str] = None
        self.openpose_available = False

        if openpose_dir:
            candidate_bin = os.path.join(openpose_dir, "bin", "OpenPoseDemo.exe")
            print(candidate_bin)
            if os.path.isfile(candidate_bin):
                self.openpose_dir = openpose_dir
                self.openpose_bin = candidate_bin
                self.openpose_available = True
                logger.info(f"✅ OpenPose binary found at {candidate_bin}")
            else:
                logger.warning(
                    f"⚠️  OPENPOSE_DIR set to {openpose_dir} but "
                    f"bin/OpenPoseDemo.exe was not found there. Falling back to MediaPipe."
                )
        else:
            path_bin = shutil.which("OpenPoseDemo.exe") or shutil.which("openpose")
            if path_bin:
                self.openpose_bin = path_bin
                # OpenPose still needs a working directory containing models/.
                # Without a known root, we can't safely run it — leave unavailable.
                logger.warning(
                    "⚠️  OpenPoseDemo.exe found on PATH but OPENPOSE_DIR is not set. "
                    "Set OPENPOSE_DIR so models/ can be located. Falling back to MediaPipe."
                )
            else:
                logger.info("ℹ️  OpenPose not configured — will use MediaPipe for 2D pose estimation.")

        # Check MediaPipe availability (used as fallback or primary)
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
    
    def estimate_2d_poses_from_video(
        self,
        video_path: str,
        frames_dir: str,
        output_dir: str,
        target_fps: int = 30,
    ) -> int:
        """
        Preferred 2D entry point. Uses the remote (Colab) pose service when
        REMOTE_POSE_URL is configured — bypasses local frame extraction and
        per-frame inference. Falls back to the local frame-based path on any
        remote failure.

        Args:
            video_path: Path to the source video file.
            frames_dir: Local frames directory (only used by the fallback path).
            output_dir: Where the per-frame .npz files should land.
            target_fps: Frame sampling rate for the remote service.

        Returns:
            Number of .npz files written.
        """
        if self.remote_client is not None:
            try:
                logger.info("🌐 Using remote pose service for 2D estimation")
                written = self.remote_client.estimate(
                    video_path=video_path,
                    output_dir=output_dir,
                    mode="2d",
                    target_fps=target_fps,
                )
                # The remote service already enforces detection-rate logic on
                # its side via zeroing missing frames; we just need to ensure
                # the local prediction pipeline gets non-empty input.
                if written == 0:
                    raise RuntimeError("Remote pose service returned no frames")
                return written
            except Exception as e:
                logger.warning(f"Remote pose service failed ({e}). Falling back to local pipeline.")

        return self.estimate_2d_poses(frames_dir, output_dir)

    def estimate_3d_poses_from_video(
        self,
        video_path: str,
        frames_dir: str,
        output_dir: str,
        target_fps: int = 30,
    ) -> int:
        """3D analogue of estimate_2d_poses_from_video."""
        if self.remote_client is not None:
            try:
                logger.info("🌐 Using remote pose service for 3D estimation")
                written = self.remote_client.estimate(
                    video_path=video_path,
                    output_dir=output_dir,
                    mode="3d",
                    target_fps=target_fps,
                )
                if written == 0:
                    raise RuntimeError("Remote pose service returned no frames")
                return written
            except Exception as e:
                logger.warning(f"Remote pose service failed ({e}). Falling back to local pipeline.")

        return self.estimate_3d_poses(frames_dir, output_dir)

    def estimate_2d_poses(self, frames_dir: str, output_dir: str) -> int:
        """
        Extract 2D poses. OpenPose is used when configured; otherwise MediaPipe.
        If OpenPose fails at runtime, MediaPipe is used as a fallback.

        Args:
            frames_dir: Directory containing frame images
            output_dir: Directory to save .npz files with 2D coordinates

        Returns:
            Number of frames processed (output .npz files written)
        """
        os.makedirs(output_dir, exist_ok=True)

        frame_files = sorted([f for f in os.listdir(frames_dir) if f.lower().endswith(('.jpg', '.png'))])
        if not frame_files:
            logger.warning("No frame files found in directory")
            return 0

        total_frames = len(frame_files)
        detected_count: Optional[int] = None

        if self.openpose_available:
            try:
                detected_count = self._estimate_2d_poses_openpose(frames_dir, output_dir, frame_files)
            except Exception as e:
                logger.warning(f"OpenPose run failed ({e}). Falling back to MediaPipe.")
                detected_count = None

        if detected_count is None:
            if not self.mediapipe_available:
                raise RuntimeError(
                    "Neither OpenPose nor MediaPipe is available for 2D pose estimation."
                )
            detected_count = self._estimate_2d_poses_mediapipe(frames_dir, output_dir, frame_files)

        detection_rate = detected_count / total_frames if total_frames > 0 else 0.0
        logger.info(
            f"2D pose detection: {detected_count}/{total_frames} frames "
            f"({detection_rate:.1%}) had a detected person"
        )
        if detection_rate < MIN_DETECTION_RATE:
            raise ValueError(LOW_DETECTION_ERROR)

        logger.info(f"✅ Extracted 2D poses for {total_frames} frames")
        return total_frames

    def _estimate_2d_poses_openpose(
        self,
        frames_dir: str,
        output_dir: str,
        frame_files: list,
    ) -> int:
        """
        Run OpenPoseDemo.exe over the entire frames directory once and write
        one .npz per input frame in COCO-24 layout.

        Returns the number of frames in which a person was detected with
        non-zero confidence.
        """
        logger.info(f"🔄 Running OpenPose on {len(frame_files)} frames...")

        json_dir = tempfile.mkdtemp(prefix="openpose_json_")
        try:
            cmd = [
                self.openpose_bin,
                "--image_dir", frames_dir,
                "--write_json", json_dir,
                "--display", "0",
                "--render_pose", "0",
                "--model_pose", "BODY_25",
                "--number_people_max", "1",
            ]
            logger.debug("OpenPose command: %s (cwd=%s)", " ".join(cmd), self.openpose_dir)

            result = subprocess.run(
                cmd,
                cwd=self.openpose_dir,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                # Surface stderr so the fallback log line is actionable.
                tail = (result.stderr or "").strip().splitlines()[-5:]
                raise RuntimeError(
                    f"OpenPose exited with code {result.returncode}: {' | '.join(tail)}"
                )

            # OpenPose names outputs as <input_stem>_keypoints.json and emits
            # them in the same sorted order as the input image directory.
            json_files = sorted(f for f in os.listdir(json_dir) if f.endswith("_keypoints.json"))

            # Build a map from input frame index -> json path so missing JSON
            # files (e.g. partial crash) become zero-pose frames rather than
            # mis-aligning with frame indices.
            stem_to_json = {Path(f).stem.replace("_keypoints", ""): os.path.join(json_dir, f) for f in json_files}

            detected = 0
            for idx, frame_file in enumerate(frame_files):
                stem = Path(frame_file).stem
                json_path = stem_to_json.get(stem)

                coords_2d = np.zeros((24, 2))
                if json_path is not None:
                    try:
                        with open(json_path, "r") as f:
                            data = json.load(f)
                        people = data.get("people") or []
                        if people:
                            kp_flat = np.array(people[0].get("pose_keypoints_2d") or [], dtype=np.float32)
                            if kp_flat.size == 75:  # BODY_25 -> 25 * 3
                                kp25 = kp_flat.reshape(25, 3)
                                if np.any(kp25[:, 2] > 0):
                                    coords_2d = self._convert_body25_to_coco24(kp25)
                                    detected += 1
                    except Exception as e:
                        logger.warning(f"Failed to parse OpenPose JSON for {frame_file}: {e}")

                npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
                np.savez(npz_path, coordinates=coords_2d[np.newaxis, :, :])

            return detected
        finally:
            shutil.rmtree(json_dir, ignore_errors=True)

    def _estimate_2d_poses_mediapipe(
        self,
        frames_dir: str,
        output_dir: str,
        frame_files: list,
    ) -> int:
        """
        MediaPipe pose extraction. Returns the number of frames in which a
        person was detected.
        """
        if not self.mediapipe_available:
            raise RuntimeError("MediaPipe not available. Install: pip install mediapipe")

        logger.info("🔄 Running MediaPipe for 2D pose estimation...")

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
        
        detected_count = 0

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
                            detected_count += 1
                        else:
                            # No person detected in this frame
                            logger.debug(f"No pose detected in frame {idx}")
                            coords_2d = np.zeros((24, 2))
                
                except Exception as e:
                    logger.warning(f"Error processing frame {idx} ({frame_file}): {e}")
                    coords_2d = np.zeros((24, 2))
                
                npz_path = os.path.join(output_dir, f"frame_{idx:05d}.npz")
                np.savez(npz_path, coordinates=coords_2d[np.newaxis, :, :])

        return detected_count


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

            from romp.main import ROMP, romp_settings

            # Use default settings from simple-romp
            settings = romp_settings(input_args=[])
            settings.mode = 'image'

            # Initialize ROMP model
            romp_model = ROMP(settings)

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


    def _convert_body25_to_coco24(self, kp25: np.ndarray) -> np.ndarray:
        """
        Map OpenPose BODY_25 keypoints (x, y, confidence) to the COCO-24
        layout produced by `_convert_mediapipe_to_coco24`. Keypoints with
        zero confidence stay as zero in the output (downstream code already
        treats zeros as missing).

        BODY_25 indices (CMU OpenPose):
            0 Nose, 1 Neck, 2 RShoulder, 3 RElbow, 4 RWrist,
            5 LShoulder, 6 LElbow, 7 LWrist, 8 MidHip,
            9 RHip, 10 RKnee, 11 RAnkle, 12 LHip, 13 LKnee, 14 LAnkle,
            15 REye, 16 LEye, 17 REar, 18 LEar,
            19 LBigToe, 20 LSmallToe, 21 LHeel,
            22 RBigToe, 23 RSmallToe, 24 RHeel
        """
        coco_24 = np.zeros((24, 2))

        def take(i: int) -> np.ndarray:
            # Drop confidence; zero out keypoints that OpenPose marked as missing.
            return kp25[i, :2] if kp25[i, 2] > 0 else np.zeros(2)

        try:
            coco_24[0] = take(0)    # Nose
            coco_24[1] = take(1)    # Neck
            coco_24[2] = take(2)    # Right Shoulder
            coco_24[3] = take(3)    # Right Elbow
            coco_24[4] = take(4)    # Right Wrist
            coco_24[5] = take(5)    # Left Shoulder
            coco_24[6] = take(6)    # Left Elbow
            coco_24[7] = take(7)    # Left Wrist
            coco_24[8] = take(9)    # Right Hip
            coco_24[9] = take(10)   # Right Knee
            coco_24[10] = take(11)  # Right Ankle
            coco_24[11] = take(12)  # Left Hip
            coco_24[12] = take(13)  # Left Knee
            coco_24[13] = take(14)  # Left Ankle
            coco_24[14] = take(15)  # Right Eye
            coco_24[15] = take(16)  # Left Eye
            coco_24[16] = take(17)  # Right Ear
            coco_24[17] = take(18)  # Left Ear
            coco_24[18] = take(8)   # Pelvis (MidHip)

            # Thorax: midpoint of neck and pelvis if both present.
            if np.any(coco_24[1]) and np.any(coco_24[18]):
                coco_24[19] = (coco_24[1] + coco_24[18]) / 2

            # Upper Neck: halfway between neck and nose.
            if np.any(coco_24[1]) and np.any(coco_24[0]):
                coco_24[20] = coco_24[1] + (coco_24[0] - coco_24[1]) * 0.5

            # Head Top: 20px above the nose, matching the MediaPipe converter.
            if np.any(coco_24[0]):
                coco_24[21] = np.array([coco_24[0][0], max(0.0, coco_24[0][1] - 20)])

            coco_24[22] = take(22)  # Right Big Toe
            coco_24[23] = take(19)  # Left Big Toe
        except IndexError as e:
            logger.warning(f"BODY_25 mapping error: {e}")

        return coco_24

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