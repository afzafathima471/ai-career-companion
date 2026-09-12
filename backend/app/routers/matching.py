from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..matching_agent import match_student_to_internships

router = APIRouter(prefix="/students/{student_id}", tags=["matching-agent"])


def _profile_dict(student_id: str, db: Session) -> dict:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {
        "target_role": student.target_role,
        "skills": [{"name": s.name, "category": s.category} for s in student.skills],
        "education": [
            {"institution": e.institution, "degree": e.degree, "field": e.field}
            for e in student.education
        ],
        "experience": [{"title": e.title, "organization": e.organization} for e in student.experience],
        "projects": [{"title": p.title, "technologies": p.technologies} for p in student.projects],
    }


@router.get("/recommended-internships")
def get_recommended_internships(
    student_id: str,
    top_k: int = Query(5, ge=1, le=20),
    with_reasoning: bool = Query(True),
    db: Session = Depends(get_db),
):
    profile = _profile_dict(student_id, db)
    results = match_student_to_internships(profile, top_k_final=top_k, with_reasoning=with_reasoning)
    return [
        {
            "job_id": r["posting"]["source_job_id"],
            "title": r["posting"]["title"],
            "company": r["posting"]["company"],
            "location": r["posting"]["location"],
            "overall_score": r["overall_score"],
            "skill_score": r["skill_score"],
            "education_score": r["education_score"],
            "experience_score": r["experience_score"],
            "matched_required_skills": r["matched_required_skills"],
            "missing_required_skills": r["missing_required_skills"],
            "matched_preferred_skills": r["matched_preferred_skills"],
            "retrieval_score": r["retrieval_score"],
            "reasoning": r.get("reasoning"),
        }
        for r in results
    ]
