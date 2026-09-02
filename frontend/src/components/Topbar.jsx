import { Bell } from "lucide-react";

export default function Topbar({ title, userName = "Afza" }) {
  return (
    <header className="flex items-center justify-between border-b border-line px-10 py-5">
      <h1 className="font-display text-[22px] text-ink">{title}</h1>

      <div className="flex items-center gap-5">
        <button
          aria-label="Notifications"
          className="relative text-ink/60 transition-colors hover:text-ink"
        >
          <Bell size={19} strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-gold" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy font-display text-[13px] text-white">
            {userName.charAt(0)}
          </div>
          <span className="text-[14px] text-ink/80">{userName}</span>
        </div>
      </div>
    </header>
  );
}
