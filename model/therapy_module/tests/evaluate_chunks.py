"""
tests/evaluate_colab_chunks.py
==============================
Evaluates pre-chunked Colab exports.
For each strategy (hybrid, hierarchical, hybrid_overlap):
1. Loads raw chunks.
2. Runs LLM metadata enrichment (if not already enriched).
3. Saves the enriched chunks back to the strategy folder.
4. Builds vector and BM25 indexes.
5. Tests retrieval and generation across 3 DSM-5 severity levels.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
import time
from pathlib import Path
from collections import Counter

# ─── Project root on sys.path ──────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

from rag.pipeline import RAGSystem
from rag.query_builder import build_query_from_severity
from rag.checkpoints import load_chunks
from rag.config import (
    CHROMA_DIR, BM25_INDEX_PATH, CHECKPOINTS_DIR, CHUNKS_FILE
)

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(name)s: %(message)s")
for noisy in ["httpx", "httpcore", "openai", "urllib3", "sentence_transformers", "transformers", "torch"]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

log = logging.getLogger("eval_chunks")

CASES = [
    {
        "label": "Level 1 — Requiring Support (age 8)",
        "severity_raw": 0,
        "age": 8,
        "model_output": {
            "input_age": 8,
            "input_gender": "Male",
            "ensemble_prediction": {
                "severity": 0,
                "severity_confidence": 0.87,
                "social_affect": 9.0,
                "rrb": 2.5,
                "comparison_score": 7.0,
                "comparison_confidence": 0.82,
            },
        },
    },
    {
        "label": "Level 2 — Requiring Substantial Support (age 6)",
        "severity_raw": 1,
        "age": 6,
        "model_output": {
            "input_age": 6,
            "input_gender": "Female",
            "ensemble_prediction": {
                "severity": 1,
                "severity_confidence": 0.91,
                "social_affect": 14.0,
                "rrb": 5.0,
                "comparison_score": 9.0,
                "comparison_confidence": 0.88,
            },
        },
    },
    {
        "label": "Level 3 — Requiring Very Substantial Support (age 5)",
        "severity_raw": 2,
        "age": 5,
        "model_output": {
            "input_age": 5,
            "input_gender": "Male",
            "ensemble_prediction": {
                "severity": 2,
                "severity_confidence": 0.95,
                "social_affect": 19.0,
                "rrb": 8.0,
                "comparison_score": 12.0,
                "comparison_confidence": 0.93,
            },
        },
    },
]

def main() -> None:
    print(f"\n{'='*70}\nEVALUATING UNIFIED CHUNKS\n{'='*70}")
    
    chunk_file = Path("chunks/chunks.json")
    enriched_file = Path(CHUNKS_FILE)
    
    if not chunk_file.exists() and not enriched_file.exists():
        print(f"Skipping: No chunks found in `chunks/`")
        return
        
    print("\n[1] Clearing old databases to force clean index build...")
    strat_chroma = Path(CHROMA_DIR)
    strat_bm25 = Path(BM25_INDEX_PATH)
    strat_ckpt_dir = Path(CHECKPOINTS_DIR)
    strat_enriched_ckpt = os.path.join(CHECKPOINTS_DIR, "chunks_enriched.json")

    if strat_chroma.exists():
        shutil.rmtree(strat_chroma)
    if strat_bm25.exists():
        strat_bm25.unlink()
    if strat_ckpt_dir.exists():
        shutil.rmtree(strat_ckpt_dir)
        
    print(f"\n[2] Loading chunks...")
    t0 = time.time()
    
    # If we already have enriched chunks saved, copy them to the Checkpoints dir
    # so RAGSystem uses them to save API calls.
    if enriched_file.exists():
        print(f"Found pre-enriched chunks at {enriched_file}. Copying to {strat_enriched_ckpt}...")
        strat_ckpt_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy(str(enriched_file), strat_enriched_ckpt)
        
        # Update chunks variable with the enriched ones so memory representation matches
        chunks = load_chunks(str(enriched_file))
    else:
        chunks = load_chunks(str(chunk_file))
        print(f"Loaded {len(chunks)} raw chunks.")
        
    print("\n[3] Building Vectors and BM25 (will run Gemini enrichment if not cached)...")
    rag = RAGSystem()
    rag.load_or_build_indexes(chunks, force_rebuild=False, pdf_dir=None)
    
    # Save enriched chunks back to the strategy folder
    if os.path.exists(strat_enriched_ckpt) and not enriched_file.exists():
        print(f"Saving newly enriched chunks to {enriched_file} ...")
        enriched_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(strat_enriched_ckpt, str(enriched_file))
        chunks = load_chunks(str(enriched_file))
        
    # Optional: Print metadata stats to verify enrichment
    ct = Counter(c.metadata.get("content_type", "?") for c in chunks)
    print(f"Content types: {dict(ct)}")
        
    print("\n[4] Running DSM-5 Level Evaluations...")
    results = {}
    for case in CASES:
        level = case["severity_raw"] + 1
        print(f"\n--- Testing Level {level} ---")
        
        queries = build_query_from_severity(level, age=case["age"])
        
        t1 = time.time()
        retrieved = rag.retrieve(
            case["model_output"],
            top_k=8,
            force_rebuild=False,
            use_metadata_filter=True,
            use_reranker=False,
        )
        print(f"Retrieved {len(retrieved)} chunks in {time.time()-t1:.2f}s")
        
        print(f"Generating Gemini response...")
        response = rag.generate(
            queries.dense, retrieved, stream=False,
            severity=level, age=case["age"],
        )
        print(f"Generated {len(response)} chars.")
        
        results[f"Level_{level}"] = {
            "retrieved_count": len(retrieved),
            "retrieved_sources": [f"{r['source']} p.{r['page']}" for r in retrieved],
            "response": response
        }
        
    out_file = f"tests/results_generation.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nDone. Results saved to {out_file}.")

if __name__ == "__main__":
    main()
