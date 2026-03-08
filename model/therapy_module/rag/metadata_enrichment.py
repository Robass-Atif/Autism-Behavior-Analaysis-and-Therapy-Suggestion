"""
rag/metadata_enrichment.py
==========================
LLM-based chunk metadata labelling using Gemini.

For each chunk, Gemini assigns structured labels that enable metadata-filtered
retrieval in ChromaDB (narrowing the candidate set before semantic ranking).

Metadata schema per chunk
--------------------------
dsm5_symptoms : list[str]
    Zero or more DSM-5 derived support characteristics that the chunk is
    relevant to (drawn from dsm5_severity.json). Empty list if none match.

    All possible values:
    Social communication —
        "minimal functional communication"
        "very limited social initiation"
        "minimal response to social overtures"
        "limited functional communication"
        "reduced social initiation"
        "atypical social responses"
        "difficulty initiating interaction"
        "ineffective social reciprocity"
        "social awkwardness"
    Restricted / repetitive behaviours —
        "extreme behavioral inflexibility"
        "high distress with change"
        "significant interference across settings"
        "behavioral rigidity"
        "distress with transitions"
        "interference in multiple contexts"
        "difficulty switching tasks"
        "organizational challenges"
        "mild-to-moderate rigidity"

intervention_type : str
    Primary intervention category: "behavioral" | "pharmacological" |
    "educational" | "communication" | "none" | "other"

content_type : str
    What the chunk is primarily about:
    "treatment_and_support" | "diagnosis" | "other"

topic : str
    Short free-text label describing the main subject (≤ 5 words).
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

from langchain_core.documents import Document

from rag.config import GEMINI_MODEL, METADATA_BATCH_SIZE

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowed values (used for validation and prompt injection)
# ---------------------------------------------------------------------------

DSM5_SYMPTOMS: list[str] = [
    # Social communication — Level 3
    "minimal functional communication",
    "very limited social initiation",
    "minimal response to social overtures",
    # Social communication — Level 2
    "limited functional communication",
    "reduced social initiation",
    "atypical social responses",
    # Social communication — Level 1
    "difficulty initiating interaction",
    "ineffective social reciprocity",
    "social awkwardness",
    # Restricted / repetitive behaviours — Level 3
    "extreme behavioral inflexibility",
    "high distress with change",
    "significant interference across settings",
    # Restricted / repetitive behaviours — Level 2
    "behavioral rigidity",
    "distress with transitions",
    "interference in multiple contexts",
    # Restricted / repetitive behaviours — Level 1
    "difficulty switching tasks",
    "organizational challenges",
    "mild-to-moderate rigidity",
]

VALID_INTERVENTION_TYPES = frozenset(
    ["behavioral", "pharmacological", "educational", "communication", "none", "other"]
)
VALID_CONTENT_TYPES = frozenset(["treatment_and_support", "diagnosis", "other"])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _is_enriched(doc: Document) -> bool:
    """Return True if *doc* already has LLM-generated metadata labels."""
    return "content_type" in doc.metadata and doc.metadata["content_type"] in VALID_CONTENT_TYPES


def enrich_chunks(
    chunks: list[Document],
    api_key: str | None = None,
    batch_size: int = METADATA_BATCH_SIZE,
    checkpoint_path: str | None = None,
) -> list[Document]:
    """
    Add LLM-generated clinical metadata to each chunk in-place.

    Sends chunks to Gemini in batches and merges the returned labels back
    into each ``Document.metadata``.  If enrichment fails for any batch the
    affected chunks receive safe default values.

    If *checkpoint_path* is provided, progress is saved after each batch so
    interrupted runs can resume without re-labelling already-enriched chunks.

    Parameters
    ----------
    chunks    : list[Document]   — produced by ``load_and_chunk_pdfs``
    api_key   : str | None       — Gemini API key; falls back to env var
    batch_size: int              — chunks per Gemini call (default 20)
    checkpoint_path : str | None — path to save incremental progress

    Returns
    -------
    The same list with metadata mutated in-place (also returned for chaining).
    """
    if not chunks:
        return chunks

    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError(
            "GEMINI_API_KEY not set — metadata enrichment requires a Gemini API key. "
            "Set it via: export GEMINI_API_KEY='your-key-here'"
        )

    # Identify chunks that still need enrichment
    unenriched_indices = [i for i, d in enumerate(chunks) if not _is_enriched(d)]
    already_done = len(chunks) - len(unenriched_indices)

    if not unenriched_indices:
        log.info("All %d chunks already enriched — skipping.", len(chunks))
        return chunks

    if already_done > 0:
        log.info(
            "Resuming enrichment: %d/%d chunks already labelled, %d remaining.",
            already_done, len(chunks), len(unenriched_indices),
        )

    client = _build_client(key)
    total  = len(unenriched_indices)
    log.info("Enriching %d chunks in batches of %d …", total, batch_size)

    for batch_start in range(0, total, batch_size):
        batch_indices = unenriched_indices[batch_start : batch_start + batch_size]
        batch = [chunks[i] for i in batch_indices]
        log.info(
            "  Batch %d–%d / %d …",
            batch_start + 1,
            min(batch_start + batch_size, total),
            total,
        )
        labels = _label_batch(client, batch)
        _merge_labels(batch, labels)

        # Save progress after each batch
        if checkpoint_path:
            from rag.checkpoints import save_chunks
            save_chunks(chunks, checkpoint_path)

    log.info("Metadata enrichment complete.")
    return chunks


# ---------------------------------------------------------------------------
# Gemini interaction
# ---------------------------------------------------------------------------

def _build_client(api_key: str):
    """Return an openai-compatible Gemini client."""
    from openai import OpenAI
    return OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )


def _label_batch(client, batch: list[Document]) -> list[dict]:
    """
    Call Gemini with the batch of chunks and return one label dict per chunk.
    Retries up to MAX_RETRIES times on 429 rate-limit errors with exponential
    back-off, honouring the Retry-After header when present.
    """
    MAX_RETRIES = 6
    prompt = _build_prompt(batch)
    messages = [
        {
            "role": "system",
            "content": (
                "You are a clinical NLP assistant that labels text chunks from autism "
                "clinical guidelines. Respond ONLY with valid JSON — a JSON array where "
                "each element corresponds to one chunk in the same order as provided."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=GEMINI_MODEL,
                messages=messages,
                temperature=0,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content.strip()
            return _parse_response(raw, expected_count=len(batch))

        except Exception as exc:
            err_str = str(exc)
            is_rate_limit = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()

            if not is_rate_limit or attempt == MAX_RETRIES - 1:
                raise

            # Try to read Retry-After from the error message
            wait = 60 * (2 ** attempt)       # exponential: 60, 120, 240 …
            import re
            m = re.search(r"retry[_ ]in[:\s]+(\d+)\.?\d*s", err_str, re.I)
            if m:
                wait = max(int(m.group(1)) + 5, wait)

            log.warning(
                "Rate limit hit (attempt %d/%d) — waiting %ds …",
                attempt + 1, MAX_RETRIES, wait,
            )
            time.sleep(wait)


def _build_prompt(batch: list[Document]) -> str:
    symptoms_list = "\n".join(f'  "{s}"' for s in DSM5_SYMPTOMS)

    chunks_text = "\n\n".join(
        f'CHUNK {i} (source: {doc.metadata.get("source", "?")},'
        f' headings: {doc.metadata.get("headings", "") or "none"}):\n'
        f'{doc.page_content[:900]}'
        for i, doc in enumerate(batch)
    )

    return f"""Label each of the following {len(batch)} chunk(s) from autism clinical guidelines.

Return a JSON object with a single key "labels" whose value is an array of {len(batch)} objects, one per chunk, in the same order. Each object must have exactly these keys:

"dsm5_symptoms"     : array of strings — zero or more characteristics from the list below that this chunk is DIRECTLY relevant to (empty array [] if none apply)
"intervention_type" : one of: "behavioral", "pharmacological", "educational", "communication", "none", "other"
"content_type"      : one of: "treatment_and_support", "diagnosis", "other"
"topic"             : string — up to 5 words describing the main subject

Valid DSM-5 symptom values (use EXACTLY these strings):
{symptoms_list}

---
{chunks_text}
---

Respond with ONLY the JSON object. No markdown, no explanation."""


def _parse_response(raw: str, expected_count: int) -> list[dict]:
    """Parse Gemini's JSON response into a list of label dicts."""
    # Strip possible markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini returned invalid JSON: {exc}\nRaw: {raw[:300]}")

    # Accept both {"labels": [...]} and a bare list
    if isinstance(parsed, dict) and "labels" in parsed:
        labels = parsed["labels"]
    elif isinstance(parsed, list):
        labels = parsed
    else:
        raise ValueError(f"Unexpected JSON structure: {type(parsed)}")

    if len(labels) != expected_count:
        log.warning(
            "Label count mismatch: expected %d, got %d — padding with defaults.",
            expected_count,
            len(labels),
        )
        while len(labels) < expected_count:
            labels.append({})

    return labels[:expected_count]


# ---------------------------------------------------------------------------
# Metadata merging helpers
# ---------------------------------------------------------------------------

def _merge_labels(batch: list[Document], labels: list[dict]) -> None:
    """Validate and write label fields into each Document's metadata."""
    for doc, label in zip(batch, labels):
        # dsm5_symptoms — filter to only valid values
        raw_symptoms = label.get("dsm5_symptoms", [])
        if isinstance(raw_symptoms, list):
            symptoms = [s for s in raw_symptoms if s in DSM5_SYMPTOMS]
        else:
            symptoms = []

        intervention = label.get("intervention_type", "none")
        if intervention not in VALID_INTERVENTION_TYPES:
            intervention = "other"

        content = label.get("content_type", "other")
        if content not in VALID_CONTENT_TYPES:
            content = "other"

        topic = str(label.get("topic", "unclassified"))[:80]

        doc.metadata["dsm5_symptoms"]     = symptoms
        doc.metadata["intervention_type"] = intervention
        doc.metadata["content_type"]      = content
        doc.metadata["topic"]             = topic


