import { Search, MapPin, Bookmark } from "lucide-react";

const internships = [
  { role: "Frontend Intern", company: "Nimbus Labs", location: "Remote", match: 94, tags: ["React", "Tailwind"] },
  { role: "AI/ML Intern", company: "Vertex Systems", location: "Bengaluru", match: 91, tags: ["Python", "ML"] },
  { role: "Full Stack Intern", company: "Loopwork", location: "Hybrid", match: 87, tags: ["Node.js", "React"] },
  { role: "Data Analyst Intern", company: "Fieldnote", location: "Remote", match: 82, tags: ["SQL", "Excel"] },
  { role: "Backend Intern", company: "Harborline", location: "Bengaluru", match: 79, tags: ["FastAPI", "Postgres"] },
  { role: "Cloud Intern", company: "Aartha Tessa", location: "Hybrid", match: 76, tags: ["Docker", "AWS"] },
];

const filters = ["All", "Remote", "Hybrid", "On-site"];

export default function Internships() {
  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Matched to your resume and interests — updated daily.
      </p>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 border border-line bg-white px-3.5 py-2.5 sm:w-80">
          <Search size={16} className="text-ink/40" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search role or company"
            className="w-full text-[14px] text-ink outline-none placeholder:text-ink/35"
          />
        </div>

        <div className="flex gap-2">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`border px-3.5 py-1.5 text-[13px] transition-colors ${
                i === 0
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-white text-ink/60 hover:border-navy/40"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {internships.map((item) => (
          <div key={item.role + item.company} className="border border-line bg-white px-5 py-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[15px] text-ink">{item.role}</p>
                <p className="mt-0.5 text-[13px] text-ink/55">{item.company}</p>
              </div>
              <button aria-label="Save" className="text-ink/30 hover:text-gold">
                <Bookmark size={17} strokeWidth={1.75} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-1 text-[12px] text-ink/50">
              <MapPin size={13} strokeWidth={1.75} />
              {item.location}
            </div>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="border border-line px-2 py-0.5 text-[11px] text-ink/55">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <span className="font-display text-[15px] text-sage">{item.match}% match</span>
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
