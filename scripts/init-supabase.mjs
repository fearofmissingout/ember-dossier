import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

loadEnvFile(".env.local");

const dbUrl = normalizeDatabaseUrl(process.env.SUPABASE_DB_URL);

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL. Put it in .env.local or set it in the current shell.");
  process.exit(1);
}

try {
  validateDatabaseUrl(dbUrl);
} catch (error) {
  console.error("Invalid SUPABASE_DB_URL.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

try {
  await client.connect();
  await runSqlFile("supabase/schema.sql");
  await runSqlFile("supabase/seed.sql");
  console.log("Supabase schema and seed completed.");
} catch (error) {
  console.error("Supabase initialization failed.");
  console.error("If the direct database host is IPv6-only, use the Supabase connection pooler URL or run the SQL files in Dashboard > SQL Editor.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}

async function runSqlFile(path) {
  const sql = await readFile(resolve(path), "utf8");
  await client.query(sql);
  console.log(`Applied ${path}`);
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function normalizeDatabaseUrl(value) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("jdbc:postgresql://")) {
    return `postgresql://${trimmed.slice("jdbc:postgresql://".length)}`;
  }

  return trimmed;
}

function validateDatabaseUrl(value) {
  const url = new URL(value);

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Use a PostgreSQL connection string that starts with postgresql:// or postgres://.");
  }

  if (!url.hostname || url.hostname === "base") {
    throw new Error("The database host looks wrong. Use the Supabase pooler or database host, not a placeholder.");
  }

  if (url.password.includes("YOUR-PASSWORD")) {
    throw new Error("Replace [YOUR-PASSWORD] with the real database password before saving the secret.");
  }
}
