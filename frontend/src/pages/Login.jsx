import { useState } from "react";
import { createStudent, loginStudent } from "../api";

function CompassMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="#C9932E" strokeWidth="1.4" />
      <path d="M15.2 8.8L10.6 10.6L8.8 15.2L13.4 13.4L15.2 8.8Z" fill="#C9932E" />
    </svg>
  );
}

// An abstract "route map" — waypoints connected by a path, standing in for
// a career journey (student → internship → offer) rather than a stock photo.
// Confined to its own box (not full-bleed) so it never sits under the text.
function JourneyIllustration() {
  return (
    <svg viewBox="0 0 260 260" fill="none" className="h-full w-full">
      <path
        d="M20 230 Q 60 190 70 150 T 130 90 T 220 30"
        stroke="#C9932E"
        strokeOpacity="0.85"
        strokeWidth="1.6"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />

      <circle cx="20" cy="230" r="4.5" fill="#142433" stroke="#C9932E" strokeWidth="1.4" />
      <circle cx="90" cy="130" r="4.5" fill="#142433" stroke="#C9932E" strokeWidth="1.4" />
      <circle cx="150" cy="75" r="4.5" fill="#142433" stroke="#C9932E" strokeWidth="1.4" />
      <circle cx="220" cy="30" r="6" fill="#C9932E" />

      <text x="30" y="248" fill="white" fillOpacity="0.5" fontSize="10" fontFamily="Inter, sans-serif">
        You are here
      </text>
      <text x="95" y="122" fill="white" fillOpacity="0.4" fontSize="10" fontFamily="Inter, sans-serif">
        Resume ready
      </text>
      <text x="152" y="67" fill="white" fillOpacity="0.4" fontSize="10" fontFamily="Inter, sans-serif">
        Matched
      </text>
      <text x="193" y="22" fill="#E8C889" fontSize="10" fontFamily="Inter, sans-serif">
        Offer
      </text>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const isSignup = mode === "signup";
  const [targetRole, setTargetRole] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const student = isSignup
        ? await createStudent({ name, email, target_role: targetRole.trim() || null })
        : await loginStudent(email);
      onLogin?.(student);
    } catch (err) {
      const msg = String(err.message).toLowerCase();
      if (msg.includes("fetch")) {
        setError("Couldn't reach the server. If it was idle, wait a minute and try again.");
      } else if (isSignup && msg.includes("already exists")) {
        setError("An account with this email already exists. Please log in instead.");
      } else if (!isSignup && msg.includes("no account")) {
        setError("No account found with this email. Please create an account first.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand side */}
      <div className="relative hidden w-[42%] flex-col bg-navy px-12 py-10 text-white md:flex">
        <div className="flex items-center gap-2.5">
          <CompassMark />
          <span className="font-display text-lg tracking-tight">CareerAI</span>
        </div>

        {/* illustration box — its own reserved space, well clear of the text below */}
        <div className="mt-10 h-64 w-64 self-end">
          <JourneyIllustration />
        </div>

        <div className="mt-12 max-w-sm">
          <p className="font-display text-[28px] leading-snug text-white">
            Your next step in the job search, mapped out for you.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-white/55">
            Resume feedback, matched internships, and interview practice —
            one place to prepare for what's next.
          </p>
        </div>

        <p className="mt-auto pt-10 text-[12px] text-white/35">AI Career Companion</p>
      </div>

      {/* Right panel — form side */}
      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <CompassMark size={22} />
            <span className="font-display text-lg text-ink">CareerAI</span>
          </div>

          <h1 className="font-display text-[26px] text-ink">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink/55">
          {isSignup ? "Sign up to start preparing for your next step." : "Log in to pick up where you left off."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {isSignup && (     
            <div>
              <label htmlFor="name" className="text-[13px] text-ink/70">
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Afza Fathima"
                className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink/30 focus:border-navy"
              />
            </div>
            )}

            <div>
              <label htmlFor="email" className="text-[13px] text-ink/70">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink/30 focus:border-navy"
              />
            </div>
            
            {isSignup && (
            <div>
              <label htmlFor="targetRole" className="text-[13px] text-ink/70">
                Target role
              </label>
              <input
                id="targetRole"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Frontend / Full Stack Intern"
                className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink/30 focus:border-navy"
              />
           </div>
            )}

            <div>
              <label htmlFor="password" className="text-[13px] text-ink/70">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink/30 focus:border-navy"
              />
            </div>

            {error && (
              <p className="border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2 text-ink/60">
                <input type="checkbox" className="accent-navy" />
                Remember me
              </label>
              <button type="button" className="text-navy hover:opacity-70">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink/55">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); }}
              className="text-navy hover:opacity-70"
            >
              {isSignup ? "Log in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
