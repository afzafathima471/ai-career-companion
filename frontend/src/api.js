const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON
    }
    throw new Error(detail);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getOrCreateStudent({ name, email, target_role }) {
  try {
    return await request("/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, target_role }),
    });
  } catch (err) {
    if (String(err.message).toLowerCase().includes("already exists")) {
      const all = await request("/students");
      const existing = all.find((s) => s.email === email);
      if (existing) return existing;
    }
    throw err;
  }
}

export function createStudent({ name, email, target_role = null }) {
  return request("/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, target_role }),
  });
}

export function loginStudent(email) {
  return request(`/students/lookup?email=${encodeURIComponent(email)}`);
}

export function updateStudent(studentId, payload) {
  return request(`/students/${studentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getProfile(studentId) {
  return request(`/students/${studentId}/profile`);
}

export function listResumes(studentId) {
  return request(`/students/${studentId}/resumes`);
}

export async function uploadResume(studentId, file) {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/students/${studentId}/resumes`, { method: "POST", body: formData });
}

export function parseResume(studentId, resumeId) {
  return request(`/students/${studentId}/resumes/${resumeId}/parse`, { method: "POST" });
}

export function getMatches(studentId) {
  return request(`/students/${studentId}/matches`);
}

export function getRecommendedInternships(studentId, { topK = 5, withReasoning = true } = {}) {
  return request(
    `/students/${studentId}/recommended-internships?top_k=${topK}&with_reasoning=${withReasoning}`
  );
}

export function getSkillGap(studentId, jobId, { withRecommendations = true } = {}) {
  return request(
    `/students/${studentId}/skill-gap/${jobId}?with_recommendations=${withRecommendations}`
  );
}

export function customizeResume(studentId, jobId, feedback = null) {
  return request(`/students/${studentId}/customize/resume/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
}

export function customizeCoverLetter(studentId, jobId, feedback = null) {
  return request(`/students/${studentId}/customize/cover-letter/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
}

export function getInterviewPrep(studentId, jobId, questionsPerCategory = 2) {
  return request(
    `/students/${studentId}/interview-prep/${jobId}?questions_per_category=${questionsPerCategory}`
  );
}

export function evaluateInterviewAnswer(studentId, question, answer) {
  return request(`/students/${studentId}/interview-prep/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer }),
  });
}

// conversationId = null starts a NEW chat (named after the first message);
// pass an id to continue an existing chat.
export function sendAssistantMessage(studentId, message, conversationId = null) {
  return request(`/students/${studentId}/assistant/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
}

export function listConversations(studentId) {
  return request(`/students/${studentId}/assistant/conversations`);
}

export function getConversationMessages(studentId, conversationId) {
  return request(`/students/${studentId}/assistant/conversations/${conversationId}/messages`);
}

export function renameConversation(studentId, conversationId, title) {
  return request(`/students/${studentId}/assistant/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(studentId, conversationId) {
  return request(`/students/${studentId}/assistant/conversations/${conversationId}`, { method: "DELETE" });
}

export function getAssistantHistory(studentId) {
  return request(`/students/${studentId}/assistant/history`);
}

// --- M4.1: Application Tracking ---

export function createApplication(studentId, payload) {
  return request(`/students/${studentId}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function listApplications(studentId, filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
  const qs = params.toString();
  return request(`/students/${studentId}/applications${qs ? `?${qs}` : ""}`);
}

export function getApplicationDashboard(studentId) {
  return request(`/students/${studentId}/applications/dashboard`);
}

export function getApplicationReminders(studentId, windowDays = 7) {
  return request(`/students/${studentId}/applications/reminders?window_days=${windowDays}`);
}

export function updateApplication(studentId, applicationId, payload) {
  return request(`/students/${studentId}/applications/${applicationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteApplication(studentId, applicationId) {
  return request(`/students/${studentId}/applications/${applicationId}`, { method: "DELETE" });
}