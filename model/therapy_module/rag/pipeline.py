"""
rag/pipeline.py
===============
RAG system orchestrator — mirrors the baseline architecture's RAGSystem class.

Wires together DatabaseManager, BM25 index, SearchEngine, QueryBuilder,
cross-encoder reranker, AFIRM matcher, Gemini generation, and LLM metadata
enrichment into one cohesive class.

Usage
-----
    from rag.pipeline import RAGSystem

    rag = RAGSystem()
    results = rag.retrieve(model_output, pdf_dir="pdfs/", top_k=10)
    response = rag.generate(query, results)
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from langchain_core.documents import Document

from rag.config import (
    CHROMA_DIR, BM25_INDEX_PATH, GEMINI_MODEL,
    DEFAULT_MODEL_WEIGHTS, SIMILARITY_K, COMMON_SECTIONS_N,
    METADATA_ENRICH_ENABLED, RERANK_CANDIDATES, CHECKPOINTS_DIR,
    CHUNKS_FILE,
)
from rag.checkpoints import (
    save_chunks, load_chunks, checkpoint_exists, clear_checkpoints,
)
from rag.database_manager import DatabaseManager
from rag.bm25_index import build_bm25_index
from rag.search_engine import SearchEngine
from rag.query_builder import build_query_from_severity, RetrievalQueries

from scripts.parse_model_output import parse_model_output

log = logging.getLogger(__name__)


class RAGSystem:
    """
    End-to-end Autism RAG System.

    Mirrors the baseline architecture's RAGSystem — same init pattern, same method names.
    VoyageAI → HuggingFace (local), SQLite → ChromaDB, OpenAI → Gemini.

    Metadata-filtered retrieval
    ---------------------------
    When chunks are enriched with LLM metadata (content_type, intervention_type),
    ``retrieve()`` automatically builds a ChromaDB ``where`` filter to restrict
    results to ``content_type == "treatment_and_support"``, ensuring diagnostic
    definition chunks are excluded from treatment-focused retrieval.
    """

    def __init__(
        self,
        chroma_dir: str = CHROMA_DIR,
        bm25_index_path: str = BM25_INDEX_PATH,
        model_name_embed: str | None = None,
    ):
        self.chroma_dir      = chroma_dir
        self.bm25_index_path = bm25_index_path
        self.db_manager      = DatabaseManager()
        self.search_engine   = SearchEngine()
        self.logger          = logging.getLogger(__name__)

        if model_name_embed:
            self._embed_model = model_name_embed

        # Gemini client (generation + metadata enrichment)
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            from openai import OpenAI
            self.gemini_client = OpenAI(
                api_key=gemini_api_key,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            )
            self._gemini_api_key = gemini_api_key
            self.logger.info("Gemini client initialised (model: %s).", GEMINI_MODEL)
        else:
            self.gemini_client   = None
            self._gemini_api_key = None
            self.logger.warning(
                "GEMINI_API_KEY not set — generation and metadata enrichment unavailable."
            )

        # Lazy-loaded indexes
        self._vectorstore = None
        self._bm25        = None
        self._bm25_sections: List[Document] = []
        self._bm25_section_ids: List[str]   = []

    # ------------------------------------------------------------------
    # Index building / loading
    # ------------------------------------------------------------------

    def load_or_build_indexes(
        self,
        chunks: List[Document],
        force_rebuild: bool = False,
        pdf_dir: str | None = None,
    ) -> None:
        """
        Load existing ChromaDB + BM25 indexes, or build from *chunks*.

        Auto-detects corpus changes via a SHA-256 hash of the PDF filenames
        stored in ``<chroma_dir>/.corpus_hash``. If the hash has changed
        (new or removed PDFs), ``force_rebuild`` is set to True automatically.

        When ``METADATA_ENRICH_ENABLED`` is True, runs LLM metadata
        enrichment before building the vectorstore.

        Checkpoint paths
        ----------------
        ``databases/checkpoints/chunks_enriched.json`` — enriched chunks
        saved after each Gemini batch so interrupted enrichment can resume.
        """
        start = time.time()

        enriched_ckpt = os.path.join(CHECKPOINTS_DIR, "chunks_enriched.json")
        ckpt_dir      = CHECKPOINTS_DIR

        # ── Corpus staleness detection ────────────────────────────────────────
        if not force_rebuild and pdf_dir:
            force_rebuild = _corpus_changed(pdf_dir, self.chroma_dir)
            if force_rebuild:
                self.logger.info(
                    "Corpus has changed — forcing full index rebuild."
                )

        # ── Clear all checkpoints on force rebuild ───────────────────────────
        if force_rebuild:
            clear_checkpoints(ckpt_dir)

        # ── Metadata enrichment (only before a fresh vectorstore build) ──────
        if force_rebuild or self.db_manager.load_vectorstore(self.chroma_dir) is None:
            # Try to load enriched checkpoint first
            if not force_rebuild and checkpoint_exists(enriched_ckpt):
                self.logger.info("Loading enriched chunks from checkpoint …")
                chunks = load_chunks(enriched_ckpt)

            if METADATA_ENRICH_ENABLED and chunks:
                if not self._gemini_api_key:
                    raise RuntimeError(
                        "GEMINI_API_KEY not set — metadata enrichment requires a Gemini API key. "
                        "Set it via: export GEMINI_API_KEY='your-key-here'"
                    )
                from rag.metadata_enrichment import enrich_chunks
                enrich_chunks(
                    chunks,
                    api_key=self._gemini_api_key,
                    checkpoint_path=enriched_ckpt,
                )

        # ── ChromaDB ─────────────────────────────────────────────────────────
        self._vectorstore = self.db_manager.load_or_build_vectorstore(
            chunks, chroma_dir=self.chroma_dir, force_rebuild=force_rebuild
        )

        # ── Verify enrichment is persisted in ChromaDB ───────────────────────
        if not force_rebuild:
            self._verify_enrichment()

        # ── Save corpus hash after successful build ───────────────────────────
        if force_rebuild and pdf_dir:
            _save_corpus_hash(pdf_dir, self.chroma_dir)

        # ── BM25 ─────────────────────────────────────────────────────────────
        if not force_rebuild:
            try:
                (self._bm25,
                 self._bm25_sections,
                 self._bm25_section_ids) = self.db_manager.load_bm25_from_pickle(
                     self.bm25_index_path
                 )
            except FileNotFoundError:
                self.logger.info("No BM25 cache found — building from chunks …")
                (self._bm25,
                 self._bm25_sections,
                 self._bm25_section_ids) = build_bm25_index(
                     chunks, index_path=self.bm25_index_path
                 )
        else:
            (self._bm25,
             self._bm25_sections,
             self._bm25_section_ids) = build_bm25_index(
                 chunks, index_path=self.bm25_index_path, force_rebuild=True
             )

        self.logger.info("Indexes ready in %.2f s.", time.time() - start)

    def _verify_enrichment(self) -> None:
        """
        Sample ChromaDB documents to check if metadata enrichment fields exist.
        If missing, log a warning — the metadata filter will be disabled.
        """
        if self._vectorstore is None:
            return
        try:
            collection = self._vectorstore._collection
            sample = collection.peek(limit=5)
            if sample and sample.get("metadatas"):
                has_content_type = any(
                    "content_type" in m for m in sample["metadatas"]
                )
                if not has_content_type:
                    self.logger.warning(
                        "Metadata enrichment not found in ChromaDB. "
                        "Metadata filters will be disabled. "
                        "Run with --rebuild to re-enrich chunks."
                    )
                    self._enrichment_verified = False
                    return
            self._enrichment_verified = True
        except Exception as exc:
            self.logger.warning("Could not verify enrichment: %s", exc)
            self._enrichment_verified = False

    # ------------------------------------------------------------------
    # Incremental Ingestion
    # ------------------------------------------------------------------

    def ingest_incremental(self, new_pdf_dir: str = "pdfs_new", move_to_dir: str = "pdfs/") -> None:
        """
        Incrementally process new PDFs:
        1. Extract and chunk new PDFs.
        2. Enrich chunks with LLM metadata.
        3. Append to existing ChromaDB.
        4. Rebuild BM25 index combining old and new chunks.
        5. Move the PDFs to the primary directory.
        """
        import shutil
        from rag.ingestion import load_and_chunk_pdfs
        from rag.config import CHUNKS_FILE, CHECKPOINTS_DIR
        
        pdf_files = list(Path(new_pdf_dir).glob("*.pdf"))
        if not pdf_files:
            self.logger.info("No new PDFs to ingest in %s.", new_pdf_dir)
            return

        self.logger.info("Starting incremental ingestion of %d new PDFs...", len(pdf_files))
        
        # 1. Chunk new PDFs
        new_chunks = load_and_chunk_pdfs(new_pdf_dir, checkpoint_path=None)
        
        # 2. Enrich new chunks
        if METADATA_ENRICH_ENABLED and new_chunks:
            if not self._gemini_api_key:
                raise RuntimeError("GEMINI_API_KEY required for metadata enrichment.")
            from rag.metadata_enrichment import enrich_chunks
            enrich_chunks(new_chunks, api_key=self._gemini_api_key, checkpoint_path=None)
            
        # 3. Append to Chroma
        vs = self.db_manager.load_vectorstore(self.chroma_dir)
        if vs is None:
            self.logger.info("No existing ChromaDB found; building from scratch.")
            vs = self.db_manager.build_vectorstore(new_chunks, self.chroma_dir)
        else:
            self.logger.info("Appending %d new chunks to existing ChromaDB...", len(new_chunks))
            vs.add_documents(new_chunks)
            # Update cache reference
            embed_model_name = self.db_manager.get_embeddings().model_name
            self.db_manager._vectorstore_cache[f"{self.chroma_dir}::{embed_model_name}"] = vs
            
        # 4. Rebuild BM25 & Global Chunks File
        old_chunks = []
        if os.path.exists(CHUNKS_FILE):
            old_chunks = load_chunks(CHUNKS_FILE)
            
        all_chunks = old_chunks + new_chunks
        self.logger.info("Rebuilding BM25 index with %d total chunks...", len(all_chunks))
        
        (self._bm25, self._bm25_sections, self._bm25_section_ids) = build_bm25_index(
            all_chunks, index_path=self.bm25_index_path, force_rebuild=True
        )
        
        save_chunks(all_chunks, CHUNKS_FILE)
        
        # 5. Move original PDFs
        target_dir = Path(move_to_dir)
        target_dir.mkdir(parents=True, exist_ok=True)
        for pdf in pdf_files:
            shutil.move(str(pdf), str(target_dir / pdf.name))
            
        self.logger.info("Incremental ingestion successfully completed.")
        _save_corpus_hash(move_to_dir, self.chroma_dir)

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------

    def retrieve(
        self,
        model_output_path_or_dict,
        pdf_dir: str = "pdfs/",
        top_k: int = COMMON_SECTIONS_N,
        model_weights: Optional[Dict[str, float]] = None,
        similarity_k: int = SIMILARITY_K,
        use_hybrid: bool = True,
        filename_type_filter: Optional[str] = None,
        force_rebuild: bool = False,
        use_metadata_filter: bool = True,
        use_reranker: bool = True,
        query_override = None,
    ) -> List[dict]:
        """
        Run the full retrieval pipeline and return top-*k* result dicts.

        Parameters
        ----------
        model_output_path_or_dict : str | dict
        pdf_dir : str
        top_k : int
        model_weights : dict | None
        similarity_k : int
        use_hybrid : bool          — if False, skip BM25
        filename_type_filter : str | None
        force_rebuild : bool
        use_metadata_filter : bool — apply content_type pre-filter when
                                     metadata is available (default True)
        use_reranker : bool        — apply cross-encoder reranking (default True)

        Returns
        -------
        list[dict] — each with keys: id, text, source, page, rrf_score,
                     chroma_rank, bm25_rank, content_type, intervention_type,
                     dsm5_symptoms, topic
        """
        if model_weights is None:
            model_weights = DEFAULT_MODEL_WEIGHTS.copy()

        # ── Parse model output ────────────────────────────────────────────────
        parsed   = parse_model_output(model_output_path_or_dict)
        severity = parsed["severity_level"]
        age      = parsed["age"]
        self.logger.info("Patient: age=%d  severity=Level %d", age, severity)

        # ── Build split queries (dense + sparse) ──────────────────────────────
        if query_override is not None:
            queries = query_override
        else:
            queries = build_query_from_severity(severity, age=age)

        # ── Ensure indexes are loaded ─────────────────────────────────────────
        if self._vectorstore is None:
            vs_exists = (self.db_manager.load_vectorstore(self.chroma_dir) is not None)
            bm25_exists = os.path.exists(self.bm25_index_path)

            needs_build = force_rebuild
            # Only check corpus if we gave a pdf_dir and we aren't already forced to rebuild
            if not needs_build and pdf_dir and vs_exists and bm25_exists:
                needs_build = _corpus_changed(pdf_dir, self.chroma_dir)
            elif not vs_exists or not bm25_exists:
                needs_build = True

            if needs_build:
                if not force_rebuild and os.path.exists(CHUNKS_FILE):
                    self.logger.info("Loading derived chunks from %s …", CHUNKS_FILE)
                    chunks = load_chunks(CHUNKS_FILE)
                else:
                    from rag.ingestion import load_and_chunk_pdfs

                    raw_ckpt = os.path.join(CHECKPOINTS_DIR, "chunks_raw.json")

                    if not force_rebuild and checkpoint_exists(raw_ckpt):
                        self.logger.info("Loading raw chunks from checkpoint …")
                        chunks = load_chunks(raw_ckpt)
                    else:
                        chunks = load_and_chunk_pdfs(
                            pdf_dir,
                            checkpoint_path=raw_ckpt if not force_rebuild else None,
                        )
                        save_chunks(chunks, raw_ckpt)
            else:
                chunks = []

            self.load_or_build_indexes(chunks, force_rebuild=needs_build, pdf_dir=pdf_dir)

        # ── Build metadata filter from patient severity ───────────────────────
        metadata_filter = None
        if use_metadata_filter and getattr(self, '_enrichment_verified', True):
            metadata_filter = _build_metadata_filter()

        # ── Dense search (uses dense query — treatment-focused) ───────────────
        ranked_lists = []
        results_map: Dict[str, dict] = {}

        chroma_ids = self.search_engine.similarity_search(
            queries.dense, self._vectorstore, similarity_k,
            filename_type_filter, metadata_filter,
        )
        if chroma_ids:
            ranked_lists.append((chroma_ids, "chroma"))
            docs = self._vectorstore.similarity_search(queries.dense, k=similarity_k)
            for doc in docs:
                cid = doc.metadata.get("chunk_id", doc.page_content[:60])
                results_map[cid] = _doc_to_result(doc)

        # ── BM25 search (uses sparse query — keyword-rich) ───────────────────
        if use_hybrid and self._bm25 is not None and model_weights.get("BM25", 0) > 0:
            bm25_ids = self.search_engine.bm25_search(
                queries.sparse,
                self._bm25,
                self._bm25_sections,
                self._bm25_section_ids,
                similarity_k,
                filename_type_filter,
                metadata_filter,
            )
            if bm25_ids:
                ranked_lists.append((bm25_ids, "BM25"))
                id_to_section = dict(zip(self._bm25_section_ids, self._bm25_sections))
                for sid in bm25_ids:
                    if sid not in results_map and sid in id_to_section:
                        results_map[sid] = _doc_to_result(id_to_section[sid])

        # ── Weighted RRF fusion ───────────────────────────────────────────────
        if len(ranked_lists) > 1:
            fused = self.search_engine.weighted_reciprocal_rank_fusion(
                ranked_lists, model_weights
            )
        elif len(ranked_lists) == 1:
            fused = [(sid, 1.0) for sid in ranked_lists[0][0]]
        else:
            self.logger.warning("No retrieval results.")
            return []

        chroma_rank_map = {sid: r for r, sid in enumerate(chroma_ids, 1)} if chroma_ids else {}
        bm25_ids_used   = ranked_lists[-1][0] if len(ranked_lists) > 1 else []
        bm25_rank_map   = {sid: r for r, sid in enumerate(bm25_ids_used, 1)}

        # Take more candidates for reranking
        rerank_k = RERANK_CANDIDATES if use_reranker else top_k
        results: List[dict] = []
        for doc_id, rrf_score in fused[:rerank_k]:
            if doc_id not in results_map:
                continue
            entry = dict(results_map[doc_id])
            entry["rrf_score"]   = round(rrf_score, 6)
            entry["chroma_rank"] = chroma_rank_map.get(doc_id)
            entry["bm25_rank"]   = bm25_rank_map.get(doc_id)
            results.append(entry)

        # ── Cross-encoder reranking ───────────────────────────────────────────
        if use_reranker and len(results) > top_k:
            from rag.reranker import rerank
            results = rerank(queries.dense, results, top_k=top_k)

        self.logger.info("Hybrid retrieval returned %d chunks.", len(results))

        # Store query and patient info for generation
        self._last_queries  = queries
        self._last_severity = severity
        self._last_age      = age

        return results

    # ------------------------------------------------------------------
    # Generation  (Gemini)
    # ------------------------------------------------------------------

    def generate(
        self,
        query: str,
        retrieved_chunks: List[dict],
        llm_model: str = GEMINI_MODEL,
        stream: bool = False,
        severity: Optional[int] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        top_joints: Optional[dict] = None,
    ) -> str:
        """
        Generate an answer from *retrieved_chunks* using Gemini.

        Returns
        -------
        str — full generated response
        """
        if not self.gemini_client:
            raise RuntimeError(
                "Gemini client not available. Set GEMINI_API_KEY environment variable."
            )

        # Use stored values from last retrieve() call if not provided
        if severity is None:
            severity = getattr(self, '_last_severity', None)
        if age is None:
            age = getattr(self, '_last_age', None)

        context = "\n\n---\n\n".join(
            f"Source: {c['source']} (page {c['page']})\n{c['text']}"
            for c in retrieved_chunks
        )

        # Match AFIRM modules to retrieved chunks
        from rag.afirm_matcher import match_afirm_to_chunks, format_afirm_context
        afirm_modules = match_afirm_to_chunks(retrieved_chunks, age=age)
        afirm_context = format_afirm_context(afirm_modules)

        messages = self._build_prompt(
            query, context,
            afirm_context=afirm_context,
            severity=severity,
            age=age,
            gender=gender,
            top_joints=top_joints,
        )

        self.logger.info("Generating response with %s …", llm_model)
        try:
            if stream:
                response_stream = self.gemini_client.chat.completions.create(
                    model=llm_model, messages=messages, temperature=0, stream=True
                )
                full_response = ""
                for chunk in response_stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        token = chunk.choices[0].delta.content
                        print(token, end="", flush=True)
                        full_response += token
                print()
                return full_response
            else:
                response = self.gemini_client.chat.completions.create(
                    model=llm_model, messages=messages, temperature=0
                )
                return response.choices[0].message.content
        except Exception as exc:
            self.logger.error("Gemini generation failed: %s", exc)
            raise

    @staticmethod
    def _build_prompt(
        query: str,
        context: str,
        afirm_context: str = "",
        severity: Optional[int] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        top_joints: Optional[dict] = None,
    ) -> list[dict]:
        patient_info = ""
        if severity is not None or age is not None or gender is not None:
            parts = []
            if age is not None:
                parts.append(f"age {age} years")
            if gender is not None:
                parts.append(f"gender {gender}")
            if severity is not None:
                parts.append(f"DSM-5 Level {severity}")
            patient_info = f"\n\nPatient profile: {', '.join(parts)}."
            
        joints_info = ""
        if top_joints:
            joints_info = "\n\nAdditionally, behavioral analysis identified the following key body joints contributing to the diagnosis (aggregated across the model ensemble):\n"
            for model_type, model_data in top_joints.items():
                joints_info += f"- **{model_type.upper()} Model Analysis**:\n"
                for task_name, task_data in model_data.items():
                    pos = ", ".join([j["joint"] for j in task_data.get("top_positive_joints", [])])
                    neg = ", ".join([j["joint"] for j in task_data.get("top_negative_joints", [])])
                    joints_info += f"  - {task_name}: Positively associated joints ({pos}). Negatively associated joints ({neg}).\n"
            joints_info += "\nPlease incorporate this kinematic and behavioral observation data into your clinical assessment where relevant, particularly when evaluating behavioral interventions or motor-related therapies."

        system_content = (
            "You are an expert clinical AI assistant specialising in autism spectrum disorder (ASD) "
            "and pediatric developmental interventions. Your objective is to synthesize a professional, "
            "comprehensive, and highly structured clinical recommendation report based *strictly* upon "
            "the provided evidence-based clinical guidelines in the context.\n\n"
            "Do not speculate or include information external to the provided context.\n"
            f"{patient_info}{joints_info}\n\n"
            "Structure your clinical report using the following precise headings:\n"
            "### 1. Patient Details\n"
            "State the patient's age, gender (if available, else specify child), and DSM-5 severity level.\n\n"
            "### 2. Evidence Based Interventions from RAG\n"
            "Synthesize the recommended behavioral, developmental, communication, and environmental interventions based strictly on the retrieved clinical guidelines context.\n\n"
            "### 3. AFIRM Modules (Suggested Therapies)\n"
            "List the Evidence-Based Practices (AFIRM modules) mentioned in the context. For each, provide a short description and format the direct URL as a clickable markdown link to see more details about the therapy.\n\n"
            "### 4. Top Joints and Kinematic Rankings\n"
            "Summarize the top positively and negatively associated joints and their rankings based on the kinematic analysis provided.\n\n"
            "### 5. Pharmacological Interventions\n"
            "E.g., Medications for co-occurring conditions like irritability or sleep. (Omit if no evidence in context).\n\n"
            "### 6. Parent-Mediated Interventions and Family Support\n"
            "E.g., Parent training programs, psychoeducation.\n\n"
            "**Formatting Constraints:**\n"
            "- Present recommendations using clear, professional bullet points.\n"
            "- Appended to every specific recommendation from the RAG guidelines, you **must** include an inline academic citation pointing "
            "to the source document, e.g., `[NICE-CG170, p.20]` or `[SIGN-145, p.34]`.\n"
            "- Explicitly note the strength of clinical evidence or age-appropriateness if mentioned in the text.\n"
            "- Maintain an objective, empirical, and clinical tone throughout the report."
        )

        user_content = f"{query}\n\nContext from clinical guidelines:\n{context}"
        if afirm_context:
            user_content += f"\n\n{afirm_context}"

        return [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ]


# ===========================================================================
# Helpers
# ===========================================================================

def _doc_to_result(doc: Document) -> dict:
    """Build a result dict from a LangChain Document."""
    m = doc.metadata
    return {
        "id":               m.get("chunk_id", doc.page_content[:60]),
        "text":             doc.page_content,
        "source":           m.get("source", "unknown"),
        "page":             m.get("page"),
        "content_type":     m.get("content_type", "other"),
        "intervention_type": m.get("intervention_type", "none"),
        "dsm5_symptoms":    m.get("dsm5_symptoms", []),
        "topic":            m.get("topic", ""),
    }


def _build_metadata_filter() -> dict | None:
    """
    Build a ChromaDB where-clause that restricts to treatment chunks.

    Restricts to ``content_type == "treatment_and_support"`` so that
    diagnostic definition chunks are excluded from retrieval.
    """
    return {"content_type": {"$eq": "treatment_and_support"}}


# ===========================================================================
# Corpus hash helpers (unchanged)
# ===========================================================================

def _corpus_changed(pdf_dir: str, chroma_dir: str) -> bool:
    """Return True if the set of PDFs has changed since last build."""
    hash_path = Path(chroma_dir) / ".corpus_hash"
    current   = _compute_corpus_hash(pdf_dir)
    if not hash_path.exists():
        return True
    return hash_path.read_text().strip() != current


def _save_corpus_hash(pdf_dir: str, chroma_dir: str) -> None:
    hash_path = Path(chroma_dir) / ".corpus_hash"
    hash_path.parent.mkdir(parents=True, exist_ok=True)
    hash_path.write_text(_compute_corpus_hash(pdf_dir))


def _compute_corpus_hash(pdf_dir: str) -> str:
    pdf_path = Path(pdf_dir)
    if not pdf_path.exists():
        return "empty"
    names = sorted(p.name for p in pdf_path.glob("*.pdf"))
    return hashlib.sha256("|".join(names).encode()).hexdigest()[:16]


# ===========================================================================
# Convenience wrappers
# ===========================================================================

def run_rag(
    model_output_path_or_dict,
    pdf_dir: str = "pdfs/",
    top_k: int = 10,
    force_rebuild: bool = False,
) -> List[dict]:
    """Thin functional wrapper around RAGSystem.retrieve()."""
    rag = RAGSystem()
    return rag.retrieve(
        model_output_path_or_dict,
        pdf_dir=pdf_dir,
        top_k=top_k,
        force_rebuild=force_rebuild,
    )


def format_chunks_for_report(chunks: List[dict]) -> List[dict]:
    """Format retrieved chunks for generating the clinical report prompt."""
    return [
        {
            "therapy_name":         f"Clinical Guideline Excerpt #{i}",
            "nice_category":        "retrieved_evidence",
            "evidence_basis":       "Clinical Guideline / Research Paper",
            "relevance_score":      chunk["rrf_score"],
            "intervention_targets": chunk.get("dsm5_symptoms", []),
            "summary":              chunk["text"][:500].strip(),
            "source_link":          f"{chunk['source']} (page {chunk['page']})",
        }
        for i, chunk in enumerate(chunks, 1)
    ]


# ===========================================================================
# Corpus hash helpers  (staleness detection)
# ===========================================================================

def _compute_corpus_hash(pdf_dir: str) -> str:
    """SHA-256 of the sorted list of PDF filenames in *pdf_dir*."""
    files = sorted(str(p.name) for p in Path(pdf_dir).glob("**/*.pdf"))
    content = "\n".join(files).encode()
    return hashlib.sha256(content).hexdigest()


def _hash_file_path(chroma_dir: str) -> Path:
    return Path(chroma_dir) / ".corpus_hash"


def _corpus_changed(pdf_dir: str, chroma_dir: str) -> bool:
    """Return True if the PDF corpus has changed since the last build."""
    hash_file = _hash_file_path(chroma_dir)
    if not hash_file.exists():
        return True  # No hash stored yet → treat as changed
    stored = hash_file.read_text().strip()
    current = _compute_corpus_hash(pdf_dir)
    return stored != current


def _save_corpus_hash(pdf_dir: str, chroma_dir: str) -> None:
    """Persist the current corpus hash so future runs can detect changes."""
    hash_file = _hash_file_path(chroma_dir)
    hash_file.parent.mkdir(parents=True, exist_ok=True)
    hash_file.write_text(_compute_corpus_hash(pdf_dir))
    log.info("Corpus hash saved to '%s'.", hash_file)

