"""
Run this once to populate the jobs table with sample listings, so the
matching agent has something to score against.

Usage (from the backend/ folder, with your venv active):
    python -m app.seed_jobs
"""
from .database import SessionLocal, Base, engine
from . import models

Base.metadata.create_all(bind=engine)

SAMPLE_JOBS = [
    {
        "title": "Frontend Intern",
        "company": "Nimbus Labs",
        "location": "Remote",
        "description": "Build UI components in React for a fast-moving product team.",
        "required_skills": "React, JavaScript, CSS, Git",
    },
    {
        "title": "AI/ML Intern",
        "company": "Vertex Systems",
        "location": "Bengaluru",
        "description": "Support model training and evaluation pipelines.",
        "required_skills": "Python, Machine Learning, TensorFlow, SQL",
    },
    {
        "title": "Full Stack Intern",
        "company": "Loopwork",
        "location": "Hybrid",
        "description": "Own small features end to end across a Node.js and React stack.",
        "required_skills": "React, Node.js, JavaScript, REST APIs",
    },
    {
        "title": "Backend Intern",
        "company": "Harborline",
        "location": "Bengaluru",
        "description": "Build and maintain FastAPI services and Postgres schemas.",
        "required_skills": "Python, FastAPI, PostgreSQL, SQL",
    },
    {
        "title": "Cloud Intern",
        "company": "Aartha Tessa",
        "location": "Hybrid",
        "description": "Support Docker-based deployments and AWS infrastructure.",
        "required_skills": "Docker, AWS, Linux, Python",
    },
]


def seed():
    db = SessionLocal()
    try:
        existing_titles = {j.title for j in db.query(models.Job).all()}
        added = 0
        for job in SAMPLE_JOBS:
            if job["title"] in existing_titles:
                continue
            db.add(models.Job(**job))
            added += 1
        db.commit()
        print(f"Added {added} job(s). {len(SAMPLE_JOBS) - added} already existed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
