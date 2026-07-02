# Self-Hosting Guide — UETCL Monitoring Dashboard

Run this project on your own PC with **your own PostgreSQL database**, with **all Lovable branding and Supabase dependencies removed**. Follow the parts in order.

> This guide is documentation only. It tells you exactly which files to edit, what to delete, and what to paste in. Nothing runs until you do the edits yourself.

**Chosen defaults (change if you want something different):**
- Database: self-hosted **PostgreSQL** (existing SQL migrations work almost as-is)
- Backend: keep **TanStack Start server functions** (smallest refactor)
- Auth: **dropped** — open dashboard on your LAN
- Realtime: replaced with **5-second polling**
- AI chatbot: **removed** (optional appendix for OpenAI)
- Email: keep existing **Mailgun** integration

---

## Part A — Run locally in VS Code

### A.1 Prerequisites

| Tool | Version | Download |
|---|---|---|
| Git | latest | https://git-scm.com/downloads |
| Node.js | v20 LTS or newer | https://nodejs.org |
| Bun | v1.1+ | https://bun.sh |
| VS Code | latest | https://code.visualstudio.com |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |

Verify:
```bash
git --version
node --version   # v20+
bun --version
docker --version
```

**Recommended VS Code extensions:** ESLint, Prettier, Tailwind CSS IntelliSense, Pretty TypeScript Errors, PostgreSQL (by Chris Kolkman).

### A.2 Get the code

**Option A — GitHub export from Lovable:**
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
code .
```

**Option B — Download ZIP** from Lovable, extract, `cd` into it, `code .`.

### A.3 Install dependencies
```bash
bun install
# fallback:  npm install
```

### A.4 Optional smoke test on the original backend
Before ripping things out, confirm the app boots:
```bash
bun run dev
```
Open http://localhost:8080. Once you see the dashboard, `Ctrl+C` and continue.

### A.5 Command cheatsheet

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on :8080 |
| `bun run build` | Production build |
| `bun run preview` | Serve production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

---

## Part B — Stand up your own PostgreSQL

### B.1 Install Postgres

**Easiest (Docker):**
```bash
docker run -d --name uetcl-pg \
  -e POSTGRES_USER=uetcl \
  -e POSTGRES_PASSWORD=uetcl_password \
  -e POSTGRES_DB=uetcl \
  -p 5432:5432 \
  -v uetcl-pg-data:/var/lib/postgresql/data \
  postgres:16
```

**Native install:** https://www.postgresql.org/download/

### B.2 Connection string
```
postgres://uetcl:uetcl_password@localhost:5432/uetcl
```

### B.3 Apply the migrations

Migrations in `supabase/migrations/*.sql` are plain Postgres SQL. Apply them with `psql`:

```bash
# from repo root, in order:
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  psql "postgres://uetcl:uetcl_password@localhost:5432/uetcl" -f "$f"
done
```

**Expect (and ignore) errors on Supabase-only statements** — you can strip these lines from each migration before running, or just tolerate the errors:

- `CREATE POLICY ...` — Row Level Security (Supabase-only enforcement path)
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — same
- `GRANT ... TO anon | authenticated | service_role` — Supabase roles that don't exist in vanilla Postgres
- `CREATE EXTENSION IF NOT EXISTS "pgjwt"` — Supabase-only
- References to `auth.users`, `auth.uid()`, `storage.*`

The `CREATE TABLE`, `CREATE INDEX`, and `INSERT` statements (seed data) are what you need.

### B.4 Verify
```bash
psql "postgres://uetcl:uetcl_password@localhost:5432/uetcl" -c "SELECT count(*) FROM events;"
psql "postgres://uetcl:uetcl_password@localhost:5432/uetcl" -c "SELECT count(*) FROM alarms WHERE is_critical;"
```

---

## Part C — Rip Supabase out of the code

### C.1 Delete these files/folders
```
src/integrations/supabase/          ← whole folder (client, client.server, auth-middleware, auth-attacher, types)
supabase/config.toml
.lovable/                           ← whole folder
AGENTS.md
```

**Rename** (optional, cosmetic):
```
supabase/migrations/  →  db/migrations/
```

### C.2 Install the Postgres driver
```bash
bun add pg
bun add -d @types/pg
```

### C.3 Create `src/lib/db.server.ts`
```ts
import { Pool } from "pg";

let _pool: Pool | undefined;

export function db(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _pool = new Pool({ connectionString: url, max: 10 });
  }
  return _pool;
}
```

### C.4 Rewrite `src/lib/dashboard.functions.ts`

Remove every `supabase.from(...)` and every `.middleware([requireSupabaseAuth])`. Replace with `db().query(sql, params)`. Pattern:

**Before:**
```ts
import { supabase } from "@/integrations/supabase/client";
// or:
.middleware([requireSupabaseAuth])
.handler(async ({ context }) => {
  const { data } = await context.supabase.from("events")
    .select("*")
    .gte("created_at", since);
  return data;
})
```

**After:**
```ts
import { db } from "./db.server";

.handler(async () => {
  const { rows } = await db().query(
    "SELECT * FROM events WHERE created_at >= $1",
    [since],
  );
  return rows;
})
```

Apply this to every function in the file:
- `getDashboardStats` — two `SELECT count(*) ... GROUP BY date_trunc(...)` queries
- `getComparisonStats` — same, filtered by day
- `getRecentActivity` — `SELECT ... FROM events UNION ALL SELECT ... FROM alarms ORDER BY created_at DESC LIMIT $1`
- `getActiveCriticalAlarms` — `SELECT * FROM alarms WHERE is_critical AND NOT acknowledged AND resolved_at IS NULL`
- `acknowledgeAlarm` — `UPDATE alarms SET acknowledged=true, acknowledged_at=now(), acknowledged_by=$2 WHERE id=$1`
- `dismissAlarm` — `UPDATE alarms SET resolved_at=now() WHERE id=$1`
- `notifyCritical` — read alarm row, POST to Mailgun (existing logic), `INSERT INTO notification_log (...)`

Remove all `.middleware([requireSupabaseAuth])` calls and any `context.userId` references (auth is dropped). If you need "acknowledged_by", pass the operator name from the client as an argument.

### C.5 Kill Supabase Realtime → 5-second polling

**Delete** `src/components/dashboard/CriticalAlarmListener.tsx` in its current form OR strip the `supabase.channel(...)` block. The remaining piece (audio + email) is still useful — trigger it from a `useEffect` that watches `getActiveCriticalAlarms` results:

In `src/components/dashboard/CriticalAlarmsPanel.tsx`, change the query to poll:
```ts
const { data: alarms = [] } = useQuery({
  queryKey: ["active-critical-alarms"],
  queryFn: () => getActiveCriticalAlarms(),
  refetchInterval: 5000,
});
```
Then track "which IDs have we already alarmed on" in a `useRef<Set<string>>` and fire the sound + `notifyCritical` for any new id.

### C.6 Strip auth wiring

**Edit `src/start.ts`** — remove the Supabase attacher:
```ts
import { createStart, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try { return await next(); }
  catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) throw error;
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
```

### C.7 Update `.env`

Delete the six `VITE_SUPABASE_*` / `SUPABASE_*` lines. Replace with:
```env
DATABASE_URL=postgres://uetcl:uetcl_password@localhost:5432/uetcl

# Optional — only if you want real emails on critical alarms
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
```

---

## Part D — Remove Lovable branding & telemetry

### D.1 Replace `vite.config.ts`
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  server: { port: 8080, host: true },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    react(),
  ],
});
```

Install what the vanilla config needs (all already present as transitive deps, but declare them):
```bash
bun add -d vite @vitejs/plugin-react vite-tsconfig-paths
```

### D.2 Delete Lovable error reporting
```
src/lib/lovable-error-reporting.ts
```
Then in `src/routes/__root.tsx`, remove:
```ts
import { reportLovableError } from "../lib/lovable-error-reporting";
```
and the `useEffect(() => { reportLovableError(error, ...) }, [error])` call inside `ErrorComponent`.

### D.3 Prune `package.json`

Remove these dependencies (dev and runtime):
```
@lovable.dev/vite-tanstack-config
@lovable.dev/mcp-js                       (if present in lockfile)
@lovable.dev/vite-plugin-dev-server-bridge (if present in lockfile)
@lovable.dev/vite-plugin-hmr-gate         (if present in lockfile)
nitro                                     (only if you don't deploy to Cloudflare Workers)
```
Then:
```bash
rm bun.lockb   # or bun.lock
bun install
```

### D.4 Simplify `bunfig.toml`
Either delete the file entirely, or shorten to:
```toml
[install]
# optional 24h supply-chain guard
minimumReleaseAge = 0
```

### D.5 Update page metadata in `src/routes/__root.tsx`
Change:
```ts
{ title: "Lovable App" },
{ name: "description", content: "Lovable Generated Project" },
{ name: "author", content: "Lovable" },
{ property: "og:title", content: "Lovable App" },
{ property: "og:description", content: "Lovable Generated Project" },
{ name: "twitter:site", content: "@Lovable" },
```
To your own copy, e.g.:
```ts
{ title: "UETCL Monitoring Dashboard" },
{ name: "description", content: "Substation events, alarms, and critical-alarm monitoring." },
{ name: "author", content: "UETCL" },
{ property: "og:title", content: "UETCL Monitoring Dashboard" },
{ property: "og:description", content: "Substation events, alarms, and critical-alarm monitoring." },
```

### D.6 Sweep the codebase for any remaining "Lovable"
```bash
# from repo root
grep -rni "lovable" --exclude-dir=node_modules --exclude-dir=.git .
```
Address each hit (comments, doc strings, remaining imports). The above steps cover the important ones.

---

## Part E — Remove the AI chatbot

### E.1 Delete files
```
src/components/chatbot/FloatingChatbot.tsx
src/routes/api/chat.ts
src/lib/ai-gateway.server.ts
```

### E.2 Edit `src/routes/index.tsx`
Remove:
```ts
import { FloatingChatbot } from "@/components/chatbot/FloatingChatbot";
```
And the `<FloatingChatbot />` render at the bottom of the JSX.

### E.3 Prune AI packages from `package.json`
```
@ai-sdk/openai-compatible
@ai-sdk/react
ai
```
Then `rm bun.lockb && bun install`.

### E.4 (Optional) Reintroduce with your own OpenAI key
See Appendix 1 at the bottom.

---

## Part F — Run it

```bash
# 1. Postgres is running (Docker container from B.1)
docker start uetcl-pg

# 2. Dev server
bun run dev
```
Open http://localhost:8080. You should see the dashboard populated from **your** Postgres database.

### Trigger a test critical alarm
```bash
psql "postgres://uetcl:uetcl_password@localhost:5432/uetcl" <<'SQL'
INSERT INTO alarms (source, severity, message, is_critical, substation, voltage_kv, bay)
VALUES ('TEST-SIM', 'critical', 'Simulated SF6 Lock event', true, 'Kawanda', 132, 'Bay-3');
SQL
```
Within 5 seconds you should hear the alarm sound and see the panel update. If `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` are set, an email fires after the sound ends.

---

## Part G — Troubleshooting

| Symptom | Fix |
|---|---|
| `Port 8080 already in use` | Kill the process, or set `server.port` in `vite.config.ts` |
| `DATABASE_URL is not set` | Add it to `.env`, restart `bun run dev` |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres isn't running — `docker start uetcl-pg` |
| psql errors like `role "authenticated" does not exist` | Expected — Supabase-only GRANT; ignore or strip from migration |
| psql errors on `CREATE POLICY` | Expected — you're not using RLS; ignore |
| TypeScript errors after deleting `supabase/types.ts` | Any imports of `Database` type must be removed; hand-type return rows from `db().query`, or generate types with `pg-to-ts` / `kysely-codegen` |
| Critical-alarm emails not sending | `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` missing — check `notification_log` table for logged attempts |
| Alarm sound doesn't play | Browsers block autoplay before first user interaction — click anywhere on the page once |
| `bun install` fails after removing Lovable packages | Delete `bun.lockb` and `node_modules/`, re-run `bun install` |
| Blank page + 500 in console | Check terminal running `bun run dev` for the server error stack |

---

## Part H — Deploy (short pointers)

Once Lovable is out you can host anywhere Node runs:

- **Docker + any VPS** — `bun run build`, then `node .output/server/index.mjs` (path may differ; check `.output/`).
- **Vercel** — install `@tanstack/react-start/plugin/vite` Vercel preset, push repo, add `DATABASE_URL` in Vercel env.
- **Railway / Fly.io / Render** — provision managed Postgres, point `DATABASE_URL` at it, deploy the Node build.
- **Behind Nginx on your own server** — reverse-proxy `localhost:8080` on the same box that runs Postgres.

---

## Appendix 1 — Optional: AI chatbot with your own OpenAI key

If you want the chatbot back after removing it:

1. `bun add openai`
2. Add `OPENAI_API_KEY=sk-...` to `.env`.
3. Create `src/routes/api/chat.ts`:
   ```ts
   import { createFileRoute } from "@tanstack/react-router";
   import OpenAI from "openai";

   export const Route = createFileRoute("/api/chat")({
     server: { handlers: { POST: async ({ request }) => {
       const { messages } = await request.json();
       const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
       const completion = await openai.chat.completions.create({
         model: "gpt-4o-mini",
         messages,
       });
       return Response.json({ reply: completion.choices[0].message });
     } } },
   });
   ```
4. Recreate a minimal chat UI component that POSTs to `/api/chat`.

---

## Appendix 2 — File change checklist

Copy this into an issue tracker and tick off as you go:

- [ ] Postgres up (Docker), `DATABASE_URL` reachable
- [ ] Migrations applied, seed data present
- [ ] `bun add pg @types/pg` done
- [ ] `src/lib/db.server.ts` created
- [ ] `src/lib/dashboard.functions.ts` rewritten (no `supabase.from`, no `requireSupabaseAuth`)
- [ ] `src/components/dashboard/CriticalAlarmsPanel.tsx` polling every 5s
- [ ] `CriticalAlarmListener.tsx` cleaned or deleted
- [ ] `src/start.ts` no longer imports `attachSupabaseAuth`
- [ ] `src/integrations/supabase/` deleted
- [ ] `supabase/config.toml`, `.lovable/`, `AGENTS.md` deleted
- [ ] `vite.config.ts` swapped to vanilla config
- [ ] `src/lib/lovable-error-reporting.ts` deleted; `__root.tsx` cleaned
- [ ] `package.json` no `@lovable.dev/*`, no `ai`/`@ai-sdk/*`
- [ ] `bunfig.toml` trimmed or deleted
- [ ] `__root.tsx` metadata rebranded
- [ ] `grep -rni lovable .` returns nothing meaningful
- [ ] `bun run dev` boots on your DB, dashboard renders, test alarm works

Done.
