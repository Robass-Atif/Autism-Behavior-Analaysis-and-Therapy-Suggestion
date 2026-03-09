"""
services/therapy_service.py
============================
Wraps the therapy_module RAG pipeline as a FastAPI-compatible async service.

The RAG pipeline uses relative file paths (ChromaDB, BM25 index, AFIRM data,
DSM-5 data) that are resolved at call time against the current working directory.
To keep those paths correct without modifying the therapy_module source, every
call temporarily changes the process CWD to the therapy_module directory under
a process-wide threading.Lock.  Calls are dispatched via asyncio.to_thread so
the FastAPI event loop is never blocked.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import threading
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)

# Global lock — os.chdir is process-wide, not thread-local.
# Ensures only one therapy pipeline call runs at a time.
_rag_lock = threading.Lock()


class TherapyService:
    """
    Async service that runs the RAG therapy recommendation pipeline.

    Usage
    -----
        service = TherapyService(therapy_module_dir="/path/to/therapy_module")
        result  = await service.generate_recommendations(model_output_dict)
    """

    def __init__(self, therapy_module_dir: str | Path) -> None:
        self.therapy_module_dir = Path(therapy_module_dir).resolve()
        self._rag: Optional[Any] = None  # RAGSystem, lazy-loaded

        if not self.therapy_module_dir.exists():
            log.warning(
                "Therapy module directory not found: %s — /therapy/recommend will be unavailable.",
                self.therapy_module_dir,
            )

    # ------------------------------------------------------------------
    # Internal helpers (executed inside the CWD-locked thread)
    # ------------------------------------------------------------------

    def _ensure_sys_path(self) -> None:
        """Add the therapy_module directory to sys.path once."""
        module_str = str(self.therapy_module_dir)
        if module_str not in sys.path:
            sys.path.insert(0, module_str)

    def _ensure_rag(self) -> None:
        """
        Lazily import and instantiate RAGSystem.
        Must be called with the process CWD already set to therapy_module_dir
        and the lock held.
        """
        if self._rag is not None:
            return

        self._ensure_sys_path()

        from rag.pipeline import RAGSystem  # noqa: PLC0415 — intentional lazy import

        chroma_dir = str(self.therapy_module_dir / "databases" / "chroma_db")
        bm25_path  = str(self.therapy_module_dir / "databases" / "bm25_index_autism.pkl")

        self._rag = RAGSystem(chroma_dir=chroma_dir, bm25_index_path=bm25_path)
        log.info("RAGSystem initialised (chroma_dir=%s).", chroma_dir)

    def _run_pipeline(self, model_output: dict, top_k: int) -> dict:
        """
        Blocking function executed in a worker thread.

        Acquires the process-wide CWD lock, changes to the therapy_module
        directory, runs the full retrieve → generate pipeline, then restores
        the original CWD before releasing the lock.
        """
        if not self.therapy_module_dir.exists():
            raise RuntimeError(
                f"Therapy module directory does not exist: {self.therapy_module_dir}"
            )

        with _rag_lock:
            old_cwd = os.getcwd()
            try:
                os.chdir(self.therapy_module_dir)
                self._ensure_rag()

                # 1. Retrieve relevant guideline chunks
                results: list[dict] = self._rag.retrieve(
                    model_output_path_or_dict=model_output,
                    pdf_dir="pdfs",
                    top_k=top_k,
                    use_reranker=True,
                )

                # 2. Parse patient metadata for generation
                self._ensure_sys_path()
                from scripts.parse_model_output import parse_model_output  # noqa: PLC0415
                from rag.query_builder import build_query_from_severity    # noqa: PLC0415

                parsed  = parse_model_output(model_output)
                queries = build_query_from_severity(
                    parsed["severity_level"], age=parsed["age"]
                )

                # 3. Generate clinical report via Gemini
                clinical_report: str = self._rag.generate(
                    queries.dense,
                    results,
                    stream=False,
                    severity=parsed["severity_level"],
                    age=parsed["age"],
                    gender=parsed.get("input_gender"),
                    top_joints=parsed.get("joint_contributions"),
                )

                return {
                    "status": "success",
                    "metadata": {
                        "patient_age":    parsed.get("age"),
                        "patient_gender": parsed.get("input_gender"),
                        "dsm5_level":     parsed.get("severity_level"),
                        "aggregated_joints": parsed.get("joint_contributions"),
                    },
                    "retrieved_chunks_count": len(results),
                    "retrieved_chunks": results,
                    "clinical_report": clinical_report,
                }

            finally:
                os.chdir(old_cwd)

    # ------------------------------------------------------------------
    # Public async API
    # ------------------------------------------------------------------

    async def generate_recommendations(
        self, model_output: dict, top_k: int = 10
    ) -> dict:
        """
        Run the RAG therapy pipeline asynchronously.

        Parameters
        ----------
        model_output : dict
            The prediction result dict returned by the ``/predict`` endpoint.
        top_k : int
            Number of guideline chunks to retrieve (default 10).

        Returns
        -------
        dict
            Keys: ``status``, ``metadata``, ``retrieved_chunks_count``,
            ``retrieved_chunks``, ``clinical_report``.
        """
        return await asyncio.to_thread(self._run_pipeline, model_output, top_k)
