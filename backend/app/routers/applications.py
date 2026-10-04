from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..application_tracker import compute_dashboard, compute_reminders, filter_applications

router = APIRouter(prefix="/students/{student_id}/applications", tags=["application-tracking"])


def _ensure_student(student_id: str, db: Session):
    if not db.query(models.Student).filter(models.Student.id == student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")


def _to_dict(app: models.Application) -> dict:
    return {
        "id": app.id, "status": app.status, "company": app.company, "title": app.title,
        "deadline": app.deadline, "interview_date": app.interview_date,
        "application_date": app.application_date,
    }


@router.post("", response_model=schemas.ApplicationOut, status_code=201)
def create_application(student_id: str, payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    _ensure_student(student_id, db)
    app = models.Application(student_id=student_id, **payload.model_dump())
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("", response_model=list[schemas.ApplicationOut])
def list_applications(
    student_id: str,
    company: str | None = Query(None),
    title: str | None = Query(None),
    status: str | None = Query(None),
    deadline_before: datetime | None = Query(None),
    deadline_after: datetime | None = Query(None),
    application_date_before: datetime | None = Query(None),
    application_date_after: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    _ensure_student(student_id, db)
    all_apps = db.query(models.Application).filter(models.Application.student_id == student_id).all()

    # Filtering logic lives in application_tracker.py (testable in isolation);
    # here we just adapt ORM rows <-> dicts at the boundary.
    as_dicts = {a.id: a for a in all_apps}
    dict_rows = [{"id": a.id, "company": a.company, "title": a.title, "status": a.status, "deadline": a.deadline,
                  "application_date": a.application_date} for a in all_apps]
    filtered_ids = {
        row["id"] for row in filter_applications(
            dict_rows, company=company, title=title, status=status,
            deadline_before=deadline_before, deadline_after=deadline_after,
            application_date_before=application_date_before, application_date_after=application_date_after,
        )
    }
    result = [as_dicts[i] for i in as_dicts if i in filtered_ids]
    result.sort(key=lambda a: a.created_at, reverse=True)
    return result


@router.get("/dashboard", response_model=schemas.DashboardOut)
def get_dashboard(student_id: str, db: Session = Depends(get_db)):
    _ensure_student(student_id, db)
    apps = db.query(models.Application).filter(models.Application.student_id == student_id).all()
    return compute_dashboard([_to_dict(a) for a in apps])


@router.get("/reminders")
def get_reminders(student_id: str, window_days: int = Query(7, ge=1, le=90), db: Session = Depends(get_db)):
    _ensure_student(student_id, db)
    apps = db.query(models.Application).filter(models.Application.student_id == student_id).all()
    reminders = compute_reminders([_to_dict(a) for a in apps], window_days=window_days)
    # strip the raw dict rows down to just id + company + title for the response
    def simplify(items):
        return [{"id": i["id"], "company": i["company"], "title": i["title"],
                  "deadline": i.get("deadline"), "interview_date": i.get("interview_date")} for i in items]
    return {k: simplify(v) for k, v in reminders.items()}


@router.get("/{application_id}", response_model=schemas.ApplicationOut)
def get_application(student_id: str, application_id: str, db: Session = Depends(get_db)):
    _ensure_student(student_id, db)
    app = db.query(models.Application).filter(
        models.Application.id == application_id, models.Application.student_id == student_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{application_id}", response_model=schemas.ApplicationOut)
def update_application(student_id: str, application_id: str, payload: schemas.ApplicationUpdate, db: Session = Depends(get_db)):
    _ensure_student(student_id, db)
    app = db.query(models.Application).filter(
        models.Application.id == application_id, models.Application.student_id == student_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app, field, value)

    db.commit()
    db.refresh(app)
    return app


@router.delete("/{application_id}", status_code=204)
def delete_application(student_id: str, application_id: str, db: Session = Depends(get_db)):
    _ensure_student(student_id, db)
    app = db.query(models.Application).filter(
        models.Application.id == application_id, models.Application.student_id == student_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()
