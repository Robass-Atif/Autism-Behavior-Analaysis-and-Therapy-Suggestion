"""
rag/bm25_index.py
=================
Build and persist a BM25Okapi index over document chunks.

Adapted from the baseline architecture/src/processing/bm25_search.py — same pickle
format {bm25, sections, section_ids} so DatabaseManager.load_bm25_from_pickle
works identically.
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import List, Tuple

from langchain_core.documents import Document
from rank_bm25 import BM25Okapi

from rag.config import BM25_INDEX_PATH, BM25_K1, BM25_B, BM25_EPSILON
from rag.preprocessing import preprocess_text

log = logging.getLogger(__name__)


def build_bm25_index(
    chunks: list[Document],
    index_path: str = BM25_INDEX_PATH,
    k1: float = BM25_K1,
    b: float  = BM25_B,
    epsilon: float = BM25_EPSILON,
    force_rebuild: bool = False,
) -> Tuple[BM25Okapi, List[Document], List[str]]:
    """
    Build (or load from cache) a BM25Okapi index.

    Parameters
    ----------
    chunks : list[Document]
        LangChain Documents from ``rag.ingestion.load_and_chunk_pdfs``.
    index_path : str
        Path for the pickle cache file.
    k1, b, epsilon : float
        BM25 parameters (defaults are the baseline architecture tuned values).
    force_rebuild : bool
        Ignore existing cache and rebuild from scratch.

    Returns
    -------
    tuple[BM25Okapi, list[Document], list[str]]
        (bm25, sections, section_ids) — matches the baseline architecture interface.
    """
    if os.path.exists(index_path) and not force_rebuild:
        return _load(index_path)

    if not chunks:
        raise ValueError(
            "No chunks to index — add PDFs to pdfs/ and run ingestion first."
        )

    log.info(
        "Building BM25 index (%d chunks, k1=%.2f, b=%.2f, ε=%.2f) …",
        len(chunks), k1, b, epsilon,
    )

    sections:    List[Document] = []
    section_ids: List[str]      = []
    corpus:      List[List[str]] = []

    for doc in chunks:
        tokens = preprocess_text(doc.page_content, use_lemmatization=True)
        if not tokens:
            continue
        chunk_id = doc.metadata.get("chunk_id", doc.page_content[:60])
        # Ensure id in metadata (matches the baseline architecture's section.metadata["id"])
        doc.metadata["id"] = chunk_id
        sections.append(doc)
        section_ids.append(chunk_id)
        corpus.append(tokens)

    bm25 = BM25Okapi(corpus, k1=k1, b=b, epsilon=epsilon)

    Path(index_path).parent.mkdir(parents=True, exist_ok=True)
    with open(index_path, "wb") as fh:
        pickle.dump(
            {
                "bm25": bm25,
                "sections": sections,
                "section_ids": section_ids,
                "config": {"k1": k1, "b": b, "epsilon": epsilon, "use_lemmatization": True},
            },
            fh,
        )
    log.info("BM25 index saved to '%s' (%d documents).", index_path, len(sections))
    return bm25, sections, section_ids


def _load(index_path: str) -> Tuple[BM25Okapi, List[Document], List[str]]:
    log.info("Loading BM25 index from '%s' …", index_path)
    with open(index_path, "rb") as fh:
        data = pickle.load(fh)
    bm25, sections, section_ids = data["bm25"], data["sections"], data["section_ids"]
    log.info("BM25 index loaded (%d documents).", len(sections))
    return bm25, sections, section_ids
