import { useState, useEffect } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";
import { getRecommendedInternships, listApplications, createApplication, applyToInternship } from "../api";

export default function Internships({ student }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [tracked, setTracked] = useState({}); // job_id -> "adding" | "added"
  const [applied, setApplied] = useState({}); // job_id -> "applying" | "applied"

  useEffect(() => {
    setMatches(null);
    setError("");
    getRecommendedInternships(student.id, { topK: 5, withReasoning: true })
      .then(setMatches)
      .catch((err) => setError(err.message));
  }, [student.id]);

  // Remember what was already tracked / applied (survives a page refresh).
  useEffect(() => {
    listApplications(student.id)
      .then((apps) => {
        const t = {}, a = {};
        apps.forEach((x) => {
          if (!x.job_id) return;
          t[x.job_id] = "added";
          if (x.status !== "Saved" && x.status !== "Planning to apply") a[x.job_id] = "applied";
        });
        setTracked((p) => ({ ...t, ...p }));
        setApplied((p) => ({ ...a, ...p }));
      })
      .catch(() => {});
  }, [student.id]);

  // Apply = record the application in the tracker with status "Applied".
  function apply(m) {
    setApplied((s) => ({ ...s, [m.job_id]: "applying" }));
    applyToInternship(student.id, m)
      .then(() => {
        setApplied((s) => ({ ...s, [m.job_id]: "applied" }));
        setTracked((t) => ({ ...t, [m.job_id]: "added" }));
      })
      .catch((err) => {
        setError(err.message);
        setApplied((s) => ({ ...s, [m.job_id]: undefined }));
      });
  }

  // Add this internship to the application tracker (once; status "Planning to apply").
  function addToTracker(m) {
    setTracked((t) => ({ ...t, [m.job_id]: "adding" }));
    listApplications(student.id)
      .then((apps) =>
        apps.some((a) => String(a.job_id) === String(m.job_id)) ||
        createApplication(student.id, {
          job_id: String(m.job_id), company: m.company, title: m.title, status: "Planning to apply",
        })
      )
      .then(() => setTracked((t) => ({ ...t, [m.job_id]: "added" })))
      .catch((err) => { setError(err.message); setTracked((t) => ({ ...t, [m.job_id]: undefined })); });
  }

  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Retrieved and scored against your extracted resume profile — required
        skills, preferred skills, education, and experience level all factor in.
      </p>

      {error && (
        <p className="mb-6 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">
          {error}
        </p>
      )}

      {!matches && !error && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Finding matches and generating explanations — this calls an LLM
          for each result, so it takes a few seconds...
        </div>
      )}

      {matches && matches.length === 0 && (
        <p className="text-[14px] text-ink/45">
          No recommendations yet — upload and parse a resume first so there's
          a profile to match against.
        </p>
      )}

      <div className="space-y-4">
        {matches?.map((m) => (
          <div key={m.job_id} className="border border-line bg-white px-6 py-5">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] text-ink">{m.title}</p>
                <p className="mt-0.5 text-[13px] text-ink/55">
                  {m.company}
                  {m.location && ` · ${m.location}`}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="font-display text-[22px] leading-none text-sage">{m.overall_score}</p>
                <p className="text-[11px] text-ink/45">match</p>
              </div>
            </div>

            {m.reasoning && (
              <div className="mb-4 flex gap-2 border-l-2 border-gold/50 bg-paper px-3 py-2.5">
                <Sparkles size={14} className="mt-0.5 flex-shrink-0 text-gold" strokeWidth={1.75} />
                <p className="text-[13px] leading-relaxed text-ink/75">{m.reasoning}</p>
              </div>
            )}

            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <SubScore label="Skills" value={m.skill_score} />
              <SubScore label="Education" value={m.education_score} />
              <SubScore label="Experience" value={m.experience_score} />
            </div>

            <div className="space-y-1.5">
              {m.matched_required_skills.length > 0 && (
                <SkillRow label="Matched required" skills={m.matched_required_skills} tone="sage" />
              )}
              {m.matched_preferred_skills.length > 0 && (
                <SkillRow label="Matched preferred" skills={m.matched_preferred_skills} tone="gold" />
              )}
              {m.missing_required_skills.length > 0 && (
                <SkillRow label="Missing required" skills={m.missing_required_skills} tone="muted" />
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-line pt-3">
              {applied[m.job_id] === "applied" ? (
                <span className="flex items-center gap-1 text-[12px] text-sage">
                  <Check size={13} /> Applied
                </span>
              ) : (
                <>
                  {tracked[m.job_id] === "added" ? (
                    <span className="flex items-center gap-1 text-[12px] text-sage">
                      <Check size={13} /> In your tracker
                    </span>
                  ) : (
                    <button
                      onClick={() => addToTracker(m)}
                      disabled={tracked[m.job_id] === "adding"}
                      className="border border-line px-3.5 py-1.5 text-[12px] text-ink/70 transition-colors hover:border-navy/40 disabled:opacity-50"
                    >
                      {tracked[m.job_id] === "adding" ? "Adding..." : "Add to tracker"}
                    </button>
                  )}
                  <button
                    onClick={() => apply(m)}
                    disabled={applied[m.job_id] === "applying"}
                    className="bg-navy px-3.5 py-1.5 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {applied[m.job_id] === "applying" ? "Applying..." : "Apply"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubScore({ label, value }) {
  return (
    <div className="border border-line py-2">
      <p className="text-[13px] text-ink">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}

function SkillRow({ label, skills, tone }) {
  const toneClass = {
    sage: "border-sage/40 text-sage",
    gold: "border-gold/40 text-gold",
    muted: "border-line text-ink/40",
  }[tone];

  return (
    <div className="flex items-start gap-2">
      <span className="w-32 flex-shrink-0 text-[11px] text-ink/40">{label}</span>
      <div className="flex flex-wrap gap-1">
        {skills.map((s) => (
          <span key={s} className={`border px-2 py-0.5 text-[11px] ${toneClass}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
