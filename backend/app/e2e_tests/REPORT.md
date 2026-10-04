# M4.2 — End-to-End System Testing & Validation Report

## 1. Full Workflow Chain — PASS
Tested the exact chain the milestone specifies: Student Profile → Resume
Upload → Resume Parsing → Internship Retrieval → Job Matching → Skill Gap
Analysis → Resume Customization → Interview Preparation → Application
Tracking.

Critically, this wasn't 9 isolated calls — the same `job_id` (the top
match from stage 5) was threaded through stages 6, 7, 8, and 9, proving
output from one stage is genuinely consumable as input to the next, not
just that each stage works alone. All 9 stages passed.

## 2. RAG Retrieval — PASS, with one honest caveat
- **Top-1 precision: 5/5 (100%)** across five distinct domains (frontend,
  marketing, data science, backend, design) — each query correctly
  surfaced its matching posting as the top result.
- **Prevention of irrelevant retrievals**: a query for something entirely
  outside the dataset ("deep sea marine biology research") scored 0.000
  across every posting — the system doesn't force a confident-looking
  match onto unrelated content.
- **Caveat**: a paraphrased query ("client-side web interface
  development" instead of "frontend React") still found the right
  posting in this test, but that's not guaranteed to generalize — this
  runs on TF-IDF (keyword-based), not the semantic embedding model the
  architecture specifies, so paraphrase robustness is inherently limited.
  This result is reported as what happened, not as proof the system
  reliably handles paraphrasing.

## 3. Multi-Agent Consistency — found one real inconsistency, one confirmed-consistent
This is the part of M4.2 testing that matters most, and it surfaced a
genuine finding rather than a clean pass across the board.

**Finding: Matching Agent and Skill Gap Agent disagree on "missing" for
skill-family-related skills.** Tested with a student who has JavaScript
but not TypeScript, against a role requiring both:
- Matching Agent reports `missing_required_skills: ['react', 'typescript']`
  (simple exact-match set difference)
- Skill Gap Agent reports `critical_missing: ['React']` and
  `partially_demonstrated: [TypeScript, related to JavaScript]`

Both are internally correct for what each claims to do, but a student
could see "TypeScript" listed as fully missing on the match screen and
"partially demonstrated" on the skill gap screen — which reads as a
contradiction if not explained. **Recommended for M4.3**: either have the
Matching Agent's scoring also consult `SKILL_FAMILIES`, or clearly label
the distinction in the UI ("exact match" vs "related skill credit").

**Confirmed consistent (verified, not assumed): Skill Gap Agent ↔
Interview Prep Agent.** Interview Prep's revision topics are built
directly from Skill Gap's output by function call, not regenerated — this
was already true by construction from M3.3, and this test specifically
confirmed revision topics fully cover Skill Gap's critical_missing +
partially_demonstrated for the same inputs.

## 4. Conversational Workflow — PASS, with a real nuance found mid-test
Ran a 4-turn conversation (not just the 2-turn check from M3.4):
1. Recommend internships (no job yet)
2. Explain skill gap for a named job → job 9001 captured
3. Follow-up interview prep request, no job named → correctly inferred 9001
4. Generic knowledge question, no job named → **also carried 9001 forward**

**Finding #1 (test-writing bug, not a product bug)**: the first attempt at
this test crashed — turn 3's `interview_prep_summary` intent triggers a
*third*, independent LLM call into `interview_agent.get_client()` that I
hadn't mocked. This was previously only a documented note in M3.4, never
actually exercised by a test. Now it has been.

**Finding #2 (a real product nuance)**: job-context fallback is "sticky"
— it doesn't clear when the conversation moves to a job-independent
intent. Checked whether this corrupts anything: it doesn't — a
`general_question` always triggers a fresh RAG search and ignores
whatever stale `postings` were passed in, so the reply content is
unaffected. The only consequence is that conversation-history
`referenced_job_id` bookkeeping would mislabel a generic message as
"about" a job it wasn't really about. Cosmetic/bookkeeping issue, not a
correctness issue — but worth fixing in M4.3 if conversation history is
ever displayed grouped by job.

## Summary table
| Area | Result | Real findings |
|---|---|---|
| Full workflow chain | PASS | None — same job_id verified flowing through all 9 stages |
| RAG retrieval | PASS | Paraphrase robustness caveat (TF-IDF limitation) |
| Multi-agent consistency | 1 issue found | Matching vs Skill Gap disagree on skill-family-related "missing" |
| Conversational workflow | PASS | Sticky job-context bookkeeping nuance; a nested-LLM-call test gap caught and fixed |

## Files
- `test_full_workflow.py` — the 9-stage chain test
- `test_rag_retrieval.py` — retrieval precision + irrelevant-query prevention
- `test_cross_agent_consistency.py` — the Matching vs Skill Gap finding
- `test_conversation_context.py` — the 4-turn conversation test
