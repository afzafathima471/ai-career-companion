"""
Two embedding backends behind the same interface: fit(texts) [optional]
and encode(texts) -> unit-normalized numpy array, so cosine similarity is
just a dot product.

- SentenceTransformerEmbedder: the production choice (matches the
  architecture doc) — real semantic embeddings, catches paraphrases a
  keyword method would miss. Downloads a model from Hugging Face on first
  use (~90MB), then caches it locally — needs a normal internet
  connection for that one-time download.

- TfidfEmbedder: a genuine offline alternative, not a mock — term-
  frequency vectors compared by cosine similarity. No network or model
  download needed. Weaker at paraphrase-level matching ("frontend" vs
  "front-end" vs "client-side" won't automatically cluster the way a
  transformer embedding would), but real and immediately usable.

Pick the backend via EMBEDDING_BACKEND=tfidf|sentence-transformers (env
var, default tfidf so this runs out of the box with no setup).
"""
import os
import pickle
import numpy as np


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str = None):
        from sentence_transformers import SentenceTransformer
        model_name = model_name or os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self.model = SentenceTransformer(model_name)

    def fit(self, texts: list[str]):
        pass  # pretrained model, no corpus-specific fitting needed

    def encode(self, texts: list[str]) -> np.ndarray:
        return np.asarray(self.model.encode(texts, normalize_embeddings=True))

    def save_state(self, path):
        pass  # nothing corpus-specific to persist

    @classmethod
    def load_state(cls, path):
        return cls()


class TfidfEmbedder:
    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        self.vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        self._fitted = False

    def fit(self, texts: list[str]):
        self.vectorizer.fit(texts)
        self._fitted = True

    def encode(self, texts: list[str]) -> np.ndarray:
        if not self._fitted:
            raise RuntimeError("TfidfEmbedder.fit(corpus) must be called before encode()")
        vecs = self.vectorizer.transform(texts).toarray()
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1  # avoid divide-by-zero for empty/all-stopword text
        return vecs / norms

    def save_state(self, path):
        with open(path, "wb") as f:
            pickle.dump(self.vectorizer, f)

    @classmethod
    def load_state(cls, path):
        instance = cls()
        with open(path, "rb") as f:
            instance.vectorizer = pickle.load(f)
        instance._fitted = True
        return instance


def get_embedder():
    backend = os.getenv("EMBEDDING_BACKEND", "tfidf")
    if backend == "sentence-transformers":
        return SentenceTransformerEmbedder()
    return TfidfEmbedder()


def load_embedder(path):
    backend = os.getenv("EMBEDDING_BACKEND", "tfidf")
    cls = SentenceTransformerEmbedder if backend == "sentence-transformers" else TfidfEmbedder
    return cls.load_state(path)
