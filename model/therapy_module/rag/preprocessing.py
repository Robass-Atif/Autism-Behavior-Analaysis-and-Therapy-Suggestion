"""
rag/preprocessing.py
====================
NLTK-based text preprocessing for BM25 indexing and query tokenisation.

Direct port of the baseline architecture/src/processing/preprocess_bm25.py — same
function signature and preprocessing logic.
"""

from __future__ import annotations

import string
from typing import List

import nltk

# Download NLTK data if missing (same pattern as the baseline architecture)
_NLTK_RESOURCES = {
    "punkt":     "tokenizers/punkt",
    "punkt_tab": "tokenizers/punkt_tab",
    "stopwords": "corpora/stopwords",
    "wordnet":   "corpora/wordnet",
}
for _name, _path in _NLTK_RESOURCES.items():
    try:
        nltk.data.find(_path)
    except LookupError:
        nltk.download(_name, quiet=True)

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

_STOP_WORDS = set(stopwords.words("english"))
_LEMMATIZER = WordNetLemmatizer()


def preprocess_text(text: str, use_lemmatization: bool = True) -> List[str]:
    """
    Tokenise *text* for BM25.

    Identical to the baseline architecture's ``preprocess_text``:
      1. Lowercase + strip punctuation
      2. Word-tokenise (NLTK punkt)
      3. Remove stop-words and numeric tokens
      4. Optionally lemmatise (WordNet)
    """
    if not text:
        return []

    text   = text.lower().translate(str.maketrans("", "", string.punctuation))
    tokens = word_tokenize(text)
    tokens = [t for t in tokens if t not in _STOP_WORDS and not t.isnumeric() and len(t) > 1]

    if use_lemmatization:
        tokens = [_LEMMATIZER.lemmatize(t) for t in tokens]

    return tokens
