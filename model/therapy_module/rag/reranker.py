"""
rag/reranker.py
===============
Cross-encoder reranker for post-fusion relevance scoring.

After W-RRF produces a ranked candidate list, the reranker scores each
chunk directly against the query using a cross-encoder model, dramatically
improving precision by pushing treatment chunks above diagnostic ones.
"""

from __future__ import annotations

import logging
from typing import List

from rag.config import RERANKER_MODEL

log = logging.getLogger(__name__)

# Lazy-loaded singleton
_cross_encoder = None


def _get_cross_encoder():
    """Load the cross-encoder model (singleton, loaded once)."""
    global _cross_encoder
    if _cross_encoder is None:
        from sentence_transformers import CrossEncoder
        log.info("Loading cross-encoder: %s", RERANKER_MODEL)
        _cross_encoder = CrossEncoder(RERANKER_MODEL)
    return _cross_encoder


def rerank(
    query: str,
    results: List[dict],
    top_k: int = 10,
) -> List[dict]:
    """
    Rerank retrieved chunks using a cross-encoder.

    Parameters
    ----------
    query   : str        — the retrieval query
    results : list[dict] — result dicts with at least a "text" key
    top_k   : int        — number of results to return after reranking

    Returns
    -------
    list[dict] — top-k results sorted by cross-encoder relevance score
    """
    if not results:
        return results

    if len(results) <= 1:
        return results[:top_k]

    model = _get_cross_encoder()

    pairs = [(query, r["text"]) for r in results]
    scores = model.predict(pairs)

    scored = list(zip(results, scores))
    scored.sort(key=lambda x: x[1], reverse=True)

    reranked = []
    for result, score in scored[:top_k]:
        entry = dict(result)
        entry["rerank_score"] = round(float(score), 6)
        reranked.append(entry)

    log.info(
        "Reranked %d → %d chunks (top score: %.4f, bottom: %.4f)",
        len(results), len(reranked),
        reranked[0]["rerank_score"] if reranked else 0,
        reranked[-1]["rerank_score"] if reranked else 0,
    )
    return reranked
