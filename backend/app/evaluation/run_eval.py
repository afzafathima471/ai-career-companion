import json
from app.matching_agent import match_student_to_internships
from app.evaluation.profiles import PROFILES

def is_relevant(posting, keywords):
    # Check title/industry/function AND the extracted skill lists -- a
    # generically-titled posting ("Intern", "BI Interns") can still be a
    # clearly correct match once you look at what skills it actually asks for.
    skills_text = " ".join(posting.get("required_skills", []) + posting.get("preferred_skills", []))
    haystack = " ".join([
        posting.get("title") or "",
        posting.get("industry") or "",
        posting.get("function") or "",
        skills_text,
    ]).lower()
    return any(kw in haystack for kw in keywords)

report = {}
for name, profile in PROFILES.items():
    keywords = profile.pop("domain_keywords")
    results = match_student_to_internships(profile, top_k_retrieve=15, top_k_final=5, with_reasoning=False)
    profile["domain_keywords"] = keywords  # put back for reuse

    labeled = []
    for r in results:
        p = r["posting"]
        relevant = is_relevant(p, keywords)
        labeled.append({
            "title": p["title"], "company": p["company"], "industry": p.get("industry"),
            "overall_score": r["overall_score"], "skill_score": r["skill_score"],
            "relevant": relevant,
        })

    precision_at_5 = sum(1 for x in labeled if x["relevant"]) / len(labeled) if labeled else 0
    report[name] = {"precision_at_5": precision_at_5, "results": labeled}

    print(f"=== {name} (precision@5: {precision_at_5:.0%}) ===")
    for x in labeled:
        tag = "OK " if x["relevant"] else "OFF"
        print(f"  [{tag}] [{x['overall_score']:3d}] {x['title'][:50]:52} ({x['industry']})")
    print()

avg_precision = sum(r["precision_at_5"] for r in report.values()) / len(report)
print(f"Average precision@5 across all 5 profiles: {avg_precision:.0%}")

with open("app/evaluation/eval_results.json", "w") as f:
    json.dump(report, f, indent=2)
