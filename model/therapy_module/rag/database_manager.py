"""
rag/database_manager.py
=======================
Handles loading and caching of:
  - ChromaDB vector store (replaces the baseline architecture's SQLite embeddings)
  - BM25 index (pickle, same as the baseline architecture)

Mirrors the baseline architecture's DatabaseManager class.
"""

from __future__ import annotations

import logging
import os
import pickle
import threading
from pathlib import Path
from typing import Tuple

from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from rank_bm25 import BM25Okapi

from rag.config import EMBED_MODEL, CHROMA_DIR, BM25_INDEX_PATH

log = logging.getLogger(__name__)


class DatabaseManager:
    """
    Loads and caches the vector store (ChromaDB) and BM25 index.
    Mirrors the baseline architecture's DatabaseManager interface.
    """

    def __init__(self):
        self._vectorstore_cache: dict[str, Chroma] = {}
        self._bm25_cache: dict[str, Tuple] = {}
        self._embeddings_cache: dict[str, HuggingFaceEmbeddings] = {}
        self._lock = threading.Lock()
        self.logger = logging.getLogger(__name__)

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------

    def get_embeddings(self, model_name: str = EMBED_MODEL) -> HuggingFaceEmbeddings:
        """Return (cached) HuggingFace embeddings instance."""
        with self._lock:
            if model_name not in self._embeddings_cache:
                self.logger.info("Loading embedding model '%s' …", model_name)
                self._embeddings_cache[model_name] = HuggingFaceEmbeddings(model_name=model_name)
            return self._embeddings_cache[model_name]

    # ------------------------------------------------------------------
    # ChromaDB vector store
    # ------------------------------------------------------------------

    def load_vectorstore(
        self,
        chroma_dir: str = CHROMA_DIR,
        model_name: str = EMBED_MODEL,
    ) -> Chroma | None:
        """
        Load an existing ChromaDB store from *chroma_dir*.

        Returns None if the directory doesn't exist or the store is empty.
        """
        cache_key = f"{chroma_dir}::{model_name}"
        with self._lock:
            if cache_key in self._vectorstore_cache:
                return self._vectorstore_cache[cache_key]

        if not Path(chroma_dir).exists():
            self.logger.warning("ChromaDB directory '%s' not found.", chroma_dir)
            return None

        try:
            embeddings  = self.get_embeddings(model_name)
            vectorstore = Chroma(persist_directory=chroma_dir, embedding_function=embeddings)

            count = vectorstore._collection.count()
            if count == 0:
                self.logger.warning("ChromaDB store at '%s' is empty.", chroma_dir)
                return None

            self.logger.info("Loaded ChromaDB store from '%s' (%d vectors).", chroma_dir, count)
            with self._lock:
                self._vectorstore_cache[cache_key] = vectorstore
            return vectorstore

        except Exception as exc:
            self.logger.error("Error loading ChromaDB from '%s': %s", chroma_dir, exc)
            raise

    def build_vectorstore(
        self,
        chunks: list[Document],
        chroma_dir: str = CHROMA_DIR,
        model_name: str = EMBED_MODEL,
    ) -> Chroma:
        """
        Build a ChromaDB vector store from *chunks* and persist it.

        Parameters
        ----------
        chunks : list[Document]
            LangChain Documents produced by ``rag.ingestion.load_and_chunk_pdfs``.
        """
        if not chunks:
            raise ValueError(
                "No chunks provided — add PDFs to pdfs/ and re-run ingestion."
            )

        embeddings = self.get_embeddings(model_name)
        self.logger.info("Building ChromaDB store from %d chunks …", len(chunks))

        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=chroma_dir,
        )
        self.logger.info("ChromaDB store persisted to '%s'.", chroma_dir)

        cache_key = f"{chroma_dir}::{model_name}"
        with self._lock:
            self._vectorstore_cache[cache_key] = vectorstore
        return vectorstore

    def load_or_build_vectorstore(
        self,
        chunks: list[Document],
        chroma_dir: str = CHROMA_DIR,
        model_name: str = EMBED_MODEL,
        force_rebuild: bool = False,
    ) -> Chroma:
        """Load an existing ChromaDB store or build one from *chunks*."""
        if not force_rebuild:
            vs = self.load_vectorstore(chroma_dir, model_name)
            if vs is not None:
                return vs
        return self.build_vectorstore(chunks, chroma_dir, model_name)

    # ------------------------------------------------------------------
    # BM25 index (same pickle format as the baseline architecture)
    # ------------------------------------------------------------------

    def load_bm25_from_pickle(
        self, filepath: str = BM25_INDEX_PATH
    ) -> Tuple[BM25Okapi, list[Document], list[str]]:
        """
        Load BM25 index from pickle file.
        Returns (bm25, sections, section_ids).
        """
        with self._lock:
            if filepath in self._bm25_cache:
                return self._bm25_cache[filepath]

        if not os.path.exists(filepath):
            raise FileNotFoundError(f"BM25 index not found: '{filepath}'")

        try:
            with open(filepath, "rb") as fh:
                data = pickle.load(fh)
            result = (data["bm25"], data["sections"], data["section_ids"])
            with self._lock:
                self._bm25_cache[filepath] = result
            self.logger.info("Loaded BM25 index from '%s' (%d docs).", filepath, len(result[1]))
            return result
        except Exception as exc:
            self.logger.error("Error loading BM25 from '%s': %s", filepath, exc)
            raise
