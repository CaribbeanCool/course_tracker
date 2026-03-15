import { Pool } from "pg";

type DbTarget = "dev" | "prod";

function logOnce(
  key: string,
  message: string,
  level: "info" | "warn" = "info",
) {
  const globalWithFlags = globalThis as unknown as Record<string, unknown>;
  const flagKey = `__courseTracker_${key}`;
  if (globalWithFlags[flagKey]) return;
  globalWithFlags[flagKey] = true;

  if (level === "warn") {
    console.warn(message);
    return;
  }
  console.info(message);
}

function safeSummaryFromConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const dbName = url.pathname?.replace(/^\//, "") || "(default)";
    const host = url.hostname || "(unknown-host)";
    const port = url.port ? `:${url.port}` : "";
    const user = url.username ? ` user=${url.username}` : "";
    const sslmode = url.searchParams.get("sslmode");
    const ssl = sslmode ? ` sslmode=${sslmode}` : "";
    return `host=${host}${port} db=${dbName}${user}${ssl}`;
  } catch {
    return "connectionString=(unparseable)";
  }
}

function getDbTarget(): DbTarget {
  const raw = (process.env.DB_TARGET || "").trim().toLowerCase();
  if (raw === "prod" || raw === "production") return "prod";
  if (raw === "dev" || raw === "development") return "dev";

  // Safe defaults:
  // - local `next dev` should use the dev DB
  // - production builds should use the prod DB
  return process.env.NODE_ENV === "production" ? "prod" : "dev";
}

function readEnv(key: string): string | undefined {
  return (process.env as Record<string, string | undefined>)[key];
}

function resolveDatabaseUrl(target: DbTarget): string | undefined {
  if (target === "prod") {
    return readEnv("DATABASE_URL_PROD") || readEnv("DATABASE_URL");
  }
  return readEnv("DATABASE_URL_DEV");
}

function resolveDatabaseUrlSource(target: DbTarget): string | undefined {
  if (target === "prod") {
    if (readEnv("DATABASE_URL_PROD")) return "DATABASE_URL_PROD";
    if (readEnv("DATABASE_URL")) return "DATABASE_URL";
    return undefined;
  }
  if (readEnv("DATABASE_URL_DEV")) return "DATABASE_URL_DEV";
  return undefined;
}

function normalizePgConnectionString(connectionString: string): string {
  // pg-connection-string currently treats sslmode=prefer|require|verify-ca
  // as aliases for verify-full, but warns this will change in a future major.
  // Normalize to sslmode=verify-full to keep the current behavior explicitly.
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get("sslmode");
    const useLibpqCompat = url.searchParams.get("uselibpqcompat");

    if (useLibpqCompat) return connectionString;
    if (
      sslmode === "prefer" ||
      sslmode === "require" ||
      sslmode === "verify-ca"
    ) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }

    return connectionString;
  } catch {
    return connectionString;
  }
}

function resolveParam(keyBase: string, target: DbTarget): string | undefined {
  const suffixed = `${keyBase}_${target.toUpperCase()}`;
  return readEnv(suffixed) || readEnv(keyBase);
}

const dbTarget = getDbTarget();
const databaseUrlSource = resolveDatabaseUrlSource(dbTarget);
const databaseUrlRaw = resolveDatabaseUrl(dbTarget);
const databaseUrl = databaseUrlRaw
  ? normalizePgConnectionString(databaseUrlRaw)
  : undefined;

const paramHost = resolveParam("DB_HOST", dbTarget) || "localhost";
const paramPort = parseInt(resolveParam("DB_PORT", dbTarget) || "5432");
const paramUser = resolveParam("DB_USER", dbTarget) || "postgres";
const paramDatabase = resolveParam("DB_NAME", dbTarget) || "courses";

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
    })
  : new Pool({
      host: paramHost,
      port: paramPort,
      user: paramUser,
      password: resolveParam("DB_PASSWORD", dbTarget) || "postgres",
      database: paramDatabase,
    });

logOnce(
  "dbInfoLogged",
  databaseUrl
    ? `[db] target=${dbTarget} via=${databaseUrlSource ?? "connectionString"} ${safeSummaryFromConnectionString(databaseUrl)}`
    : `[db] target=${dbTarget} via=params host=${paramHost}:${paramPort} db=${paramDatabase} user=${paramUser}`,
);

// Check if we're in demo mode (no real database connection)
let isDemoMode = false;

async function checkConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    isDemoMode = true;
    logOnce(
      "dbDemoModeLogged",
      "[db] Connection failed; running in demo mode",
      "warn",
    );
    return false;
  }
}

// Initialize connection check
checkConnection();

// Mock data for demo mode when database is unavailable
const mockCourses: Course[] = [
  {
    id: 1,
    name: "MATE3031",
    credits: 4,
    grade: "A",
    hp: 16,
    session: "1er 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 2,
    name: "QUIM3131",
    credits: 3,
    grade: "C",
    hp: 6,
    session: "1er 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 3,
    name: "QUIM3133",
    credits: 1,
    grade: "C",
    hp: 2,
    session: "1er 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 4,
    name: "INGL3103",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 5,
    name: "CIIC3015",
    credits: 4,
    grade: "A",
    hp: 16,
    session: "2do 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 6,
    name: "MATE3032",
    credits: 4,
    grade: "A",
    hp: 16,
    session: "2do 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 7,
    name: "QUIM3132",
    credits: 3,
    grade: "D",
    hp: 3,
    session: "2do 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 8,
    name: "QUIM3134",
    credits: 1,
    grade: "C",
    hp: 2,
    session: "2do 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 9,
    name: "INGL3104",
    credits: 3,
    grade: "C",
    hp: 6,
    session: "2do 21",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 10,
    name: "CIIC3075",
    credits: 3,
    grade: "B",
    hp: 9,
    session: "1er 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 11,
    name: "CIIC4010",
    credits: 4,
    grade: "A",
    hp: 16,
    session: "1er 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 12,
    name: "MATE3063",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "Verano",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 13,
    name: "FISI3171",
    credits: 4,
    grade: "C",
    hp: 8,
    session: "2do 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 14,
    name: "FISI3173",
    credits: 1,
    grade: "A",
    hp: 4,
    session: "2do 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 15,
    name: "CIIC4020",
    credits: 4,
    grade: "B",
    hp: 12,
    session: "2do 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 16,
    name: "ESPA3101",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 17,
    name: "CIIC4025",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 18,
    name: "FISI3172",
    credits: 4,
    grade: "A",
    hp: 16,
    session: "1er 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 19,
    name: "FISI3174",
    credits: 1,
    grade: "B",
    hp: 3,
    session: "1er 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 20,
    name: "INEL3105",
    credits: 3,
    grade: "W",
    hp: 0,
    session: "W-2do 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 21,
    name: "ESPA3102",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 22,
    name: "INSO4101",
    credits: 3,
    grade: "B",
    hp: 9,
    session: "1er 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 23,
    name: "CIIC3081",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "2do 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 24,
    name: "MATE4145",
    credits: 4,
    grade: "C",
    hp: 8,
    session: "1er 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 25,
    name: "INEL4115",
    credits: 1,
    grade: "A",
    hp: 4,
    session: "2do 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 26,
    name: "INGL3225",
    credits: 3,
    grade: "PASS",
    hp: 0,
    session: "1er 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 27,
    name: "INGE3011",
    credits: 2,
    grade: null,
    hp: 0,
    session: "Falta",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 28,
    name: "CIIC4082",
    credits: 3,
    grade: "B",
    hp: 9,
    session: "1er 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 29,
    name: "INSO4115",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "2do 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 30,
    name: "ININ4010",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 25",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 31,
    name: "INGL3238",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "2do 22",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 32,
    name: "CIIC4050",
    credits: 4,
    grade: "A",
    hp: 16,
    session: "2do 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 33,
    name: "CIIC4030",
    credits: 3,
    grade: "C",
    hp: 6,
    session: "1er 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 34,
    name: "INSO4116",
    credits: 3,
    grade: "B",
    hp: 9,
    session: "1er 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 35,
    name: "INGE3045",
    credits: 3,
    grade: "C",
    hp: 6,
    session: "2do 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 36,
    name: "CIIC4060",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 25",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 37,
    name: "CIIC4070",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "2do 24",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 38,
    name: "INSO4117",
    credits: 3,
    grade: "B",
    hp: 9,
    session: "2do 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 39,
    name: "ININ4015",
    credits: 3,
    grade: null,
    hp: 0,
    session: "En curso",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 40,
    name: "INSO4151",
    credits: 3,
    grade: null,
    hp: 0,
    session: "En curso",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 41,
    name: "INGE3035",
    credits: 3,
    grade: null,
    hp: 0,
    session: "Falta",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 42,
    name: "INME4045",
    credits: 3,
    grade: "C",
    hp: 6,
    session: "1er 25",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 43,
    name: "INSO4998",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "2do 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 44,
    name: "ECON3021",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "2do 23",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 45,
    name: "EDFI3645",
    credits: 2,
    grade: "A",
    hp: 8,
    session: "1er 25",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 46,
    name: "LIBR3001",
    credits: 3,
    grade: null,
    hp: 0,
    session: "Falta",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 47,
    name: "LIBR3002",
    credits: 3,
    grade: null,
    hp: 0,
    session: "Falta",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 48,
    name: "LIBR3003",
    credits: 3,
    grade: null,
    hp: 0,
    session: "Falta",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 49,
    name: "SOCI3261",
    credits: 3,
    grade: "A",
    hp: 12,
    session: "1er 25",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 50,
    name: "PSIC3001",
    credits: 3,
    grade: null,
    hp: 0,
    session: "En curso",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 51,
    name: "CIPO3011",
    credits: 3,
    grade: null,
    hp: 0,
    session: "En curso",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: 52,
    name: "SOHU3001",
    credits: 3,
    grade: null,
    hp: 0,
    session: "Falta",
    created_at: new Date(),
    updated_at: new Date(),
  },
];

export interface Course {
  id: number;
  name: string;
  credits: number;
  grade: string | null;
  hp: number;
  session: string;
  created_at: Date;
  updated_at: Date;
}

export interface CourseInput {
  name: string;
  credits: number;
  grade?: string | null;
  hp?: number;
  session: string;
}

export async function getAllCourses(): Promise<Course[]> {
  try {
    const result = await pool.query<Course>(
      "SELECT * FROM courses ORDER BY session, name",
    );
    return result.rows;
  } catch {
    // Return mock data if database is unavailable
    return [...mockCourses].sort((a, b) => {
      if (a.session !== b.session) return a.session.localeCompare(b.session);
      return a.name.localeCompare(b.name);
    });
  }
}

export async function getCourseById(id: number): Promise<Course | null> {
  try {
    const result = await pool.query<Course>(
      "SELECT * FROM courses WHERE id = $1",
      [id],
    );
    return result.rows[0] || null;
  } catch {
    // Return from mock data if database is unavailable
    return mockCourses.find((c) => c.id === id) || null;
  }
}

export async function getCoursesBySemester(): Promise<
  Record<string, Course[]>
> {
  const courses = await getAllCourses();
  const grouped: Record<string, Course[]> = {};

  for (const course of courses) {
    if (!grouped[course.session]) {
      grouped[course.session] = [];
    }
    grouped[course.session].push(course);
  }

  return grouped;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  try {
    const result = await pool.query<Course>(
      `INSERT INTO courses (name, credits, grade, hp, session) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        input.name,
        input.credits,
        input.grade || "",
        input.hp || 0,
        input.session,
      ],
    );
    return result.rows[0];
  } catch {
    // Create in mock data if database is unavailable
    const newCourse: Course = {
      id: Math.max(...mockCourses.map((c) => c.id)) + 1,
      name: input.name,
      credits: input.credits,
      grade: input.grade || null,
      hp: input.hp || 0,
      session: input.session,
      created_at: new Date(),
      updated_at: new Date(),
    };
    mockCourses.push(newCourse);
    return newCourse;
  }
}

export async function updateCourse(
  id: number,
  input: Partial<CourseInput>,
): Promise<Course | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.credits !== undefined) {
    fields.push(`credits = $${paramIndex++}`);
    values.push(input.credits);
  }
  if (input.grade !== undefined) {
    fields.push(`grade = $${paramIndex++}`);
    values.push(input.grade || "");
  }
  if (input.hp !== undefined) {
    fields.push(`hp = $${paramIndex++}`);
    values.push(input.hp);
  }
  if (input.session !== undefined) {
    fields.push(`session = $${paramIndex++}`);
    values.push(input.session);
  }

  if (fields.length === 0) {
    return getCourseById(id);
  }

  values.push(id);

  try {
    const result = await pool.query<Course>(
      `UPDATE courses SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  } catch {
    // Update in mock data if database is unavailable
    const index = mockCourses.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const course = mockCourses[index];
    if (input.name !== undefined) course.name = input.name;
    if (input.credits !== undefined) course.credits = input.credits;
    if (input.grade !== undefined) course.grade = input.grade || null;
    if (input.hp !== undefined) course.hp = input.hp;
    if (input.session !== undefined) course.session = input.session;
    course.updated_at = new Date();

    return course;
  }
}

export async function deleteCourse(id: number): Promise<boolean> {
  try {
    const result = await pool.query("DELETE FROM courses WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  } catch {
    // Delete from mock data if database is unavailable
    const index = mockCourses.findIndex((c) => c.id === id);
    if (index === -1) return false;
    mockCourses.splice(index, 1);
    return true;
  }
}

export interface CourseStats {
  totalCredits: number;
  totalHp: number;
  gpa: number;
  completedCourses: number;
  inProgressCourses: number;
  missingCourses: number;
}

export async function getCourseStats(): Promise<CourseStats> {
  const courses = await getAllCourses();

  let totalCredits = 0;
  let totalHp = 0;
  let gradedCredits = 0;
  let completedCourses = 0;
  let inProgressCourses = 0;
  let missingCourses = 0;

  for (const course of courses) {
    if (course.session === "Falta") {
      missingCourses++;
    } else if (course.session === "En curso") {
      inProgressCourses++;
    } else {
      completedCourses++;
      totalCredits += course.credits;
      // Only count graded courses for GPA (not PASS/FAIL or W)
      if (
        course.grade &&
        !["PASS", "W", ""].includes(course.grade) &&
        course.hp > 0
      ) {
        totalHp += course.hp;
        gradedCredits += course.credits;
      }
    }
  }

  const gpa = gradedCredits > 0 ? totalHp / gradedCredits : 0;

  return {
    totalCredits,
    totalHp,
    gpa: Math.round(gpa * 100) / 100,
    completedCourses,
    inProgressCourses,
    missingCourses,
  };
}

export default pool;
