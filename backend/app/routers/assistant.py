import json
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..dataset import load_dataset
from ..database import get_db
from ..career_assistant import route_intent, resolve_job_ids, gather_context, synthesize_response

router = APIRouter(prefix="/students/{student_id}/assistant", tags=["career-assistant"])

DATASET_PATH = Path(__file__).resolve().parent.parent / "data_pipeline" / "internship_dataset.json"
DEFAULT_TITLE = "New chat"


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





def _iso(dt):
    """Timestamps are stored as naive UTC; send them with a 'Z' so the browser converts to local time."""
    if dt is None:
        return None
    return dt.isoformat() + ("" if dt.tzinfo else "Z")


def _title_from(message: str) -> str:
    t = re.sub(r"\s+", " ", message).strip()
    return t if len(t) <= 48 else t[:47].rstrip() + "…"


def _get_conversation(student_id: str, conversation_id: str, db: Session) -> models.Conversation:
    conv = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id, models.Conversation.student_id == student_id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


def _conv_out(conv: models.Conversation, message_count: int = 0) -> dict:
    return {"id": conv.id, "title": conv.title, "created_at": _iso(conv.created_at),
            "updated_at": _iso(conv.updated_at), "message_count": message_count}


# ---------- conversations (the chat list) ----------

@router.get("/conversations")
def list_conversations(student_id: str, db: Session = Depends(get_db)):
    _profile_dict(student_id, db)  # 404 if the student doesn't exist
    counts = dict(
        db.query(models.ConversationMessage.conversation_id, func.count(models.ConversationMessage.id))
        .filter(models.ConversationMessage.student_id == student_id)
        .group_by(models.ConversationMessage.conversation_id).all()
    )
    convs = (db.query(models.Conversation).filter(models.Conversation.student_id == student_id)
             .order_by(models.Conversation.updated_at.desc()).all())
    return [_conv_out(c, counts.get(c.id, 0)) for c in convs]


@router.post("/conversations", status_code=201)
def create_conversation(student_id: str, db: Session = Depends(get_db), title: str | None = Body(None, embed=True)):
    _profile_dict(student_id, db)
    conv = models.Conversation(student_id=student_id, title=(title or "").strip()[:100] or DEFAULT_TITLE)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return _conv_out(conv)


@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(student_id: str, conversation_id: str, db: Session = Depends(get_db)):
    conv = _get_conversation(student_id, conversation_id, db)
    rows = (db.query(models.ConversationMessage)
            .filter(models.ConversationMessage.conversation_id == conv.id)
            .order_by(models.ConversationMessage.created_at.asc()).all())
    return [{"role": m.role, "content": m.content, "intent": m.intent,
             "referenced_job_id": m.referenced_job_id, "created_at": _iso(m.created_at)} for m in rows]


@router.patch("/conversations/{conversation_id}")
def rename_conversation(student_id: str, conversation_id: str, db: Session = Depends(get_db),
                        title: str = Body(..., embed=True)):
    conv = _get_conversation(student_id, conversation_id, db)
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    conv.title = title[:100]
    db.commit()
    db.refresh(conv)
    return _conv_out(conv)


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(student_id: str, conversation_id: str, db: Session = Depends(get_db)):
    conv = _get_conversation(student_id, conversation_id, db)
    db.query(models.ConversationMessage).filter(models.ConversationMessage.conversation_id == conv.id).delete()
    db.delete(conv)
    db.commit()


# ---------- chat ----------

@router.post("/chat")
def chat(student_id: str, db: Session = Depends(get_db), message: str = Body(..., embed=True),
         conversation_id: str | None = Body(None, embed=True)):
    profile = _profile_dict(student_id, db)

    # No conversation_id -> start a new chat (named after the first message), like ChatGPT/Claude.
    if conversation_id:
        conv = _get_conversation(student_id, conversation_id, db)
    else:
        conv = models.Conversation(student_id=student_id, title=_title_from(message))
        db.add(conv)
        db.flush()

    # Context is per conversation: history and the 'job under discussion' come from THIS chat only.
    history_rows = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.conversation_id == conv.id)
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

    dataset = load_dataset()
    postings = [p for jid in job_ids for p in dataset if p["source_job_id"] == jid]

    grounding = gather_context(routing["intent"], postings, profile, message)
    reply = synthesize_response(message, history, grounding, profile)

    primary_job_id = str(job_ids[0]) if job_ids else None

    # A chat that was created empty (POST /conversations) is named after its first message.
    if conv.title == DEFAULT_TITLE and not history_rows:
        conv.title = _title_from(message)

    db.add(models.ConversationMessage(student_id=student_id, conversation_id=conv.id, role="user", content=message))
    db.add(models.ConversationMessage(student_id=student_id, conversation_id=conv.id, role="assistant", content=reply,
                                       intent=routing["intent"], referenced_job_id=primary_job_id))
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"reply": reply, "intent": routing["intent"], "referenced_job_ids": job_ids,
            "conversation_id": conv.id, "title": conv.title, "updated_at": _iso(conv.updated_at)}


@router.get("/history")
def get_history(student_id: str, db: Session = Depends(get_db)):
    """Legacy: every message for the student across all chats, oldest first."""
    rows = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.student_id == student_id)
        .order_by(models.ConversationMessage.created_at.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content, "intent": m.intent,
              "referenced_job_id": m.referenced_job_id, "conversation_id": m.conversation_id,
              "created_at": _iso(m.created_at)} for m in rows]
