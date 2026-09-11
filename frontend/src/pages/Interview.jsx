import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

const initialMessages = [
  {
    from: "ai",
    text: "Let's do a mock interview for the Frontend Intern role. I'll ask a few questions — take your time. First: tell me about a project where you had to learn a new technology quickly.",
  },
  {
    from: "user",
    text: "I built an AI Career Companion app and had to learn LangGraph for agent orchestration in about a week.",
  },
  {
    from: "ai",
    text: "Good — that's a strong example. Can you walk me through how you approached learning it, and what tripped you up along the way?",
  },
];

const focusAreas = ["Behavioral", "Technical", "System design", "Resume-based"];

export default function Interview() {
  const [messages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-[calc(100vh-89px)]">
      {/* left rail: session setup */}
      <div className="hidden w-64 flex-shrink-0 border-r border-line bg-white px-5 py-6 lg:block">
        <p className="mb-3 text-[13px] text-ink/60">Focus area</p>
        <div className="space-y-1.5">
          {focusAreas.map((area, i) => (
            <button
              key={area}
              className={`block w-full border-l-2 px-3 py-2 text-left text-[13px] transition-colors ${
                i === 0
                  ? "border-gold bg-paper text-ink"
                  : "border-transparent text-ink/55 hover:text-ink"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        <div className="mt-8 border border-line px-4 py-4">
          <p className="text-[12px] text-ink/50">Targeting</p>
          <p className="mt-1 text-[13px] text-ink">Frontend Intern</p>
          <p className="text-[12px] text-ink/45">Nimbus Labs</p>
        </div>
      </div>

      {/* chat area */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto px-10 py-8">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.from === "ai" && (
                <div className="mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center bg-navy text-white">
                  <Sparkles size={13} strokeWidth={1.75} />
                </div>
              )}
              <div
                className={`max-w-lg px-4 py-3 text-[14px] leading-relaxed ${
                  msg.from === "user"
                    ? "bg-navy text-white"
                    : "border border-line bg-white text-ink/85"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-10 py-5">
          <div className="flex items-center gap-3 border border-line bg-white px-4 py-2.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your answer..."
              className="w-full text-[14px] text-ink outline-none placeholder:text-ink/35"
            />
            <button aria-label="Send" className="text-navy hover:opacity-70">
              <Send size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
