from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .database import Base, engine
from .routers import students, resumes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Career Companion API")

# Allow the local Vite dev server to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(students.router)
app.include_router(resumes.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "ai-career-companion-api"}
