import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..text_extraction import extract_text
from ..llm import extract_resume_data

router = APIRouter(prefix="/students/{student_id}/resumes", tags=["resumes"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("", response_model=schemas.ResumeOut, status_code=201)
async def upload_resume(student_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    file_type = ALLOWED_TYPES.get(file.content_type)
    if not file_type:
        raise HTTPException(status_code=415, detail="Only PDF and DOCX files are supported")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File exceeds the 5MB limit")

    stored_name = f"{uuid.uuid4()}.{file_type}"
    dest_path = UPLOAD_DIR / stored_name
    with open(dest_path, "wb") as f:
        f.write(contents)

    resume = models.Resume(
        student_id=student_id,
        filename=file.filename,
        file_path=str(dest_path),
        file_type=file_type,
        parse_status="pending",
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("", response_model=list[schemas.ResumeOut])
def list_resumes(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return (
        db.query(models.Resume)
        .filter(models.Resume.student_id == student_id)
        .order_by(models.Resume.uploaded_at.desc())
        .all()
    )


@router.post("/{resume_id}/parse", response_model=schemas.ResumeOut)
def parse_resume(student_id: str, resume_id: str, db: Session = Depends(get_db)):
    resume = (
        db.query(models.Resume)
        .filter(models.Resume.id == resume_id, models.Resume.student_id == student_id)
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    try:
        text = extract_text(resume.file_path, resume.file_type)
        if not text:
            raise ValueError("No extractable text found in this file — is it a scanned image?")

        extracted = extract_resume_data(text)

        # Replace this student's previously extracted data with the fresh parse.
        db.query(models.Skill).filter(models.Skill.student_id == student_id).delete()
        db.query(models.Education).filter(models.Education.student_id == student_id).delete()
        db.query(models.Experience).filter(models.Experience.student_id == student_id).delete()
        db.query(models.Project).filter(models.Project.student_id == student_id).delete()

        for s in extracted["skills"]:
            db.add(models.Skill(student_id=student_id, name=s["name"], category=s.get("category", "technical")))

        for e in extracted["education"]:
            db.add(models.Education(
                student_id=student_id,
                institution=e["institution"],
                degree=e.get("degree"),
                field=e.get("field"),
                start_date=e.get("start_date"),
                end_date=e.get("end_date"),
            ))

        for ex in extracted["experience"]:
            db.add(models.Experience(
                student_id=student_id,
                title=ex["title"],
                organization=ex.get("organization"),
                description=ex.get("description"),
                start_date=ex.get("start_date"),
                end_date=ex.get("end_date"),
            ))

        for p in extracted["projects"]:
            techs = p.get("technologies") or []
            db.add(models.Project(
                student_id=student_id,
                title=p["title"],
                description=p.get("description"),
                technologies=", ".join(techs) if isinstance(techs, list) else techs,
            ))

        resume.parse_status = "success"
        resume.parsed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(resume)
        return resume

    except Exception as e:
        resume.parse_status = "failed"
        db.commit()
        raise HTTPException(status_code=502, detail=f"Parsing failed: {e}")
