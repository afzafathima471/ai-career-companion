import StatCard from "../components/StatCard";
import InternshipRow from "../components/InternshipRow";

const internships = [
  { role: "Frontend Intern", company: "Nimbus Labs", location: "Remote", match: 94 },
  { role: "AI/ML Intern", company: "Vertex Systems", location: "Bengaluru", match: 91 },
  { role: "Full Stack Intern", company: "Loopwork", location: "Hybrid", match: 87 },
  { role: "Data Analyst Intern", company: "Fieldnote", location: "Remote", match: 82 },
];

export default function Dashboard() {
  return (
    <div className="px-10 py-8">
      <p className="mb-8 text-[15px] text-ink/60">Welcome back, Afza!</p>

      <div className="mb-10 flex gap-4">
        <StatCard label="Resume score" value="92" suffix="%" tone="sage" />
        <StatCard label="Matches" value="12" tone="gold" />
        <StatCard label="Applied" value="4" tone="navy" />
      </div>

      <div className="border border-line bg-white px-6 py-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-[17px] text-ink">Recommended internships</h2>
          <button className="text-[13px] text-ink/50 transition-colors hover:text-ink">
            See all
          </button>
        </div>
        <div className="mt-3">
          {internships.map((item) => (
            <InternshipRow key={item.role + item.company} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
