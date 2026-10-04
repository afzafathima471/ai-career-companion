import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, RefreshCw, FileText, Mail, BookmarkPlus } from "lucide-react";
import {
  getRecommendedInternships, customizeResume, customizeCoverLetter,
  listApplications, createApplication, updateApplication,
} from "../api";

export default function Customize({ student }) {
  const [jobs, setJobs] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mode, setMode] = useState("resume"); // "resume" | "cover-letter"
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    getRecommendedInternships(student.id, { topK: 5, withReasoning: false })
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, [student.id]);

  function generate(jobId, currentMode, feedbackText = null) {
    setError("");
    setLoading(true);
    setResult(null);
    setSaveMsg("");
    const call = currentMode === "resume" ? customizeResume : customizeCoverLetter;
    call(student.id, jobId, feedbackText)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function selectJob(jobId) {
    setSelectedJobId(jobId);
    setFeedback("");
    generate(jobId, mode);
  }

  function switchMode(newMode) {
    setMode(newMode);
    setFeedback("");
    if (selectedJobId) generate(selectedJobId, newMode);
  }

  function regenerate() {
    if (!selectedJobId || !feedback.trim()) return;
    generate(selectedJobId, mode, feedback.trim());
  }

  // Attach the generated resume / cover letter to this internship's tracked application
  // (creates the application as "Saved" if it isn't being tracked yet).
  function saveToApplication() {
    const job = jobs?.find((j) => j.job_id === selectedJobId);
    if (!job || !result) return;
    setSaveMsg("Saving...");
    listApplications(student.id)
      .then((apps) =>
        apps.find((a) => String(a.job_id) === String(selectedJobId)) ||
        createApplication(student.id, {
          job_id: String(selectedJobId), company: job.company, title: job.title, status: "Saved",
        })
      )
      .then((app) => {
        const { _validation, ...clean } = result; // eslint-disable-line no-unused-vars
        const payload = mode === "resume"
          ? { resume_snapshot: JSON.stringify(clean) }
          : { cover_letter_snapshot: result.cover_letter };
        return updateApplication(student.id, app.id, payload);
      })
      .then(() => setSaveMsg(`Saved to Applications (${mode === "resume" ? "resume" : "cover letter"})`))
      .catch((err) => setSaveMsg(err.message));
  }

  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Generate a tailored resume or cover letter for a specific role — built only from what's actually in your profile.
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
        <div className="mb-6 flex flex-wrap gap-2">
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

      {selectedJobId && (
        <div className="mb-6 flex gap-2">
          <ModeTab active={mode === "resume"} onClick={() => switchMode("resume")} icon={FileText} label="Resume" />
          <ModeTab active={mode === "cover-letter"} onClick={() => switchMode("cover-letter")} icon={Mail} label="Cover Letter" />
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Generating — this calls an LLM, takes a few seconds...
        </div>
      )}

      {result && !loading && (
        <div className="space-y-5">
          {result._validation && !result._validation.clean && (
            <div className="flex gap-2 border border-gold/50 bg-gold/10 px-4 py-3">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-gold" strokeWidth={1.75} />
              <div className="text-[13px] text-ink/80">
                <p className="font-medium">Double-check before using this</p>
                <p className="mt-0.5 text-ink/60">
                  These terms appeared in the generated content but weren't found in your profile:{" "}
                  <span className="text-ink">{result._validation.suspect_skills.join(", ")}</span>
                </p>
              </div>
            </div>
          )}

          {mode === "resume" ? <ResumeResult result={result} /> : <CoverLetterResult result={result} />}

          <div className="flex items-center gap-3">
            <button
              onClick={saveToApplication}
              className="flex items-center gap-1.5 border border-navy px-3.5 py-2 text-[13px] text-navy transition-colors hover:bg-navy hover:text-white"
            >
              <BookmarkPlus size={14} strokeWidth={1.75} />
              Save to application
            </button>
            {saveMsg && <span className="text-[12px] text-ink/60">{saveMsg}</span>}
          </div>

          <div className="border border-line bg-white px-5 py-4">
            <p className="mb-2 text-[13px] text-ink/60">Want a change? Describe it and regenerate.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g. make the headline shorter, emphasize the portfolio project more"
                className="w-full border border-line bg-white px-3.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink/30 focus:border-navy"
              />
              <button
                onClick={regenerate}
                disabled={!feedback.trim()}
                className="flex flex-shrink-0 items-center gap-1.5 bg-navy px-3.5 py-2 text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <RefreshCw size={14} strokeWidth={1.75} />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border px-3.5 py-1.5 text-[13px] transition-colors ${
        active ? "border-navy bg-navy text-white" : "border-line bg-white text-ink/60 hover:border-navy/40"
      }`}
    >
      <Icon size={14} strokeWidth={1.75} />
      {label}
    </button>
  );
}

function ResumeResult({ result }) {
  return (
    <div className="border border-line bg-white px-6 py-6">
      <p className="font-display text-[18px] text-ink">{result.headline}</p>

      {result.prioritized_skills?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] uppercase tracking-wide text-ink/40">Skills, in priority order</p>
          <div className="flex flex-wrap gap-1.5">
            {result.prioritized_skills.map((s) => (
              <span key={s} className="border border-line px-2.5 py-1 text-[12px] text-ink/70">{s}</span>
            ))}
          </div>
        </div>
      )}

      {result.experience_bullets?.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[12px] uppercase tracking-wide text-ink/40">Experience</p>
          {result.experience_bullets.map((exp) => (
            <div key={exp.title} className="mb-3">
              <p className="text-[14px] text-ink">{exp.title}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-ink/70">
                {exp.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {result.project_highlights?.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[12px] uppercase tracking-wide text-ink/40">Projects to highlight</p>
          {result.project_highlights.map((p) => (
            <div key={p.title} className="mb-2 text-[13px]">
              <span className="text-ink">{p.title}</span>
              <span className="text-ink/55"> — {p.why_relevant}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CoverLetterResult({ result }) {
  return (
    <div className="border border-line bg-white px-6 py-6">
      <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink/85">{result.cover_letter}</p>
    </div>
  );
}
