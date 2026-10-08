import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import StatCard from "../components/StatCard";
import InternshipRow from "../components/InternshipRow";
import { getProfile, getRecommendedInternships, getApplicationDashboard, listApplications, applyToInternship } from "../api";

export default function Dashboard({ student, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [appStats, setAppStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getProfile(student.id).catch(() => null),
      getRecommendedInternships(student.id, { topK: 20, withReasoning: false }).catch(() => []),
      getApplicationDashboard(student.id).catch(() => null),
      listApplications(student.id).catch(() => []),
    ]).then(([p, m, a, apps]) => {
      setProfile(p);
      setMatches(m);
      setAppStats(a);
      const done = {};
      apps.forEach((x) => {
        if (x.job_id && x.status !== "Saved" && x.status !== "Planning to apply") done[x.job_id] = "applied";
      });
      setApplied(done);
      setLoading(false);
    });
  }, [student.id]);

  const skillCount = profile?.skills?.length ?? 0;
  const strongMatches = matches.filter((m) => m.overall_score >= 70).length;
  const topMatches = matches.slice(0, 4);
  const firstName = student.name.split(" ")[0];
  const show = (v) => (loading ? "—" : v);

  function apply(m) {
    setApplied((s) => ({ ...s, [m.job_id]: "applying" }));
    applyToInternship(student.id, m)
      .then(() => {
        setApplied((s) => ({ ...s, [m.job_id]: "applied" }));
        getApplicationDashboard(student.id).then(setAppStats).catch(() => {});
      })
      .catch(() => setApplied((s) => ({ ...s, [m.job_id]: undefined })));
  }

  return (
    <div className="px-10 py-8">
      <p className="mb-8 text-[15px] text-ink/60">Welcome back, {firstName}!</p>

      <div className="mb-10 flex gap-4">
        <StatCard label="Skills found" value={show(skillCount)} tone="sage" />
        <StatCard label="Strong matches" value={show(strongMatches)} tone="gold" />
        <StatCard label="Applications" value={show(appStats?.total_applications ?? 0)} tone="navy" />
      </div>

      <div className="border border-line bg-white px-6 py-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] text-ink">Recommended internships</h2>
          <button
            onClick={() => onNavigate?.("Job-Resume Matching")}
            className="text-[13px] text-ink/50 transition-colors hover:text-ink"
          >
            See all
          </button>
        </div>

        <div className="mt-3">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-[14px] text-ink/50">
              <Loader2 size={16} className="animate-spin" />
              Loading your matches...
            </div>
          )}

          {!loading && skillCount === 0 && (
            <p className="py-4 text-[14px] text-ink/45">
              No matches yet — upload and parse your resume first so there's a profile to match against.
            </p>
          )}

          {!loading && skillCount > 0 && topMatches.length === 0 && (
            <p className="py-4 text-[14px] text-ink/45">
              Couldn't load matches right now. Try again in a moment.
            </p>
          )}

          {!loading &&
            skillCount > 0 &&
            topMatches.map((m) => (
              <InternshipRow
                key={m.job_id}
                role={m.title}
                company={m.company}
                location={m.location || "—"}
                match={Math.round(m.overall_score)}
                status={applied[m.job_id]}
                onApply={() => apply(m)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}