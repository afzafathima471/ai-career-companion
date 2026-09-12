"""
M2.3 — Job-Resume Matching Agent.

Two-stage design:
1. RETRIEVE — semantic search (M2.2) over the internship knowledge base
   using a query built from the student's profile, narrowing ~200
   postings down to a relevant candidate set (broad recall).
2. SCORE + EXPLAIN — structured comparison of the student's skills,
   education, and experience against each candidate's requirements,
   producing a numeric score, then an LLM-generated explanation for the
   top matches.

Scoring is intentionally NOT just retrieval similarity — the milestone
asks for a real comparison against required/preferred skills, experience
requirements, and education requirements, so that's computed explicitly
and can be explained to a student, not just "the text looked similar."
"""
import json

from .rag.search import semantic_search
from .llm import get_client, GROQ_MODEL

# Coarse ordering for degree comparison — real EMSCAD values on the left.
EDUCATION_LEVELS = {
    "unspecified": 0,
    "some high school coursework": 1,
    "high school or equivalent": 1,
    "vocational": 1,
    "certification": 2,
    "some college coursework completed": 2,
    "associate degree": 3,
    "bachelor's degree": 4,
    "master's degree": 5,
    "doctorate": 6,
    "professional": 5,
}


def build_student_query(profile: dict) -> str:
    parts = []
    if profile.get("target_role"):
        parts.append(profile["target_role"])
    parts += [s["name"] for s in profile.get("skills", [])]
    parts += [e["title"] for e in profile.get("experience", [])]
    parts += [p["title"] for p in profile.get("projects", [])]
    return " ".join(parts) or "internship"


def score_skills(student_skills: list[str], required: list[str], preferred: list[str]) -> dict:
    student_set = {s.lower() for s in student_skills}
    req_set = {s.lower() for s in required}
    pref_set = {s.lower() for s in preferred}

    if not req_set and not pref_set:
        return {"score": 50, "matched_required": [], "missing_required": [], "matched_preferred": []}

    req_matched = req_set & student_set
    req_missing = req_set - student_set
    pref_matched = pref_set & student_set

    req_score = (len(req_matched) / len(req_set)) if req_set else 1.0
    pref_score = (len(pref_matched) / len(pref_set)) if pref_set else 0.0
    combined = req_score * 0.8 + pref_score * 0.2

    return {
        "score": round(combined * 100),
        "matched_required": sorted(req_matched),
        "missing_required": sorted(req_missing),
        "matched_preferred": sorted(pref_matched),
    }


def score_education(student_education: list[dict], required_education_text: str | None) -> int:
    if not required_education_text or required_education_text.lower() in ("unspecified", "not applicable", ""):
        return 100  # no explicit requirement stated -> automatically satisfied

    required_level = EDUCATION_LEVELS.get(required_education_text.lower(), 0)
    if required_level <= 1:
        return 100  # high-school level or below -- essentially all students qualify

    student_levels = []
    for ed in student_education:
        degree = (ed.get("degree") or "").lower()
        for level_name, level_num in EDUCATION_LEVELS.items():
            # crude keyword match: "bachelor" found in "bachelor of science" etc.
            if level_name.split()[0] in degree:
                student_levels.append(level_num)

    if not student_levels:
        return 40  # in-progress student, no completed degree on record -- partial credit, not zero
    return 100 if max(student_levels) >= required_level else 60


def score_experience(required_experience_text: str | None) -> int:
    if not required_experience_text:
        return 100
    text = required_experience_text.lower()
    if any(term in text for term in ["internship", "not applicable", "entry level"]):
        return 100
    if "associate" in text:
        return 70
    if any(term in text for term in ["mid-senior", "director", "executive"]):
        return 20  # a real mismatch, worth surfacing rather than hiding
    return 80


def score_candidate(profile: dict, posting: dict) -> dict:
    student_skill_names = [s["name"] for s in profile.get("skills", [])]
    skills = score_skills(student_skill_names, posting["required_skills"], posting["preferred_skills"])
    education_score = score_education(profile.get("education", []), posting.get("education_requirement"))
    experience_score = score_experience(posting.get("experience_requirement"))

    overall = round(skills["score"] * 0.6 + education_score * 0.2 + experience_score * 0.2)

    return {
        "overall_score": overall,
        "skill_score": skills["score"],
        "education_score": education_score,
        "experience_score": experience_score,
        "matched_required_skills": skills["matched_required"],
        "missing_required_skills": skills["missing_required"],
        "matched_preferred_skills": skills["matched_preferred"],
    }


REASONING_PROMPT = """You are a career advisor explaining why a student is or isn't a good fit for an internship.

Student profile:
- Target role: {target_role}
- Skills: {skills}
- Education: {education}
- Experience: {experience}
- Projects: {projects}

Internship:
- Title: {title} at {company}
- Required skills: {required_skills}
- Preferred skills: {preferred_skills}
- Experience requirement: {experience_requirement}
- Education requirement: {education_requirement}

Already-computed match breakdown (explain it, don't recompute it):
- Overall score: {overall_score}/100
- Matched required skills: {matched_required}
- Missing required skills: {missing_required}

Write a 2-3 sentence explanation of why this is or isn't a good match,
referencing specific skills/experience by name. Be honest about gaps, not
just positives. Return ONLY valid JSON: {{"reasoning": "..."}}
"""


def generate_reasoning(profile: dict, posting: dict, score: dict) -> str:
    client = get_client()
    prompt = REASONING_PROMPT.format(
        target_role=profile.get("target_role") or "Not specified",
        skills=", ".join(s["name"] for s in profile.get("skills", [])) or "None listed",
        education=", ".join(
            f"{e['degree']} in {e['field']}" for e in profile.get("education", []) if e.get("degree")
        ) or "None listed",
        experience=", ".join(e["title"] for e in profile.get("experience", [])) or "None listed",
        projects=", ".join(p["title"] for p in profile.get("projects", [])) or "None listed",
        title=posting["title"],
        company=posting["company"],
        required_skills=", ".join(posting["required_skills"]) or "None specified",
        preferred_skills=", ".join(posting["preferred_skills"]) or "None specified",
        experience_requirement=posting.get("experience_requirement") or "Not specified",
        education_requirement=posting.get("education_requirement") or "Not specified",
        overall_score=score["overall_score"],
        matched_required=", ".join(score["matched_required_skills"]) or "none",
        missing_required=", ".join(score["missing_required_skills"]) or "none",
    )
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You output only valid JSON, nothing else."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    try:
        return json.loads(raw)["reasoning"]
    except (json.JSONDecodeError, KeyError, TypeError):
        return "Reasoning unavailable — the model returned an unexpected format."


def match_student_to_internships(
    profile: dict,
    top_k_retrieve: int = 15,
    top_k_final: int = 5,
    with_reasoning: bool = True,
) -> list[dict]:
    query = build_student_query(profile)
    candidates = semantic_search(query, top_k=top_k_retrieve)

    scored = []
    for c in candidates:
        posting = c["job"]
        score = score_candidate(profile, posting)
        scored.append({"posting": posting, "retrieval_score": c["score"], **score})

    scored.sort(key=lambda x: x["overall_score"], reverse=True)
    top = scored[:top_k_final]

    if with_reasoning:
        for item in top:
            item["reasoning"] = generate_reasoning(profile, item["posting"], item)

    return top
