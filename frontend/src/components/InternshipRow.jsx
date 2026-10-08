import { Check } from "lucide-react";

export default function InternshipRow({ role, company, location, match, status, onApply }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-4 last:border-0">
      <div>
        <p className="text-[15px] text-ink">{role}</p>
        <p className="mt-0.5 text-[13px] text-ink/55">
          {company} · {location}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="font-display text-[16px] text-sage">{match}%</p>
          <p className="text-[11px] text-ink/45">match</p>
        </div>
        {status === "applied" ? (
          <span className="flex items-center gap-1 text-[13px] text-sage">
            <Check size={14} /> Applied
          </span>
        ) : (
          <button
            onClick={onApply}
            disabled={status === "applying"}
            className="bg-navy px-3 py-1.5 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "applying" ? "Applying..." : "Apply"}
          </button>
        )}
      </div>
    </div>
  );
}