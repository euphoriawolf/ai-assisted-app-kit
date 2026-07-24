// Drizzle generates migrations into packages/db/src/migrations, but wrangler applies them from
// packages/api/migrations. Without this sync, prod deploys against a stale schema. Run after
// `db:generate` (the root `db:generate` script chains it). See CLAUDE.md gotchas.
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "packages/db/src/migrations");
const to = join(root, "packages/api/migrations");

await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log(`synced migrations: ${from} -> ${to}`);
