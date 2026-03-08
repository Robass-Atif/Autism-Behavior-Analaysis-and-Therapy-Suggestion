"""
rag/config.py
=============
Central configuration for the Autism RAG Pipeline.
Mirrors the baseline architecture's Config/SourceConfig pattern.
"""

from __future__ import annotations

from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Ingestion / Chunking  (Docling HybridChunker, parallel)
# ---------------------------------------------------------------------------
# Max tokens per chunk — must match the embedding model's context window.
# S-PubMedBert-MS-MARCO and all-MiniLM-L6-v2 both top out at 512 WordPiece
# tokens. Setting to 256 keeps each chunk well within the safe embedding zone.
DOCLING_MAX_TOKENS = 512

# Number of PDFs converted concurrently (ThreadPoolExecutor workers).
# Docling's ONNX inference releases the GIL, so threading is effective.
INGEST_WORKERS = 2

# Legacy character-based limits kept for backwards compatibility.
CHUNK_SIZE    = 800
CHUNK_OVERLAP = 150

# ---------------------------------------------------------------------------
# LLM Metadata Enrichment
# ---------------------------------------------------------------------------
# Set to False to skip Gemini labelling (e.g. during development / testing).
METADATA_ENRICH_ENABLED = True

# Number of chunks sent to Gemini per API call during enrichment.
# Smaller batches (10) improve dsm5_symptoms tagging quality at the cost
# of ~2x API calls — worthwhile given symptoms are the primary filter signal.
METADATA_BATCH_SIZE = 50

# ---------------------------------------------------------------------------
# Embeddings — biomedical sentence-transformers model
# ---------------------------------------------------------------------------
# pritamdeka/S-PubMedBert-MS-MARCO is fine-tuned on PubMed + MS-MARCO;
# significantly better than all-MiniLM-L6-v2 on clinical/biomedical retrieval.
# Changing this requires a full vectorstore rebuild (force_rebuild=True).
EMBED_MODEL = "pritamdeka/S-PubMedBert-MS-MARCO"

# ---------------------------------------------------------------------------
# Vector Store — ChromaDB (local vector database)
# ---------------------------------------------------------------------------
CHROMA_DIR          = "databases/chroma_db"
CHROMA_COLLECTION   = "autism_guidelines"

# ---------------------------------------------------------------------------
# BM25 Index
# ---------------------------------------------------------------------------
BM25_INDEX_PATH = "databases/bm25_index_autism.pkl"

# Tuned BM25 parameters (from the baseline architecture optimisation trials)
BM25_K1      = 1.7
BM25_B       = 0.83
BM25_EPSILON = 0.05

# ---------------------------------------------------------------------------
# Retrieval / Fusion
# ---------------------------------------------------------------------------
RRF_K = 50   # Reciprocal Rank Fusion smoothing constant

# Relative weight of each retriever
DEFAULT_MODEL_WEIGHTS: dict[str, float] = {
    "chroma": 4.0,   # dense semantic search
    "BM25":   3.0,   # sparse keyword — balanced with reranker downstream
}

SIMILARITY_K   = 25   # candidates retrieved per arm
COMMON_SECTIONS_N = 10  # final sections after fusion (10 × 512 ≈ 5120 tokens)

# ---------------------------------------------------------------------------
# Cross-Encoder Reranker
# ---------------------------------------------------------------------------
RERANKER_MODEL      = "cross-encoder/ms-marco-MiniLM-L-6-v2"
RERANK_CANDIDATES   = 30   # candidates from W-RRF before reranking

# ---------------------------------------------------------------------------
# Gemini — generation LLM only (not embeddings)
# ---------------------------------------------------------------------------
GEMINI_MODEL = "gemini-2.5-flash"

# ---------------------------------------------------------------------------
# Checkpoints — resume after interruption
# ---------------------------------------------------------------------------
CHECKPOINTS_DIR = "databases/checkpoints"

# ---------------------------------------------------------------------------
# Chunking setup
# ---------------------------------------------------------------------------
CHUNKS_FILE = "chunks/chunks_enriched.json"


# ---------------------------------------------------------------------------
# Data paths
# ---------------------------------------------------------------------------
DSM5_PATH = "data/dsm5_severity.json"
MODEL_OUTPUT_PATH = "data/model_output.json"
