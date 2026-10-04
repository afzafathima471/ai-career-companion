from app.matching_agent import score_candidate
from app.skill_gap_agent import classify_skill_gaps
from app.interview_agent import identify_revision_topics
from app.skill_gap_agent import analyze_skill_gap

print("=== M4.2 Multi-Agent Consistency Tests ===\n")

# A student who has JavaScript (related to TypeScript via the skill-family
# map) but NOT TypeScript itself -- designed specifically to probe whether
# Matching Agent and Skill Gap Agent agree on what counts as "missing".
profile = {
    "skills": [{"name": "JavaScript"}, {"name": "CSS"}],
    "education": [], "experience": [], "projects": [], "certifications": [],
}
posting = {
    "title": "Frontend Intern", "company": "Nimbus Labs",
    "required_skills": ["React", "TypeScript", "CSS"], "preferred_skills": [],
    "experience_requirement": "Internship", "education_requirement": "Unspecified",
}

match_result = score_candidate(profile, posting)
gap_result = classify_skill_gaps(["JavaScript", "CSS"], posting["required_skills"], posting["preferred_skills"])

print("Matching Agent says missing_required_skills:", match_result["missing_required_skills"])
print("Skill Gap Agent says critical_missing:", gap_result["critical_missing"])
print("Skill Gap Agent says partially_demonstrated:", gap_result["partially_demonstrated"])

# THE FINDING: does Matching Agent's "missing" list match Skill Gap's
# "critical_missing" list exactly?
matching_missing = set(match_result["missing_required_skills"])
gap_critical = {s.lower() for s in gap_result["critical_missing"]}

if matching_missing == gap_critical:
    print("\n-> Matching Agent and Skill Gap Agent AGREE exactly on what's missing.")
else:
    only_in_matching = matching_missing - gap_critical
    print(f"\n-> REAL INCONSISTENCY FOUND: Matching Agent counts {only_in_matching} as fully")
    print(f"   'missing', but Skill Gap Agent treats it as 'partially demonstrated' (has a related skill).")
    print(f"   This is because Matching Agent's scoring does simple exact-match set difference,")
    print(f"   while Skill Gap Agent additionally checks the SKILL_FAMILIES relation table.")
    print(f"   Both are internally correct for what they claim to do -- but a student could see")
    print(f"   'TypeScript' listed as missing on the Match screen and 'partially demonstrated'")
    print(f"   on the Skill Gap screen, which could look like a contradiction if not explained.")

print()

# Does Interview Agent's revision topics correctly inherit from Skill Gap
# (not regenerate independently)? This one SHOULD be perfectly consistent
# by construction -- verifying that actually holds.
full_gap = analyze_skill_gap(profile, posting, with_recommendations=False)
revision_topics = identify_revision_topics(full_gap)
revision_topic_names = {t["topic"].lower() for t in revision_topics}
gap_topic_names = {s.lower() for s in full_gap["critical_missing"]} | {g["missing_skill"].lower() for g in full_gap["partially_demonstrated"]}

print("Skill Gap critical_missing + partially_demonstrated:", gap_topic_names)
print("Interview Agent revision topics:", revision_topic_names)
assert revision_topic_names >= gap_topic_names, "Interview Agent's revision topics don't fully cover Skill Gap's findings!"
print("Test (Interview Agent revision topics correctly inherit from Skill Gap, by construction): PASS")

print("\n=== CONSISTENCY FINDING SUMMARY ===")
print("Matching <-> Skill Gap: INCONSISTENT definition of 'missing' for skill-family-related skills (documented above)")
print("Skill Gap <-> Interview Prep: CONSISTENT (same source data, verified)")
