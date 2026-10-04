import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, Plus, Pencil, Trash2, Check, X, MessageSquare } from "lucide-react";
import {
  sendAssistantMessage, listConversations, getConversationMessages,
  renameConversation, deleteConversation,
} from "../api";

const INTENT_LABELS = {
  recommend_internships: "Recommending internships",
  explain_match: "Explaining a match",
  explain_skill_gap: "Explaining a skill gap",
  compare_internships: "Comparing internships",
  customize_materials: "Customizing materials",
  interview_prep_summary: "Interview prep",
  general_question: null,
};

const SUGGESTIONS = [
  "What internships should I apply to?",
  "What skills am I missing for that role?",
  "Help me prepare for an interview",
];

// Group the chat list like ChatGPT/Claude: Today, Yesterday, Previous 7 days, Older.
function groupConversations(convs) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86400000;
  const groups = [["Today", []], ["Yesterday", []], ["Previous 7 days", []], ["Older", []]];
  convs.forEach((c) => {
    const age = startOfToday - new Date(c.updated_at);
    const i = age <= 0 ? 0 : age <= day ? 1 : age <= 7 * day ? 2 : 3;
    groups[i][1].push(c);
  });
  return groups.filter(([, items]) => items.length > 0);
}

export default function CareerAssistant({ student }) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null); // null = a new, not-yet-saved chat
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const bottomRef = useRef(null);
  const activeRef = useRef(null); // lets a slow reply know whether the user has since switched chats

  function openChat(id, msgs) {
    activeRef.current = id;
    setActiveId(id);
    setMessages(msgs);
  }

  function selectChat(id) {
    if (id === activeRef.current) return Promise.resolve();
    setError("");
    setLoadingChat(true);
    activeRef.current = id;
    setActiveId(id);
    setMessages([]);
    return getConversationMessages(student.id, id)
      .then((rows) => {
        if (activeRef.current === id) setMessages(rows.map((m) => ({ role: m.role, content: m.content, intent: m.intent })));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingChat(false));
  }

  // On load: show the chat list and open the most recent chat (or an empty new chat).
  useEffect(() => {
    listConversations(student.id)
      .then((list) => {
        setConversations(list);
        if (list.length > 0) return selectChat(list[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingList(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function newChat() {
    setError("");
    setLoadingChat(false);
    openChat(null, []);
  }

  function send(textOverride) {
    const text = (textOverride ?? draft).trim();
    if (!text || sending) return;
    setDraft("");
    setError("");
    const sentFrom = activeRef.current; // chat this message belongs to (null = new chat)
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    sendAssistantMessage(student.id, text, sentFrom)
      .then((res) => {
        // sidebar: add the new chat, or update its title, and move it to the top
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === res.conversation_id);
          const updated = {
            id: res.conversation_id, title: res.title, updated_at: res.updated_at,
            created_at: existing?.created_at ?? res.updated_at,
            message_count: (existing?.message_count ?? 0) + 2,
          };
          return [updated, ...prev.filter((c) => c.id !== res.conversation_id)];
        });
        if (activeRef.current === sentFrom) {
          activeRef.current = res.conversation_id;
          setActiveId(res.conversation_id);
          setMessages((prev) => [...prev, { role: "assistant", content: res.reply, intent: res.intent }]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setSending(false));
  }

  function startRename(c) {
    setEditingId(c.id);
    setEditTitle(c.title);
  }

  function saveRename() {
    const title = editTitle.trim();
    const id = editingId;
    setEditingId(null);
    if (!title) return;
    renameConversation(student.id, id, title)
      .then((c) => setConversations((prev) => prev.map((x) => (x.id === id ? { ...x, title: c.title } : x))))
      .catch((err) => setError(err.message));
  }

  function removeChat(c) {
    if (!window.confirm(`Delete "${c.title}"? This can't be undone.`)) return;
    deleteConversation(student.id, c.id)
      .then(() => {
        setConversations((prev) => prev.filter((x) => x.id !== c.id));
        if (activeRef.current === c.id) newChat();
      })
      .catch((err) => setError(err.message));
  }

  return (
    <div className="flex h-[calc(100vh-89px)]">
      {/* Chat list */}
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-line bg-white">
        <div className="p-3">
          <button
            onClick={newChat}
            className="flex w-full items-center gap-2 border border-line px-3 py-2 text-[13px] text-ink transition-colors hover:border-navy/40"
          >
            <Plus size={15} strokeWidth={1.75} />
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {loadingList && (
            <p className="flex items-center gap-2 px-2 py-2 text-[12px] text-ink/45">
              <Loader2 size={13} className="animate-spin" /> Loading chats...
            </p>
          )}
          {!loadingList && conversations.length === 0 && (
            <p className="px-2 py-2 text-[12px] text-ink/40">No saved chats yet. Send a message and it will appear here.</p>
          )}

          {groupConversations(conversations).map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wide text-ink/35">{label}</p>
              {items.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 border-l-2 px-2 py-2 text-[13px] ${
                    c.id === activeId ? "border-gold bg-paper text-ink" : "border-transparent text-ink/65 hover:bg-paper"
                  }`}
                >
                  {editingId === c.id ? (
                    <>
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 border border-navy bg-white px-1.5 py-0.5 text-[13px] text-ink outline-none"
                      />
                      <button onClick={saveRename} aria-label="Save name" className="text-sage"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} aria-label="Cancel" className="text-ink/40"><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => selectChat(c.id)} title={c.title} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <MessageSquare size={13} strokeWidth={1.75} className="flex-shrink-0 text-ink/35" />
                        <span className="truncate">{c.title}</span>
                      </button>
                      <button onClick={() => startRename(c)} aria-label="Rename chat" className="hidden text-ink/35 hover:text-ink group-hover:block">
                        <Pencil size={13} strokeWidth={1.75} />
                      </button>
                      <button onClick={() => removeChat(c)} aria-label="Delete chat" className="hidden text-ink/35 hover:text-gold group-hover:block">
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-10 py-8">
          {loadingChat && (
            <div className="flex items-center gap-2 text-[14px] text-ink/50">
              <Loader2 size={16} className="animate-spin" />
              Loading chat...
            </div>
          )}

          {!loadingChat && messages.length === 0 && !loadingList && (
            <div>
              <p className="mb-1 font-display text-[20px] text-ink">New chat</p>
              <p className="mb-5 text-[14px] text-ink/55">
                Ask about matches, skill gaps, applications, or interview prep. Each chat remembers what you've
                discussed in it, and is saved in the list on the left.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="border border-line bg-white px-3 py-1.5 text-[13px] text-ink/70 transition-colors hover:border-navy/40">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="mr-3 flex h-7 w-7 flex-shrink-0 items-center justify-center bg-navy text-white">
                    <Sparkles size={13} strokeWidth={1.75} />
                  </div>
                )}
                <div className="max-w-lg">
                  {m.role === "assistant" && INTENT_LABELS[m.intent] && (
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-ink/35">{INTENT_LABELS[m.intent]}</p>
                  )}
                  <div
                    className={`whitespace-pre-line px-4 py-3 text-[14px] leading-relaxed ${
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
          <p className="mx-10 mb-2 border border-gold/40 bg-gold/10 px-3 py-2 text-[13px] text-ink/80">{error}</p>
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
            <button onClick={() => send()} disabled={!draft.trim() || sending} aria-label="Send" className="text-navy hover:opacity-70 disabled:opacity-30">
              <Send size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
