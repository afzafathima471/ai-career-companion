from fastapi import APIRouter, Query

from ..rag.search import semantic_search

router = APIRouter(prefix="/internships", tags=["internships"])


@router.get("/search")
def search_internships(q: str = Query(..., min_length=1), top_k: int = 5):
    results = semantic_search(q, top_k=top_k)
    return [
        {
            "job_id": r["job"]["source_job_id"],
            "title": r["job"]["title"],
            "company": r["job"]["company"],
            "location": r["job"]["location"],
            "required_skills": r["job"]["required_skills"],
            "preferred_skills": r["job"]["preferred_skills"],
            "score": r["score"],
            "matched_chunk_type": r["matched_chunk_type"],
        }
        for r in results
    ]
