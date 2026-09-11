const API_BASE = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new Error(detail);
  }
  // 204 / empty responses
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Creates a student, or — if that email already exists — fetches the
 * existing one. There's no dedicated "get by email" endpoint yet, so this
 * falls back to scanning the list. Fine at this scale; revisit if the
 * student list grows.
 */
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
  return request(`/students/${studentId}/resumes`, {
    method: "POST",
    body: formData, // no Content-Type header — browser sets the multipart boundary
  });
}

export function getMatches(studentId) {
  return request(`/students/${studentId}/matches`);
}

export function listJobs() {
  return request("/jobs");
}

export function parseResume(studentId, resumeId) {
  return request(`/students/${studentId}/resumes/${resumeId}/parse`, {
    method: "POST",
  });
}
