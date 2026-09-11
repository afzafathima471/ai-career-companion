from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..matching import score_match

router = APIRouter(tags=["jobs"])


@router.post("/jobs", response_model=schemas.JobOut, status_code=201)
def create_job(payload: schemas.JobCreate, db: Session = Depends(get_db)):
    job = models.Job(
        title=payload.title,
        company=payload.company,
        location=payload.location,
        description=payload.description,
        required_skills=", ".join(payload.required_skills),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs", response_model=list[schemas.JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).order_by(models.Job.created_at.desc()).all()


@router.get("/students/{student_id}/matches", response_model=list[schemas.MatchOut])
def get_matches(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    jobs = db.query(models.Job).all()
    student_skill_names = [s.name for s in student.skills]

    results = []
    for job in jobs:
        required = [s.strip() for s in job.required_skills.split(",") if s.strip()]
        scored = score_match(student_skill_names, required)
        results.append({"job": job, **scored})

    results.sort(key=lambda r: r["match_percent"], reverse=True)
    return results
