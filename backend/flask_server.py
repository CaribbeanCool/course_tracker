import os
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import bcrypt
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool


def _db_target() -> str:
    raw = (os.getenv("DB_TARGET") or "").strip().lower()
    if raw in {"prod", "production"}:
        return "prod"
    if raw in {"dev", "development"}:
        return "dev"
    return "dev"


def _first(*keys: str, default: str) -> str:
    for key in keys:
        val = os.getenv(key)
        if val is not None and val.strip() != "":
            return val
    return default


def _resolve_db_conn_args() -> Tuple[Tuple[Any, ...], Dict[str, Any]]:
    """Resolve psycopg2.connect args/kwargs based on env vars.

    Supports:
    - DATABASE_URL_DEV / DATABASE_URL_PROD / DATABASE_URL
    - DB_*_DEV/PROD and DB_* fallbacks (mirrors frontend)
    - legacy HOST/PORT/DB/USER/PASS from backend/.env
    """

    target = _db_target()
    suffix = target.upper()

    database_url = os.getenv(f"DATABASE_URL_{suffix}") or os.getenv("DATABASE_URL")
    if database_url:
        return (database_url,), {}

    host = _first(
        f"DB_HOST_{suffix}",
        "HOST",
        "POSTGRES_HOST",
        default="localhost",
    )
    port = int(
        _first(
            f"DB_PORT_{suffix}",
            "PORT",
            "POSTGRES_PORT",
            default="5432",
        )
    )
    dbname = _first(
        f"DB_NAME_{suffix}",
        "DB",
        f"POSTGRES_DB_{suffix}",
        "POSTGRES_DB",
        "DB",
        default="courses",
    )
    user = _first(
        f"DB_USER_{suffix}",
        "DB_USER",
        f"POSTGRES_USER_{suffix}",
        "POSTGRES_USER",
        "USER",
        default="postgres",
    )
    password = _first(
        f"DB_PASSWORD_{suffix}",
        "DB_PASSWORD",
        f"POSTGRES_PASSWORD_{suffix}",
        "POSTGRES_PASSWORD",
        "PASS",
        default="postgres",
    )

    return (), {
        "host": host,
        "port": port,
        "dbname": dbname,
        "user": user,
        "password": password,
    }


def _serialize_dt(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _serialize_course(row: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _serialize_dt(v) for k, v in row.items()}


def _require_user_id() -> int:
    raw = request.headers.get("X-User-Id") or request.headers.get("x-user-id")
    if not raw:
        raise ValueError("Missing X-User-Id")
    try:
        return int(str(raw))
    except ValueError as exc:
        raise ValueError("Invalid X-User-Id") from exc


def _compute_stats(courses: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_credits = 0
    total_hp = 0
    graded_credits = 0
    completed_courses = 0
    in_progress_courses = 0
    missing_courses = 0

    for course in courses:
        session = course.get("session")
        if session == "Falta":
            missing_courses += 1
            continue
        if session == "En curso":
            in_progress_courses += 1
            continue

        completed_courses += 1
        credits = int(course.get("credits") or 0)
        hp = int(course.get("hp") or 0)
        grade = course.get("grade")

        total_credits += credits
        if grade and grade not in {"PASS", "W", ""} and hp > 0:
            total_hp += hp
            graded_credits += credits

    gpa = (total_hp / graded_credits) if graded_credits > 0 else 0

    return {
        "totalCredits": total_credits,
        "totalHp": total_hp,
        "gpa": round(gpa, 2),
        "completedCourses": completed_courses,
        "inProgressCourses": in_progress_courses,
        "missingCourses": missing_courses,
    }


def create_app() -> Flask:
    load_dotenv()

    app = Flask(__name__)

    cors_origins = os.getenv("CORS_ORIGINS")
    if cors_origins:
        origins = [o.strip() for o in cors_origins.split(",") if o.strip()]
        CORS(app, origins=origins)
    else:
        CORS(app)

    conn_args, conn_kwargs = _resolve_db_conn_args()
    pool: Optional[ThreadedConnectionPool]
    try:
        pool = ThreadedConnectionPool(
            1,
            int(os.getenv("DB_POOL_MAX") or "10"),
            *conn_args,
            **conn_kwargs,
        )
    except Exception as exc:
        pool = None
        app.logger.warning("DB pool init failed; continuing without DB: %s", exc)

    @contextmanager
    def db_conn():
        if pool is None:
            raise RuntimeError("Database unavailable")
        conn = pool.getconn()
        try:
            yield conn
        finally:
            pool.putconn(conn)

    def fetch_all_courses(user_id: int) -> List[Dict[str, Any]]:
        with db_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, credits, grade, hp, session, user_id, created_at, updated_at "
                "FROM courses WHERE user_id = %s ORDER BY session, name",
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    def fetch_course_by_id(course_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        with db_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, name, credits, grade, hp, session, user_id, created_at, updated_at "
                "FROM courses WHERE id = %s AND user_id = %s",
                (course_id, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    @app.get("/health")
    def health():
        return jsonify({"ok": True, "db": pool is not None})

    @app.post("/api/auth/verify")
    def verify_auth():
        payload = request.get_json(silent=True) or {}
        username = payload.get("username")
        password = payload.get("password")

        if not username or not password:
            return jsonify({"error": "Missing username/password"}), 400

        with db_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, username, password_hash FROM users WHERE username = %s",
                (username,),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Invalid credentials"}), 401

            stored_hash = (row.get("password_hash") or "").encode("utf-8")
            ok = False
            try:
                ok = bcrypt.checkpw(str(password).encode("utf-8"), stored_hash)
            except ValueError:
                ok = False

            if not ok:
                return jsonify({"error": "Invalid credentials"}), 401

            return jsonify({"id": int(row["id"]), "username": row["username"]})

    @app.get("/api/courses")
    def list_courses():
        try:
            user_id = _require_user_id()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

        stats = (request.args.get("stats") or "").lower() == "true"
        group_by = request.args.get("groupBy")

        courses = fetch_all_courses(user_id)

        if stats:
            return jsonify(_compute_stats(courses))

        if group_by == "semester":
            grouped: Dict[str, List[Dict[str, Any]]] = {}
            for course in courses:
                grouped.setdefault(course["session"], []).append(
                    _serialize_course(course)
                )
            return jsonify(grouped)

        return jsonify([_serialize_course(c) for c in courses])

    @app.post("/api/courses")
    def create_course():
        try:
            user_id = _require_user_id()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

        payload = request.get_json(silent=True) or {}
        name = payload.get("name")
        credits = payload.get("credits")
        grade = payload.get("grade")
        hp = payload.get("hp")
        session = payload.get("session")

        if not name or credits is None or not session:
            return jsonify({"error": "Name, credits, and session are required"}), 400

        try:
            credits_int = int(credits)
            hp_int = int(hp) if hp is not None else 0
        except ValueError:
            return jsonify({"error": "Invalid numeric field"}), 400

        with db_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO courses (name, credits, grade, hp, session, user_id) "
                "VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
                (
                    str(name),
                    credits_int,
                    str(grade or ""),
                    hp_int,
                    str(session),
                    user_id,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return jsonify(_serialize_course(dict(row))), 201

    @app.get("/api/courses/<int:course_id>")
    def get_course(course_id: int):
        try:
            user_id = _require_user_id()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

        course = fetch_course_by_id(course_id, user_id)
        if not course:
            return jsonify({"error": "Course not found"}), 404

        return jsonify(_serialize_course(course))

    @app.put("/api/courses/<int:course_id>")
    def update_course(course_id: int):
        try:
            user_id = _require_user_id()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

        payload = request.get_json(silent=True) or {}

        allowed = {"name", "credits", "grade", "hp", "session"}
        updates = {k: payload.get(k) for k in allowed if k in payload}
        if not updates:
            course = fetch_course_by_id(course_id, user_id)
            if not course:
                return jsonify({"error": "Course not found"}), 404
            return jsonify(_serialize_course(course))

        fields = []
        values: List[Any] = []

        if "name" in updates:
            fields.append("name = %s")
            values.append(str(updates["name"]))
        if "credits" in updates and updates["credits"] is not None:
            try:
                values.append(int(updates["credits"]))
            except ValueError:
                return jsonify({"error": "Invalid credits"}), 400
            fields.append("credits = %s")
        if "grade" in updates:
            fields.append("grade = %s")
            values.append(str(updates["grade"] or ""))
        if "hp" in updates and updates["hp"] is not None:
            try:
                values.append(int(updates["hp"]))
            except ValueError:
                return jsonify({"error": "Invalid hp"}), 400
            fields.append("hp = %s")
        if "session" in updates:
            fields.append("session = %s")
            values.append(str(updates["session"]))

        values.extend([course_id, user_id])

        with db_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"UPDATE courses SET {', '.join(fields)} WHERE id = %s AND user_id = %s RETURNING *",
                tuple(values),
            )
            row = cur.fetchone()
            conn.commit()
            if not row:
                return jsonify({"error": "Course not found"}), 404
            return jsonify(_serialize_course(dict(row)))

    @app.delete("/api/courses/<int:course_id>")
    def delete_course(course_id: int):
        try:
            user_id = _require_user_id()
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 401

        with db_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "DELETE FROM courses WHERE id = %s AND user_id = %s",
                (course_id, user_id),
            )
            deleted = (cur.rowcount or 0) > 0
            conn.commit()
            if not deleted:
                return jsonify({"error": "Course not found"}), 404
            return jsonify({"success": True})

    return app


app = create_app()


if __name__ == "__main__":
    railway_port = (os.getenv("PORT") or "").strip()

    host = (os.getenv("FLASK_HOST") or "").strip() or "127.0.0.1"
    if railway_port and not (os.getenv("FLASK_HOST") or "").strip():
        host = "0.0.0.0"

    port_raw = railway_port or (os.getenv("FLASK_PORT") or "").strip() or "3010"
    port = int(port_raw)

    debug = (os.getenv("FLASK_DEBUG") or "").strip().lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)
