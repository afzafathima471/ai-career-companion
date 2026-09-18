"""
M3.3 — Interview Preparation Agent.

Reuses M3.1's skill gap analysis as the grounding for revision topics
(deterministic, no LLM needed for that part) rather than re-deriving gaps
from scratch — one source of truth for "what's missing."

Question generation is the LLM piece, with a real post-check: the
milestone asks for 5 distinct categories (Technical, Resume-based,
Project-based, Role-specific, HR/general), so `validate_question_coverage`
verifies the model actually delivered all 5 rather than trusting the
prompt blindly — same spirit as M3.2's hallucination check.
"""
import json

from .llm import get_client, GROQ_MODEL

CATEGORIES = ["Technical", "Resume-based", "Project-based", "Role-specific", "HR/general"]


def identify_revision_topics(skill_gap: dict) -> list[dict]:
    """Deterministic -- built directly from M3.1's gap analysis, not
    regenerated. High priority = no evidence at all; medium = partial
    evidence via a related skill; also surfaces an experience-level
    mismatch if one exists."""
    topics = []
    for skill in skill_gap.get("critical_missing", []):
        topics.append({
            "topic": skill, "priority": "high",
            "reason": "Required skill with no evidence in your profile — expect this to come up directly.",
        })
    for gap in skill_gap.get("partially_demonstrated", []):
        topics.append({
            "topic": gap["missing_skill"], "priority": "medium",
            "reason": f"You have {gap['related_skill_held']} but not {gap['missing_skill']} specifically — "
                      f"a role-specific interviewer may probe this distinction.",
        })
    exp_gap = skill_gap.get("experience_gap", {})
    if exp_gap.get("has_gap"):
        topics.append({
            "topic": "Experience level expectations",
            "priority": "high" if exp_gap.get("severity") == "major" else "medium",
            "reason": exp_gap.get("note", ""),
        })
    return topics


def validate_question_coverage(questions: list[dict]) -> dict:
    present = {q.get("category") for q in questions if q.get("category")}
    missing = [c for c in CATEGORIES if c not in present]
    counts = {c: sum(1 for q in questions if q.get("category") == c) for c in CATEGORIES}
    return {"complete": len(missing) == 0, "present_categories": sorted(present),
            "missing_categories": missing, "counts_per_category": counts}


QUESTIONS_PROMPT = """You are preparing a student for an internship interview.

Student profile:
- Skills: {skills}
- Education: {education}
- Experience: {experience}
- Projects: {projects}

Target role: {title} at {company}
Required skills: {required_skills}
Job description: {description}

Known skill gaps (things the student should be ready to address honestly
if asked, not pretend to know): {revision_topics}

Generate exactly {per_category} interview questions for EACH of these five
categories: Technical, Resume-based, Project-based, Role-specific, HR/general.
- Technical: about the required skills for this specific role.
- Resume-based: reference the student's actual listed experience/education.
- Project-based: reference the student's actual listed projects by name.
- Role-specific: about this specific company/role, not generic.
- HR/general: standard behavioral/motivation questions.

For each question, include brief preparation guidance (what a strong
answer would cover, 1-2 sentences).

Return ONLY valid JSON:
{{
  "questions": [
    {{"category": "Technical", "question": "...", "prep_guidance": "..."}}
  ]
}}
"""


def generate_interview_questions(profile: dict, posting: dict, skill_gap: dict, questions_per_category: int = 2) -> dict:
    revision_topics = identify_revision_topics(skill_gap)
    client = get_client()

    prompt = QUESTIONS_PROMPT.format(
        skills=", ".join(s["name"] for s in profile.get("skills", [])) or "None listed",
        education=", ".join(f"{e['degree']} in {e['field']}" for e in profile.get("education", []) if e.get("degree")) or "None listed",
        experience="; ".join(f"{e['title']} at {e.get('organization', '')}" for e in profile.get("experience", [])) or "None listed",
        projects="; ".join(p["title"] for p in profile.get("projects", [])) or "None listed",
        title=posting["title"], company=posting["company"],
        required_skills=", ".join(posting.get("required_skills", [])) or "None specified",
        description=(posting.get("description") or "")[:800],
        revision_topics=", ".join(t["topic"] for t in revision_topics) or "none identified",
        per_category=questions_per_category,
    )

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": "You output only valid JSON, nothing else."},
                  {"role": "user", "content": prompt}],
        temperature=0.5, response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return {"questions": [], "revision_topics": revision_topics,
                "_coverage": {"complete": False, "missing_categories": CATEGORIES, "present_categories": [], "counts_per_category": {}},
                "_error": "Model returned an unexpected format."}

    questions = result.get("questions", [])
    return {
        "questions": questions,
        "revision_topics": revision_topics,
        "_coverage": validate_question_coverage(questions),
    }


EVALUATION_PROMPT = """You are a mock interviewer evaluating a student's answer.

Question asked: {question}
Student's answer: {answer}

Student's actual background (for checking if their answer is consistent
with reality, not for grading style alone):
- Skills: {skills}
- Experience: {experience}
- Projects: {projects}

Give honest, constructive feedback. Return ONLY valid JSON:
{{
  "rating": "strong" | "adequate" | "needs_work",
  "feedback": "2-3 sentences of specific, constructive feedback",
  "strengths": ["..."],
  "improvements": ["..."]
}}
"""


def evaluate_answer(question: str, answer: str, profile: dict) -> dict:
    client = get_client()
    prompt = EVALUATION_PROMPT.format(
        question=question, answer=answer,
        skills=", ".join(s["name"] for s in profile.get("skills", [])) or "None listed",
        experience="; ".join(e["title"] for e in profile.get("experience", [])) or "None listed",
        projects="; ".join(p["title"] for p in profile.get("projects", [])) or "None listed",
    )
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": "You output only valid JSON, nothing else."},
                  {"role": "user", "content": prompt}],
        temperature=0.3, response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"rating": "unknown", "feedback": "Evaluation unavailable — the model returned an unexpected format.",
                "strengths": [], "improvements": []}
