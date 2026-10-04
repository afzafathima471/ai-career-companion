"""
Tiny startup migration for the multi-chat feature.

`Base.metadata.create_all()` creates the new `conversations` table but does NOT
add a column to a table that already exists, so an existing career.db would be
missing `conversation_messages.conversation_id`. This adds it (idempotent), and
moves any old single-thread messages into one "Earlier chat" per student so
nothing a student already said is lost. Safe to run on every start.
"""
from sqlalchemy import inspect, text

from .database import SessionLocal
from . import models


def run_migrations(engine, session_factory=SessionLocal):
    insp = inspect(engine)
    if "conversation_messages" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("conversation_messages")}
        with engine.begin() as conn:
            if "conversation_id" not in cols:
                conn.execute(text("ALTER TABLE conversation_messages ADD COLUMN conversation_id VARCHAR"))
            conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_conversation_messages_conversation_id "
                "ON conversation_messages (conversation_id)"
            ))

    db = session_factory()
    try:
        orphans = db.query(models.ConversationMessage).filter(models.ConversationMessage.conversation_id.is_(None)).all()
        by_student = {}
        for m in orphans:
            by_student.setdefault(m.student_id, []).append(m)
        for student_id, msgs in by_student.items():
            msgs.sort(key=lambda m: m.created_at or 0)
            conv = models.Conversation(student_id=student_id, title="Earlier chat",
                                       created_at=msgs[0].created_at, updated_at=msgs[-1].created_at)
            db.add(conv)
            db.flush()
            for m in msgs:
                m.conversation_id = conv.id
        db.commit()
    finally:
        db.close()
