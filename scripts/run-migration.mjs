// One-off script: runs a SQL migration against the remote Supabase project
// via the Management API (uses SUPABASE_ACCESS_TOKEN, no DB password needed).
// Usage: node scripts/run-migration.mjs <migration-file.sql>

import { readFileSync } from "node:fs";

const PROJECT_REF = "hcbckdwkfgtefdhbetyq";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN env var is required");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <migration-file.sql>");
  process.exit(1);
}

const query = readFileSync(file, "utf8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  }
);

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text || "(no output — success)");

if (!res.ok) process.exit(1);