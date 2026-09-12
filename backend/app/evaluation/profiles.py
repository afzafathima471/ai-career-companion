"""
M2.4 — five sample student profiles spanning different skill sets, used to
evaluate retrieval relevance and matching quality against manually-defined
expectations.

`domain_keywords` isn't used by the matching agent itself — it's an
evaluation-only signal: a recommended posting is auto-labeled "on-topic"
if its title/industry/function contains one of these words. This is an
objective, reproducible proxy for "was this a sensible recommendation,"
not a perfect one — see the README for its limitations.
"""

PROFILES = {
    "frontend_dev": {
        "target_role": "Frontend Intern",
        "skills": [{"name": n} for n in ["React", "JavaScript", "CSS", "HTML", "Git", "Python"]],
        "education": [{"institution": "KIT Tiptur", "degree": "Bachelor's degree", "field": "Computer Science"}],
        "experience": [{"title": "Web Developer", "organization": "Freelance"}],
        "projects": [{"title": "Portfolio website", "technologies": "React, CSS"}],
        "domain_keywords": ["web", "software", "developer", "frontend", "engineer", "javascript", "programming", "technology"],
    },
    "marketing": {
        "target_role": "Marketing Intern",
        "skills": [{"name": n} for n in ["Social Media Marketing", "Content Marketing", "SEO", "Copywriting", "Communication"]],
        "education": [{"institution": "State College", "degree": "Bachelor's degree", "field": "Marketing"}],
        "experience": [],
        "projects": [],
        "domain_keywords": ["marketing", "social media", "content", "seo", "advertising", "brand", "digital"],
    },
    "design": {
        "target_role": "Design Intern",
        "skills": [{"name": n} for n in ["Photoshop", "Illustrator", "Figma", "UX Design", "UI Design", "Graphic Design"]],
        "education": [{"institution": "Art Institute", "degree": "Bachelor's degree", "field": "Design"}],
        "experience": [],
        "projects": [{"title": "Mobile app redesign", "technologies": "Figma"}],
        "domain_keywords": ["design", "graphic", "ux", "ui", "creative", "visual", "brand"],
    },
    "data_science": {
        "target_role": "Data Science Intern",
        "skills": [{"name": n} for n in ["Python", "SQL", "Machine Learning", "Data Analysis", "Data Visualization", "Tableau"]],
        "education": [{"institution": "Tech University", "degree": "Bachelor's degree", "field": "Data Science"}],
        "experience": [],
        "projects": [{"title": "Sales forecasting model", "technologies": "Python, scikit-learn"}],
        "domain_keywords": ["data", "analytics", "analyst", "machine learning", "scientist", "engineering", "software"],
    },
    "sales_business": {
        "target_role": "Business Development Intern",
        "skills": [{"name": n} for n in ["Sales", "Business Development", "CRM", "Communication", "Market Research"]],
        "education": [{"institution": "Business School", "degree": "Bachelor's degree", "field": "Business Administration"}],
        "experience": [],
        "projects": [],
        "domain_keywords": ["sales", "business development", "account", "client", "partnership", "growth"],
    },
}
