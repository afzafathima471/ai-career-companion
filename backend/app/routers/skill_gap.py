from ..dataset import get_posting

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..skill_gap_agent import analyze_skill_gap

router = APIRouter(prefix="/students/{student_id}", tags=["skill-gap-agent"])




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
        "certifications": [{"name": c.name, "issuer": c.issuer} for c in student.certifications],
    }





@router.get("/skill-gap/{job_id}")
def get_skill_gap(
    student_id: str,
    job_id: int,
    with_recommendations: bool = Query(True),
    db: Session = Depends(get_db),
):
    profile = _profile_dict(student_id, db)
    posting = get_posting(job_id)
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found in the internship knowledge base")
    result = analyze_skill_gap(profile, posting, with_recommendations=with_recommendations)
    return {
        "job_id": job_id,
        "title": posting["title"],
        "company": posting["company"],
        **result,
    }
