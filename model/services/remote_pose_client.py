"""
Client for the Colab-hosted remote pose-estimation service.

The remote service (see model/colab/pose_estimation_colab.ipynb) accepts a
video upload at /pose/2d or /pose/3d and returns a zip of frame_NNNNN.npz
files in the same shape the local prediction pipeline expects.
"""
from __future__ import annotations

import io
import logging
import os
import zipfile
from typing import Literal

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class RemotePoseClient:
    def __init__(self, base_url: str, timeout_sec: int = 900):
        # Strip trailing slash so we can concatenate paths cleanly.
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_sec
        self.session = requests.Session()
        self.session.trust_env = False
        retry = Retry(
            total=3,
            connect=3,
            read=3,
            backoff_factor=0.5,
            status_forcelist=(502, 503, 504),
            allowed_methods=frozenset({"GET", "POST"}),
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def health(self) -> dict:
        r = self.session.get(
            f"{self.base_url}/health",
            timeout=10,
            headers={"ngrok-skip-browser-warning": "true"},
        )
        r.raise_for_status()
        return r.json()

    def estimate(
        self,
        video_path: str,
        output_dir: str,
        mode: Literal["2d", "3d"],
        target_fps: int = 30,
    ) -> int:
        """
        Upload `video_path` to the remote service and unzip the response into
        `output_dir`. Returns the number of NPZ files written.
        """
        os.makedirs(output_dir, exist_ok=True)
        endpoint = f"{self.base_url}/pose/{mode}"

        logger.info(f"Sending video to remote pose service: {endpoint}")
        with open(video_path, "rb") as f:
            response = self.session.post(
                endpoint,
                files={"video": (os.path.basename(video_path), f, "video/mp4")},
                params={"fps": target_fps},
                timeout=self.timeout,
                headers={"ngrok-skip-browser-warning": "true"},
            )

        if response.status_code != 200:
            # Surface the remote error body so misconfigurations are obvious.
            raise RuntimeError(
                f"Remote pose service returned {response.status_code}: {response.text[:500]}"
            )

        frame_count = int(response.headers.get("X-Frame-Count", "0"))
        with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
            zf.extractall(output_dir)

        written = sum(1 for n in os.listdir(output_dir) if n.endswith(".npz"))
        logger.info(f"Remote pose: {frame_count} frames decoded, {written} npz files written to {output_dir}")
        return written
