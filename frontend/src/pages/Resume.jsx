import { useState, useEffect, useRef } from "react";
import { UploadCloud, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { uploadResume, parseResume, getProfile } from "../api";

const categoryLabel = { technical: "Technical", soft: "Soft skill", tool: "Tool" };

export default function Resume({ student }) {
  const [resume, setResume] = useState(null); // { id, filename, parse_status }
  const [profile, setProfile] = useState(null);
  const [stage, setStage] = useState("idle"); // idle | uploading | parsing | done | error
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    // If this student already has a parsed profile from an earlier session, show it.
    getProfile(student.id)
      .then((p) => {
        if (p.skills.length || p.education.length || p.experience.length || p.projects.length || p.certifications.length) {
          setProfile(p);
          setStage("done");
        }
      })
      .catch(() => {
        /* no profile yet — fine, stay idle */
      });
  }, [student.id]);

  async function handleFileSelected(file) {
    if (!file) return;
    setError("");
    setStage("uploading");
    try {
      const uploaded = await uploadResume(student.id, file);
      setResume(uploaded);

      setStage("parsing");
      const parsed = await parseResume(student.id, uploaded.id);
      setResume(parsed);

      const freshProfile = await getProfile(student.id);
      setProfile(freshProfile);
      setStage("done");
    } catch (err) {
      setError(err.message);
      setStage("error");
    }
  }

  return (
    <div className="px-10 py-8">
      <p className="mb-8 text-[15px] text-ink/60">
        Upload your resume — it's read and parsed by the backend, no sample data here.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Left column: upload */}
        <div className="space-y-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={stage === "uploading" || stage === "parsing"}
            className="w-full border border-dashed border-line bg-white px-6 py-10 text-center transition-colors hover:border-navy/40 disabled:opacity-60"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0])}
            />
            <UploadCloud className="mx-auto mb-3 text-ink/40" size={28} strokeWidth={1.5} />
            <p className="text-[14px] text-ink/70">
              Click to choose a resume, or drag one here
            </p>
            <p className="mt-1 text-[12px] text-ink/40">PDF or DOCX, up to 5MB</p>
          </button>

          {resume && (
            <div className="border border-line bg-white px-6 py-6">
              <p className="mb-1 text-[13px] text-ink/60">File</p>
              <p className="mb-4 text-[14px] text-ink">{resume.filename}</p>

              <StatusRow stage={stage} error={error} />
            </div>
          )}
        </div>

        {/* Right column: real extracted data */}
        <div className="border border-line bg-white px-6 py-6">
          <h2 className="mb-4 font-display text-[17px] text-ink">Extracted profile</h2>

          {!profile ? (
            <p className="text-[14px] text-ink/45">
              Upload a resume to see what gets extracted.
            </p>
          ) : (
            <div className="space-y-6">
              <Section title="Skills">
                {profile.skills.length === 0 ? (
                  <EmptyNote />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <span
                        key={s.id}
                        className="border border-line px-2.5 py-1 text-[12px] text-ink/70"
                        title={categoryLabel[s.category] ?? s.category}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Education">
                {profile.education.length === 0 ? (
                  <EmptyNote />
                ) : (
                  profile.education.map((ed) => (
                    <div key={ed.id} className="mb-2 text-[14px]">
                      <p className="text-ink">{ed.institution}</p>
                      <p className="text-[12px] text-ink/50">
                        {[ed.degree, ed.field].filter(Boolean).join(", ")}
                        {ed.start_date && ` · ${ed.start_date}–${ed.end_date ?? "present"}`}
                      </p>
                    </div>
                  ))
                )}
              </Section>

              <Section title="Experience">
                {profile.experience.length === 0 ? (
                  <EmptyNote />
                ) : (
                  profile.experience.map((ex) => (
                    <div key={ex.id} className="mb-3 text-[14px]">
                      <p className="text-ink">
                        {ex.title}
                        {ex.organization && <span className="text-ink/50"> · {ex.organization}</span>}
                      </p>
                      {ex.description && (
                        <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">{ex.description}</p>
                      )}
                    </div>
                  ))
                )}
              </Section>

              <Section title="Projects">
                {profile.projects.length === 0 ? (
                  <EmptyNote />
                ) : (
                  profile.projects.map((p) => (
                    <div key={p.id} className="mb-3 text-[14px]">
                      <p className="text-ink">{p.title}</p>
                      {p.description && (
                        <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">{p.description}</p>
                      )}
                      {p.technologies && (
                        <p className="mt-1 text-[12px] text-ink/45">{p.technologies}</p>
                      )}
                    </div>
                  ))
                )}
              </Section>

              <Section title="Certifications">
                {profile.certifications.length === 0 ? (
                  <EmptyNote />
                ) : (
                  profile.certifications.map((c) => (
                    <div key={c.id} className="mb-2 text-[14px]">
                      <p className="text-ink">{c.name}</p>
                      {c.issuer && <p className="text-[12px] text-ink/50">{c.issuer}</p>}
                    </div>
                  ))
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ stage, error }) {
  if (stage === "uploading") {
    return <StatusLine icon={<Loader2 size={15} className="animate-spin" />} text="Uploading..." />;
  }
  if (stage === "parsing") {
    return <StatusLine icon={<Loader2 size={15} className="animate-spin" />} text="Parsing with AI — this takes a few seconds..." />;
  }
  if (stage === "done") {
    return <StatusLine icon={<CheckCircle2 size={15} className="text-sage" />} text="Parsed successfully" tone="text-sage" />;
  }
  if (stage === "error") {
    return (
      <StatusLine
        icon={<AlertTriangle size={15} className="text-gold" />}
        text={error || "Something went wrong"}
        tone="text-ink/70"
      />
    );
  }
  return null;
}

function StatusLine({ icon, text, tone = "text-ink/60" }) {
  return (
    <div className={`flex items-center gap-2 text-[13px] ${tone}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[12px] uppercase tracking-wide text-ink/40">{title}</p>
      {children}
    </div>
  );
}

function EmptyNote() {
  return <p className="text-[13px] text-ink/40">None found in this resume.</p>;
}
