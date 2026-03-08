"""
tests/evaluate_strategies.py
=============================
End-to-end evaluation of chunking strategies across all DSM-5 severity levels.

Runs 3 strategies x 3 severity levels = 9 retrieval runs.
Collects results, prints detailed comparison, and saves to JSON.

Usage:
    python tests/evaluate_strategies.py [--no-rerank] [--rebuild]
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from collections import Counter
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

from rag.pipeline import RAGSystem
from rag.checkpoints import load_chunks
from rag.config import CHUNKS_FILE

TEST_INPUTS = {
    "Level 1": "tests/model_output_level1.json",
    "Level 2": "tests/model_output_level2.json",
    "Level 3": "tests/model_output_level3.json",
}

# Keywords we'd expect to see in good retrieval results for each level
EXPECTED_THEMES = {
    "Level 1": [
        "social skills", "social communication", "interaction",
        "cognitive behavio", "organizational", "switching",
    ],
    "Level 2": [
        "structured", "visual support", "communication", "behavioral",
        "intervention", "ABA", "naturalistic", "speech",
    ],
    "Level 3": [
        "intensive", "substantial support", "AAC", "augmentative",
        "functional communication", "pharmacol", "medication",
        "behavioral", "sensory",
    ],
}


def count_theme_hits(results: list[dict], themes: list[str]) -> int:
    """Count how many theme keywords appear across all retrieved chunk texts."""
    full_text = " ".join(r["text"].lower() for r in results)
    return sum(1 for t in themes if t.lower() in full_text)


def evaluate() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-rerank", action="store_true")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--top-k", type=int, default=10)
    args = parser.parse_args()

    # ── Verify chunks exist ───────────────────────────────────────────────
    if not os.path.exists(CHUNKS_FILE):
        print("No chunks found at", CHUNKS_FILE)
        return

    # ── Run evaluations ───────────────────────────────────────────────
    # Structure: all_results[level] = list[dict]
    all_results: dict[str, list[dict]] = {}
    timings: dict[str, float] = {}

    chunks = load_chunks(CHUNKS_FILE)
    chunk_count = len(chunks)
    log.info("Initialized with %d chunks", chunk_count)

    for level_name, model_path in TEST_INPUTS.items():
        print(f"\n{'=' * 70}")
        print(f"  {level_name}")
        print(f"{'=' * 70}")

        t0 = time.time()
        rag = RAGSystem()
        results = rag.retrieve(
            model_output_path_or_dict=model_path,
            top_k=args.top_k,
            force_rebuild=args.rebuild,
            use_reranker=not args.no_rerank,
        )
        elapsed = time.time() - t0
        timings[level_name] = elapsed

        all_results[level_name] = results
        log.info(
            "  %s: %d results in %.1fs",
            level_name, len(results), elapsed,
        )

        # Only rebuild on first run
        args.rebuild = False

    # ── Print detailed results ───────────────────────
    print("\n" + "=" * 90)
    print("DETAILED RESULTS")
    print("=" * 90)

    for level_name in TEST_INPUTS:
        results = all_results[level_name]
        print(f"\n  --- {level_name} ({len(results)} results) ---")

        for i, r in enumerate(results, 1):
            src = r["source"][:40]
            page = r["page"]
            rrf = r["rrf_score"]
            rerank = r.get("rerank_score")
            ctype = r.get("content_type", "?")
            itype = r.get("intervention_type", "?")
            topic = r.get("topic", "")[:50]

            score_str = f"RRF={rrf:.6f}"
            if rerank is not None:
                score_str += f"  rerank={rerank:.4f}"

            print(f"  [{i:2d}] {src:<40s} p.{page:<4}  {score_str}")
            print(f"       type={ctype:<25s} intervention={itype}")
            if topic:
                print(f"       topic: {topic}")
            # First 150 chars of text
            snippet = r["text"][:150].replace("\n", " ").strip()
            print(f"       {snippet} ...")

    # ── Summary comparison table ──────────────────────────────────────────
    print("\n" + "=" * 90)
    print("SUMMARY COMPARISON TABLE")
    print("=" * 90)

    header = (
        f"{'Level':<8s} | {'Chunks':>6s} | "
        f"{'Results':>7s} | {'Avg RRF':>9s} | {'Treatment%':>10s} | "
        f"{'Theme Hits':>10s} | {'Sources':>7s} | {'Time':>6s}"
    )
    print(header)
    print("-" * len(header))

    for level_name in TEST_INPUTS:
        results = all_results[level_name]

        if results:
            avg_rrf = sum(r["rrf_score"] for r in results) / len(results)
            treatment_pct = (
                sum(1 for r in results if r.get("content_type") == "treatment_and_support")
                / len(results) * 100
            )
            themes = EXPECTED_THEMES.get(level_name, [])
            theme_hits = count_theme_hits(results, themes)
            theme_total = len(themes)
            unique_sources = len({r["source"] for r in results})
        else:
            avg_rrf = 0
            treatment_pct = 0
            theme_hits = 0
            theme_total = 0
            unique_sources = 0

        elapsed = timings[level_name]

        print(
            f"{level_name:<8s} | {chunk_count:>6d} | "
            f"{len(results):>7d} | {avg_rrf:>9.6f} | {treatment_pct:>9.1f}% | "
            f"{theme_hits:>4d}/{theme_total:<5d} | {unique_sources:>7d} | {elapsed:>5.1f}s"
        )

    # ── Save full results ─────────────────────────────────────────────────
    output = {
        "chunk_count": chunk_count,
        "detailed_results": {
            level: [
                {k: v for k, v in r.items() if k != "text"}
                for r in results
            ]
            for level, results in all_results.items()
        },
        "full_results": all_results,
    }

    out_path = "tests/evaluation_results.json"
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)
    print(f"\nFull results saved to {out_path}")


if __name__ == "__main__":
    evaluate()
