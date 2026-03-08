"""
rag/search_engine.py
====================
Core search logic: ChromaDB (dense) + BM25 (sparse) + Weighted RRF.

Supports metadata-filtered retrieval: a ``metadata_filter`` dict (with
ChromaDB ``$where`` operators) narrows the candidate set before ranking,
ensuring irrelevant content types (e.g. diagnosis-only chunks) are excluded
when the query specifically needs treatment guidance.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from rank_bm25 import BM25Okapi

from rag.config import DEFAULT_MODEL_WEIGHTS, RRF_K, SIMILARITY_K
from rag.preprocessing import preprocess_text

log = logging.getLogger(__name__)


class SearchEngine:
    """
    Provides dense (ChromaDB), sparse (BM25), and fused (W-RRF) search.

    Both similarity_search() and bm25_search() accept an optional
    ``metadata_filter`` dict applied before scoring, enabling
    content_type / intervention_type / dsm5_symptoms pre-filtering.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    # ------------------------------------------------------------------
    # Weighted Reciprocal Rank Fusion  (identical to the baseline architecture)
    # ------------------------------------------------------------------

    def weighted_reciprocal_rank_fusion(
        self,
        ranked_lists: List[Tuple[List[str], str]],
        model_weights: Dict[str, float] = DEFAULT_MODEL_WEIGHTS,
        k: int = RRF_K,
    ) -> List[Tuple[str, float]]:
        """
        Perform weighted RRF on multiple ranked doc-ID lists.

        Parameters
        ----------
        ranked_lists : list of (id_list, model_name)
        model_weights : dict[str, float]
        k : int   — RRF smoothing constant

        Returns
        -------
        list of (doc_id, score) sorted descending.
        """
        rrf_scores: Dict[str, float] = defaultdict(float)

        for ranked_list, model_name in ranked_lists:
            weight = model_weights.get(model_name, 1.0)
            for rank, doc_id in enumerate(ranked_list, start=1):
                rrf_scores[doc_id] += weight * (1.0 / (k + rank))

        return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)

    # ------------------------------------------------------------------
    # Dense similarity search via ChromaDB
    # ------------------------------------------------------------------

    def similarity_search(
        self,
        query_text: str,
        vectorstore: Chroma,
        similarity_k: int = SIMILARITY_K,
        filename_type_filter: Optional[str] = None,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """
        ChromaDB similarity search — returns ordered list of chunk_ids.

        Parameters
        ----------
        query_text           : str
        vectorstore          : Chroma
        similarity_k         : int
        filename_type_filter : str | None  — comma-separated source file names
        metadata_filter      : dict | None — ChromaDB ``where`` clause, e.g.
            ``{"content_type": {"$eq": "treatment_and_support"}}``
            Combined with filename_type_filter using ``$and`` if both present.

        Returns
        -------
        list[str]   — ordered chunk IDs (most similar first)
        """
        try:
            where = _build_chroma_where(filename_type_filter, metadata_filter)

            kwargs: Dict[str, Any] = {"k": similarity_k}
            if where:
                kwargs["filter"] = where

            docs = vectorstore.similarity_search(query_text, **kwargs)
            ids  = [doc.metadata.get("chunk_id", doc.page_content[:60]) for doc in docs]
            self.logger.info("ChromaDB similarity search: %d results", len(ids))
            return ids
        except Exception as exc:
            self.logger.error("Error in ChromaDB similarity search: %s", exc)
            return []

    # ------------------------------------------------------------------
    # BM25 search  (same interface as the baseline architecture)
    # ------------------------------------------------------------------

    def bm25_search(
        self,
        query_text: str,
        bm25: BM25Okapi,
        bm25_sections: List[Document],
        bm25_section_ids: List[str],
        similarity_k: int = SIMILARITY_K,
        filename_type_filter: Optional[str] = None,
        metadata_filter: Optional[Dict[str, Any]] = None,
        use_lemmatized: bool = True,
    ) -> List[str]:
        """
        BM25 search with NLTK-lemmatised query and optional metadata pre-filter.

        Returns
        -------
        list[str]   — ordered chunk IDs (highest BM25 score first)
        """
        try:
            query_tokens = preprocess_text(query_text, use_lemmatization=use_lemmatized)
            return self._core_bm25_search(
                query_tokens, bm25, bm25_sections, bm25_section_ids,
                similarity_k, filename_type_filter, metadata_filter,
            )
        except Exception as exc:
            self.logger.error("Error in BM25 search: %s", exc)
            return []

    def _core_bm25_search(
        self,
        query_tokens: List[str],
        bm25: BM25Okapi,
        bm25_sections: List[Document],
        bm25_section_ids: List[str],
        similarity_k: int,
        filename_type_filter: Optional[str],
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[str]:
        """Internal BM25 search with filename and metadata pre-filtering."""
        if not query_tokens:
            return []

        bm25_scores = bm25.get_scores(query_tokens)

        # Build a combined mask from filename filter + metadata filter
        mask = _build_bm25_mask(bm25_sections, filename_type_filter, metadata_filter)

        if mask is not None:
            filtered = [
                (i, bm25_scores[i]) for i in range(len(bm25_sections)) if mask[i]
            ]
            top_k = sorted(filtered, key=lambda x: x[1], reverse=True)[:similarity_k]
            return [bm25_section_ids[idx] for idx, _ in top_k]

        scores_np = np.array(bm25_scores)
        if len(scores_np) > similarity_k:
            top_idx = np.argpartition(scores_np, -similarity_k)[-similarity_k:]
            top_idx = top_idx[scores_np[top_idx].argsort()[::-1]]
        else:
            top_idx = scores_np.argsort()[::-1]

        return [bm25_section_ids[i] for i in top_idx]


# ---------------------------------------------------------------------------
# Filter-building helpers
# ---------------------------------------------------------------------------

def _build_chroma_where(
    filename_type_filter: Optional[str],
    metadata_filter: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Combine filename and metadata filters into a single ChromaDB where clause."""
    clauses = []

    if filename_type_filter:
        prefixes = [p.strip() for p in filename_type_filter.split(",")]
        if len(prefixes) == 1:
            clauses.append({"source": {"$eq": prefixes[0]}})
        else:
            clauses.append({"$or": [{"source": {"$eq": p}} for p in prefixes]})

    if metadata_filter:
        clauses.append(metadata_filter)

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def _build_bm25_mask(
    sections: List[Document],
    filename_type_filter: Optional[str],
    metadata_filter: Optional[Dict[str, Any]],
) -> Optional[List[bool]]:
    """
    Build a boolean mask over *sections* applying filename and simple
    equality metadata filters.  Returns None when no filtering is needed.

    Only supports top-level ``{"field": value}`` equality in metadata_filter
    for BM25 (ChromaDB operators like ``$eq``/``$in`` are unwrapped).
    """
    if not filename_type_filter and not metadata_filter:
        return None

    mask = [True] * len(sections)

    if filename_type_filter:
        prefixes = tuple(p.strip().lower() for p in filename_type_filter.split(","))
        for i, sec in enumerate(sections):
            src = sec.metadata.get("source", "").lower()
            if not any(src.startswith(p) for p in prefixes):
                mask[i] = False

    if metadata_filter:
        simple = _flatten_chroma_filter(metadata_filter)
        for i, sec in enumerate(sections):
            if not mask[i]:
                continue
            for field, value in simple.items():
                doc_val = sec.metadata.get(field)
                if isinstance(value, list):          # $in semantics
                    if doc_val not in value:
                        mask[i] = False
                        break
                else:                                # equality
                    if doc_val != value:
                        mask[i] = False
                        break

    return mask


def _flatten_chroma_filter(f: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert simple ChromaDB filter dicts to plain {field: value_or_list}.
    Handles ``{"field": {"$eq": v}}`` and ``{"field": {"$in": [...]}}`` forms.
    Ignores compound operators ($and/$or) — full evaluation not needed for BM25.
    """
    result = {}
    for key, val in f.items():
        if key.startswith("$"):
            continue          # skip compound operators
        if isinstance(val, dict):
            if "$eq" in val:
                result[key] = val["$eq"]
            elif "$in" in val:
                result[key] = val["$in"]
        else:
            result[key] = val
    return result
