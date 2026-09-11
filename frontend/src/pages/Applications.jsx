const applications = [
  { role: "Frontend Intern", company: "Nimbus Labs", date: "28 Aug 2026", status: "Interview" },
  { role: "AI/ML Intern", company: "Vertex Systems", date: "25 Aug 2026", status: "Applied" },
  { role: "Full Stack Intern", company: "Loopwork", date: "20 Aug 2026", status: "Offer" },
  { role: "Backend Intern", company: "Harborline", date: "12 Aug 2026", status: "Rejected" },
];

const statusStyle = {
  Applied: "text-ink/55 border-line",
  Interview: "text-navy border-navy/30",
  Offer: "text-sage border-sage/40",
  Rejected: "text-ink/40 border-line",
};

export default function Applications() {
  return (
    <div className="px-10 py-8">
      <p className="mb-6 text-[15px] text-ink/60">
        Track every internship you've applied to, in one place.
      </p>

      <div className="border border-line bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink/45">
              <th className="px-6 py-3.5 font-normal">Role</th>
              <th className="px-6 py-3.5 font-normal">Company</th>
              <th className="px-6 py-3.5 font-normal">Applied on</th>
              <th className="px-6 py-3.5 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app, i) => (
              <tr key={i} className="border-b border-line text-[14px] last:border-0">
                <td className="px-6 py-4 text-ink">{app.role}</td>
                <td className="px-6 py-4 text-ink/65">{app.company}</td>
                <td className="px-6 py-4 text-ink/50">{app.date}</td>
                <td className="px-6 py-4">
                  <span
                    className={`border px-2.5 py-1 text-[12px] ${statusStyle[app.status]}`}
                  >
                    {app.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
