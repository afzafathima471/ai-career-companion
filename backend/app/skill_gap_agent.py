"""
M3.1 — Skill Gap Analysis Agent.

Given a student's profile and a specific selected job posting, classifies
gaps into the categories the milestone asks for:
- critical_missing: required skills the student has no evidence of, and
  no related skill either
- partially_demonstrated: required skills the student doesn't have exactly,
  but has a related/adjacent skill for (e.g. has JavaScript, job wants
  TypeScript) — worth calling out differently from a total blank
- preferred_gaps: preferred (not required) skills the student is missing
- experience_gap / education_gap: structured, not just pass/fail

Deterministic classification (fully testable, no LLM needed) + an LLM call
for the personalized recommendations and "why this matters" explanations,
same split as the Resume and Matching agents.
"""
import json

from .llm import get_client, GROQ_MODEL

# Deliberately small and conservative — a false "related skill" claim is
# worse than not claiming one. Each entry: skill -> skills that partially
# cover it. Not exhaustive; documented as a known limitation.
SKILL_FAMILIES = {
    "typescript": ["javascript"],
    "javascript": ["typescript"],
    "vue.js": ["react", "angular"],
    "angular": ["react", "vue.js"],
    "react": ["vue.js", "angular"],
    "illustrator": ["photoshop", "indesign"],
    "indesign": ["photoshop", "illustrator"],
    "photoshop": ["illustrator", "indesign"],
    "django": ["flask", "fastapi"],
    "flask": ["django", "fastapi"],
    "fastapi": ["django", "flask"],
    "power bi": ["tableau", "excel"],
    "tableau": ["power bi", "excel"],
    "google analytics": ["data analysis"],
    "sem": ["seo"],
    "seo": ["sem"],
}


def classify_skill_gaps(student_skills: list[str], required: list[str], preferred: list[str]) -> dict:
    student_set = {s.lower() for s in student_skills}

    critical_missing = []
    partially_demonstrated = []
    matched_required = []

    for skill in required:
        skill_l = skill.lower()
        if skill_l in student_set:
            matched_required.append(skill)
            continue
        related = [s for s in SKILL_FAMILIES.get(skill_l, []) if s in student_set]
        if related:
            partially_demonstrated.append({"missing_skill": skill, "related_skill_held": related[0]})
        else:
            critical_missing.append(skill)

    preferred_gaps = [s for s in preferred if s.lower() not in student_set]
    matched_preferred = [s for s in preferred if s.lower() in student_set]

    return {
        "matched_required": matched_required,
        "critical_missing": critical_missing,
        "partially_demonstrated": partially_demonstrated,
        "matched_preferred": matched_preferred,
        "preferred_gaps": preferred_gaps,
    }


def assess_experience_gap(required_experience_text: str | None) -> dict:
    if not required_experience_text:
        return {"has_gap": False, "note": "No specific experience level stated for this role."}
    text = required_experience_text.lower()
    if any(t in text for t in ["internship", "not applicable", "entry level"]):
        return {"has_gap": False, "note": f"Role is aimed at entry-level candidates ({required_experience_text}) — no experience gap expected."}
    if "associate" in text:
        return {"has_gap": True, "severity": "moderate", "note": "Role expects some prior relevant experience (Associate level) beyond a typical first internship."}
    if any(t in text for t in ["mid-senior", "director", "executive"]):
        return {"has_gap": True, "severity": "major", "note": f"This role is targeted at {required_experience_text} candidates — a significant experience gap for a student applicant."}
    return {"has_gap": True, "severity": "minor", "note": f"Stated experience requirement: {required_experience_text}."}


EDUCATION_LEVELS = {
    "unspecified": 0, "high school or equivalent": 1, "vocational": 1,
    "certification": 2, "some college coursework completed": 2,
    "associate degree": 3, "bachelor's degree": 4, "master's degree": 5,
    "doctorate": 6, "professional": 5,
}


def assess_education_gap(student_education: list[dict], required_education_text: str | None) -> dict:
    if not required_education_text or required_education_text.lower() in ("unspecified", "not applicable", ""):
        return {"has_gap": False, "note": "No specific education requirement stated for this role."}

    required_level = EDUCATION_LEVELS.get(required_education_text.lower(), 0)
    if required_level <= 1:
        return {"has_gap": False, "note": f"Requirement ({required_education_text}) is at or below high-school level — not a gap."}

    student_levels = []
    for ed in student_education:
        degree = (ed.get("degree") or "").lower()
        for level_name, level_num in EDUCATION_LEVELS.items():
            if level_name.split()[0] in degree:
                student_levels.append(level_num)

    if not student_levels:
        return {"has_gap": True, "severity": "in_progress", "note": f"No completed degree on record yet against a stated requirement of {required_education_text} — likely a current student, not a true gap."}
    if max(student_levels) >= required_level:
        return {"has_gap": False, "note": f"Education on record meets or exceeds the stated requirement ({required_education_text})."}
    return {"has_gap": True, "severity": "moderate", "note": f"Highest recorded education is below the stated requirement of {required_education_text}."}


REASONING_PROMPT = """You are a career advisor helping a student understand their skill gaps for a specific internship.

Student profile:
- Skills: {skills}
- Certifications: {certifications}
- Education: {education}
- Experience: {experience}
- Projects: {projects}

Internship: {title} at {company}
Required skills: {required_skills}
Preferred skills: {preferred_skills}

Gap analysis (already computed — explain it, don't recompute):
- Critical missing skills: {critical_missing}
- Partially demonstrated (student has a related skill): {partially_demonstrated}
- Preferred skill gaps: {preferred_gaps}
- Experience gap: {experience_gap}
- Education gap: {education_gap}

For EACH critical missing skill and each partially-demonstrated gap, write:
1. A one-sentence explanation of why that skill matters for this specific role.
2. A concrete, personalized recommendation for closing the gap (a type of
   project, course focus, or practice — not a specific paid product name).

Return ONLY valid JSON in this shape:
{{
  "skill_recommendations": [
    {{"skill": "...", "why_it_matters": "...", "recommendation": "..."}}
  ],
  "overall_summary": "2-3 sentence honest summary of how close a fit this student is right now."
}}
"""


def generate_gap_recommendations(profile: dict, posting: dict, gaps: dict) -> dict:
    client = get_client()
    gap_skills = gaps["critical_missing"] + [g["missing_skill"] for g in gaps["partially_demonstrated"]]

    prompt = REASONING_PROMPT.format(
        skills=", ".join(s["name"] for s in profile.get("skills", [])) or "None listed",
        certifications=", ".join(c["name"] for c in profile.get("certifications", [])) or "None listed",
        education=", ".join(f"{e['degree']} in {e['field']}" for e in profile.get("education", []) if e.get("degree")) or "None listed",
        experience=", ".join(e["title"] for e in profile.get("experience", [])) or "None listed",
        projects=", ".join(p["title"] for p in profile.get("projects", [])) or "None listed",
        title=posting["title"], company=posting["company"],
        required_skills=", ".join(posting["required_skills"]) or "None specified",
        preferred_skills=", ".join(posting["preferred_skills"]) or "None specified",
        critical_missing=", ".join(gap_skills) or "none",
        partially_demonstrated=", ".join(f"{g['missing_skill']} (has {g['related_skill_held']})" for g in gaps["partially_demonstrated"]) or "none",
        preferred_gaps=", ".join(gaps["preferred_gaps"]) or "none",
        experience_gap=gaps["experience_gap"]["note"],
        education_gap=gaps["education_gap"]["note"],
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
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"skill_recommendations": [], "overall_summary": "Recommendations unavailable — the model returned an unexpected format."}


def analyze_skill_gap(profile: dict, posting: dict, with_recommendations: bool = True) -> dict:
    student_skill_names = [s["name"] for s in profile.get("skills", [])]
    skill_gaps = classify_skill_gaps(student_skill_names, posting["required_skills"], posting["preferred_skills"])
    experience_gap = assess_experience_gap(posting.get("experience_requirement"))
    education_gap = assess_education_gap(profile.get("education", []), posting.get("education_requirement"))

    result = {**skill_gaps, "experience_gap": experience_gap, "education_gap": education_gap}

    if with_recommendations:
        recs = generate_gap_recommendations(profile, posting, result)
        result["skill_recommendations"] = recs.get("skill_recommendations", [])
        result["overall_summary"] = recs.get("overall_summary")

    return result
