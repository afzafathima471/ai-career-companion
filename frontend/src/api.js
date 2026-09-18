const API_BASE = "http://127.0.0.1:8000";

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
