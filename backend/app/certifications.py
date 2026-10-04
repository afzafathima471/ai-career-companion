"""
Certification extraction safety net.

The LLM is the primary extractor (llm.py). This module makes certification
extraction robust in two ways:
  1. normalise whatever the model returns (strings, odd keys, blanks, duplicates)
     so one malformed entry can't fail the whole parse;
  2. scan the resume text itself for an explicit "Certifications / Licenses /
     Training / Online courses" section and add any entries the model missed.
Pure functions, no I/O, unit-tested.
"""
import re

_HEADING_VOCAB = {
    "certification", "certifications", "certificate", "certificates", "license", "licenses",
    "licence", "licences", "licensure", "course", "courses", "online", "training", "trainings",
    "professional", "technical", "additional", "other", "relevant", "completed", "and", "&", "/",
}
_HEADING_KEYS = ("certif", "licen", "train", "online")

# Headings that end a certifications section.
_STOP = re.compile(
    r"^(summary|profile|professional summary|objective|career objective|education|academic.*|"
    r"work experience|experience|professional experience|internships?|projects?|academic projects?|"
    r"personal projects?|skills|technical skills|key skills|core competencies|achievements?|awards?.*|"
    r"honou?rs.*|interests|hobbies|languages|references|declaration|personal (details|information)|"
    r"extra.?curricular.*|activities|publications?|contact.*|volunteer.*|leadership.*)\s*:?$", re.I)

_HINT = re.compile(
    r"certif|course|specializ|nanodegree|licen|bootcamp|workshop|training|diploma|fundamentals|essentials|"
    r"foundations?|associate|practitioner|coursera|udemy|edx|nptel|springboard|hackerrank|google|microsoft|"
    r"aws|amazon|oracle|cisco|ibm|linkedin|meta|infosys|udacity|datacamp|kaggle|simplilearn|great learning|"
    r"comptia|pmi|salesforce|nvidia|red hat|freecodecamp|codecademy|skillsoft|guvi|geeksforgeeks|w3schools", re.I)

_BULLET = re.compile(r"^\s*(?:[-–—•·▪●○■□◆◇►➢✓✔*>]|\d{1,2}[.)])\s*")
_DATE = re.compile(
    r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}\b|\b(?:19|20)\d{2}\b|"
    r"\bissued\b|\bcredential\s*id\b[:\s]*\S*", re.I)
_SPLIT = re.compile(r"\s+[-–—|]\s+|\s+by\s+|\s+from\s+", re.I)
_TRAIL_DATE = re.compile(r"\s*\([^)]*\d{4}[^)]*\)\s*$")


def _clean(line: str) -> str:
    line = _BULLET.sub("", line.strip())
    return re.sub(r"\s+", " ", line).strip(" \t:;,.")


def _is_heading(text: str) -> bool:
    toks = re.findall(r"[a-z&/]+", text.lower())
    return (0 < len(toks) <= 6 and all(t in _HEADING_VOCAB for t in toks)
            and any(t.startswith(_HEADING_KEYS) for t in toks))


def _name_issuer(line: str) -> tuple[str, str | None]:
    parts = _SPLIT.split(line, maxsplit=1)
    name = _clean(_TRAIL_DATE.sub("", parts[0]))
    issuer = None
    if len(parts) > 1:
        rest = _clean(_DATE.sub("", _TRAIL_DATE.sub("", parts[1])))
        rest = re.sub(r"^[-–—|,\s]+|[-–—|,\s]+$", "", rest)
        if len(rest) >= 2 and re.search(r"[A-Za-z]", rest):
            issuer = rest
    return name, issuer


def find_certification_lines(text: str, max_lines: int = 15) -> list[str]:
    """Entries listed under an explicit certifications-style heading in the resume text."""
    lines = [l for l in (text or "").splitlines()]
    found: list[str] = []
    i = 0
    while i < len(lines):
        raw = _clean(lines[i])
        inline = None
        if _is_heading(raw):
            pass
        else:
            m = re.match(r"^([A-Za-z &/]{4,45})\s*[:|]\s*(\S.*)$", raw)
            if m and _is_heading(m.group(1)):
                inline = m.group(2)
            else:
                i += 1
                continue
        entries: list[str] = []
        if inline:
            sep = r"\s*[;•|]\s*" if "(" in inline else r"\s*[;•|,]\s*"
            entries += [p for p in re.split(sep, inline) if p.strip()]
        else:
            j = i + 1
            while j < len(lines) and len(entries) < max_lines:
                cand = _clean(lines[j])
                j += 1
                if not cand:
                    continue
                if _STOP.match(cand) or _is_heading(cand):
                    j -= 1
                    break
                words = cand.split()
                if cand.isupper() and len(words) <= 4 and not re.search(r"\d", cand) and not _HINT.search(cand):
                    j -= 1  # an unrecognised ALL-CAPS heading
                    break
                entries.append(cand)
            i = j - 1
        found += [_clean(e) for e in entries]
        i += 1
    return [f for f in found if 4 <= len(f) <= 160 and re.search(r"[A-Za-z]{3}", f)]


def _key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def normalize_certifications(items) -> list[dict]:
    """Accept whatever the model returned and produce clean, de-duplicated {name, issuer} dicts."""
    out, seen = [], set()
    for it in items or []:
        if isinstance(it, str):
            name, issuer = it, None
        elif isinstance(it, dict):
            name = it.get("name") or it.get("title") or it.get("certification") or it.get("certificate")
            issuer = it.get("issuer") or it.get("organization") or it.get("provider")
        else:
            continue
        name = _clean(str(name)) if name else ""
        if len(name) < 2 or _key(name) in seen:
            continue
        seen.add(_key(name))
        out.append({"name": name, "issuer": _clean(str(issuer)) if issuer else None})
    return out


def merge_certifications(llm_items, resume_text: str) -> list[dict]:
    """Model output (normalised) plus any entries from an explicit certifications section it missed."""
    merged = normalize_certifications(llm_items)
    have = [_key(c["name"]) for c in merged]
    for line in find_certification_lines(resume_text):
        name, issuer = _name_issuer(line)
        k, kl = _key(name), _key(line)
        if len(name) < 4 or not k:
            continue
        if any(h and (h in kl or k in h) for h in have):
            continue
        merged.append({"name": name, "issuer": issuer})
        have.append(k)
    return merged
