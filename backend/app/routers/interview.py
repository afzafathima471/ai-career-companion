from ..dataset import get_posting

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..skill_gap_agent import analyze_skill_gap
from ..interview_agent import generate_interview_questions, evaluate_answer

router = APIRouter(prefix="/students/{student_id}", tags=["interview-agent"])



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





@router.get("/interview-prep/{job_id}")
def get_interview_prep(
    student_id: str,
    job_id: int,
    questions_per_category: int = Query(2, ge=1, le=5),
    db: Session = Depends(get_db),
):
    profile = _profile_dict(student_id, db)
    posting = get_posting(job_id)
    if not posting:
        raise HTTPException(status_code=404, detail="Job posting not found in the internship knowledge base")
    skill_gap = analyze_skill_gap(profile, posting, with_recommendations=False)
    result = generate_interview_questions(profile, posting, skill_gap, questions_per_category=questions_per_category)
    return {"job_id": job_id, "title": posting["title"], "company": posting["company"], **result}


@router.post("/interview-prep/evaluate")
def evaluate_interview_answer(
    student_id: str,
    db: Session = Depends(get_db),
    question: str = Body(...),
    answer: str = Body(...),
):
    profile = _profile_dict(student_id, db)
    return evaluate_answer(question, answer, profile)
