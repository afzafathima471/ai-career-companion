"""
M2.2 — semantic retrieval: given a natural-language query, return the most
relevant job postings (aggregated from their best-matching chunk).
"""
import json
from pathlib import Path
from functools import lru_cache

from .embeddings import load_embedder
from .vector_index import load_index, cosine_search, INDEX_DIR

DATASET_PATH = Path(__file__).resolve().parent.parent / "data_pipeline" / "internship_dataset.json"


@lru_cache(maxsize=1)
def _load_all():
    embeddings, chunks = load_index()
    embedder = load_embedder(INDEX_DIR / "embedder_state.pkl")
    with open(DATASET_PATH) as f:
        postings = json.load(f)
    postings_by_id = {p["source_job_id"]: p for p in postings}
    return embeddings, chunks, embedder, postings_by_id


def semantic_search(query: str, top_k: int = 5) -> list[dict]:
    embeddings, chunks, embedder, postings_by_id = _load_all()

    query_vec = embedder.encode([query])[0]
    # search generously over chunks, then collapse to distinct jobs
    hits = cosine_search(query_vec, embeddings, top_k=top_k * 4)

    best_per_job = {}
    for chunk_idx, score in hits:
        chunk = chunks[chunk_idx]
        job_id = chunk["job_id"]
        if job_id not in best_per_job or score > best_per_job[job_id]["score"]:
            best_per_job[job_id] = {"score": score, "matched_chunk_type": chunk["chunk_type"]}

    ranked = sorted(best_per_job.items(), key=lambda kv: kv[1]["score"], reverse=True)[:top_k]

    results = []
    for job_id, info in ranked:
        posting = postings_by_id.get(job_id)
        if not posting:
            continue
        results.append({
            "job": posting,
            "score": round(info["score"], 4),
            "matched_chunk_type": info["matched_chunk_type"],
        })
    return results
