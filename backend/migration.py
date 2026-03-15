import json
import os
import argparse
from typing import Any, Dict, Iterable, List, Optional, Tuple

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from dotenv import load_dotenv


TABLE_NAME = "courses"
REQUIRED_FIELDS = ["name", "credits", "session"]


def _is_wildcard_name(name: Any) -> bool:
    return isinstance(name, str) and name.endswith("****")


def _is_empty(value: Any) -> bool:
    return value is None or (isinstance(value, str) and value.strip() == "")


def _to_int(value: Any, *, default: Optional[int] = None) -> Optional[int]:
    if value is None:
        return default
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        s = value.strip()
        if s == "":
            return default
        try:
            return int(s)
        except ValueError:
            return default
    return default


def is_valid_course(course: Dict[str, Any]) -> bool:
    for field in REQUIRED_FIELDS:
        if field not in course or _is_empty(course[field]):
            return False
    return True


def clean_course_data(course: Dict[str, Any]) -> Dict[str, Any]:
    cleaned = dict(course)

    if isinstance(cleaned.get("name"), str):
        cleaned["name"] = cleaned["name"].strip()
    if isinstance(cleaned.get("session"), str):
        cleaned["session"] = cleaned["session"].strip()

    grade = cleaned.get("grade")
    if grade is None:
        cleaned["grade"] = ""
    elif isinstance(grade, str):
        cleaned["grade"] = grade.strip()

    cleaned["credits"] = _to_int(cleaned.get("credits"), default=None)
    cleaned["hp"] = _to_int(cleaned.get("hp"), default=0)

    return cleaned


def dedupe_courses(courses: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate by course 'name' except wildcard names ending with '****'.

    For wildcard names (e.g. LIBR****, SOHU****), duplicates are preserved.
    For all other names, later records with non-empty values overwrite earlier ones.
    """
    result: List[Dict[str, Any]] = []
    index_by_name: Dict[str, int] = {}

    for raw in courses:
        course = clean_course_data(raw)
        name = course.get("name")
        if _is_empty(name):
            continue

        if _is_wildcard_name(name):
            result.append(course)
            continue

        if name not in index_by_name:
            index_by_name[name] = len(result)
            result.append(course)
            continue

        existing = result[index_by_name[name]]
        for key in ("credits", "grade", "hp", "session"):
            incoming_val = course.get(key)
            if not _is_empty(incoming_val):
                existing[key] = incoming_val

    return result


def get_pg_connection():
    """Connect to the Postgres container using env vars.

    Supported env vars:
      - POSTGRES_HOST (default: localhost)
      - POSTGRES_PORT (default: 5432)
      - POSTGRES_DB (default: postgres)
      - POSTGRES_USER (default: postgres)
      - POSTGRES_PASSWORD (default: postgres)

    Alternatively, you can set DATABASE_URL.
    """

    def _target() -> str:
        raw = (os.getenv("DB_TARGET") or "").strip().lower()
        if raw in {"prod", "production"}:
            return "prod"
        if raw in {"dev", "development"}:
            return "dev"
        return "dev"

    target = _target()
    target_suffix = target.upper()

    database_url = os.getenv(f"DATABASE_URL_{target_suffix}") or os.getenv(
        "DATABASE_URL"
    )
    if database_url:
        return psycopg2.connect(database_url)

    def _first(*keys: str, default: str) -> str:
        for key in keys:
            val = os.getenv(key)
            if val is not None and val.strip() != "":
                return val
        return default

    host = _first(
        f"DB_HOST_{target_suffix}",
        "DB_HOST",
        "POSTGRES_HOST",
        "HOST",
        default="localhost",
    )
    port = int(
        _first(
            f"DB_PORT_{target_suffix}",
            "DB_PORT",
            "POSTGRES_PORT",
            "PORT",
            default="5432",
        )
    )
    dbname = _first(
        f"DB_NAME_{target_suffix}",
        "DB_NAME",
        f"POSTGRES_DB_{target_suffix}",
        "POSTGRES_DB",
        "DB",
        default="postgres",
    )
    user = _first(
        f"DB_USER_{target_suffix}",
        "DB_USER",
        f"POSTGRES_USER_{target_suffix}",
        "POSTGRES_USER",
        "USER",
        default="postgres",
    )
    password = _first(
        f"DB_PASSWORD_{target_suffix}",
        "DB_PASSWORD",
        f"POSTGRES_PASSWORD_{target_suffix}",
        "POSTGRES_PASSWORD",
        "PASS",
        default="postgres",
    )

    return psycopg2.connect(
        host=host, port=port, dbname=dbname, user=user, password=password
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import courses into Postgres")
    parser.add_argument(
        "--db-target",
        choices=["dev", "prod"],
        help="Select which DB config to use (maps to DATABASE_URL_DEV/PROD).",
    )
    return parser.parse_args()


def apply_schema(conn, schema_path: str = "../frontend/scripts/init-db.sql") -> None:
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with conn.cursor() as cur:
        cur.execute(schema_sql)


def upsert_courses(conn, courses: List[Dict[str, Any]]) -> Tuple[int, int]:
    valid_courses = [c for c in courses if is_valid_course(c)]
    if not valid_courses:
        return 0, 0

    wildcard = [c for c in valid_courses if _is_wildcard_name(c.get("name"))]
    normal = [c for c in valid_courses if not _is_wildcard_name(c.get("name"))]

    rows_normal = [
        (c["name"], c["credits"], c.get("grade", ""), c.get("hp", 0), c["session"])
        for c in normal
    ]
    rows_wildcard = [
        (c["name"], c["credits"], c.get("grade", ""), c.get("hp", 0), c["session"])
        for c in wildcard
    ]

    with conn.cursor() as cur:
        if rows_normal:
            # Matches the partial unique index in schema.sql.
            upsert_stmt = sql.SQL(
                """
                INSERT INTO {table} (name, credits, grade, hp, session)
                VALUES %s
                ON CONFLICT (name) WHERE right(name, 4) <> '****'
                DO UPDATE SET
                    credits = EXCLUDED.credits,
                    grade = EXCLUDED.grade,
                    hp = EXCLUDED.hp,
                    session = EXCLUDED.session
                """
            ).format(table=sql.Identifier(TABLE_NAME))
            execute_values(cur, upsert_stmt.as_string(conn), rows_normal, page_size=200)

        if rows_wildcard:
            # Wildcard names are allowed to duplicate, so we always insert.
            insert_stmt = sql.SQL(
                """
                INSERT INTO {table} (name, credits, grade, hp, session)
                VALUES %s
                """
            ).format(table=sql.Identifier(TABLE_NAME))
            execute_values(
                cur, insert_stmt.as_string(conn), rows_wildcard, page_size=200
            )

    skipped = len(courses) - len(valid_courses)
    return len(valid_courses), skipped


def main() -> None:
    args = _parse_args()
    load_dotenv()

    if args.db_target:
        os.environ["DB_TARGET"] = args.db_target

    print("Starting course data import to Postgres...")

    with open("classes.json", "r", encoding="utf-8") as f:
        courses_data = json.load(f)

    courses = dedupe_courses(courses_data)

    conn = get_pg_connection()
    try:
        conn.autocommit = False

        apply_schema(conn)
        inserted_or_updated, skipped = upsert_courses(conn, courses)
        conn.commit()

        print(f"Upserted {inserted_or_updated} courses")
        if skipped:
            print(f"Skipped {skipped} invalid courses (missing required fields)")
    except Exception as _:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
