"""
M2.1 — builds the internship knowledge base.

Source: the EMSCAD (Employment Scam Aegean Dataset) — 17,880 real job ads
posted 2012-2014 via Workable, published by the University of the Aegean
for employment-fraud research, and mirrored in CSV form on GitHub. It's
the closest thing to "the Kaggle dataset" reachable from this environment
(kaggle.com itself needs an authenticated API call this sandbox can't
make) — same underlying data, different host.

This script:
1. Filters to genuine (non-fraudulent) postings with "intern" in the title
2. Cleans text (strips HTML tags, collapses whitespace)
3. Extracts a best-effort company name from the company_profile blurb
4. Extracts required vs preferred skills via keyword matching against a
   curated vocabulary (see skill_vocabulary.py)
5. Drops duplicates and incomplete postings
6. Caps over-represented titles so the final set isn't 80% "Marketing Intern"
7. Writes the result to internship_dataset.json

Known limitations (real, not hidden):
- Company extraction is regex-based and imperfect — some postings fall
  back to "Undisclosed Company" because the source text doesn't name the
  employer in an extractable way.
- Skill extraction is keyword matching, not semantic — it will miss a
  skill described in different words than the vocabulary list.
- The data is from 2012-2014, so it skews toward tools/stacks common then
  (jQuery over modern React, for instance) — fine for testing a RAG/
  matching pipeline, less fine as "current" internship listings.
"""
import json
import re
import html
from collections import Counter

import pandas as pd

from .skill_vocabulary import SKILL_VOCABULARY, PREFERRED_MARKERS

SOURCE_CSV = "/home/claude/emscad_raw.csv"
OUTPUT_JSON = "/home/claude/backend/app/data_pipeline/internship_dataset.json"

TARGET_MIN, TARGET_MAX = 150, 200
MAX_PER_TITLE = 6  # cap so "Marketing Intern" (17 copies) doesn't dominate


def clean_text(text) -> str:
    if pd.isna(text):
        return ""
    text = html.unescape(str(text))
    text = re.sub(r"<[^>]+>", " ", text)  # strip HTML tags
    text = re.sub(r"#(URL|EMAIL|PHONE)_[a-f0-9]+#", "", text)  # EMSCAD's anonymization tokens
    text = re.sub(r"\s+", " ", text).strip()
    return text


NAME_CHARS = r"A-Za-z0-9&.\-'’"
COMPANY_VERBS = (
    r"is|was|has|provides|offers|creates|helps|delivers|builds|makes|"
    r"believes|designs|connects|empowers|specializes|focuses|operates|"
    r"aims|exists|revolutionizes|revolutionises|works"
)

COMPANY_PATTERNS = [
    re.compile(rf"^(?:We're|We are|Hi,?\s+we are)\s+([A-Z][{NAME_CHARS}]+(?:\s[A-Z][{NAME_CHARS}]+){{0,2}})"),
    re.compile(rf"^([A-Z][{NAME_CHARS}]+(?:\s[A-Z][{NAME_CHARS}]+){{0,2}})\s*(?:\([^)]*\))?\s+(?:{COMPANY_VERBS})\b"),
    re.compile(rf"^At\s+([A-Z][{NAME_CHARS}]+(?:\s[A-Z][{NAME_CHARS}]+){{0,2}}),"),
    re.compile(rf"^At\s+([A-Z][{NAME_CHARS}]+(?:\s[A-Z][{NAME_CHARS}]+){{0,2}})\s+we\b"),
    re.compile(rf"^([A-Z][{NAME_CHARS}]+(?:\s[A-Z][{NAME_CHARS}]+){{0,2}})['’]s\s+(?:mission|goal|vision|team|platform|culture)\b"),
]


def extract_company(company_profile: str) -> str:
    text = clean_text(company_profile)
    if not text:
        return "Undisclosed Company"
    for pattern in COMPANY_PATTERNS:
        m = pattern.match(text)
        if m:
            name = m.group(1).strip().rstrip(".,")
            # guard against grabbing a sentence fragment that isn't really a name
            if 1 <= len(name.split()) <= 4 and len(name) < 40:
                return name
    return "Undisclosed Company"


def extract_skills(requirements: str, description: str) -> tuple[list[str], list[str]]:
    combined = f"{requirements} {description}"
    sentences = re.split(r"(?<=[.!?])\s+", combined)

    required, preferred = set(), set()
    for sentence in sentences:
        lower = sentence.lower()
        is_preferred_sentence = any(marker in lower for marker in PREFERRED_MARKERS)
        for skill in SKILL_VOCABULARY:
            pattern = r"\b" + re.escape(skill) + r"\b"
            if re.search(pattern, sentence, re.IGNORECASE):
                (preferred if is_preferred_sentence else required).add(skill)

    # a skill flagged preferred in one sentence but required elsewhere counts as required
    preferred -= required
    return sorted(required), sorted(preferred)


def build_dataset():
    df = pd.read_csv(SOURCE_CSV)

    intern_mask = df["title"].str.contains("intern", case=False, na=False)
    genuine = df[intern_mask & (df["fraudulent"] == 0)].copy()

    records = []
    for _, row in genuine.iterrows():
        description = clean_text(row["description"])
        requirements = clean_text(row["requirements"])

        # drop incomplete postings
        if len(description) < 80:
            continue

        required_skills, preferred_skills = extract_skills(requirements, description)

        records.append({
            "source_job_id": int(row["job_id"]),
            "title": clean_text(row["title"]),
            "company": extract_company(row["company_profile"]),
            "location": clean_text(row["location"]) or None,
            "description": description,
            "requirements_raw": requirements or None,
            "required_skills": required_skills,
            "preferred_skills": preferred_skills,
            "experience_requirement": clean_text(row["required_experience"]) or None,
            "education_requirement": clean_text(row["required_education"]) or None,
            "industry": clean_text(row["industry"]) or None,
            "function": clean_text(row["function"]) or None,
            "employment_type": clean_text(row["employment_type"]) or None,
        })

    # dedupe exact duplicate postings (same title + description)
    seen = set()
    deduped = []
    for r in records:
        key = (r["title"], r["description"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(r)

    # near-duplicate detection: same company handling reposts of the same
    # role with minor text differences (e.g. one extra sentence added).
    # Exact-match dedup above misses these; catch them via word-set overlap
    # within same-company groups (keeps candidate pairs small, not O(n^2)
    # over the whole dataset).
    from collections import defaultdict
    by_company = defaultdict(list)
    for r in deduped:
        by_company[r["company"]].append(r)

    def word_set(text):
        return set(re.findall(r"[a-z]{3,}", text.lower()))

    to_drop = set()
    for company, group in by_company.items():
        if company == "Undisclosed Company" or len(group) < 2:
            continue  # don't cross-compare unrelated postings that share the fallback label
        for i in range(len(group)):
            if group[i]["source_job_id"] in to_drop:
                continue
            for j in range(i + 1, len(group)):
                if group[j]["source_job_id"] in to_drop:
                    continue
                a, b = word_set(group[i]["description"]), word_set(group[j]["description"])
                if not a or not b:
                    continue
                jaccard = len(a & b) / len(a | b)
                if jaccard > 0.85:
                    # keep the longer/more complete posting, drop the other
                    shorter = group[i] if len(group[i]["description"]) < len(group[j]["description"]) else group[j]
                    to_drop.add(shorter["source_job_id"])

    deduped = [r for r in deduped if r["source_job_id"] not in to_drop]

    # cap over-represented titles for diversity
    title_counts = Counter()
    capped = []
    for r in deduped:
        title_counts[r["title"]] += 1
        if title_counts[r["title"]] <= MAX_PER_TITLE:
            capped.append(r)

    # trim to target range, keeping postings that actually have skills first
    capped.sort(key=lambda r: len(r["required_skills"]) + len(r["preferred_skills"]), reverse=True)
    final = capped[:TARGET_MAX]

    with open(OUTPUT_JSON, "w") as f:
        json.dump(final, f, indent=2)

    print(f"Raw genuine internship postings: {len(genuine)}")
    print(f"After cleaning + exact dedup: {len(deduped) + len(to_drop)}")
    print(f"Near-duplicate reposts removed: {len(to_drop)}")
    print(f"After near-dup removal: {len(deduped)}")
    print(f"After diversity cap (max {MAX_PER_TITLE}/title): {len(capped)}")
    print(f"Final dataset size: {len(final)}")
    print(f"Target range: {TARGET_MIN}-{TARGET_MAX} — {'OK' if TARGET_MIN <= len(final) <= TARGET_MAX else 'OUT OF RANGE'}")
    print(f"Written to: {OUTPUT_JSON}")

    return final


if __name__ == "__main__":
    build_dataset()
