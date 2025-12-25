"""
Service for video frame extraction
"""
import cv2
import logging
import os
from pathlib import Path
from typing import Tuple

logger = logging.getLogger(__name__)

class VideoProcessingService:
    """Handles video frame extraction"""
    
    def __init__(self):
        pass
    
    def extract_frames(self, video_path: str, output_dir: str, target_fps: int = 30) -> Tuple[int, float, float]:
        """
        Extract frames from video at target FPS
        
        Args:
            video_path: Path to input video file
            output_dir: Directory to save extracted frames
            target_fps: Target frames per second (default: 30)
        
        Returns:
            Tuple of (num_frames_extracted, video_duration_seconds, original_fps)
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        # Get video properties
        original_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / original_fps if original_fps > 0 else 0
        
        logger.info(f"Video properties: {original_fps:.2f} FPS, {total_frames} frames, {duration:.2f}s")
        
        # Calculate frame sampling interval
        if target_fps is None or target_fps >= original_fps:
            frame_interval = 1
        else:
            frame_interval = max(1, int(original_fps / target_fps))
        
        logger.info(f"Extracting every {frame_interval} frame(s) to achieve ~{target_fps} FPS")
        
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
        
        logger.info(f"✅ Extracted {saved_count} frames from {frame_count} total frames")
        
        return saved_count, duration, original_fps
    
    def validate_video(self, video_path: str, max_size_mb: int, max_duration_sec: int) -> Tuple[bool, str]:
        """
        Validate video file
        
        Args:
            video_path: Path to video file
            max_size_mb: Maximum file size in MB
            max_duration_sec: Maximum duration in seconds
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file exists
        if not os.path.exists(video_path):
            return False, f"Video file not found: {video_path}"
        
        # Check file size
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        if file_size_mb > max_size_mb:
            return False, f"Video file too large: {file_size_mb:.2f}MB (max: {max_size_mb}MB)"
        
        # Check video can be opened
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return False, "Cannot open video file. May be corrupted or unsupported format."
        
        # Check duration
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        
        cap.release()
        
        if duration > max_duration_sec:
            return False, f"Video too long: {duration:.2f}s (max: {max_duration_sec}s)"
        
        logger.info(f"✅ Video validation passed: {file_size_mb:.2f}MB, {duration:.2f}s")
        return True, "Valid"
