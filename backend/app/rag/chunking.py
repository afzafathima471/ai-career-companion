"""
M2.2 — splits each job posting into meaningful chunks.

Deliberately field-based rather than arbitrary character-count splitting:
an "overview" chunk (title, company, description — what the role IS) and
a "requirements" chunk (skills, experience, education — what it NEEDS).
This keeps each chunk semantically coherent, so a query like "what skills
does this role need" and a query like "what does this company do" retrieve
different, relevant chunks instead of both hitting one undifferentiated blob.
"""

MAX_CHUNK_CHARS = 1500  # guards against the rare outlier posting with a huge description


def chunk_posting(posting: dict) -> list[dict]:
    chunks = []

    overview = f"{posting['title']} at {posting['company']}. {posting['description']}"
    chunks.append({
        "job_id": posting["source_job_id"],
        "chunk_type": "overview",
        "text": overview[:MAX_CHUNK_CHARS],
    })

    req_parts = []
    if posting.get("requirements_raw"):
        req_parts.append(posting["requirements_raw"])
    if posting.get("required_skills"):
        req_parts.append("Required skills: " + ", ".join(posting["required_skills"]))
    if posting.get("preferred_skills"):
        req_parts.append("Preferred skills: " + ", ".join(posting["preferred_skills"]))
    if posting.get("experience_requirement"):
        req_parts.append("Experience level: " + posting["experience_requirement"])
    if posting.get("education_requirement"):
        req_parts.append("Education: " + posting["education_requirement"])

    if req_parts:
        chunks.append({
            "job_id": posting["source_job_id"],
            "chunk_type": "requirements",
            "text": " ".join(req_parts)[:MAX_CHUNK_CHARS],
        })

    return chunks


def chunk_all(postings: list[dict]) -> list[dict]:
    all_chunks = []
    for posting in postings:
        all_chunks.extend(chunk_posting(posting))
    return all_chunks
