"""
rag_pipeline.py — CLI entry-point
==================================
Thin command-line wrapper around the ``rag`` package.

All business logic lives in the ``rag/`` package:
  rag/config.py           — constants & paths
  rag/ingestion.py        — PDF loading & chunking
  rag/preprocessing.py    — NLTK tokenisation for BM25
  rag/database_manager.py — ChromaDB + BM25 load/build (mirrors A-NICE-RAG's DatabaseManager)
  rag/bm25_index.py       — BM25Okapi build & cache
  rag/search_engine.py    — Weighted RRF hybrid retrieval (mirrors A-NICE-RAG's SearchEngine)
  rag/query_builder.py    — Symptom-driven query builder (split dense/sparse)
  rag/reranker.py         — Cross-encoder reranking
  rag/afirm_matcher.py    — AFIRM evidence-based intervention matching
  rag/pipeline.py         — RAGSystem orchestrator (mirrors A-NICE-RAG's RAGSystem)

    python rag_pipeline.py --test
    python rag_pipeline.py --model-output data/model_output.json --top-k 10
    python rag_pipeline.py --model-output data/model_output.json --rebuild
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from collections import Counter

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

from rag.pipeline import RAGSystem, format_chunks_for_report, run_rag
from rag.ingestion import load_and_chunk_pdfs
from rag.query_builder import build_query_from_severity
from rag.config import CHROMA_DIR, BM25_INDEX_PATH, GEMINI_MODEL, CHECKPOINTS_DIR
from rag.checkpoints import save_chunks, load_chunks, checkpoint_exists, clear_checkpoints

from scripts.parse_model_output import parse_model_output


def _print_results(results: list[dict], top_k: int) -> None:
    """Print retrieval results."""
    print(f"\nRetrieved {len(results)} chunks:\n")
    for i, r in enumerate(results, 1):
        rerank_info = f"  rerank={r['rerank_score']:.4f}" if 'rerank_score' in r else ""
        print(f"[{i}] {r['source']} p.{r['page']}  RRF={r['rrf_score']:.6f}{rerank_info}")
        print(f"     {r['text'][:200].strip()} …\n")





def main() -> None:
    parser = argparse.ArgumentParser(
        description="Autism Clinical Guidelines RAG Pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--rebuild",      action="store_true",  help="Force rebuild of all indexes using both old and new PDFs.")
    parser.add_argument("--json-out",     action="store_true",  help="Output ONLY a structured JSON payload to stdout.")
    parser.add_argument("--ingest",       action="store_true",  help="Scan pdfs_new/ for new PDFs, append them to the DB, and proceed.")
    args = parser.parse_args()

    from pathlib import Path
    import shutil
    from rag.config import MODEL_OUTPUT_PATH, COMMON_SECTIONS_N

    NEW_PDF_DIR = "pdfs_new"
    PRIMARY_PDF_DIR = "pdfs"
    Path(NEW_PDF_DIR).mkdir(parents=True, exist_ok=True)
    pdf_dir_to_use = PRIMARY_PDF_DIR if args.rebuild else None

    # ── Rebuild Branch ────────────────────────────────────────────────────────
    if args.rebuild:
        if not args.json_out:
            print("\n[!] Force rebuild requested.")
        new_pdfs = list(Path(NEW_PDF_DIR).glob("*.pdf"))
        if new_pdfs:
            if not args.json_out:
                print(f"Moving {len(new_pdfs)} new PDFs to '{PRIMARY_PDF_DIR}' before rebuilding...")
            Path(PRIMARY_PDF_DIR).mkdir(parents=True, exist_ok=True)
            for pdf_file in new_pdfs:
                shutil.move(str(pdf_file), str(Path(PRIMARY_PDF_DIR) / pdf_file.name))

    # ── Full run ──────────────────────────────────────────────────────────────
    if not args.json_out:
        print("=" * 70)
        print(f"AUTISM RAG PIPELINE — FULL RUN")
        print("=" * 70)

    rag = RAGSystem()
    
    if args.ingest:
        new_pdfs = list(Path(NEW_PDF_DIR).glob("*.pdf"))
        if not new_pdfs:
            if not args.json_out:
                print(f"\nWARNING: No new PDFs found in '{NEW_PDF_DIR}'. Proceeding with existing database.\n")
        else:
            if not args.json_out:
                print(f"\nFound {len(new_pdfs)} new PDFs in '{NEW_PDF_DIR}'. Initiating incremental ingestion...\n")
            rag.ingest_incremental(new_pdf_dir=NEW_PDF_DIR, move_to_dir=PRIMARY_PDF_DIR)
            pdf_dir_to_use = PRIMARY_PDF_DIR

    results = rag.retrieve(
        model_output_path_or_dict=MODEL_OUTPUT_PATH,
        pdf_dir=pdf_dir_to_use,
        top_k=COMMON_SECTIONS_N,
        force_rebuild=args.rebuild,
        use_reranker=True,
    )

    if not args.json_out:
        _print_results(results, COMMON_SECTIONS_N)

    # Always generate clinical report
    parsed = parse_model_output(MODEL_OUTPUT_PATH)
    queries = build_query_from_severity(parsed["severity_level"], age=parsed["age"])
    if not args.json_out:
        print("=" * 70)
        print(f"GEMINI GENERATION ({GEMINI_MODEL})")
        print("=" * 70)
    answer = rag.generate(
        queries.dense, results, stream=not args.json_out,
        severity=parsed["severity_level"], age=parsed["age"],
        gender=parsed.get("input_gender"),
        top_joints=parsed.get("joint_contributions"),
    )

    final_output = {
        "status": "success",
        "metadata": {
            "patient_age": parsed.get("age"),
            "patient_gender": parsed.get("input_gender"),
            "dsm5_level": parsed.get("severity_level"),
            "aggregated_joints": parsed.get("joint_contributions")
        },
        "retrieved_chunks_count": len(results),
        "retrieved_chunks": results,
        "clinical_report": answer
    }

    out_path = "data/rag_results.json"
    
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(final_output, fh, indent=2, ensure_ascii=False)
        
    if args.json_out:
        # Mute Python logs to ensure stdout only contains the valid JSON
        logging.getLogger().setLevel(logging.CRITICAL)
        print(json.dumps(final_output, indent=2, ensure_ascii=False))
    else:
        print(f"\nThe JSON API-like response containing the generated report has been saved to: {out_path}")


if __name__ == "__main__":
    main()
