"""
M4.1 — Application Tracking & Management Module.

Pure, deterministic logic for the pieces that need to be exact: status
validation, dashboard counts, and deadline/reminder calculations. No LLM
involved anywhere in this module — there's nothing here that benefits
from natural language generation, and a wrong count on a dashboard is a
real bug, not a stylistic choice.
"""
from datetime import datetime, timedelta

STATUS_STAGES = [
    "Saved", "Planning to apply", "Applied", "Application under review",
    "Shortlisted", "Interview scheduled", "Interview completed",
    "Offer received", "Rejected", "Withdrawn",
]

# Statuses that mean the application is no longer "in flight" -- used to
# compute "active applications" on the dashboard. Offer received is a
# terminal (and positive) outcome, counted on its own, same as Rejected.
TERMINAL_STATUSES = {"Offer received", "Rejected", "Withdrawn"}

DEFAULT_REMINDER_WINDOW_DAYS = 7
STALE_FOLLOW_UP_DAYS = 10  # "Applied" with no status change in this long -> suggest a follow-up


def validate_status(status: str) -> str:
    """Returns the status unchanged if valid, otherwise raises ValueError
    with the exact list of valid options -- callers (the API layer)
    convert this into a clean 422, not a silent fallback. A dashboard
    metric is wrong if a bad status value is allowed to slip in quietly."""
    if status not in STATUS_STAGES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {', '.join(STATUS_STAGES)}")
    return status


def compute_dashboard(applications: list[dict], today: datetime = None) -> dict:
    """applications: list of dicts with at least status, deadline,
    interview_date keys (datetime or None). Matches exactly the 6 metrics
    the milestone lists."""
    today = today or datetime.now()

    total = len(applications)
    active = sum(1 for a in applications if a["status"] not in TERMINAL_STATUSES)
    offers = sum(1 for a in applications if a["status"] == "Offer received")
    rejected = sum(1 for a in applications if a["status"] == "Rejected")

    upcoming_deadlines = sum(
        1 for a in applications
        if a.get("deadline") and a["status"] not in TERMINAL_STATUSES
        and today <= a["deadline"] <= today + timedelta(days=DEFAULT_REMINDER_WINDOW_DAYS)
    )
    interviews_scheduled = sum(1 for a in applications if a["status"] == "Interview scheduled")

    return {
        "total_applications": total,
        "active_applications": active,
        "upcoming_deadlines": upcoming_deadlines,
        "interviews_scheduled": interviews_scheduled,
        "offers_received": offers,
        "rejected_applications": rejected,
    }


def compute_reminders(applications: list[dict], today: datetime = None, window_days: int = DEFAULT_REMINDER_WINDOW_DAYS) -> dict:
    """Four categories the milestone names explicitly. Each rule is
    deterministic and stated plainly so it's obvious exactly why
    something shows up here."""
    today = today or datetime.now()
    window_end = today + timedelta(days=window_days)

    upcoming_deadlines = [
        a for a in applications
        if a.get("deadline") and a["status"] not in TERMINAL_STATUSES
        and today <= a["deadline"] <= window_end
    ]
    upcoming_deadlines.sort(key=lambda a: a["deadline"])

    upcoming_interviews = [
        a for a in applications
        if a.get("interview_date") and a["status"] == "Interview scheduled"
        and today <= a["interview_date"] <= window_end
    ]
    upcoming_interviews.sort(key=lambda a: a["interview_date"])

    follow_ups = [
        a for a in applications
        if a["status"] == "Applied"
        and a.get("application_date")
        and (today - a["application_date"]) >= timedelta(days=STALE_FOLLOW_UP_DAYS)
    ]

    pending_applications = [
        a for a in applications
        if a["status"] in ("Saved", "Planning to apply")
    ]

    return {
        "upcoming_deadlines": upcoming_deadlines,
        "upcoming_interviews": upcoming_interviews,
        "follow_ups_suggested": follow_ups,
        "pending_applications": pending_applications,
    }


def filter_applications(applications: list[dict], company: str = None, title: str = None,
                          status: str = None, deadline_before: datetime = None,
                          deadline_after: datetime = None,
                          application_date_before: datetime = None,
                          application_date_after: datetime = None) -> list[dict]:
    """In-memory filtering over an already-fetched list -- kept here
    (rather than only as a SQL query in the router) so the filtering
    rules themselves are unit-testable independent of a database."""
    result = applications
    if company:
        result = [a for a in result if company.lower() in a["company"].lower()]
    if title:
        result = [a for a in result if title.lower() in a["title"].lower()]
    if status:
        result = [a for a in result if a["status"] == status]
    if deadline_before:
        result = [a for a in result if a.get("deadline") and a["deadline"] <= deadline_before]
    if deadline_after:
        result = [a for a in result if a.get("deadline") and a["deadline"] >= deadline_after]
    if application_date_before:
        result = [a for a in result if a.get("application_date") and a["application_date"] <= application_date_before]
    if application_date_after:
        result = [a for a in result if a.get("application_date") and a["application_date"] >= application_date_after]
    return result
