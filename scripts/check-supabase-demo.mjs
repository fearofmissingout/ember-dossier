import { existsSync, readFileSync } from "node:fs";

loadEnvFile(".env.local");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !publishableKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  process.exit(1);
}

const endpoint = new URL("/rest/v1/demo_snapshots", supabaseUrl);
endpoint.searchParams.set("select", "room_slug,updated_at");
endpoint.searchParams.set("room_slug", "eq.ember-demo");
endpoint.searchParams.set("limit", "1");

const response = await fetch(endpoint, {
  headers: {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`
  }
});

const body = await response.text();

if (!response.ok) {
  console.error(`Supabase demo table check failed with HTTP ${response.status}.`);
  console.error(body);

  if (body.includes("PGRST205") || body.includes("demo_snapshots")) {
    console.error("Run the SQL from `npm run --silent supabase:sql` in Supabase SQL Editor, then retry.");
  }

  process.exit(1);
}

const rows = JSON.parse(body);

if (rows.length === 0) {
  console.log("Supabase demo_snapshots table is reachable. No ember-demo row yet; the app will create it on first load.");
} else {
  console.log(`Supabase demo_snapshots table is reachable. ember-demo updated_at=${rows[0].updated_at}`);
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
