import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { getApplicationReminders } from "../api";

function fmt(d) {
  return d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";
}

function buildItems(r) {
  if (!r) return [];
  return [
    ...(r.upcoming_interviews || []).map((a) => ({
      key: `i${a.id}`, text: `Interview: ${a.title} at ${a.company}`, when: fmt(a.interview_date),
    })),
    ...(r.upcoming_deadlines || []).map((a) => ({
      key: `d${a.id}`, text: `Deadline: ${a.title} at ${a.company}`, when: fmt(a.deadline),
    })),
    ...(r.follow_ups_suggested || []).map((a) => ({
      key: `f${a.id}`, text: `Follow up with ${a.company} about ${a.title}`, when: "",
    })),
    ...(r.pending_applications || []).map((a) => ({
      key: `p${a.id}`, text: `Not applied yet: ${a.title} at ${a.company}`, when: "",
    })),
  ];
}

export default function Topbar({ title, userName = "Afza", studentId, onProfileClick, onNavigate }) {
  const [reminders, setReminders] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // refresh whenever the page changes, so new applications show up
  useEffect(() => {
    if (!studentId) return;
    getApplicationReminders(studentId)
      .then(setReminders)
      .catch(() => setReminders(null));
  }, [studentId, title]);

  // close the dropdown when clicking outside it
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const items = buildItems(reminders);

  return (
    <header className="flex items-center justify-between border-b border-line px-10 py-5">
      <h1 className="font-display text-[22px] text-ink">{title}</h1>

      <div className="flex items-center gap-5">
        <div ref={ref} className="relative">
          <button
            aria-label="Notifications"
            onClick={() => setOpen((o) => !o)}
            className="relative text-ink/60 transition-colors hover:text-ink"
          >
            <Bell size={19} strokeWidth={1.75} />
            {items.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-gold" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-3 w-80 border border-line bg-white shadow-lg">
              <div className="border-b border-line px-4 py-3 text-[13px] font-medium text-ink">
                Notifications
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-ink/50">You're all caught up.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {items.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => { setOpen(false); onNavigate?.("Applications"); }}
                      className="block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-paper"
                    >
                      <p className="text-[13px] text-ink">{n.text}</p>
                      {n.when && <p className="mt-0.5 text-[11px] text-ink/45">{n.when}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onProfileClick}
          aria-label="Open profile settings"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-70"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy font-display text-[13px] text-white">
            {userName.charAt(0)}
          </div>
          <span className="text-[14px] text-ink/80">{userName}</span>
        </button>
      </div>
    </header>
  );
}