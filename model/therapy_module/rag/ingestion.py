"""
rag/ingestion.py
================
PDF loading and chunking — Step 1 of the RAG pipeline.

Uses IBM Docling (DocumentConverter + HybridChunker) for layout-aware PDF
parsing with token-aligned, structure-respecting chunking.

PDFs are converted in parallel using a ThreadPoolExecutor. Docling's ONNX
inference releases the GIL, so threading provides real concurrency without
the overhead of multiprocessing (no model re-loading across workers).
"""

from __future__ import annotations

import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from langchain_core.documents import Document

from rag.config import EMBED_MODEL, DOCLING_MAX_TOKENS, INGEST_WORKERS

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy singletons — heavy to initialise; shared safely across threads
# ---------------------------------------------------------------------------

_converter      = None
_chunker        = None
_singleton_lock = threading.Lock()


def _get_converter():
    """Return a shared DocumentConverter (initialised once, thread-safe)."""
    global _converter
    if _converter is None:
        with _singleton_lock:
            if _converter is None:
                from docling.document_converter import DocumentConverter
                log.info("Initialising Docling DocumentConverter …")
                _converter = DocumentConverter()
    return _converter


def _get_chunker():
    """Return a shared HybridChunker aligned to the project embedding model."""
    global _chunker
    if _chunker is None:
        with _singleton_lock:
            if _chunker is None:
                from docling.chunking import HybridChunker
                from docling_core.transforms.chunker.tokenizer.huggingface import (
                    HuggingFaceTokenizer,
                )
                from transformers import AutoTokenizer

                log.info("Initialising HybridChunker (tokenizer: %s) …", EMBED_MODEL)
                hf_tok = HuggingFaceTokenizer(
                    tokenizer=AutoTokenizer.from_pretrained(EMBED_MODEL),
                    max_tokens=DOCLING_MAX_TOKENS,
                )
                _chunker = HybridChunker(tokenizer=hf_tok, merge_peers=True)
    return _chunker


# ---------------------------------------------------------------------------
# Per-file worker (runs inside the thread pool)
# ---------------------------------------------------------------------------

def _process_pdf(pdf_file: Path) -> list[Document]:
    """
    Convert *pdf_file* with Docling and return its chunks as LangChain Documents.
    Runs inside a thread — uses the shared converter and chunker singletons.
    """
    converter = _get_converter()
    chunker   = _get_chunker()

    log.info("Parsing %s …", pdf_file.name)
    try:
        result   = converter.convert(str(pdf_file))
        dl_doc   = result.document
        chunks   = list(chunker.chunk(dl_doc=dl_doc))
        stem     = pdf_file.stem
        docs: list[Document] = []

        for i, chunk in enumerate(chunks):
            text     = chunker.contextualize(chunk)          # heading-enriched text
            page     = _page_from_chunk(chunk)
            headings = _headings_from_chunk(chunk)
            chunk_id = f"{stem}::p{page}::c{i}"

            docs.append(Document(
                page_content=text,
                metadata={
                    "source":   pdf_file.name,
                    "page":     page,
                    "chunk_id": chunk_id,
                    "headings": headings,
                },
            ))

        log.info("  → %d chunks from %s", len(docs), pdf_file.name)
        return docs

    except Exception as exc:
        log.error("Failed to parse %s: %s", pdf_file.name, exc)
        return []


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_and_chunk_pdfs(
    pdf_dir: str = "pdfs/",
    max_workers: int = INGEST_WORKERS,
    checkpoint_path: str | None = None,
) -> list[Document]:
    """
    Walk *pdf_dir* recursively, parse every PDF with Docling in parallel,
    and return semantically coherent, token-aligned chunks as LangChain Documents.

    PDFs are processed concurrently with up to *max_workers* threads.

    If *checkpoint_path* is provided, already-parsed PDFs are loaded from the
    checkpoint and only new PDFs are processed. Progress is saved after each
    PDF completes so interrupted runs can resume.

    Each Document carries metadata:
      source    — filename of the source PDF
      page      — 1-based page number of the first token in the chunk
      chunk_id  — unique ID: "<stem>::p<page>::c<index>"
      headings  — pipe-joined section heading breadcrumb (may be empty)
    """
    pdf_path = Path(pdf_dir)
    if not pdf_path.exists():
        raise FileNotFoundError(
            f"PDF directory '{pdf_dir}' does not exist. "
            f"Create it and add clinical guideline PDFs before running the pipeline."
        )

    pdf_files = sorted(pdf_path.glob("**/*.pdf"))
    if not pdf_files:
        raise FileNotFoundError(
            f"No PDF files found in '{pdf_dir}'. "
            f"Add clinical guideline PDFs before running the pipeline."
        )

    # ── Resume from checkpoint ────────────────────────────────────────────
    all_chunks: list[Document] = []
    done_sources: set[str] = set()

    if checkpoint_path:
        from rag.checkpoints import load_chunks, checkpoint_exists, save_chunks
        if checkpoint_exists(checkpoint_path):
            all_chunks = load_chunks(checkpoint_path)
            done_sources = {d.metadata["source"] for d in all_chunks}
            log.info(
                "Resuming ingestion: %d chunks from %d PDFs already cached.",
                len(all_chunks), len(done_sources),
            )

    remaining = [f for f in pdf_files if f.name not in done_sources]
    if not remaining:
        log.info("All %d PDFs already ingested — skipping.", len(pdf_files))
        return all_chunks

    # Force singleton initialisation on the main thread before spawning workers,
    # so model loading logs appear once and not interleaved.
    _get_converter()
    _get_chunker()

    log.info(
        "Starting parallel ingestion of %d PDFs (workers=%d) …",
        len(remaining),
        max_workers,
    )

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        future_to_file = {pool.submit(_process_pdf, f): f for f in remaining}
        for future in as_completed(future_to_file):
            pdf_file = future_to_file[future]
            try:
                docs = future.result()
                all_chunks.extend(docs)
                # Save after each PDF so progress survives interruption
                if checkpoint_path:
                    save_chunks(all_chunks, checkpoint_path)
            except Exception as exc:
                log.error("Unhandled error processing %s: %s", pdf_file.name, exc)

    log.info("Total chunks produced: %d", len(all_chunks))
    return all_chunks


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _page_from_chunk(chunk) -> int | None:
    """Extract the 1-based page number from the first provenance entry."""
    try:
        items = chunk.meta.doc_items
        if items:
            prov = items[0].prov
            if prov:
                return prov[0].page_no
    except Exception:
        pass
    return None


def _headings_from_chunk(chunk) -> str:
    """Return pipe-joined section headings for the chunk (may be empty)."""
    try:
        headings = chunk.meta.headings
        if headings:
            return " | ".join(headings)
    except Exception:
        pass
    return ""


