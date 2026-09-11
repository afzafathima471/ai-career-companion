from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


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


class ResumeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    student_id: str
    filename: str
    file_type: str
    parse_status: str
    uploaded_at: datetime
    parsed_at: datetime | None


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
