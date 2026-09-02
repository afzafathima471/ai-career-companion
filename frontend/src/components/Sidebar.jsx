import { LayoutGrid, FileText, Briefcase, MessagesSquare, ClipboardList, Settings, HelpCircle } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Resume", icon: FileText },
  { label: "Internships", icon: Briefcase },
  { label: "Interview", icon: MessagesSquare },
  { label: "Applications", icon: ClipboardList },
];

const footerItems = [
  { label: "Settings", icon: Settings },
  { label: "Help", icon: HelpCircle },
];

function CompassMark() {
  // A small hand-drawn compass glyph — stands in for a logo, ties to the
  // "guidance / navigation" idea behind the product rather than a stock icon.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#C9932E" strokeWidth="1.4" />
      <path d="M15.2 8.8L10.6 10.6L8.8 15.2L13.4 13.4L15.2 8.8Z" fill="#C9932E" />
    </svg>
  );
}

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col bg-navy text-white">
      <div className="flex items-center gap-2 px-6 py-7">
        <CompassMark />
        <span className="font-display text-lg tracking-tight">CareerAI</span>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.label === active;
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  onClick={() => onNavigate?.(item.label)}
                  className={`group flex w-full items-center gap-3 rounded-sm border-l-2 px-3 py-2.5 text-left text-[14px] transition-colors ${
                    isActive
                      ? "border-gold bg-white/[0.06] text-white"
                      : "border-transparent text-white/60 hover:border-white/20 hover:text-white/90"
                  }`}
                >
                  <Icon size={17} strokeWidth={1.75} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <ul className="space-y-0.5">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  onClick={() => onNavigate?.(item.label)}
                  className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-[14px] text-white/50 transition-colors hover:text-white/85"
                >
                  <Icon size={17} strokeWidth={1.75} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
