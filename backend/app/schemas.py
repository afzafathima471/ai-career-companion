from .application_tracker import validate_status
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class StudentCreate(BaseModel):
    name: str
    email: EmailStr
    target_role: str | None = None


class StudentUpdate(BaseModel):
    name: str | None = None
    target_role: str | None = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: EmailStr
    target_role: str | None
    created_at: datetime
    updated_at: datetime


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    category: str


class EducationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    institution: str
    degree: str | None
    field: str | None
    start_date: str | None
    end_date: str | None


class ExperienceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    organization: str | None
    description: str | None
    start_date: str | None
    end_date: str | None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: str | None
    technologies: str | None


class CertificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    issuer: str | None


class StudentProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: EmailStr
    target_role: str | None
    skills: list[SkillOut]
    education: list[EducationOut]
    experience: list[ExperienceOut]
    projects: list[ProjectOut]
    certifications: list[CertificationOut]


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    student_id: str
    filename: str
    file_type: str
    parse_status: str
    uploaded_at: datetime
    parsed_at: datetime | None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    company: str
    location: str | None
    description: str | None
    required_skills: str


class JobCreate(BaseModel):
    title: str
    company: str
    location: str | None = None
    description: str | None = None
    required_skills: list[str]


class MatchOut(BaseModel):
    job: JobOut
    match_percent: int
    matched_skills: list[str]
    missing_skills: list[str]


class ApplicationCreate(BaseModel):
    job_id: str | None = None
    company: str
    title: str
    description: str | None = None
    status: str = "Saved"
    application_date: datetime | None = None
    deadline: datetime | None = None
    interview_date: datetime | None = None
    interview_status: str | None = None
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        return validate_status(v)


class ApplicationUpdate(BaseModel):
    status: str | None = None
    application_date: datetime | None = None
    deadline: datetime | None = None
    interview_date: datetime | None = None
    interview_status: str | None = None
    notes: str | None = None
    resume_snapshot: str | None = None
    cover_letter_snapshot: str | None = None

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v is None:
            return v
        return validate_status(v)


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    student_id: str
    job_id: str | None
    company: str
    title: str
    description: str | None
    status: str
    application_date: datetime | None
    deadline: datetime | None
    interview_date: datetime | None
    interview_status: str | None
    notes: str | None
    resume_snapshot: str | None
    cover_letter_snapshot: str | None
    created_at: datetime
    updated_at: datetime


class DashboardOut(BaseModel):
    total_applications: int
    active_applications: int
    upcoming_deadlines: int
    interviews_scheduled: int
    offers_received: int
    rejected_applications: int