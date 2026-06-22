import pg from "pg";

const { Pool } = pg;

let pool = null;

function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function shouldUseSsl(databaseUrl) {
  return !/localhost|127\.0\.0\.1|sslmode=disable/i.test(databaseUrl);
}

export function isDatabaseConfigured() {
  return Boolean(sanitize(process.env.DATABASE_URL));
}

export function getDatabasePool() {
  const databaseUrl = sanitize(process.env.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error("La base Neon/Postgres n'est pas configurée.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
      max: 3,
    });
  }

  return pool;
}

export async function queryDatabase(text, params = []) {
  const databasePool = getDatabasePool();
  return databasePool.query(text, params);
}

export async function checkDatabaseAccess() {
  await queryDatabase("SELECT 1");
  return true;
}
