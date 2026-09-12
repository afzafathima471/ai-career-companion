"""
A curated skill vocabulary used to extract structured skills from free-text
job requirements/descriptions. Deliberately spans multiple domains — tech,
marketing, design, business — since the source dataset covers internships
across many fields, not just software roles.

This is keyword-matching, not an ML model: a skill counts as "present" if
its exact phrase (word-boundary, case-insensitive) appears in the text.
That's a real limitation — it will miss paraphrases ("building websites"
won't match "Web Development" unless that phrase appears) — documented in
the pipeline README.
"""

SKILL_VOCABULARY = [
    # Programming languages
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "SQL",
    "Ruby", "PHP", "Swift", "Kotlin", "HTML", "CSS",
    # Frameworks / platforms
    "React", "Angular", "Vue.js", "Node.js", "Django", "Flask", "FastAPI",
    "TensorFlow", "PyTorch", "AWS", "Azure", "Google Cloud", "Docker",
    "Kubernetes", "WordPress", "Salesforce", "HubSpot",
    # Data / analytics tools
    "Excel", "Tableau", "Power BI", "Google Analytics", "SPSS", "SAS",
    "Machine Learning", "Data Analysis", "Data Visualization",
    # Design tools
    "Photoshop", "Illustrator", "Figma", "Sketch", "InDesign", "Canva",
    "Adobe Creative Suite", "UX Design", "UI Design", "Graphic Design",
    # Marketing / business
    "Social Media Marketing", "Content Marketing", "Email Marketing", "SEO",
    "SEM", "Market Research", "Copywriting", "Public Relations",
    "Business Development", "Sales", "CRM", "Google Ads",
    # Office / productivity
    "PowerPoint", "Microsoft Office", "Word", "Google Sheets",
    # Soft skills
    "Communication", "Teamwork", "Leadership", "Problem Solving",
    "Time Management", "Attention to Detail", "Creativity",
    "Analytical Skills", "Project Management", "Organizational Skills",
    "Written Communication", "Verbal Communication", "Multitasking",
]

# Sentence-level markers that flag a requirement as "nice to have" rather
# than mandatory — used to split extracted skills into required vs preferred.
PREFERRED_MARKERS = [
    "preferred", "nice to have", "a plus", "is a plus", "bonus",
    "desirable", "ideally", "plus if", "even better",
]
