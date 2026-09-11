import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

const breakdown = [
  { label: "ATS compatibility", score: 96 },
  { label: "Keyword match", score: 88 },
  { label: "Formatting", score: 94 },
  { label: "Experience clarity", score: 90 },
];

const suggestions = [
  {
    type: "fix",
    text: "Quantify the impact in your internship bullet points — add numbers where you can.",
  },
  {
    type: "fix",
    text: "\"Full Stack Intern\" role is missing keywords like React and REST APIs that match your target roles.",
  },
  {
    type: "good",
    text: "Strong action verbs used throughout — recruiters respond well to this.",
  },
  {
    type: "good",
    text: "Contact information and section headers are ATS-friendly.",
  },
];

function ScoreRing({ score }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={radius} stroke="#E4E0D6" strokeWidth="8" fill="none" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        stroke="#6B8F71"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export default function Resume() {
  return (
    <div className="px-10 py-8">
      <p className="mb-8 text-[15px] text-ink/60">
        Upload your resume to get a score and tailored feedback.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Left column: upload + score */}
        <div className="space-y-6">
          <div className="border border-dashed border-line bg-white px-6 py-10 text-center">
            <UploadCloud className="mx-auto mb-3 text-ink/40" size={28} strokeWidth={1.5} />
            <p className="text-[14px] text-ink/70">
              Drag and drop your resume, or{" "}
              <span className="text-navy underline underline-offset-2">browse</span>
            </p>
            <p className="mt-1 text-[12px] text-ink/40">PDF or DOCX, up to 5MB</p>
          </div>

          <div className="border border-line bg-white px-6 py-6">
            <p className="mb-1 text-[13px] text-ink/60">Uploaded</p>
            <p className="text-[14px] text-ink">Afza_Fathima_Resume.pdf</p>

            <div className="mt-6 flex items-center justify-center">
              <div className="relative">
                <ScoreRing score={92} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[26px] leading-none text-ink">92</span>
                  <span className="text-[11px] text-ink/45">overall</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {breakdown.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-[12px] text-ink/60">
                    <span>{item.label}</span>
                    <span>{item.score}%</span>
                  </div>
                  <div className="h-1 w-full bg-line">
                    <div
                      className="h-1 bg-sage"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: feedback */}
        <div className="border border-line bg-white px-6 py-6">
          <h2 className="mb-4 font-display text-[17px] text-ink">Feedback</h2>
          <div className="space-y-4">
            {suggestions.map((item, i) => (
              <div key={i} className="flex gap-3">
                {item.type === "good" ? (
                  <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-sage" strokeWidth={1.75} />
                ) : (
                  <AlertCircle size={17} className="mt-0.5 flex-shrink-0 text-gold" strokeWidth={1.75} />
                )}
                <p className="text-[14px] leading-relaxed text-ink/75">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
