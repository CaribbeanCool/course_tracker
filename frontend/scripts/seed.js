import pg from "pg";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

function safeSummaryFromConnectionString(connectionString) {
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

function resolveDatabaseUrlSource(target) {
  if (target === "prod") {
    if (process.env.DATABASE_URL_PROD) return "DATABASE_URL_PROD";
    if (process.env.DATABASE_URL) return "DATABASE_URL";
    return undefined;
  }
  if (process.env.DATABASE_URL_DEV) return "DATABASE_URL_DEV";
  return undefined;
}

function getDbTarget() {
  const raw = (process.env.DB_TARGET || "").trim().toLowerCase();
  if (raw === "prod" || raw === "production") return "prod";
  if (raw === "dev" || raw === "development") return "dev";
  return process.env.NODE_ENV === "production" ? "prod" : "dev";
}

function resolveDatabaseUrl(target) {
  if (target === "prod") {
    return process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  }
  return process.env.DATABASE_URL_DEV;
}

function normalizePgConnectionString(connectionString) {
  // Keep current pg-connection-string behavior explicit.
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

function resolveParam(keyBase, target) {
  const suffixed = `${keyBase}_${target.toUpperCase()}`;
  return process.env[suffixed] || process.env[keyBase];
}

async function seed() {
  const dbTarget = getDbTarget();
  const databaseUrlSource = resolveDatabaseUrlSource(dbTarget);
  const databaseUrlRaw = resolveDatabaseUrl(dbTarget);
  const databaseUrl = databaseUrlRaw
    ? normalizePgConnectionString(databaseUrlRaw)
    : undefined;

  if (databaseUrl) {
    console.info(
      `[db] target=${dbTarget} via=${databaseUrlSource ?? "connectionString"} ${safeSummaryFromConnectionString(databaseUrl)}`,
    );
  } else {
    const host = resolveParam("DB_HOST", dbTarget) || "localhost";
    const port = resolveParam("DB_PORT", dbTarget) || "5432";
    const user = resolveParam("DB_USER", dbTarget) || "postgres";
    const database = resolveParam("DB_NAME", dbTarget) || "courses";
    console.info(
      `[db] target=${dbTarget} via=params host=${host}:${port} db=${database} user=${user}`,
    );
  }

  const client = databaseUrl
    ? new Client({
        connectionString: databaseUrl,
      })
    : new Client({
        host: resolveParam("DB_HOST", dbTarget) || "localhost",
        port: parseInt(resolveParam("DB_PORT", dbTarget) || "5432"),
        user: resolveParam("DB_USER", dbTarget) || "postgres",
        password: resolveParam("DB_PASSWORD", dbTarget) || "postgres",
        database: resolveParam("DB_NAME", dbTarget) || "courses",
      });

  try {
    await client.connect();
    console.log("Connected to database");

    // Read seed data
    const seedDataPath = join(__dirname, "seed-data.json");
    const seedData = JSON.parse(readFileSync(seedDataPath, "utf-8"));

    // Clear existing data
    await client.query("DELETE FROM courses");
    console.log("Cleared existing courses");

    // Insert courses
    for (const course of seedData) {
      await client.query(
        `INSERT INTO courses (name, credits, grade, hp, session) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          course.name,
          course.credits,
          course.grade || "",
          course.hp,
          course.session,
        ],
      );
    }

    console.log(`Inserted ${seedData.length} courses`);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

seed();
