import { useState } from "react";
import { ChevronDown, Mail, MessageCircle } from "lucide-react";

const faqs = [
  {
    q: "How is my resume score calculated?",
    a: "We check ATS compatibility, keyword match against your target roles, formatting consistency, and how clearly your experience is described. Each contributes to the overall score.",
  },
  {
    q: "How are internships matched to me?",
    a: "Matching is based on your resume content, target role, and stated preferences — the percentage reflects how closely a listing lines up with your profile.",
  },
  {
    q: "Can I practice interviews for a specific company?",
    a: "Yes — set a target role and company in the Interview tab, and the questions will be tailored to that context where possible.",
  },
  {
    q: "Is my resume data stored securely?",
    a: "Your resume and profile data are stored securely and are never shared with third parties without your consent.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line py-4 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[14px] text-ink">{q}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={`flex-shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="mt-2.5 text-[13px] leading-relaxed text-ink/60">{a}</p>}
    </div>
  );
}

export default function Help() {
  return (
    <div className="max-w-2xl px-10 py-8">
      <p className="mb-8 text-[15px] text-ink/60">
        Answers to common questions, or reach out directly.
      </p>

      <div className="border border-line bg-white px-6 py-2">
        <h2 className="mb-2 mt-4 font-display text-[17px] text-ink">Frequently asked</h2>
        <div>
          {faqs.map((item) => (
            <FaqItem key={item.q} {...item} />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-line bg-white px-5 py-5">
          <Mail size={18} className="mb-3 text-navy" strokeWidth={1.75} />
          <p className="text-[14px] text-ink">Email support</p>
          <p className="mt-1 text-[13px] text-ink/50">
            We usually reply within a day.
          </p>
          <button className="mt-3 text-[13px] text-navy hover:opacity-70">
            support@careerai.app
          </button>
        </div>

        <div className="border border-line bg-white px-5 py-5">
          <MessageCircle size={18} className="mb-3 text-navy" strokeWidth={1.75} />
          <p className="text-[14px] text-ink">Send feedback</p>
          <p className="mt-1 text-[13px] text-ink/50">
            Tell us what's working, and what isn't.
          </p>
          <button className="mt-3 border border-line px-3 py-1.5 text-[13px] text-ink/70 hover:border-navy/40">
            Open form
          </button>
        </div>
      </div>
    </div>
  );
}
