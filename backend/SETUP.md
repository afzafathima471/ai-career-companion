# Backend setup — Step 1: Student profiles

## 1. Place this folder
Put the `backend` folder at the same level as `frontend`, so your project
root looks like:

```
ai-career-companion-agent/
├── frontend/
└── backend/
```

## 2. Create a virtual environment and install dependencies
Open a terminal inside `backend/`:

```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

(On the Activate step, if PowerShell blocks it with an execution-policy
error, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
first, then try activating again.)

## 3. Run the server

```powershell
uvicorn app.main:app --reload
```

You should see `Uvicorn running on http://127.0.0.1:8000`. A `career.db`
SQLite file will appear in the `backend` folder automatically — that's
your local database, no setup needed.

## 4. Test it
Open `http://127.0.0.1:8000/docs` in your browser — FastAPI generates an
interactive API tester automatically. Try the `POST /students` endpoint
with a body like:

```json
{
  "name": "Afza Fathima",
  "email": "afza@example.com",
  "target_role": "Frontend Intern"
}
```

Then `GET /students` should show it in the list.

## What's in here
- `app/database.py` — SQLite connection for now; swap `DATABASE_URL` to a
  Postgres/Supabase URL later via a `.env` file (see `.env.example`) — no
  other code changes needed.
- `app/models.py` — the `Student` table definition.
- `app/schemas.py` — request/response validation (Pydantic).
- `app/routers/students.py` — create, list, get-by-id, and update endpoints.
- `app/main.py` — the FastAPI app, with CORS already configured so your
  Vite frontend (`localhost:5173` / `5174`) can call this API directly.

## Next steps (not in this drop)
- Resume upload endpoint (store the file + create a `Resume` row)
- Resume parsing with an LLM (extract skills/education/experience into
  structured fields)
- Wiring the frontend's Resume page to actually call this API instead of
  using sample data

We'll do these one at a time, same as this step.
