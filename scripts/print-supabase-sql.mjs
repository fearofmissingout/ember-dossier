import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const files = ["supabase/schema.sql", "supabase/seed.sql"];
const chunks = [];

for (const file of files) {
  const sql = await readFile(resolve(file), "utf8");
  chunks.push(`-- ${file}\n${sql.trim()}`);
}

process.stdout.write(`${chunks.join("\n\n")}\n`);
