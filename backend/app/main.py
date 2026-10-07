from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .database import Base, engine
from .routers import students, resumes, jobs, internships, matching, skill_gap, customize, interview, assistant, applications

Base.metadata.create_all(bind=engine)

from .migrations import run_migrations
run_migrations(engine)

app = FastAPI(title="AI Career Companion API")

import os
ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"] + \
          [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(resumes.router)
app.include_router(jobs.router)
app.include_router(internships.router)
app.include_router(matching.router)
app.include_router(skill_gap.router)
app.include_router(customize.router)
app.include_router(interview.router)
app.include_router(assistant.router)
app.include_router(applications.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ai-career-companion-api"}
