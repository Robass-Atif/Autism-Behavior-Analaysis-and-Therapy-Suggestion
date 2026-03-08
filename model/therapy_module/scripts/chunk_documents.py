"""
Colab Script 1: Docling HybridChunker (current strategy)
=========================================================
Run this on Google Colab with a GPU runtime for fast PDF conversion.

Usage:
  1. Upload your PDFs to a folder called `pdfs/` in Colab
  2. Run all cells (or run this as a script)
  3. Download the output `chunks_hybrid.json`
  4. Place it at: chunks/hybrid/chunks.json
"""

# ── 0. Install dependencies ────────────────────────────────────────────────
# fmt: off
# !pip install -q docling docling-core transformers langchain-core
# fmt: on

import json
import logging
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# ── 1. Configuration ───────────────────────────────────────────────────────
PDF_DIR          = "pdfs"
OUTPUT_FILE      = "chunks_hybrid.json"
EMBED_MODEL      = "pritamdeka/S-PubMedBert-MS-MARCO"
MAX_TOKENS       = 512
WORKERS          = 2          # bump to 4 on Colab Pro with high-RAM

# ── 2. Initialise Docling (runs on GPU if available) ───────────────────────
from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker
from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer
from transformers import AutoTokenizer

log.info("Initialising DocumentConverter …")
converter = DocumentConverter()

log.info("Initialising HybridChunker (tokenizer: %s, max_tokens: %d) …", EMBED_MODEL, MAX_TOKENS)
hf_tok = HuggingFaceTokenizer(
    tokenizer=AutoTokenizer.from_pretrained(EMBED_MODEL),
    max_tokens=MAX_TOKENS,
)
chunker = HybridChunker(tokenizer=hf_tok, merge_peers=True)


# ── 3. Helpers ─────────────────────────────────────────────────────────────
def _page_from_chunk(chunk) -> int | None:
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
    try:
        headings = chunk.meta.headings
        if headings:
            return " | ".join(headings)
    except Exception:
        pass
    return ""


def process_pdf(pdf_file: Path) -> list[dict]:
    log.info("Parsing %s …", pdf_file.name)
    t0 = time.time()
    result = converter.convert(str(pdf_file))
    dl_doc = result.document
    chunks = list(chunker.chunk(dl_doc=dl_doc))
    stem   = pdf_file.stem
    docs   = []

    for i, chunk in enumerate(chunks):
        text     = chunker.contextualize(chunk)
        page     = _page_from_chunk(chunk)
        headings = _headings_from_chunk(chunk)
        chunk_id = f"{stem}::p{page}::c{i}"

        docs.append({
            "page_content": text,
            "metadata": {
                "source":   pdf_file.name,
                "page":     page,
                "chunk_id": chunk_id,
                "headings": headings,
            },
        })

    elapsed = time.time() - t0
    log.info("  → %d chunks from %s (%.1fs)", len(docs), pdf_file.name, elapsed)
    return docs


# ── 4. Run parallel ingestion ──────────────────────────────────────────────
pdf_files = sorted(Path(PDF_DIR).glob("**/*.pdf"))
log.info("Found %d PDFs in '%s'", len(pdf_files), PDF_DIR)

all_chunks: list[dict] = []
t_start = time.time()

with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    futures = {pool.submit(process_pdf, f): f for f in pdf_files}
    for future in as_completed(futures):
        try:
            all_chunks.extend(future.result())
        except Exception as exc:
            log.error("Failed: %s — %s", futures[future].name, exc)

elapsed_total = time.time() - t_start
log.info("Done: %d total chunks from %d PDFs in %.1fs", len(all_chunks), len(pdf_files), elapsed_total)

# ── 5. Save output ─────────────────────────────────────────────────────────
with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
    json.dump(all_chunks, fh, ensure_ascii=False)

log.info("Saved to %s", OUTPUT_FILE)
print(f"\n✓ Download '{OUTPUT_FILE}' and place at chunks/hybrid/chunks.json")
