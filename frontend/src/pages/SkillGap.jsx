import { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { getRecommendedInternships, getSkillGap } from "../api";

export default function SkillGap({ student }) {
  const [jobs, setJobs] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [gap, setGap] = useState(null);
  const [loadingGap, setLoadingGap] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getRecommendedInternships(student.id, { topK: 5, withReasoning: false })
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, [student.id]);

  function selectJob(jobId) {
    setSelectedJobId(jobId);
    setGap(null);
    setError("");
    setLoadingGap(true);
    getSkillGap(student.id, jobId, { withRecommendations: true })
      .then(setGap)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingGap(false));
  }

  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Pick a recommended role to see exactly what's missing — and how to close the gap.
      </p>

      {error && (
        <p className="mb-6 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">
          {error}
        </p>
      )}

      {!jobs && !error && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Loading your recommended roles...
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {jobs.map((j) => (
            <button
              key={j.job_id}
              onClick={() => selectJob(j.job_id)}
              className={`border px-3.5 py-2 text-left text-[13px] transition-colors ${
                selectedJobId === j.job_id
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-white text-ink/70 hover:border-navy/40"
              }`}
            >
              {j.title} <span className="opacity-60">· {j.company}</span>
            </button>
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <p className="text-[14px] text-ink/45">
          No recommendations yet — upload and parse a resume first.
        </p>
      )}

      {loadingGap && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Analyzing gaps and generating recommendations — a few seconds...
        </div>
      )}

      {gap && (
        <div className="space-y-6">
          {gap.overall_summary && (
            <div className="border border-line bg-white px-6 py-5">
              <p className="text-[14px] leading-relaxed text-ink/80">{gap.overall_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GapSection
              title="Critical missing skills"
              tone="gold"
              items={gap.critical_missing}
              recommendations={gap.skill_recommendations}
              empty="None — you meet every required skill."
            />
            <GapSection
              title="Partially demonstrated"
              tone="navy"
              items={gap.partially_demonstrated.map(
                (p) => `${p.missing_skill} (you have ${p.related_skill_held})`
              )}
              recommendations={gap.skill_recommendations}
              empty="No partial matches to report."
            />
            <GapSection
              title="Preferred skill gaps"
              tone="muted"
              items={gap.preferred_gaps}
              empty="You match every preferred skill too."
            />
            <div className="border border-line bg-white px-5 py-5">
              <p className="mb-3 text-[12px] uppercase tracking-wide text-ink/40">
                Experience &amp; education
              </p>
              <GapNote label="Experience" data={gap.experience_gap} />
              <div className="mt-3 border-t border-line pt-3">
                <GapNote label="Education" data={gap.education_gap} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GapSection({ title, tone, items, recommendations = [], empty }) {
  const toneClass = { gold: "text-gold", navy: "text-navy", muted: "text-ink/50" }[tone];

  return (
    <div className="border border-line bg-white px-5 py-5">
      <p className={`mb-3 text-[13px] font-medium ${toneClass}`}>{title}</p>
      {items.length === 0 ? (
        <p className="flex items-center gap-1.5 text-[13px] text-sage">
          <CheckCircle2 size={14} strokeWidth={1.75} />
          {empty}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((skill) => {
            const rec = recommendations.find((r) => skill.toLowerCase().startsWith(r.skill.toLowerCase()));
            return (
              <li key={skill} className="text-[13px]">
                <div className="flex items-start gap-1.5 text-ink">
                  <AlertCircle size={14} className={`mt-0.5 flex-shrink-0 ${toneClass}`} strokeWidth={1.75} />
                  {skill}
                </div>
                {rec && (
                  <div className="ml-5 mt-1 space-y-0.5 text-[12px] text-ink/55">
                    <p>
                      <span className="text-ink/40">Why it matters:</span> {rec.why_it_matters}
                    </p>
                    <p className="flex items-start gap-1">
                      <TrendingUp size={12} className="mt-0.5 flex-shrink-0 text-sage" />
                      {rec.recommendation}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GapNote({ label, data }) {
  return (
    <div>
      <p className="text-[13px] text-ink">
        {label}
        {!data.has_gap && <CheckCircle2 size={13} className="ml-1.5 inline text-sage" strokeWidth={2} />}
      </p>
      <p className="mt-0.5 text-[12px] text-ink/55">{data.note}</p>
    </div>
  );
}
