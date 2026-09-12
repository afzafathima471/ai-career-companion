# M2.1 — Internship Knowledge Base

## Source
**EMSCAD (Employment Scam Aegean Dataset)** — 17,880 real job postings from
2012–2014, published by the University of the Aegean for employment-fraud
research, sourced via a GitHub CSV mirror. This is the practical
substitute for pulling directly from Kaggle: `kaggle.com` needs an
authenticated API call this sandboxed environment can't make, but this is
the same underlying data — it's the dataset Kaggle's own "Real / Fake Job
Posting Prediction" listing is built from.

If you'd rather pull it from Kaggle directly (e.g. to match the milestone
instruction exactly, or to grab the full un-mirrored version), the account
is `shivamb/real-or-fake-fake-jobposting-prediction` — download
`fake_job_postings.csv` and swap it in for `emscad_raw.csv`; the pipeline
schema is identical either way.

## Pipeline: `build_dataset.py`
1. **Filter** — genuine (`fraudulent == 0`) postings with "intern" in the title (578 found)
2. **Clean** — strip HTML tags, unescape entities, remove the dataset's `#URL_...#` / `#EMAIL_...#` anonymization tokens, collapse whitespace
3. **Extract company name** — regex-based, matched against common opening patterns in the company_profile blurb (`"We're X, ..."`, `"X is a ..."`, `"At X, ..."`, `"X's mission is ..."`, etc.)
4. **Extract skills** — keyword match against a 60-term vocabulary (`skill_vocabulary.py`) spanning tech, design, marketing, and soft skills; sentence-level "preferred/nice-to-have/plus" markers split matches into required vs preferred
5. **Deduplicate** — exact title+description matches dropped (33 found)
6. **Diversity cap** — max 6 postings per exact title, so repeated titles like "Marketing Intern" (17 raw copies) don't dominate the set
7. **Trim to target** — sorted by skill-richness, capped at 200

## Result
- **200 postings** (within the 150–200 target)
- **173 unique titles**
- Spans Marketing, Software/Web Dev, Design, Sales, Business Development, Data, and more
- Countries: mostly US (101), GB (29), GR (17), DE (12), plus others
- Median 4 extracted skills per posting (range 2–11)

## Known limitations (real, not hidden)
- **Company extraction: 97/200 (48.5%)** got a real name; the rest fall
  back to "Undisclosed Company." Of the 103 that failed, 21 had literally
  no company_profile text in the source data (unrecoverable), the other
  82 have profile text in a format the regex patterns don't catch. This
  doesn't affect matching/RAG quality (that runs on skills, requirements,
  description) — it only affects the company name shown to a user. More
  regex patterns could close some of this gap; diminishing returns beyond
  a point without an actual NER model.
- **Skill extraction is keyword matching, not semantic.** It will miss a
  skill described in different words than the vocabulary list (e.g. "able
  to build websites" won't register as "Web Development" unless that exact
  phrase appears). "Go" and standalone "R" were deliberately excluded from
  the vocabulary after testing showed they matched the common English
  words "go" and "(large)r" far more often than the programming languages
  — every single "Go" match in an early test run was a false positive.
- **Data is from 2012–2014** — tool/stack mix skews toward that era
  (jQuery-era web dev, less cloud/AI-native). Fine for testing a RAG and
  matching pipeline; would need refreshing for a live product.

## Files
- `internship_dataset.json` — the 200-posting structured dataset
- `build_dataset.py` — the pipeline that produced it (rerunnable)
- `skill_vocabulary.py` — the skill list and preferred-marker phrases

## Schema (per posting)
```json
{
  "source_job_id": int,
  "title": string,
  "company": string,
  "location": string | null,
  "description": string,
  "requirements_raw": string | null,
  "required_skills": [string],
  "preferred_skills": [string],
  "experience_requirement": string | null,
  "education_requirement": string | null,
  "industry": string | null,
  "function": string | null,
  "employment_type": string | null
}
```
