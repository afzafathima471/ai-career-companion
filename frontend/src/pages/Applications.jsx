import { useState, useEffect, useCallback } from "react";
import {
  Loader2, Plus, X, Trash2, Clock, Calendar, AlertCircle,
  ChevronDown, ChevronUp, FileText, Mail, StickyNote, Copy, Check,
} from "lucide-react";
import {
  listApplications, getApplicationDashboard, getApplicationReminders,
  createApplication, updateApplication, deleteApplication,
} from "../api";

const STATUS_STAGES = [
  "Saved", "Planning to apply", "Applied", "Application under review",
  "Shortlisted", "Interview scheduled", "Interview completed",
  "Offer received", "Rejected", "Withdrawn",
];

// "Completed" = no longer in flight (matches TERMINAL_STATUSES in the backend).
const COMPLETED_STATUSES = ["Offer received", "Rejected", "Withdrawn"];

// Statuses that come before an interview: setting an interview date moves these to "Interview scheduled".
const PRE_INTERVIEW = ["Saved", "Planning to apply", "Applied", "Application under review", "Shortlisted"];

const INTERVIEW_OUTCOMES = [
  "Scheduled", "Completed - awaiting result", "Passed - next round",
  "Offer discussed", "Not selected", "Rescheduled", "Cancelled",
];

const STATUS_TONE = {
  "Saved": "muted", "Planning to apply": "muted", "Applied": "navy",
  "Application under review": "navy", "Shortlisted": "gold",
  "Interview scheduled": "gold", "Interview completed": "gold",
  "Offer received": "sage", "Rejected": "muted", "Withdrawn": "muted",
};

const EMPTY_FILTERS = {
  company: "", title: "", status: "",
  deadlineFrom: "", deadlineTo: "", appliedFrom: "", appliedTo: "",
};

// Dates are sent as NAIVE local ISO strings (no "Z"): the backend stores and
// compares naive datetimes, so a UTC "Z" string would shift days / break filters.
const dayStart = (v) => `${v}T00:00:00`;
const dayEnd = (v) => `${v}T23:59:59`;
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString() : "");
const fmtDateTime = (s) =>
  s ? new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";

function toApiFilters(f) {
  return {
    company: f.company.trim(),
    title: f.title.trim(),
    status: f.status,
    deadline_after: f.deadlineFrom ? dayStart(f.deadlineFrom) : "",
    deadline_before: f.deadlineTo ? dayEnd(f.deadlineTo) : "",
    application_date_after: f.appliedFrom ? dayStart(f.appliedFrom) : "",
    application_date_before: f.appliedTo ? dayEnd(f.appliedTo) : "",
  };
}

export default function Applications({ student }) {
  const [dashboard, setDashboard] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState("all"); // all | active | completed
  const [expandedId, setExpandedId] = useState(null);

  const refresh = useCallback(() => {
    setError("");
    Promise.all([
      getApplicationDashboard(student.id),
      getApplicationReminders(student.id),
      listApplications(student.id, toApiFilters(filters)),
    ])
      .then(([d, r, a]) => {
        setDashboard(d);
        setReminders(r);
        setApplications(a);
      })
      .catch((err) => setError(err.message));
  }, [student.id, filters]);

  useEffect(() => { refresh(); }, [refresh]);

  function handleStatusChange(appId, status) {
    updateApplication(student.id, appId, { status }).then(refresh).catch((err) => setError(err.message));
  }

  function handleDelete(appId) {
    if (!window.confirm("Delete this application?")) return;
    deleteApplication(student.id, appId).then(refresh).catch((err) => setError(err.message));
  }

  const shown = (applications || []).filter((a) =>
    view === "all" ? true : view === "completed" ? COMPLETED_STATUSES.includes(a.status) : !COMPLETED_STATUSES.includes(a.status)
  );
  const hasFilters = Object.values(filters).some(Boolean);

  const reminderCount = reminders
    ? reminders.upcoming_deadlines.length + reminders.upcoming_interviews.length +
      reminders.follow_ups_suggested.length + reminders.pending_applications.length
    : 0;

  const setF = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const inputCls = "border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-navy";

  return (
    <div className="px-10 py-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-[15px] text-ink/60">Every role you're tracking, in one place.</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-navy px-3.5 py-2 text-[13px] text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2} />
          Add application
        </button>
      </div>

      {error && (
        <p className="mb-6 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">{error}</p>
      )}

      {dashboard && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatBox label="Total" value={dashboard.total_applications} />
          <StatBox label="Active" value={dashboard.active_applications} />
          <StatBox label="Deadlines soon" value={dashboard.upcoming_deadlines} tone="gold" />
          <StatBox label="Interviews" value={dashboard.interviews_scheduled} tone="gold" />
          <StatBox label="Offers" value={dashboard.offers_received} tone="sage" />
          <StatBox label="Rejected" value={dashboard.rejected_applications} />
        </div>
      )}

      {reminderCount > 0 && (
        <div className="mb-6 border border-gold/40 bg-gold/10 px-5 py-4">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-ink">
            <AlertCircle size={14} className="text-gold" strokeWidth={1.75} />
            {reminderCount} thing{reminderCount !== 1 ? "s" : ""} need{reminderCount === 1 ? "s" : ""} attention
          </div>
          <div className="space-y-1 text-[12px] text-ink/70">
            {reminders.upcoming_deadlines.map((a) => (
              <p key={`dl-${a.id}`}><Clock size={11} className="mr-1 inline" />Deadline soon ({fmtDate(a.deadline)}): {a.title} @ {a.company}</p>
            ))}
            {reminders.upcoming_interviews.map((a) => (
              <p key={`iv-${a.id}`}><Calendar size={11} className="mr-1 inline" />Interview {fmtDateTime(a.interview_date)}: {a.title} @ {a.company}</p>
            ))}
            {reminders.follow_ups_suggested.map((a) => (
              <p key={`fu-${a.id}`}>Consider following up: {a.title} @ {a.company} (applied a while ago, no update)</p>
            ))}
            {reminders.pending_applications.map((a) => (
              <p key={`pe-${a.id}`}>Not applied yet: {a.title} @ {a.company}</p>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <AddForm
          studentId={student.id}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); refresh(); }}
        />
      )}

      {/* Active / completed tabs */}
      <div className="mb-3 flex gap-2">
        {[["all", "All"], ["active", "Active"], ["completed", "Completed"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`border px-3.5 py-1.5 text-[13px] transition-colors ${
              view === key ? "border-navy bg-navy text-white" : "border-line bg-white text-ink/60 hover:border-navy/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search & filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input type="text" placeholder="Search by company" value={filters.company} onChange={setF("company")} className={inputCls} />
          <input type="text" placeholder="Search by role" value={filters.title} onChange={setF("title")} className={inputCls} />
          <select value={filters.status} onChange={setF("status")} className={inputCls}>
            <option value="">All statuses</option>
            {STATUS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="px-2 text-[12px] text-ink/50 underline hover:text-ink">
              Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ink/50">
          <label className="flex items-center gap-1.5">Deadline
            <input type="date" value={filters.deadlineFrom} onChange={setF("deadlineFrom")} className={inputCls} />
            to
            <input type="date" value={filters.deadlineTo} onChange={setF("deadlineTo")} className={inputCls} />
          </label>
          <label className="flex items-center gap-1.5">Applied
            <input type="date" value={filters.appliedFrom} onChange={setF("appliedFrom")} className={inputCls} />
            to
            <input type="date" value={filters.appliedTo} onChange={setF("appliedTo")} className={inputCls} />
          </label>
        </div>
      </div>

      {!applications && !error && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Loading applications...
        </div>
      )}

      {applications && shown.length === 0 && (
        <p className="text-[14px] text-ink/45">No applications match — try Add application, or clear your filters.</p>
      )}

      <div className="border border-line bg-white">
        {shown.map((a) => (
          <div key={a.id} className="border-b border-line last:border-0">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[14px] text-ink">{a.title}</p>
                <p className="truncate text-[12px] text-ink/50">
                  {a.company}
                  {a.application_date && ` · Applied ${fmtDate(a.application_date)}`}
                  {a.deadline && ` · Deadline ${fmtDate(a.deadline)}`}
                  {a.interview_date && ` · Interview ${fmtDateTime(a.interview_date)}`}
                  {a.interview_status && ` (${a.interview_status})`}
                </p>
                <p className="mt-1 flex items-center gap-2 text-[11px] text-ink/40">
                  {a.notes && <span className="flex items-center gap-0.5"><StickyNote size={11} />Notes</span>}
                  {a.resume_snapshot && <span className="flex items-center gap-0.5"><FileText size={11} />Resume</span>}
                  {a.cover_letter_snapshot && <span className="flex items-center gap-0.5"><Mail size={11} />Cover letter</span>}
                </p>
              </button>
              <div className="flex flex-shrink-0 items-center gap-2">
                <StatusBadge status={a.status} />
                <select
                  value={a.status}
                  onChange={(e) => handleStatusChange(a.id, e.target.value)}
                  className="border border-line bg-white px-2 py-1 text-[11px] text-ink/60 outline-none"
                >
                  {STATUS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} aria-label="Details" className="text-ink/40 hover:text-ink">
                  {expandedId === a.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => handleDelete(a.id)} aria-label="Delete" className="text-ink/30 hover:text-gold">
                  <Trash2 size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
            {expandedId === a.id && (
              <DetailPanel key={a.id} studentId={student.id} app={a} onSaved={refresh} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }) {
  const toneClass = { gold: "text-gold", sage: "text-sage" }[tone] || "text-ink";
  return (
    <div className="border border-line bg-white py-3 text-center">
      <p className={`font-display text-[20px] leading-none ${toneClass}`}>{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || "muted";
  const toneClass = { navy: "border-navy/40 text-navy", gold: "border-gold/40 text-gold",
    sage: "border-sage/40 text-sage", muted: "border-line text-ink/40" }[tone];
  return <span className={`border px-2 py-0.5 text-[11px] ${toneClass}`}>{status}</span>;
}

function DetailPanel({ studentId, app, onSaved }) {
  const [form, setForm] = useState({
    description: app.description || "",
    application_date: (app.application_date || "").slice(0, 10),
    deadline: (app.deadline || "").slice(0, 10),
    interview_date: (app.interview_date || "").slice(0, 16),
    interview_status: app.interview_status || "",
    notes: app.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [doc, setDoc] = useState("resume"); // resume | cover
  const set = (key) => (e) => { setMsg(""); setForm((f) => ({ ...f, [key]: e.target.value })); };

  function save() {
    setSaving(true);
    setMsg("");
    const advance = form.interview_date && PRE_INTERVIEW.includes(app.status);
    updateApplication(studentId, app.id, {
      ...(advance ? { status: "Interview scheduled" } : {}),
      description: form.description,
      application_date: form.application_date ? dayStart(form.application_date) : null,
      deadline: form.deadline ? dayStart(form.deadline) : null,
      interview_date: form.interview_date ? `${form.interview_date}:00` : null,
      interview_status: form.interview_status || null,
      notes: form.notes,
    })
      .then(() => { setMsg(advance ? "Saved - status moved to Interview scheduled" : "Saved"); onSaved(); })
      .catch((e) => setMsg(e.message))
      .finally(() => setSaving(false));
  }

  const field = "mt-1 w-full border border-line bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-navy";
  const label = "text-[11px] uppercase tracking-wide text-ink/40";

  return (
    <div className="space-y-5 border-t border-line bg-paper px-5 py-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <p className={label}>Application date</p>
          <input type="date" value={form.application_date} onChange={set("application_date")} className={field} />
        </div>
        <div>
          <p className={label}>Deadline</p>
          <input type="date" value={form.deadline} onChange={set("deadline")} className={field} />
        </div>
        <div>
          <p className={label}>Interview date &amp; time</p>
          <input type="datetime-local" value={form.interview_date} onChange={set("interview_date")} className={field} />
        </div>
        <div>
          <p className={label}>Interview outcome</p>
          <select value={form.interview_status} onChange={set("interview_status")} className={field}>
            <option value="">Not set</option>
            {INTERVIEW_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div>
        <p className={label}>Role description</p>
        <textarea rows={2} value={form.description} onChange={set("description")}
          placeholder="What the role involves, requirements, contact person..." className={field} />
      </div>

      <div>
        <p className={label}>Notes &amp; follow-up</p>
        <textarea rows={3} value={form.notes} onChange={set("notes")}
          placeholder="e.g. Spoke to recruiter, follow up on Friday, send portfolio link..." className={field} />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="bg-navy px-3.5 py-1.5 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving..." : "Save details"}
        </button>
        {msg && <span className={`text-[12px] ${msg.startsWith("Saved") ? "text-sage" : "text-gold"}`}>{msg}</span>}
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-2 text-[13px] font-medium text-ink">Documents used for this application</p>
        <div className="mb-3 flex gap-2">
          <DocTab active={doc === "resume"} onClick={() => setDoc("resume")} icon={FileText} label="Resume" present={!!app.resume_snapshot} />
          <DocTab active={doc === "cover"} onClick={() => setDoc("cover")} icon={Mail} label="Cover letter" present={!!app.cover_letter_snapshot} />
        </div>
        {doc === "resume"
          ? <DocView text={app.resume_snapshot} kind="resume" />
          : <DocView text={app.cover_letter_snapshot} kind="cover letter" />}
      </div>
    </div>
  );
}

function DocTab({ active, onClick, icon: Icon, label, present }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 border px-3 py-1 text-[12px] transition-colors ${
        active ? "border-navy bg-navy text-white" : "border-line bg-white text-ink/60 hover:border-navy/40"
      }`}>
      <Icon size={13} strokeWidth={1.75} />
      {label}
      {present && <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-sage"}`} />}
    </button>
  );
}

function DocView({ text, kind }) {
  const [copied, setCopied] = useState(false);

  if (!text) {
    return (
      <p className="text-[13px] text-ink/45">
        No {kind} saved for this application yet. Generate one on the Customize page and click
        &ldquo;Save to application&rdquo;.
      </p>
    );
  }

  // Resume snapshots are saved as JSON (headline, skills, bullets...); fall back to plain text.
  let parsed = null;
  try {
    const p = JSON.parse(text);
    if (p && typeof p === "object" && !Array.isArray(p)) parsed = p;
  } catch { /* plain text */ }

  function copy() {
    const out = parsed ? resumeToText(parsed) : text;
    navigator.clipboard?.writeText(out).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <div className="border border-line bg-white px-5 py-4">
      <div className="mb-2 flex justify-end">
        <button onClick={copy} className="flex items-center gap-1 text-[12px] text-ink/50 hover:text-ink">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {parsed ? <ResumeSnapshot data={parsed} /> : (
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink/85">{text}</p>
      )}
    </div>
  );
}

function resumeToText(r) {
  const lines = [];
  if (r.headline) lines.push(r.headline, "");
  if (r.prioritized_skills?.length) lines.push("Skills: " + r.prioritized_skills.join(", "), "");
  (r.experience_bullets || []).forEach((e) => {
    lines.push(e.title);
    (e.bullets || []).forEach((b) => lines.push("- " + b));
    lines.push("");
  });
  (r.project_highlights || []).forEach((p) => lines.push(`${p.title}: ${p.why_relevant}`));
  return lines.join("\n").trim();
}

function ResumeSnapshot({ data }) {
  return (
    <div className="text-[13px]">
      {data.headline && <p className="font-display text-[16px] text-ink">{data.headline}</p>}
      {data.prioritized_skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {data.prioritized_skills.map((s) => (
            <span key={s} className="border border-line px-2 py-0.5 text-[12px] text-ink/70">{s}</span>
          ))}
        </div>
      )}
      {data.experience_bullets?.map((exp) => (
        <div key={exp.title} className="mt-3">
          <p className="text-ink">{exp.title}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/70">
            {(exp.bullets || []).map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
      {data.project_highlights?.length > 0 && (
        <div className="mt-3 space-y-1">
          {data.project_highlights.map((p) => (
            <p key={p.title}><span className="text-ink">{p.title}</span><span className="text-ink/55"> — {p.why_relevant}</span></p>
          ))}
        </div>
      )}
    </div>
  );
}

function AddForm({ studentId, onClose, onCreated }) {
  const [form, setForm] = useState({
    company: "", title: "", status: "Saved", deadline: "", application_date: "", description: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const cls = "border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-navy";

  function submit() {
    if (!form.company.trim() || !form.title.trim()) return;
    setSaving(true);
    setErr("");
    createApplication(studentId, {
      company: form.company.trim(), title: form.title.trim(), status: form.status,
      description: form.description.trim() || null,
      notes: form.notes.trim() || null,
      deadline: form.deadline ? dayStart(form.deadline) : null,
      application_date: form.application_date ? dayStart(form.application_date) : null,
    })
      .then(onCreated)
      .catch((e) => setErr(e.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="mb-6 border border-line bg-white px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">Add an application</p>
        <button onClick={onClose} aria-label="Close"><X size={15} className="text-ink/40" /></button>
      </div>
      {err && <p className="mb-2 text-[12px] text-gold">{err}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input placeholder="Company" value={form.company} onChange={set("company")} className={cls} />
        <input placeholder="Role title" value={form.title} onChange={set("title")} className={cls} />
        <select value={form.status} onChange={set("status")} className={cls}>
          {STATUS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="text-[11px] text-ink/45">Application date
          <input type="date" value={form.application_date} onChange={set("application_date")} className={`${cls} mt-1 w-full`} />
        </label>
        <label className="text-[11px] text-ink/45">Deadline
          <input type="date" value={form.deadline} onChange={set("deadline")} className={`${cls} mt-1 w-full`} />
        </label>
        <span />
        <textarea rows={2} placeholder="Role description (optional)" value={form.description} onChange={set("description")} className={`${cls} sm:col-span-3`} />
        <textarea rows={2} placeholder="Notes / follow-up (optional)" value={form.notes} onChange={set("notes")} className={`${cls} sm:col-span-3`} />
      </div>
      <button onClick={submit} disabled={saving} className="mt-3 bg-navy px-3.5 py-1.5 text-[12px] text-white disabled:opacity-50">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
