import json
import os
from groq import Groq

# Groq's model lineup changes over time — keep this as an env var so a
# deprecation doesn't require a code change. Check console.groq.com/docs/models
# if this one is ever retired.
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env — see .env.example."
            )
        _client = Groq(api_key=api_key)
    return _client


EXTRACTION_PROMPT = """You are a resume parser. Extract structured information from the resume \
text below and return ONLY valid JSON — no markdown fences, no commentary.

Return this exact shape:
{{
  "skills": [{{"name": string, "category": "technical" | "soft" | "tool"}}],
  "education": [{{"institution": string, "degree": string | null, "field": string | null, "start_date": string | null, "end_date": string | null}}],
  "experience": [{{"title": string, "organization": string | null, "description": string | null, "start_date": string | null, "end_date": string | null}}],
  "projects": [{{"title": string, "description": string | null, "technologies": [string]}}]
}}

Rules:
- If a field isn't present in the resume, use null (or an empty list for skills/education/experience/projects).
- Dates: keep whatever format the resume uses (e.g. "Jan 2024", "2023", "2022-2024"). Don't invent dates.
- Don't invent skills, roles, or projects that aren't in the text.
- "technologies" should list specific tools/languages/frameworks mentioned for that project, not soft skills.

Resume text:
\"\"\"
{resume_text}
\"\"\"
"""


def extract_resume_data(resume_text: str) -> dict:
    """Calls the LLM and returns a validated dict matching the extraction shape.
    Raises ValueError if the model's output isn't valid/parseable JSON."""
    client = get_client()

    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You output only valid JSON, nothing else."},
            {"role": "user", "content": EXTRACTION_PROMPT.format(resume_text=resume_text[:12000])},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Model did not return valid JSON: {e}\nRaw output: {raw[:500]}")

    for key in ("skills", "education", "experience", "projects"):
        data.setdefault(key, [])

    return data
