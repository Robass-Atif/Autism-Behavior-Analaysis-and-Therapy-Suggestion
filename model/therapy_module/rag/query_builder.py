"""
rag/query_builder.py
====================
Build natural-language queries from patient symptom characteristics.

Returns separate queries for dense (semantic) and sparse (BM25) retrieval:
  - Dense query: Treatment-focused, uses symptom descriptions to match
    intervention/therapy chunks rather than diagnostic definition chunks.
  - BM25 query: Keyword-rich, includes exact clinical terminology for
    precise term matching.

Queries deliberately avoid mentioning "DSM-5", severity levels, or age to
prevent the retriever from surfacing diagnostic classification chunks.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Optional

from rag.config import DSM5_PATH

log = logging.getLogger(__name__)


@dataclass
class RetrievalQueries:
    """Holds separate queries optimised for dense and sparse retrieval."""
    dense: str   # for ChromaDB (semantic, treatment-focused)
    sparse: str  # for BM25 (keyword-rich, includes clinical terms)


def build_query_from_severity(
    severity_level: int,
    age: Optional[int] = None,
    dsm5_path: str = DSM5_PATH,
) -> RetrievalQueries:
    """
    Build separate dense and BM25 queries for hybrid retrieval.

    Queries are constructed from the symptom characteristics of the given
    severity level. No mention of DSM-5, severity levels, or age is
    included — only symptoms and treatment intent.

    Parameters
    ----------
    severity_level : int   — 1, 2, or 3
    age            : int | None — child's age (stored but not used in query)
    dsm5_path      : str   — path to dsm5_severity.json

    Returns
    -------
    RetrievalQueries with .dense and .sparse attributes
    """
    dsm5_data = _load_dsm5(dsm5_path)
    entry     = _find_severity_entry(dsm5_data, severity_level)

    if entry is None:
        q = (
            "What are the recommended interventions, therapies, and treatments "
            "for a child with autism spectrum disorder who has social communication "
            "difficulties and restricted repetitive behaviors?"
        )
        log.warning("Severity entry for Level %d not found — using generic query.", severity_level)
        return RetrievalQueries(dense=q, sparse=q)

    # Social communication characteristics
    sc_chars = entry.get("social_communication", {}).get(
        "derived_support_characteristics", []
    )
    # Restricted / repetitive behaviour characteristics
    rrb_chars = entry.get("restricted_repetitive_behaviors", {}).get(
        "derived_support_characteristics", []
    )

    # --- Dense query: symptom-driven, treatment-focused ---
    sc_phrase  = ", ".join(sc_chars)  if sc_chars  else "social communication difficulties"
    rrb_phrase = ", ".join(rrb_chars) if rrb_chars else "restricted repetitive behaviors"

    dense_query = (
        f"What are the recommended interventions, therapies, and treatments "
        f"for an autistic child presenting with {sc_phrase}, "
        f"and {rrb_phrase}?"
    )

    # --- BM25 query: keyword-rich, includes exact clinical terms ---
    sparse_parts: list[str] = []
    if sc_chars:
        sparse_parts.append(
            "social communication difficulties: " + ", ".join(sc_chars)
        )
    if rrb_chars:
        sparse_parts.append(
            "restricted repetitive behaviors: " + ", ".join(rrb_chars)
        )

    symptoms_str = "; ".join(sparse_parts)
    sparse_query = (
        f"interventions therapies treatments autism "
        f"{symptoms_str}"
    )

    log.info("Dense query : %s", dense_query)
    log.info("Sparse query: %s", sparse_query)
    return RetrievalQueries(dense=dense_query, sparse=sparse_query)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_dsm5(path: str) -> dict | None:
    try:
        with open(path, "r") as fh:
            return json.load(fh)
    except FileNotFoundError:
        log.warning("DSM-5 file not found at '%s'.", path)
        return None


def _find_severity_entry(dsm5_data: dict | None, level: int) -> dict | None:
    if not dsm5_data:
        return None
    for entry in dsm5_data.get("severity_levels", []):
        if entry.get("severity_level") == f"Level {level}":
            return entry
    return None
