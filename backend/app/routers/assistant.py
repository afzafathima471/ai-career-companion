import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from .. import models
from ..database import get_db
from ..career_assistant import route_intent, resolve_job_ids, gather_context, synthesize_response

router = APIRouter(prefix="/students/{student_id}/assistant", tags=["career-assistant"])

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


def _load_dataset() -> list[dict]:
    with open(DATASET_PATH) as f:
        return json.load(f)


@router.post("/chat")
def chat(student_id: str, db: Session = Depends(get_db), message: str = Body(..., embed=True)):
    profile = _profile_dict(student_id, db)

    history_rows = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.student_id == student_id)
        .order_by(models.ConversationMessage.created_at.desc())
        .limit(10)
        .all()
    )
    history_rows.reverse()
    history = [{"role": m.role, "content": m.content} for m in history_rows]

    known_job_ids = sorted({int(m.referenced_job_id) for m in history_rows if m.referenced_job_id})
    last_discussed = next((int(m.referenced_job_id) for m in reversed(history_rows) if m.referenced_job_id), None)

    routing = route_intent(message, history, known_job_ids)
    job_ids = resolve_job_ids(routing["referenced_job_ids"], last_discussed)

    dataset = _load_dataset()
    postings = [p for jid in job_ids for p in dataset if p["source_job_id"] == jid]

    grounding = gather_context(routing["intent"], postings, profile, message)
    reply = synthesize_response(message, history, grounding, profile)

    primary_job_id = str(job_ids[0]) if job_ids else None

    db.add(models.ConversationMessage(student_id=student_id, role="user", content=message))
    db.add(models.ConversationMessage(student_id=student_id, role="assistant", content=reply,
                                       intent=routing["intent"], referenced_job_id=primary_job_id))
    db.commit()

    return {"reply": reply, "intent": routing["intent"], "referenced_job_ids": job_ids}


@router.get("/history")
def get_history(student_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.student_id == student_id)
        .order_by(models.ConversationMessage.created_at.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content, "intent": m.intent,
              "referenced_job_id": m.referenced_job_id, "created_at": m.created_at} for m in rows]
