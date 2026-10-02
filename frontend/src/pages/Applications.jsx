import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, X, Trash2, Clock, Calendar, AlertCircle } from "lucide-react";
import {
  listApplications, getApplicationDashboard, getApplicationReminders,
  createApplication, updateApplication, deleteApplication,
} from "../api";

const STATUS_STAGES = [
  "Saved", "Planning to apply", "Applied", "Application under review",
  "Shortlisted", "Interview scheduled", "Interview completed",
  "Offer received", "Rejected", "Withdrawn",
];

const STATUS_TONE = {
  "Saved": "muted", "Planning to apply": "muted", "Applied": "navy",
  "Application under review": "navy", "Shortlisted": "gold",
  "Interview scheduled": "gold", "Interview completed": "gold",
  "Offer received": "sage", "Rejected": "muted", "Withdrawn": "muted",
};

export default function Applications({ student }) {
  const [dashboard, setDashboard] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ company: "", status: "" });

  const refresh = useCallback(() => {
    setError("");
    Promise.all([
      getApplicationDashboard(student.id),
      getApplicationReminders(student.id),
      listApplications(student.id, filters),
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
    deleteApplication(student.id, appId).then(refresh).catch((err) => setError(err.message));
  }

  const reminderCount = reminders
    ? reminders.upcoming_deadlines.length + reminders.upcoming_interviews.length + reminders.follow_ups_suggested.length
    : 0;

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
            {reminderCount} thing{reminderCount !== 1 ? "s" : ""} need attention
          </div>
          <div className="space-y-1 text-[12px] text-ink/70">
            {reminders.upcoming_deadlines.map((a) => (
              <p key={`dl-${a.id}`}><Clock size={11} className="mr-1 inline" />Deadline soon: {a.title} @ {a.company}</p>
            ))}
            {reminders.upcoming_interviews.map((a) => (
              <p key={`iv-${a.id}`}><Calendar size={11} className="mr-1 inline" />Interview coming up: {a.title} @ {a.company}</p>
            ))}
            {reminders.follow_ups_suggested.map((a) => (
              <p key={`fu-${a.id}`}>Consider following up: {a.title} @ {a.company} (applied a while ago, no update)</p>
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

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search by company"
          value={filters.company}
          onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
          className="border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink/35 focus:border-navy"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-navy"
        >
          <option value="">All statuses</option>
          {STATUS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!applications && !error && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Loading applications...
        </div>
      )}

      {applications && applications.length === 0 && (
        <p className="text-[14px] text-ink/45">No applications match — try Add application, or clear your filters.</p>
      )}

      <div className="border border-line bg-white">
        {applications?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5 last:border-0">
            <div className="min-w-0">
              <p className="truncate text-[14px] text-ink">{a.title}</p>
              <p className="truncate text-[12px] text-ink/50">
                {a.company}
                {a.deadline && ` · Deadline ${new Date(a.deadline).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <StatusBadge status={a.status} />
              <select
                value={a.status}
                onChange={(e) => handleStatusChange(a.id, e.target.value)}
                className="border border-line bg-white px-2 py-1 text-[11px] text-ink/60 outline-none"
              >
                {STATUS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => handleDelete(a.id)} aria-label="Delete" className="text-ink/30 hover:text-gold">
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
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

function AddForm({ studentId, onClose, onCreated }) {
  const [form, setForm] = useState({ company: "", title: "", status: "Saved", deadline: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function submit() {
    if (!form.company.trim() || !form.title.trim()) return;
    setSaving(true);
    setErr("");
    createApplication(studentId, {
      company: form.company.trim(), title: form.title.trim(), status: form.status,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input placeholder="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          className="border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-navy" />
        <input placeholder="Role title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-navy" />
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          className="border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-navy">
          {STATUS_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          className="border border-line px-2.5 py-1.5 text-[13px] outline-none focus:border-navy" />
      </div>
      <button onClick={submit} disabled={saving} className="mt-3 bg-navy px-3.5 py-1.5 text-[12px] text-white disabled:opacity-50">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
