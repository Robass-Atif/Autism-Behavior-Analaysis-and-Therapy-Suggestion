"""
tests/test_pipeline.py
======================
End-to-end pipeline test: ingestion → metadata enrichment → vector + BM25
indexing → retrieval → generation, for all three DSM-5 severity levels.

Run from the project root:
    .venv/bin/python tests/test_pipeline.py [--rebuild]

Flags
-----
--rebuild   Wipe all databases and caches and do a full rebuild from PDFs.
            Without this flag, cached indexes are reused for fast iteration.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import textwrap
import time
from pathlib import Path
from collections import Counter

# ─── Project root on sys.path ──────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)-8s %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
for noisy in ["httpx", "httpcore", "openai", "urllib3", "sentence_transformers",
              "transformers", "torch"]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

log = logging.getLogger("test_pipeline")


# ─── Dummy model outputs (one per severity level) ─────────────────────────
CASES = [
    {
        "label":        "Level 1 — Requiring Support (age 8)",
        "severity_raw": 0,
        "age":          8,
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
            "predictions_2d": {},
            "predictions_3d": {},
        },
    },
    {
        "label":        "Level 2 — Requiring Substantial Support (age 6)",
        "severity_raw": 1,
        "age":          6,
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
            "predictions_2d": {},
            "predictions_3d": {},
        },
    },
    {
        "label":        "Level 3 — Requiring Very Substantial Support (age 5)",
        "severity_raw": 2,
        "age":          5,
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
            "predictions_2d": {},
            "predictions_3d": {},
        },
    },
]


def hr(char: str = "─", width: int = 70) -> str:
    return char * width


def wrapped(text: str, indent: str = "  ", width: int = 78) -> str:
    lines = []
    for line in text.splitlines():
        if line.strip():
            lines.append(
                textwrap.fill(line, width=width,
                              initial_indent=indent,
                              subsequent_indent=indent + "  ")
            )
        else:
            lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Autism RAG — full 3-level pipeline test")
    parser.add_argument("--rebuild", action="store_true",
                        help="Wipe all DBs and rebuild from scratch")
    parser.add_argument("--pdf-dir", default="pdfs/", help="PDF directory")
    parser.add_argument("--top-k",   type=int, default=10, help="Chunks to retrieve per level")
    parser.add_argument("--no-generate", action="store_true",
                        help="Skip Gemini generation (retrieval only)")
    args = parser.parse_args()

    from rag.pipeline import RAGSystem
    from rag.ingestion import load_and_chunk_pdfs
    from rag.query_builder import build_query_from_severity
    from rag.checkpoints import checkpoint_exists, load_chunks, save_chunks, clear_checkpoints
    from rag.config import CHROMA_DIR, BM25_INDEX_PATH, CHECKPOINTS_DIR

    # ── STEP 1: Ingestion ─────────────────────────────────────────────────
    print(f"\n{hr('═')}")
    print("  AUTISM RAG PIPELINE — FULL 3-LEVEL END-TO-END TEST")
    print(hr('═'))

    rag = RAGSystem(chroma_dir=CHROMA_DIR, bm25_index_path=BM25_INDEX_PATH)

    if args.rebuild:
        print("\n  ⚠  --rebuild: wiping all databases and caches …")
        import shutil
        for d in [CHROMA_DIR, CHECKPOINTS_DIR]:
            if Path(d).exists():
                shutil.rmtree(d)
                print(f"     Wiped {d}")

    print(f"\n{hr()}")
    print("STEP 1: PDF INGESTION + METADATA ENRICHMENT + INDEX BUILD")
    print(hr())

    raw_ckpt = os.path.join(CHECKPOINTS_DIR, "chunks_raw.json")
    t0 = time.time()

    if not args.rebuild and checkpoint_exists(raw_ckpt):
        print(f"  Loading raw chunks from checkpoint: {raw_ckpt}")
        chunks = load_chunks(raw_ckpt)
        print(f"  → {len(chunks)} chunks loaded from cache")
    else:
        chunks = load_and_chunk_pdfs(args.pdf_dir, checkpoint_path=raw_ckpt)
        print(f"  → {len(chunks)} chunks in {time.time()-t0:.1f}s")
        if not chunks:
            print("  ❌  No chunks produced — check pdfs/ directory!")
            sys.exit(1)

    # Build/load indexes (enrichment runs inside here)
    rag.load_or_build_indexes(chunks, force_rebuild=args.rebuild, pdf_dir=args.pdf_dir)
    print(f"  → Indexes ready in {time.time()-t0:.1f}s total\n")

    # ── STEP 1b: Metadata quality snapshot ───────────────────────────────
    print(hr('─'))
    print("METADATA SNAPSHOT (first 8 chunks)")
    print(hr('─'))
    meta_keys = {"dsm5_symptoms", "intervention_type", "content_type", "topic"}
    ok = err = 0
    for c in chunks:
        missing = meta_keys - set(c.metadata)
        if missing:
            err += 1
        else:
            ok += 1

    print(f"  Enrichment coverage: {ok}/{len(chunks)} chunks have all metadata keys"
          + (" ✅" if err == 0 else f" ⚠ ({err} missing)"))

    ct = Counter(c.metadata.get("content_type", "?") for c in chunks)
    it = Counter(c.metadata.get("intervention_type", "?") for c in chunks)
    print(f"  content_type   : {dict(ct)}")
    print(f"  intervention   : {dict(it)}")

    # Sample
    print()
    for i, c in enumerate(chunks[:8]):
        syms = (c.metadata.get("dsm5_symptoms") or [])
        sym_str = ", ".join(syms[:2]) + ("…" if len(syms) > 2 else "") if syms else "∅"
        print(f"  [{i}] ct={c.metadata.get('content_type','?'):25s}  "
              f"it={c.metadata.get('intervention_type','?'):15s}  "
              f"syms=[{sym_str}]")
        print(f"       topic={c.metadata.get('topic','?')!r}")

    # ── STEP 2: Retrieval + Generation per level ─────────────────────────
    all_responses: dict[int, dict] = {}

    for case in CASES:
        level = case["severity_raw"] + 1
        print(f"\n{hr('═')}")
        print(f"  DSM-5 {case['label']}")
        print(hr('═'))

        queries = build_query_from_severity(level, age=case["age"])
        print(f"\n  Dense  query: {queries.dense[:120]} …")
        print(f"  Sparse query: {queries.sparse[:120]} …")

        t1 = time.time()
        results = rag.retrieve(
            case["model_output"],
            pdf_dir=args.pdf_dir,
            top_k=args.top_k,
            force_rebuild=False,
            use_metadata_filter=True,
            use_reranker=True,
        )
        print(f"\n  Retrieved {len(results)} chunks in {time.time()-t1:.2f}s")

        if not results:
            print("  ❌  No results — check metadata_filter and enrichment.")
            all_responses[level] = None
            continue

        # Print top-8 chunks
        print(f"\n  {'─'*66}")
        print(f"  TOP-{min(8, len(results))} CHUNKS")
        print(f"  {'─'*66}")
        for i, r in enumerate(results[:8], 1):
            syms = ", ".join((r.get("dsm5_symptoms") or [])[:2]) or "∅"
            ct_str = r.get("content_type", "?")
            rerank = f"  rerank={r['rerank_score']:.3f}" if "rerank_score" in r else ""
            print(f"  [{i:2d}] rrf={r['rrf_score']:.5f}{rerank}  "
                  f"source={Path(r['source']).stem[:30]}  p={r['page']}")
            print(f"        topic={r.get('topic','?')!r}  ct={ct_str}  syms=[{syms}]")
            print(f"        {r['text'][:130].strip()!r}")

        # Generation
        if not args.no_generate:
            print(f"\n  Generating with Gemini …")
            t2 = time.time()
            response = rag.generate(
                queries.dense, results[:8], stream=False,
                severity=level, age=case["age"],
            )
            gen_time = time.time() - t2
            print(f"  Generated in {gen_time:.2f}s  ({len(response)} chars)\n")
            print(f"  {'─'*66}")
            print(f"  GEMINI RESPONSE — Level {level}")
            print(f"  {'─'*66}")
            print(wrapped(response))
            all_responses[level] = {"query": queries.dense, "response": response, "n": len(results)}
        else:
            all_responses[level] = {"query": queries.dense, "response": "(skipped)", "n": len(results)}

    # ── STEP 3: Cross-level summary ────────────────────────────────────────
    print(f"\n{hr('═')}")
    print("  CROSS-LEVEL SUMMARY")
    print(hr('═'))
    for level in [1, 2, 3]:
        r = all_responses.get(level)
        if r:
            resp_len = len(r["response"])
            print(f"  Level {level}: {r['n']:3d} chunks retrieved  |  {resp_len} char response")
        else:
            print(f"  Level {level}: ❌ FAILED")

    # Save results
    out = Path("tests/results_3level.json")
    out.parent.mkdir(exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(all_responses, fh, indent=2, ensure_ascii=False)
    print(f"\n  Results saved → {out}")
    print(f"\n{'✅  End-to-end test complete.':^70}\n")


if __name__ == "__main__":
    main()
