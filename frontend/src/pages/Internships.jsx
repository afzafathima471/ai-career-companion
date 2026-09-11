import { useState, useEffect } from "react";
import { Search, MapPin, Bookmark, Loader2 } from "lucide-react";
import { getMatches } from "../api";

export default function Internships({ student }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getMatches(student.id)
      .then(setMatches)
      .catch((err) => setError(err.message));
  }, [student.id]);

  const filtered = (matches ?? []).filter((m) =>
    `${m.job.title} ${m.job.company}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Ranked against the skills extracted from your resume.
      </p>

      <div className="mb-6 flex items-center gap-2 border border-line bg-white px-3.5 py-2.5 sm:w-80">
        <Search size={16} className="text-ink/40" strokeWidth={1.75} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search role or company"
          className="w-full text-[14px] text-ink outline-none placeholder:text-ink/35"
        />
      </div>

      {error && (
        <p className="mb-6 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">
          {error}
        </p>
      )}

      {!matches && !error && (
        <div className="flex items-center gap-2 text-[14px] text-ink/50">
          <Loader2 size={16} className="animate-spin" />
          Loading matches...
        </div>
      )}

      {matches && matches.length === 0 && (
        <p className="text-[14px] text-ink/45">
          No job listings yet — ask whoever's seeding the jobs table to add some.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.job.id} className="border border-line bg-white px-5 py-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[15px] text-ink">{m.job.title}</p>
                <p className="mt-0.5 text-[13px] text-ink/55">{m.job.company}</p>
              </div>
              <button aria-label="Save" className="text-ink/30 hover:text-gold">
                <Bookmark size={17} strokeWidth={1.75} />
              </button>
            </div>

            {m.job.location && (
              <div className="mb-4 flex items-center gap-1 text-[12px] text-ink/50">
                <MapPin size={13} strokeWidth={1.75} />
                {m.job.location}
              </div>
            )}

            <div className="mb-4 space-y-1.5">
              {m.matched_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.matched_skills.map((s) => (
                    <span key={s} className="border border-sage/40 px-2 py-0.5 text-[11px] text-sage">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {m.missing_skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.missing_skills.map((s) => (
                    <span key={s} className="border border-line px-2 py-0.5 text-[11px] text-ink/40">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-display text-[15px] text-sage">{m.match_percent}% match</span>
              <button className="bg-navy px-3.5 py-1.5 text-[12px] text-white transition-opacity hover:opacity-90">
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
