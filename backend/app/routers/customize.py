import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..customization_agent import generate_tailored_resume, generate_cover_letter

router = APIRouter(prefix="/students/{student_id}/customize", tags=["customization-agent"])

DATASET_PATH = Path(__file__).resolve().parent.parent / "data_pipeline" / "internship_dataset.json"


def _profile_dict(student_id: str, db: Session) -> dict:
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {
        "target_role": student.target_role,
        "skills": [{"name": s.name, "category": s.category} for s in student.skills],
        "education": [{"institution": e.institution, "degree": e.degree, "field": e.field} for e in student.education],
        "experience": [{"title": e.title, "organization": e.organization, "description": e.description} for e in student.experience],
        "projects": [{"title": p.title, "technologies": p.technologies, "description": p.description} for p in student.projects],
        "certifications": [{"name": c.name, "issuer": c.issuer} for c in student.certifications],
    }


def _get_posting(job_id: int) -> dict:
    with open(DATASET_PATH) as f:
        postings = json.load(f)
    posting = next((p for p in postings if p["source_job_id"] == job_id), None)
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found in the internship knowledge base")
    return posting


@router.post("/resume/{job_id}")
def customize_resume(student_id: str, job_id: int, db: Session = Depends(get_db), feedback: str | None = Body(None, embed=True)):
    profile = _profile_dict(student_id, db)
    posting = _get_posting(job_id)
    result = generate_tailored_resume(profile, posting, feedback=feedback)
    return {"job_id": job_id, "title": posting["title"], "company": posting["company"], **result}


@router.post("/cover-letter/{job_id}")
def customize_cover_letter(student_id: str, job_id: int, db: Session = Depends(get_db), feedback: str | None = Body(None, embed=True)):
    profile = _profile_dict(student_id, db)
    posting = _get_posting(job_id)
    result = generate_cover_letter(profile, posting, feedback=feedback)
    return {"job_id": job_id, "title": posting["title"], "company": posting["company"], **result}
