-- Database schema for course tracker

-- Users table for authentication (simple username/password)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    grade TEXT NOT NULL DEFAULT '',
    hp INTEGER NOT NULL DEFAULT 0,
    session TEXT NOT NULL,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Some placeholder course codes end with '****' (e.g. LIBR****, SOHU****).
-- These are allowed to have duplicates. All other course names should be unique.
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS courses_name_unique_non_wildcard ON courses (name)
WHERE
    right(name, 4) <> '****';

-- Keep updated_at current on updates
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;

CREATE TRIGGER trg_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();