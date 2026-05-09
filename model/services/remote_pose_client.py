"""
Client for the Colab-hosted remote pose-estimation service.

The remote service (see model/colab/pose_estimation_colab.ipynb) exposes an
async job queue: POST /pose/{2d,3d} returns 202 with a job_id, the client
polls GET /jobs/{id}, then downloads GET /jobs/{id}/result once status=done.
This avoids ngrok free-tier edge timeouts on long videos.
"""
from __future__ import annotations

import io
import logging
import os
import time
import zipfile
from typing import Literal

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)


class RemotePoseClient:
    def __init__(self, base_url: str, timeout_sec: int = 1800, poll_interval_sec: float = 3.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout_sec
        self.poll_interval = poll_interval_sec
        self.session = requests.Session()
        self.session.trust_env = False
        retry = Retry(
            total=3,
            connect=3,
            read=3,
            backoff_factor=0.5,
            status_forcelist=(502, 503, 504),
            allowed_methods=frozenset({"GET", "POST", "DELETE"}),
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _headers(self) -> dict:
        return {"ngrok-skip-browser-warning": "true"}

    def health(self) -> dict:
        r = self.session.get(f"{self.base_url}/health", timeout=10, headers=self._headers())
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
        Upload `video_path`, poll the job until it finishes, then unzip the
        result into `output_dir`. Returns the number of NPZ files written.
        """
        os.makedirs(output_dir, exist_ok=True)
        endpoint = f"{self.base_url}/pose/{mode}"

        logger.info(f"Submitting video to remote pose service: {endpoint}")
        with open(video_path, "rb") as f:
            response = self.session.post(
                endpoint,
                files={"video": (os.path.basename(video_path), f, "video/mp4")},
                params={"fps": target_fps},
                timeout=self.timeout,
                headers=self._headers(),
            )

        if response.status_code not in (200, 202):
            raise RuntimeError(
                f"Remote pose submit returned {response.status_code}: {response.text[:500]}"
            )

        try:
            job_id = response.json()["job_id"]
        except (ValueError, KeyError) as e:
            raise RuntimeError(f"Remote pose submit returned invalid body: {response.text[:500]}") from e

        logger.info(f"Remote pose job queued: {job_id}")

        deadline = time.time() + self.timeout
        last_status = None
        last_progress = None
        while True:
            if time.time() > deadline:
                self._delete_job(job_id)
                raise RuntimeError(f"Remote pose job {job_id} timed out after {self.timeout}s")

            sr = self.session.get(
                f"{self.base_url}/jobs/{job_id}",
                timeout=30,
                headers=self._headers(),
            )
            if sr.status_code != 200:
                raise RuntimeError(
                    f"Remote pose status returned {sr.status_code}: {sr.text[:500]}"
                )
            status_body = sr.json()
            status = status_body.get("status")
            progress = status_body.get("progress")
            if status != last_status or progress != last_progress:
                logger.info(f"Remote pose job {job_id}: status={status} progress={progress}")
                last_status = status
                last_progress = progress

            if status == "done":
                break
            if status == "error":
                err = status_body.get("error", "unknown error")
                raise RuntimeError(f"Remote pose job {job_id} failed: {err}")

            time.sleep(self.poll_interval)

        rr = self.session.get(
            f"{self.base_url}/jobs/{job_id}/result",
            timeout=self.timeout,
            headers=self._headers(),
        )
        if rr.status_code != 200:
            raise RuntimeError(
                f"Remote pose result returned {rr.status_code}: {rr.text[:500]}"
            )

        frame_count = int(rr.headers.get("X-Frame-Count", "0"))
        with zipfile.ZipFile(io.BytesIO(rr.content)) as zf:
            zf.extractall(output_dir)

        self._delete_job(job_id)

        written = sum(1 for n in os.listdir(output_dir) if n.endswith(".npz"))
        logger.info(f"Remote pose: {frame_count} frames decoded, {written} npz files written to {output_dir}")
        return written

    def _delete_job(self, job_id: str) -> None:
        try:
            self.session.delete(
                f"{self.base_url}/jobs/{job_id}",
                timeout=10,
                headers=self._headers(),
            )
        except requests.RequestException:
            pass
