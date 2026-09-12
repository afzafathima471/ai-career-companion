"""
A minimal local vector index — embeddings stored as a .npy matrix,
chunk metadata as JSON, no external vector database required. This is
the pragmatic local equivalent of the pgvector index in the architecture
doc; swapping to Postgres + pgvector later means changing where these
arrays are read from/written to, not how search works (it's still cosine
similarity — pgvector just does it in SQL instead of numpy).

Fine for this dataset's scale (a few hundred chunks) — brute-force cosine
similarity over ~400 vectors is sub-millisecond. Would want an ANN index
(FAISS, or pgvector's own indexing) once the corpus is large enough that
brute force stops being instant.
"""
import json
from pathlib import Path

import numpy as np

INDEX_DIR = Path(__file__).resolve().parent / "index_data"


def save_index(embeddings: np.ndarray, chunks: list[dict], embedder):
    INDEX_DIR.mkdir(exist_ok=True)
    np.save(INDEX_DIR / "embeddings.npy", embeddings)
    with open(INDEX_DIR / "chunks.json", "w") as f:
        json.dump(chunks, f)
    embedder.save_state(INDEX_DIR / "embedder_state.pkl")


def load_index():
    embeddings = np.load(INDEX_DIR / "embeddings.npy")
    with open(INDEX_DIR / "chunks.json") as f:
        chunks = json.load(f)
    return embeddings, chunks


def index_exists() -> bool:
    return (INDEX_DIR / "embeddings.npy").exists()


def cosine_search(query_vec: np.ndarray, embeddings: np.ndarray, top_k: int = 10):
    """Both query_vec and embeddings rows are assumed unit-normalized,
    so cosine similarity is just the dot product."""
    scores = embeddings @ query_vec.reshape(-1)
    top_idx = np.argsort(-scores)[:top_k]
    return [(int(i), float(scores[i])) for i in top_idx]
