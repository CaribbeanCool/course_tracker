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

### Run (Railway)

Railway injects a `PORT` environment variable. The server must bind to that port and to `0.0.0.0`.

Recommended start command (pick the one that matches your service root):

- If the Railway service root is `backend/`:
  - `gunicorn flask_server:app --bind 0.0.0.0:$PORT`
- If the Railway service root is the repo root:
  - `gunicorn backend.flask_server:app --bind 0.0.0.0:$PORT`

Environment to set in Railway:

- `PORT` is reserved by Railway for the web process. Do not use it for your database port.
- `DATABASE_URL` (or `DATABASE_URL_PROD`) pointing at your production Postgres
- `DB_TARGET=prod` (optional, but recommended if you use both dev/prod vars)
- `CORS_ORIGINS` set to your deployed frontend origin (comma-separated if multiple)

### API

- `POST /api/auth/verify`
- `GET/POST /api/courses`
- `GET/PUT/DELETE /api/courses/<id>`

All `/api/courses*` endpoints expect `X-User-Id` (provided by the Next.js server routes).

With the current setup, the browser calls Flask directly and sends `X-User-Id` itself.
