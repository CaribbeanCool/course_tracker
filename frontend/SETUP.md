# Course Tracker - Setup Guide

## Overview

The Course Tracker is a web application built with Next.js that allows you to:

- View all courses you took organized by semester
- Track your grades, credits, and GPA
- Identify missing courses still needed to complete
- Edit existing course information
- Add new courses to your transcript

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL running locally (Docker recommended)
- Environment variables configured

## Database Setup

### 1. Start PostgreSQL (Docker)

```bash
docker run --name postgres-courses \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=courses \
  -p 5432:5432 \
  -d postgres:latest
```

Adjust `DB_USER`, `DB_PASSWORD`, `DB_NAME` as needed to match your setup.

### 2. Initialize the Database Schema

Run the SQL initialization script:

```bash
psql -h localhost -U postgres -d courses -f scripts/init-db.sql
```

This will create the `courses` table with the proper schema and indexes.

### 3. Seed Initial Data

Seed the database with your course data:

```bash
pnpm run seed
```

This reads `scripts/seed-data.json` and populates your courses.

## Environment Variables

Add these to your `.env.local` file:

```
DB_TARGET=dev
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=courses

# Optional (used when DB_TARGET=prod)
# DATABASE_URL_PROD=postgresql://...?...&sslmode=verify-full
# Or just DATABASE_URL=postgresql://...

# Optional (used when DB_TARGET=dev)
# DATABASE_URL_DEV=postgresql://...
```

Update these values to match your PostgreSQL configuration.

## Running the Application

### Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
pnpm build
pnpm start
```

## Features

### Dashboard View

- **Semester Tabs**: Click tabs to view courses from each semester
- **Statistics Panel**: See total credits, total honor points, and GPA
- **Course List**: View all courses in the selected semester

### Course Management

- **Edit Course**: Click the pencil icon on any course to edit details (grade, credits, honor points, semester)
- **Add Course**: Use the "Add Course" button to add new courses
- **Delete Course**: Remove courses from your transcript (available in edit dialog)

### Statistics

The dashboard calculates:

- **Total Credits**: Sum of all completed course credits
- **Total Honor Points**: Sum of honor points from all graded courses
- **GPA**: Honor points ÷ graded credits (rounded to 2 decimals)
- **Completed Courses**: Courses with a semester (not "Falta" or "En curso")
- **In Progress Courses**: Courses marked as "En curso"
- **Missing Courses**: Courses marked as "Falta"

## Database Schema

The `courses` table contains:

- `id`: Unique identifier (auto-generated)
- `name`: Course code/name (e.g., "MATE3031")
- `credits`: Number of course credits
- `grade`: Letter grade (A, B, C, D, F, PASS, W, or empty)
- `hp`: Honor points (0-16 based on grade and credits)
- `session`: Semester/session identifier (e.g., "1er 22", "2do 21", "Falta", "En curso")
- `created_at`: Timestamp when course was added
- `updated_at`: Timestamp of last modification

## API Endpoints

### GET `/api/courses`

Fetch all courses.

**Response:**

```json
[
  {
    "id": 1,
    "name": "MATE3031",
    "credits": 4,
    "grade": "A",
    "hp": 16,
    "session": "1er 22",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### POST `/api/courses`

Create a new course.

**Request:**

```json
{
  "name": "CIIC4050",
  "credits": 3,
  "grade": "B",
  "hp": 9,
  "session": "1er 24"
}
```

### PUT `/api/courses/[id]`

Update a course.

**Request:**

```json
{
  "grade": "A",
  "hp": 12
}
```

### DELETE `/api/courses/[id]`

Delete a course.

## Troubleshooting

### Database Connection Error

- Verify PostgreSQL is running: `docker ps | grep postgres`
- Check environment variables match your database config
- Test connection: `psql -h localhost -U postgres -d courses`

### Seed Data Not Loading

- Ensure the schema is created first: `psql -h localhost -U postgres -d courses -f scripts/init-db.sql`
- Verify `scripts/seed-data.json` exists
- Check for PostgreSQL permission errors

### Port Already in Use

If port 3000 is in use, run:

```bash
pnpm dev -- -p 3001
```

## Development Notes

- The application uses SWR for client-side data fetching and caching
- Course data is validated on the server side
- Database queries use parameterized statements to prevent SQL injection
- Course names with `****` suffix can have duplicates (for placeholder courses)
