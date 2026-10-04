import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    target_role = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    resumes = relationship("Resume", back_populates="student", cascade="all, delete-orphan")
    skills = relationship("Skill", back_populates="student", cascade="all, delete-orphan")
    education = relationship("Education", back_populates="student", cascade="all, delete-orphan")
    experience = relationship("Experience", back_populates="student", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="student", cascade="all, delete-orphan")
    certifications = relationship("Certification", back_populates="student", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    parse_status = Column(String, nullable=False, default="pending")
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    parsed_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="resumes")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, default="technical")

    student = relationship("Student", back_populates="skills")


class Education(Base):
    __tablename__ = "education"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    institution = Column(String, nullable=False)
    degree = Column(String, nullable=True)
    field = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)

    student = relationship("Student", back_populates="education")


class Experience(Base):
    __tablename__ = "experience"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    description = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)

    student = relationship("Student", back_populates="experience")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    technologies = Column(String, nullable=True)

    student = relationship("Student", back_populates="projects")


class Certification(Base):
    """New for M3.1 — the Skill Gap Agent compares against certifications,
    but nothing extracted or stored these before now."""
    __tablename__ = "certifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    issuer = Column(String, nullable=True)

    student = relationship("Student", back_populates="certifications")


class Conversation(Base):
    """One named chat (like a ChatGPT/Claude chat). A student can have many;
    each keeps its own message history and its own 'job under discussion'."""
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    title = Column(String, nullable=False, default="New chat")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ConversationMessage(Base):
    """M3.4 -- persisted chat history per student, so the Career Assistant
    has real context retention across turns, not just within one request.
    Since M4.5 each message belongs to a Conversation (conversation_id)."""
    __tablename__ = "conversation_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True, index=True)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(String, nullable=False)
    intent = Column(String, nullable=True)
    referenced_job_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    description = Column(String, nullable=True)
    required_skills = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    job_id = Column(String, nullable=True)

    company = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    status = Column(String, nullable=False, default="Saved")
    application_date = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)
    interview_date = Column(DateTime, nullable=True)
    interview_status = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    resume_snapshot = Column(String, nullable=True)
    cover_letter_snapshot = Column(String, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    student = relationship("Student", back_populates="applications")
