"""
M3.2 — Resume & Cover Letter Customization Agent.

Two deterministic, testable pieces sandwich the LLM generation:
1. RANK — score the student's actual experience/projects/skills by
   relevance to the target posting (keyword overlap), so the LLM is
   generating from an already-prioritized, grounded list rather than
   guessing what to emphasize.
2. VALIDATE — after generation, check the output for skills that appear
   nowhere in the student's real profile. This is the direct response to
   the milestone's explicit requirement: "ensure that no unsupported
   skills, experiences, or achievements are invented." It's a real check,
   not a prompt instruction taken on faith — documented honestly as
   imperfect (see the module docstring at the bottom on its limits).
"""
import json
import re

from .llm import get_client, GROQ_MODEL


STOPWORDS = {
    "and", "the", "a", "an", "or", "to", "of", "in", "on", "for", "with",
    "is", "are", "was", "were", "be", "been", "this", "that", "as", "at",
    "by", "from", "it", "its", "we", "you", "our", "their", "will", "your",
}


def _keywords(text: str) -> set[str]:
    tokens = set(re.findall(r"[a-z][a-z0-9+.#]{1,}", (text or "").lower()))
    return tokens - STOPWORDS


def rank_relevant_content(profile: dict, posting: dict) -> dict:
    target_keywords = _keywords(
        " ".join(posting.get("required_skills", []) + posting.get("preferred_skills", []) + [posting.get("description", "")])
    )

    ranked_skills = []
    for s in profile.get("skills", []):
        relevant = s["name"].lower() in {k.lower() for k in posting.get("required_skills", []) + posting.get("preferred_skills", [])}
        ranked_skills.append({"name": s["name"], "relevant": relevant})
    ranked_skills.sort(key=lambda x: x["relevant"], reverse=True)

    ranked_experience = []
    for e in profile.get("experience", []):
        text_keywords = _keywords(f"{e.get('title', '')} {e.get('description', '')}")
        overlap = text_keywords & target_keywords
        ranked_experience.append({"title": e.get("title"), "organization": e.get("organization"),
                                   "relevance_score": len(overlap), "matched_keywords": sorted(overlap)})
    ranked_experience.sort(key=lambda x: x["relevance_score"], reverse=True)

    ranked_projects = []
    for p in profile.get("projects", []):
        text_keywords = _keywords(f"{p.get('title', '')} {p.get('technologies', '')}")
        overlap = text_keywords & target_keywords
        ranked_projects.append({"title": p.get("title"), "relevance_score": len(overlap), "matched_keywords": sorted(overlap)})
    ranked_projects.sort(key=lambda x: x["relevance_score"], reverse=True)

    return {"ranked_skills": ranked_skills, "ranked_experience": ranked_experience, "ranked_projects": ranked_projects}


def _profile_skill_names(profile: dict) -> set[str]:
    return {s["name"].lower() for s in profile.get("skills", [])}


def _profile_known_tokens(profile: dict) -> set[str]:
    """Everything the student's real profile actually contains, as a
    lowercase token set -- skills, project/experience titles, and words
    from their descriptions. Used as the ground truth for the hallucination
    check below."""
    tokens = set(_profile_skill_names(profile))
    for e in profile.get("experience", []):
        tokens |= _keywords(f"{e.get('title', '')} {e.get('organization', '')} {e.get('description', '')}")
    for p in profile.get("projects", []):
        tokens |= _keywords(f"{p.get('title', '')} {p.get('technologies', '')} {p.get('description', '')}")
    for c in profile.get("certifications", []):
        tokens |= _keywords(c.get("name", ""))
    return tokens


# Known technical/soft skill vocabulary -- reused from M2.1's extraction
# list conceptually, kept local and small here since this check only needs
# to catch skill-shaped tokens, not do full extraction.
COMMON_SKILL_TERMS = {
    "python", "java", "javascript", "typescript", "react", "angular", "vue.js", "node.js",
    "django", "flask", "fastapi", "sql", "aws", "azure", "docker", "kubernetes", "html", "css",
    "excel", "tableau", "photoshop", "illustrator", "figma", "seo", "machine", "learning",
}


def validate_no_hallucination(generated_text: str, profile: dict) -> dict:
    """Flags skill-like terms that appear in generated content but nowhere
    in the student's actual profile. Real limitation, stated plainly: this
    catches invented SKILLS reliably (closed vocabulary, exact match) but
    can't reliably catch invented ACHIEVEMENTS or exaggerated claims phrased
    in prose ("led a team of 10") -- that needs semantic fact-checking
    against the source resume, which is a further step, not built here."""
    generated_tokens = _keywords(generated_text)
    known_tokens = _profile_known_tokens(profile)

    suspect_skills = sorted(
        (generated_tokens & COMMON_SKILL_TERMS) - known_tokens
    )

    return {
        "clean": len(suspect_skills) == 0,
        "suspect_skills": suspect_skills,
    }


RESUME_PROMPT = """You are a resume writer helping a student tailor their resume for a specific internship.

CRITICAL RULE: Only use skills, experiences, projects, and achievements that
appear in the student's profile below. Never invent a skill, project, metric,
or accomplishment that isn't listed. If the student has nothing relevant for
a section, say so rather than inventing content.

Student profile (this is the ONLY source of truth for what they've done):
- Skills: {skills}
- Certifications: {certifications}
- Education: {education}
- Experience: {experience}
- Projects: {projects}

Already-ranked by relevance to this role (use this ordering, don't re-rank):
- Most relevant experience: {ranked_experience}
- Most relevant projects: {ranked_projects}

Target role: {title} at {company}
Required skills: {required_skills}
Preferred skills: {preferred_skills}
Job description: {description}

Generate a tailored resume as JSON:
{{
  "headline": "one-line professional summary tailored to this role",
  "prioritized_skills": ["skills from the student's list, reordered with most relevant to this role first"],
  "experience_bullets": [
    {{"title": "experience title from the student's profile", "bullets": ["improved bullet point 1 (rewritten for clarity/impact, but describing the SAME real thing)", "..."]}}
  ],
  "project_highlights": [
    {{"title": "project title from the student's profile", "why_relevant": "1 sentence connecting it to this role"}}
  ],
  "keywords_incorporated": ["job-description keywords naturally worked into the bullets above"]
}}
Return ONLY this JSON, nothing else.
"""


def generate_tailored_resume(profile: dict, posting: dict, feedback: str | None = None) -> dict:
    ranking = rank_relevant_content(profile, posting)
    client = get_client()

    prompt = RESUME_PROMPT.format(
        skills=", ".join(s["name"] for s in profile.get("skills", [])) or "None listed",
        certifications=", ".join(c["name"] for c in profile.get("certifications", [])) or "None listed",
        education=", ".join(f"{e['degree']} in {e['field']}" for e in profile.get("education", []) if e.get("degree")) or "None listed",
        experience="; ".join(f"{e['title']} at {e.get('organization', '')}: {e.get('description', '')}" for e in profile.get("experience", [])) or "None listed",
        projects="; ".join(f"{p['title']}: {p.get('technologies', '')}" for p in profile.get("projects", [])) or "None listed",
        ranked_experience=", ".join(e["title"] for e in ranking["ranked_experience"][:3] if e["title"]) or "none",
        ranked_projects=", ".join(p["title"] for p in ranking["ranked_projects"][:3] if p["title"]) or "none",
        title=posting["title"], company=posting["company"],
        required_skills=", ".join(posting.get("required_skills", [])) or "None specified",
        preferred_skills=", ".join(posting.get("preferred_skills", [])) or "None specified",
        description=(posting.get("description") or "")[:800],
    )
    if feedback:
        prompt += f"\n\nThe student reviewed a previous draft and asked for this change: \"{feedback}\". Incorporate it."

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": "You output only valid JSON, nothing else."},
                  {"role": "user", "content": prompt}],
        temperature=0.4, response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Model returned an unexpected format.", "raw": raw[:500]}

    flat_text = json.dumps(result)
    result["_validation"] = validate_no_hallucination(flat_text, profile)
    return result


COVER_LETTER_PROMPT = """You are helping a student write a cover letter for a specific internship.

CRITICAL RULE: Only reference skills, experiences, and projects that appear
in the student's profile below. Never invent an accomplishment.

Student profile:
- Skills: {skills}
- Education: {education}
- Experience: {experience}
- Projects: {projects}

Target role: {title} at {company}
Required skills: {required_skills}
Job description: {description}

Write a professional, personalized cover letter (3-4 short paragraphs) that
connects the student's real background to this specific role. Don't use
generic filler ("I am a hard worker") -- reference actual skills/projects
by name. Return ONLY valid JSON: {{"cover_letter": "..."}}
"""


def generate_cover_letter(profile: dict, posting: dict, feedback: str | None = None) -> dict:
    client = get_client()
    prompt = COVER_LETTER_PROMPT.format(
        skills=", ".join(s["name"] for s in profile.get("skills", [])) or "None listed",
        education=", ".join(f"{e['degree']} in {e['field']}" for e in profile.get("education", []) if e.get("degree")) or "None listed",
        experience="; ".join(f"{e['title']} at {e.get('organization', '')}" for e in profile.get("experience", [])) or "None listed",
        projects="; ".join(p["title"] for p in profile.get("projects", [])) or "None listed",
        title=posting["title"], company=posting["company"],
        required_skills=", ".join(posting.get("required_skills", [])) or "None specified",
        description=(posting.get("description") or "")[:800],
    )
    if feedback:
        prompt += f"\n\nThe student reviewed a previous draft and asked for this change: \"{feedback}\". Incorporate it."

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
        return {"error": "Model returned an unexpected format.", "raw": raw[:500]}

    result["_validation"] = validate_no_hallucination(result.get("cover_letter", ""), profile)
    return result
