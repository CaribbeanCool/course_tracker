## Flask backend

This folder hosts the backend API (Flask) used by the Next.js app.

### Run (dev)

From the repo root:

- Create/activate a venv and install deps:
  - `pip install -r backend/requirements.txt`
- Start the API:
  - `python backend/flask_server.py`

Environment:

- `FLASK_HOST` (default `127.0.0.1`)
- `FLASK_PORT` (default `3010`)
- DB configuration uses the same variables as the frontend (e.g. `DATABASE_URL_DEV` / `DB_HOST_DEV`, etc.)

### API

- `POST /api/auth/verify`
- `GET/POST /api/courses`
- `GET/PUT/DELETE /api/courses/<id>`

All `/api/courses*` endpoints expect `X-User-Id` (provided by the Next.js server routes).

With the current setup, the browser calls Flask directly and sends `X-User-Id` itself.
