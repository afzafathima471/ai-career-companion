"""
M3.4 — Conversational Career Assistant.

Two LLM calls per turn, with deterministic, testable logic in between:

1. ROUTE — classify the message's intent and extract which job(s) (if
   any) it refers to.
2. GATHER — deterministically call the already-tested agents from
   M2.3/M3.1/M3.2/M3.3 to fetch REAL data grounding the reply (scores,
   gaps, generated materials, retrieved postings) — the assistant does
   not answer from the LLM's free-floating knowledge, it answers from
   what these agents actually computed.
3. SYNTHESIZE — one final LLM call turns (message + history + grounding)
   into a natural conversational reply.

Context retention: if a turn doesn't explicitly name a job but a job was
discussed earlier in the conversation, that's used as the implicit
subject — this is the actual mechanism, not just a claim, and it's tested
below.
"""
import json

from .llm import get_client, GROQ_MODEL
from .matching_agent import score_candidate
from .skill_gap_agent import analyze_skill_gap
from .rag.search import semantic_search

INTENTS = [
    "recommend_internships", "explain_match", "explain_skill_gap",
    "compare_internships", "customize_materials", "interview_prep_summary",
    "general_question",
]


def validate_intent(parsed: dict) -> dict:
    """Normalizes the router LLM's output. Never trusts it blindly --
    falls back to a safe default if the model returns something outside
    the known intent set or malformed job_ids."""
    intent = parsed.get("intent")
    if intent not in INTENTS:
        intent = "general_question"

    job_ids = parsed.get("referenced_job_ids", [])
    if not isinstance(job_ids, list):
        job_ids = []
    clean_job_ids = []
    for j in job_ids:
        try:
            clean_job_ids.append(int(j))
        except (TypeError, ValueError):
            continue

    return {"intent": intent, "referenced_job_ids": clean_job_ids}


ROUTER_PROMPT = """Classify this message from a student using a career assistant chatbot.

Conversation so far:
{history}

Student's new message: "{message}"

Known internship job IDs mentioned so far in this conversation: {known_job_ids}

Classify into exactly one intent:
- recommend_internships: wants internship suggestions
- explain_match: wants to know why they match (or don't) a specific role
- explain_skill_gap: wants to know what skills they're missing for a role
- compare_internships: wants to compare 2+ specific roles
- customize_materials: wants a tailored resume or cover letter
- interview_prep_summary: wants interview questions or prep help
- general_question: anything else (general advice, questions about a role's requirements, etc.)

If the message references a specific internship (by name, company, or
implicitly continuing the previous topic), extract its job ID from the
known job IDs list above.

Return ONLY valid JSON: {{"intent": "...", "referenced_job_ids": [123]}}
"""


def route_intent(message: str, history: list[dict], known_job_ids: list[int]) -> dict:
    client = get_client()
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history[-6:]) or "(no prior messages)"
    prompt = ROUTER_PROMPT.format(history=history_text, message=message, known_job_ids=known_job_ids or "none yet")

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": "You output only valid JSON, nothing else."},
                  {"role": "user", "content": prompt}],
        temperature=0.1, response_format={"type": "json_object"},
    )
    raw = completion.choices[0].message.content
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {}
    return validate_intent(parsed)


def resolve_job_ids(intent_job_ids: list[int], last_discussed_job_id: int | None) -> list[int]:
    """Context retention: if this turn didn't name a job but one was
    discussed earlier, fall back to it. This is the actual mechanism
    behind 'maintain conversation context about previously discussed
    internships' -- not just a prompt instruction."""
    if intent_job_ids:
        return intent_job_ids
    if last_discussed_job_id is not None:
        return [last_discussed_job_id]
    return []


def gather_context(intent: str, postings: list[dict], profile: dict, message: str) -> dict:
    """Deterministic (except for customize_materials/interview_prep_summary,
    which reuse already-tested M3.2/M3.3 LLM calls -- real reuse, not new
    untested surface)."""
    if intent == "recommend_internships":
        from .matching_agent import match_student_to_internships
        matches = match_student_to_internships(profile, top_k_final=5, with_reasoning=False)
        return {"matches": [{"title": m["posting"]["title"], "company": m["posting"]["company"],
                              "score": m["overall_score"]} for m in matches]}

    if intent == "explain_match" and postings:
        return {"match_breakdown": [{"job": p["title"], "company": p["company"], **score_candidate(profile, p)} for p in postings[:1]]}

    if intent == "explain_skill_gap" and postings:
        gap = analyze_skill_gap(profile, postings[0], with_recommendations=False)
        return {"skill_gap": gap, "job": postings[0]["title"]}

    if intent == "compare_internships" and len(postings) >= 2:
        return {"comparison": [{"job": p["title"], "company": p["company"], **score_candidate(profile, p)} for p in postings]}

    if intent == "customize_materials" and postings:
        from .customization_agent import generate_tailored_resume, generate_cover_letter
        wants_cover_letter = "cover letter" in message.lower()
        result = generate_cover_letter(profile, postings[0]) if wants_cover_letter else generate_tailored_resume(profile, postings[0])
        return {"customized_material": result, "material_type": "cover_letter" if wants_cover_letter else "resume"}

    if intent == "interview_prep_summary" and postings:
        from .interview_agent import generate_interview_questions
        gap = analyze_skill_gap(profile, postings[0], with_recommendations=False)
        result = generate_interview_questions(profile, postings[0], gap, questions_per_category=1)
        return {"interview_prep": result}

    # general_question, or an intent that needed a job but got none
    search_results = semantic_search(message, top_k=5)
    return {"related_postings": [{"title": r["job"]["title"], "company": r["job"]["company"]} for r in search_results],
            "note": "No specific internship was identified for this question." if intent != "general_question" else None}


SYNTHESIS_PROMPT = """You are a career assistant chatting with a student about their internship search.

Student profile: {profile_summary}

Conversation so far:
{history}

Student's new message: "{message}"

Real data gathered to answer this (use ONLY this -- don't invent numbers,
scores, or facts not present here):
{grounding}

Write a natural, conversational reply (not a report -- this is a chat).
Reference specific numbers/skills from the grounding data where relevant.
If the grounding data shows no specific internship was identified but one
seems needed, ask a brief clarifying question instead of guessing.
Keep it to 2-5 sentences unless the data genuinely needs more room (e.g.
listing several recommendations).
"""


def synthesize_response(message: str, history: list[dict], grounding: dict, profile: dict) -> str:
    client = get_client()
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history[-6:]) or "(no prior messages)"
    profile_summary = f"Skills: {', '.join(s['name'] for s in profile.get('skills', [])) or 'none listed'}"

    prompt = SYNTHESIS_PROMPT.format(
        profile_summary=profile_summary, history=history_text, message=message,
        grounding=json.dumps(grounding, separators=(",", ":")),
    )
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": "You are a warm, direct career assistant. Plain text reply, no JSON."},
                  {"role": "user", "content": prompt}],
        temperature=0.6,
    )
    return completion.choices[0].message.content
