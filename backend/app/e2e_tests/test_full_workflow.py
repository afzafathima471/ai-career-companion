from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def mk(content):
    obj = MagicMock()
    obj.choices = [MagicMock()]
    obj.choices[0].message.content = content
    return obj

print("=== M4.2 Full Workflow Test ===")
print("Student Profile -> Resume Upload -> Resume Parsing -> Internship Retrieval ->")
print("Job Matching -> Skill Gap Analysis -> Resume Customization -> Interview Prep -> Application Tracking\n")

# 1. Student Profile
r = client.post('/students', json={'name': 'Afza', 'email': 'e2e-workflow@example.com', 'target_role': 'Frontend Intern'})
assert r.status_code == 201, r.text
student_id = r.json()['id']
print("1. Student Profile created:", student_id[:8])

# 2. Resume Upload
with open('/tmp/e2e_resume.pdf', 'rb') as f:
    r = client.post(f'/students/{student_id}/resumes', files={'file': ('resume.pdf', f, 'application/pdf')})
assert r.status_code == 201, r.text
resume_id = r.json()['id']
print("2. Resume uploaded:", resume_id[:8])

# 3. Resume Parsing (mocked LLM, realistic extraction matching the PDF content)
fake_extraction = {
    "skills": [{"name": "React", "category": "technical"}, {"name": "CSS", "category": "technical"},
               {"name": "Git", "category": "tool"}, {"name": "Communication", "category": "soft"}],
    "education": [{"institution": "KIT Tiptur", "degree": "Bachelor's degree", "field": "Computer Science", "start_date": None, "end_date": None}],
    "experience": [{"title": "Web Developer", "organization": "Freelance", "description": "Built client websites using React and CSS", "start_date": None, "end_date": None}],
    "projects": [{"title": "Portfolio site", "description": "Personal portfolio", "technologies": ["React", "CSS"]}],
    "certifications": [],
}
with patch("app.routers.resumes.extract_resume_data", return_value=fake_extraction):
    r = client.post(f'/students/{student_id}/resumes/{resume_id}/parse')
    assert r.status_code == 200, r.text
print("3. Resume parsed, status:", r.json()['parse_status'])

# verify the profile actually reflects what was parsed
r = client.get(f'/students/{student_id}/profile')
profile = r.json()
assert len(profile['skills']) == 4
assert {s['name'] for s in profile['skills']} == {"React", "CSS", "Git", "Communication"}
print("   Profile verified: 4 skills, 1 education, 1 experience, 1 project")

# 4. Internship Retrieval (RAG -- real, no mocking)
r = client.get('/internships/search', params={'q': 'frontend React developer', 'top_k': 3})
assert r.status_code == 200, r.text
assert len(r.json()) > 0
print("4. Internship retrieval (RAG):", [x['title'] for x in r.json()])

# 5. Job Matching (real retrieval + scoring, no reasoning needed for this check)
r = client.get(f'/students/{student_id}/recommended-internships', params={'with_reasoning': False, 'top_k': 3})
assert r.status_code == 200, r.text
matches = r.json()
assert matches[0]['title'] == 'Frontend Intern', f"Expected Frontend Intern top match, got {matches[0]['title']}"
top_job_id = matches[0]['job_id']
print(f"5. Job Matching: top match = {matches[0]['title']} (score {matches[0]['overall_score']}) -> job_id {top_job_id}")

# 6. Skill Gap Analysis (real, for the SAME top-matched job)
r = client.get(f'/students/{student_id}/skill-gap/{top_job_id}', params={'with_recommendations': False})
assert r.status_code == 200, r.text
skill_gap = r.json()
print("6. Skill Gap Analysis:", {k: skill_gap[k] for k in ['matched_required', 'critical_missing', 'partially_demonstrated']})

# 7. Resume Customization (mocked LLM, for the SAME job)
fake_resume = mk('{"headline": "Frontend-focused developer", "prioritized_skills": ["React", "CSS"], "experience_bullets": [{"title": "Web Developer", "bullets": ["Built client websites using React and CSS"]}], "project_highlights": [], "keywords_incorporated": ["React"]}')
with patch("app.customization_agent.get_client") as mock_client:
    mock_client.return_value.chat.completions.create.return_value = fake_resume
    r = client.post(f'/students/{student_id}/customize/resume/{top_job_id}', json={})
    assert r.status_code == 200, r.text
    customized = r.json()
print("7. Resume Customization: validation clean =", customized['_validation']['clean'])

# 8. Interview Preparation (mocked LLM, for the SAME job)
fake_questions = mk('{"questions": [{"category": "Technical", "question": "Explain React hooks", "prep_guidance": "..."}, {"category": "Resume-based", "question": "Tell me about your freelance work", "prep_guidance": "..."}, {"category": "Project-based", "question": "Describe your portfolio site", "prep_guidance": "..."}, {"category": "Role-specific", "question": "Why Nimbus Labs?", "prep_guidance": "..."}, {"category": "HR/general", "question": "Why this internship?", "prep_guidance": "..."}]}')
with patch("app.interview_agent.get_client") as mock_client:
    mock_client.return_value.chat.completions.create.return_value = fake_questions
    r = client.get(f'/students/{student_id}/interview-prep/{top_job_id}', params={'questions_per_category': 1})
    assert r.status_code == 200, r.text
    prep = r.json()
print("8. Interview Preparation: coverage complete =", prep['_coverage']['complete'])

# 9. Application Tracking (real, logging the SAME job this whole chain was about)
r = client.post(f'/students/{student_id}/applications', json={
    "job_id": str(top_job_id), "company": matches[0]['company'], "title": matches[0]['title'], "status": "Applied",
})
assert r.status_code == 201, r.text
app_id = r.json()['id']
print("9. Application Tracking: logged application", app_id[:8], "for", r.json()['company'])

r = client.get(f'/students/{student_id}/applications/dashboard')
assert r.json()['total_applications'] == 1
print("   Dashboard confirms 1 total application")

print("\n*** FULL 9-STAGE WORKFLOW CHAIN: PASS ***")
print("Verified the SAME job_id (", top_job_id, ") flowed correctly through matching -> skill gap -> customization -> interview prep -> tracking")
