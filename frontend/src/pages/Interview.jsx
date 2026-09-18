import { useState, useEffect } from "react";
import { Loader2, AlertCircle, ChevronDown, Send, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { getRecommendedInternships, getInterviewPrep, evaluateInterviewAnswer } from "../api";

const CATEGORY_ORDER = ["Technical", "Resume-based", "Project-based", "Role-specific", "HR/general"];

export default function Interview({ student }) {
  const [jobs, setJobs] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getRecommendedInternships(student.id, { topK: 5, withReasoning: false })
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, [student.id]);

  function selectJob(jobId) {
    setSelectedJobId(jobId);
    setPrep(null);
    setError("");
    setLoading(true);
    getInterviewPrep(student.id, jobId, 2)
      .then(setPrep)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const grouped = prep
    ? CATEGORY_ORDER.map((cat) => ({
        category: cat,
        questions: prep.questions.filter((q) => q.category === cat),
      })).filter((g) => g.questions.length > 0)
    : [];

  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Role-specific questions across five categories, plus what to revise beforehand.
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

      {loading && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Generating questions across five categories — a few seconds...
        </div>
      )}

      {prep && !loading && (
        <div className="space-y-6">
          {!prep._coverage.complete && (
            <div className="flex gap-2 border border-gold/50 bg-gold/10 px-4 py-3 text-[13px] text-ink/80">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-gold" strokeWidth={1.75} />
              <span>
                Missing question categories this round: {prep._coverage.missing_categories.join(", ")}.
                Try regenerating by re-selecting the role.
              </span>
            </div>
          )}

          {prep.revision_topics.length > 0 && (
            <div className="border border-line bg-white px-6 py-5">
              <p className="mb-3 font-display text-[16px] text-ink">Revise before your interview</p>
              <div className="space-y-2">
                {prep.revision_topics.map((t) => (
                  <div key={t.topic} className="flex items-start gap-2 text-[13px]">
                    <PriorityDot priority={t.priority} />
                    <div>
                      <span className="text-ink">{t.topic}</span>
                      <span className="text-ink/55"> — {t.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.category}>
              <p className="mb-3 text-[12px] uppercase tracking-wide text-ink/40">{group.category}</p>
              <div className="space-y-3">
                {group.questions.map((q, i) => (
                  <QuestionCard key={i} question={q} studentId={student.id} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriorityDot({ priority }) {
  const color = { high: "bg-gold", medium: "bg-navy/50", low: "bg-ink/20" }[priority] || "bg-ink/20";
  return <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${color}`} />;
}

function QuestionCard({ question, studentId }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  function submitAnswer() {
    if (!answer.trim()) return;
    setEvaluating(true);
    setEvaluation(null);
    evaluateInterviewAnswer(studentId, question.question, answer.trim())
      .then(setEvaluation)
      .finally(() => setEvaluating(false));
  }

  return (
    <div className="border border-line bg-white px-5 py-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 text-left">
        <div>
          <p className="text-[14px] text-ink">{question.question}</p>
          {question.prep_guidance && (
            <p className="mt-1 text-[12px] text-ink/50">{question.prep_guidance}</p>
          )}
        </div>
        <ChevronDown size={16} className={`mt-0.5 flex-shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type a practice answer..."
            rows={3}
            className="w-full border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink/30 focus:border-navy"
          />
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || evaluating}
            className="mt-2 flex items-center gap-1.5 bg-navy px-3.5 py-1.5 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {evaluating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} strokeWidth={1.75} />}
            Get feedback
          </button>

          {evaluation && (
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-[13px]">
              <div className="flex items-center gap-1.5">
                <RatingIcon rating={evaluation.rating} />
                <span className="capitalize text-ink">{evaluation.rating?.replace("_", " ")}</span>
              </div>
              <p className="text-ink/70">{evaluation.feedback}</p>
              {evaluation.strengths?.length > 0 && (
                <p className="text-sage">Strengths: {evaluation.strengths.join(", ")}</p>
              )}
              {evaluation.improvements?.length > 0 && (
                <p className="text-ink/55">To improve: {evaluation.improvements.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RatingIcon({ rating }) {
  if (rating === "strong") return <CheckCircle2 size={14} className="text-sage" strokeWidth={1.75} />;
  if (rating === "needs_work") return <XCircle size={14} className="text-gold" strokeWidth={1.75} />;
  return <MinusCircle size={14} className="text-ink/40" strokeWidth={1.75} />;
}
