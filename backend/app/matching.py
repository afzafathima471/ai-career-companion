"""
Job-Resume Matching Agent.

Scores a candidate's extracted skills against a job's required skills.
Deterministic keyword-overlap scoring for now — no LLM call needed, so
it's fast and free to run on every job for every student. This can be
upgraded to embedding-based similarity (per the RAG architecture in the
design doc) once there's a large enough job corpus that exact-keyword
matching starts missing near-synonyms (e.g. "JS" vs "JavaScript").
"""


def _normalize(skill: str) -> str:
    return skill.strip().lower()


def score_match(student_skills: list[str], job_required_skills: list[str]) -> dict:
    student_set = {_normalize(s) for s in student_skills}
    required_set = {_normalize(s) for s in job_required_skills}

    if not required_set:
        return {"match_percent": 0, "matched_skills": [], "missing_skills": []}

    matched = required_set & student_set
    missing = required_set - student_set

    match_percent = round((len(matched) / len(required_set)) * 100)

    return {
        "match_percent": match_percent,
        "matched_skills": sorted(matched),
        "missing_skills": sorted(missing),
    }
