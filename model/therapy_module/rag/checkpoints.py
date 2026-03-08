"""
rag/checkpoints.py
==================
Helpers for serialising / deserialising pipeline artefacts so that
expensive stages can be resumed after interruption.

Checkpoint layout
-----------------
    databases/checkpoints/
        parsed/<stem>.json      — Docling DoclingDocument per PDF
        chunks/<stem>.json      — raw LangChain Document chunks per PDF
        enriched/<stem>.json    — enriched LangChain Document chunks per PDF
"""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path

from langchain_core.documents import Document

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LangChain Document serialisation
# ---------------------------------------------------------------------------

def save_chunks(chunks: list[Document], path: str) -> None:
    """Atomically write *chunks* to a JSON file."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(
            [{"page_content": d.page_content, "metadata": d.metadata} for d in chunks],
            fh,
            ensure_ascii=False,
        )
    tmp.replace(p)


def load_chunks(path: str) -> list[Document]:
    """Deserialise a checkpoint JSON back to LangChain Documents."""
    with open(path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)
    return [Document(page_content=r["page_content"], metadata=r["metadata"]) for r in raw]


# ---------------------------------------------------------------------------
# Docling DoclingDocument serialisation
# ---------------------------------------------------------------------------

def save_docling_doc(doc, path: str) -> None:
    """Atomically write a DoclingDocument to JSON via Pydantic."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(doc.model_dump_json(), encoding="utf-8")
    tmp.replace(p)


def load_docling_doc(path: str):
    """Load a DoclingDocument from a JSON checkpoint."""
    from docling_core.types.doc import DoclingDocument
    return DoclingDocument.model_validate_json(Path(path).read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Stage-level helpers
# ---------------------------------------------------------------------------

def stage_path(checkpoint_dir: str, stage: str, stem: str) -> str:
    """Return the checkpoint file path for a given stage and PDF stem."""
    return str(Path(checkpoint_dir) / stage / f"{stem}.json")


def completed_stems(checkpoint_dir: str, stage: str) -> set[str]:
    """Return the set of PDF stems that have completed a given stage."""
    d = Path(checkpoint_dir) / stage
    if not d.exists():
        return set()
    return {p.stem for p in d.glob("*.json")}


def checkpoint_exists(path: str) -> bool:
    return Path(path).exists()


def clear_checkpoints(checkpoint_dir: str) -> None:
    """Remove the entire checkpoint directory."""
    p = Path(checkpoint_dir)
    if p.exists():
        shutil.rmtree(p)
        log.info("Cleared checkpoints at '%s'.", checkpoint_dir)
