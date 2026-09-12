"""
M2.2 — builds the vector index from the M2.1 internship dataset.

Usage (from backend/, venv active):
    python -m app.rag.build_index
"""
import json
from pathlib import Path

from .chunking import chunk_all
from .embeddings import get_embedder
from .vector_index import save_index

DATASET_PATH = Path(__file__).resolve().parent.parent / "data_pipeline" / "internship_dataset.json"


def build():
    with open(DATASET_PATH) as f:
        postings = json.load(f)

    chunks = chunk_all(postings)
    texts = [c["text"] for c in chunks]

    embedder = get_embedder()
    embedder.fit(texts)  # no-op for sentence-transformers, fits vocabulary for tfidf
    embeddings = embedder.encode(texts)

    save_index(embeddings, chunks, embedder)

    print(f"Postings: {len(postings)}")
    print(f"Chunks: {len(chunks)}")
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Index saved to: {Path(__file__).resolve().parent / 'index_data'}")


if __name__ == "__main__":
    build()
