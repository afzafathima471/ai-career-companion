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


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "pdf" or "docx"
    parse_status = Column(String, nullable=False, default="pending")  # pending | success | failed
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    parsed_at = Column(DateTime, nullable=True)

    student = relationship("Student", back_populates="resumes")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=gen_uuid)
    student_id = Column(String, ForeignKey("students.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, default="technical")  # technical | soft | tool

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
    technologies = Column(String, nullable=True)  # comma-separated for simplicity

    student = relationship("Student", back_populates="projects")
