import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { getAssistantHistory, sendAssistantMessage } from "../api";

const INTENT_LABELS = {
  recommend_internships: "Recommending internships",
  explain_match: "Explaining a match",
  explain_skill_gap: "Explaining a skill gap",
  compare_internships: "Comparing internships",
  customize_materials: "Customizing materials",
  interview_prep_summary: "Interview prep",
  general_question: null,
};

export default function CareerAssistant({ student }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    getAssistantHistory(student.id)
      .then((history) => setMessages(history.map((m) => ({ role: m.role, content: m.content, intent: m.intent }))))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingHistory(false));
  }, [student.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    sendAssistantMessage(student.id, text)
      .then((res) => {
        setMessages((prev) => [...prev, { role: "assistant", content: res.reply, intent: res.intent }]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false));
  }

  return (
    <div className="flex h-[calc(100vh-89px)] flex-col">
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <p className="mb-6 text-[15px] text-ink/60">
          Ask about matches, skill gaps, applications, or interview prep — it remembers what you've discussed.
        </p>

        {loadingHistory && (
          <div className="flex items-center gap-2 text-[14px] text-ink/50">
            <Loader2 size={16} className="animate-spin" />
            Loading your conversation...
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <p className="text-[14px] text-ink/45">
            Try: "What internships should I apply to?" or "What skills am I missing for that role?"
          </p>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center bg-navy text-white">
                  <Sparkles size={13} strokeWidth={1.75} />
                </div>
              )}
              <div className={`max-w-lg ${m.role === "user" ? "" : ""}`}>
                {m.role === "assistant" && INTENT_LABELS[m.intent] && (
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-ink/35">
                    {INTENT_LABELS[m.intent]}
                  </p>
                )}
                <div
                  className={`px-4 py-3 text-[14px] leading-relaxed ${
                    m.role === "user" ? "bg-navy text-white" : "border border-line bg-white text-ink/85"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center bg-navy text-white">
                <Sparkles size={13} strokeWidth={1.75} />
              </div>
              <div className="flex items-center gap-2 border border-line bg-white px-4 py-3 text-[13px] text-ink/50">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-10 mb-2 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">
          {error}
        </p>
      )}

      <div className="border-t border-line px-10 py-5">
        <div className="flex items-center gap-3 border border-line bg-white px-4 py-2.5">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about internships, skill gaps, or interview prep..."
            className="w-full text-[14px] text-ink outline-none placeholder:text-ink/35"
          />
          <button onClick={send} disabled={!draft.trim() || sending} aria-label="Send" className="text-navy hover:opacity-70 disabled:opacity-30">
            <Send size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
