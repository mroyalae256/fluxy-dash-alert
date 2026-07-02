
## Goal

Rewrite `LOCAL_SETUP.md` as a **self-hosting guide** that walks you through:
1. Running the exported project locally in VS Code
2. Removing every Lovable-branded UI element
3. Replacing Lovable Cloud + Supabase with **your own PostgreSQL database**
4. Turning off the features that depend on Lovable services (AI chatbot, Realtime, hosted auth)

**Documentation only** — no code changes in this task. The guide lists exactly which files to edit / delete, what to paste in their place, and how to verify each step. You (or I in a follow-up task) execute the edits.

## Chosen defaults (since you skipped the questions)

- **Database:** self-hosted PostgreSQL — closest match, existing SQL migrations work almost as-is
- **Backend:** keep TanStack Start server functions — smallest change vs. rewriting as FastAPI
- **Auth:** dropped (open dashboard on your LAN)
- **Realtime:** replaced with a 5-second poll on the critical alarms query
- **AI chatbot:** disabled (removed from UI). Optional appendix shows how to plug in your own OpenAI key
- **Emails:** already uses Mailgun env vars — no change

If any of these defaults are wrong, tell me and I'll revise.

## Guide outline (sections in `LOCAL_SETUP.md`)

### Part A — Run locally in VS Code
1. Prerequisites: Git, Node 20+, Bun, VS Code, Docker (for local Postgres), recommended extensions
2. Get the code (GitHub export or ZIP), open in VS Code
3. `bun install` (fallback `npm install`), notes on `bunfig.toml` 24h guard
4. First-run smoke test on the hosted Cloud backend to confirm the app boots
5. Dev / build / preview commands cheatsheet

### Part B — Stand up your own PostgreSQL
1. Install Postgres (Docker one-liner + native install links for Windows/macOS/Linux)
2. Create database + user; connection-string format
3. Apply the existing SQL migrations from `supabase/migrations/` using `psql` (they are plain Postgres SQL). Notes on skipping Supabase-only bits: RLS policies referencing `auth.uid()`, `GRANT ... TO authenticated`, extensions like `pgjwt`
4. Seed data — same folder, same command
5. Verify with `psql` sample query

### Part C — Rip out Supabase from the code
File-by-file list of edits:
- **Delete** `src/integrations/supabase/` (client, client.server, auth-middleware, auth-attacher, types)
- **Delete** `supabase/config.toml` (keep `supabase/migrations/` as your SQL source of truth, rename folder to `db/migrations/` if preferred)
- **Add** `src/lib/db.server.ts` — a thin `pg`-based Postgres client reading `DATABASE_URL`
- **Rewrite** `src/lib/dashboard.functions.ts` — swap every `supabase.from(...)` for `db.query(...)` with parameterized SQL. Guide includes before/after snippets for each function (`getDashboardStats`, `getComparisonStats`, `getRecentActivity`, `getActiveCriticalAlarms`, `acknowledgeAlarm`, `dismissAlarm`, `notifyCritical`)
- **Delete** `src/components/dashboard/CriticalAlarmListener.tsx`'s realtime channel; replace with `useQuery({ refetchInterval: 5000 })` in `CriticalAlarmsPanel.tsx` (diff shown)
- **Edit** `src/start.ts` — drop `attachSupabaseAuth` from `functionMiddleware`
- **Edit** `src/routes/__root.tsx` — no changes needed if you skip auth
- **Delete** `.env` Supabase keys; add `DATABASE_URL=postgres://user:pass@localhost:5432/uetcl`

### Part D — Remove Lovable branding & telemetry
1. **Edit `vite.config.ts`** — replace `@lovable.dev/vite-tanstack-config` with a vanilla TanStack Start config (full replacement snippet included: `@tanstack/react-start/plugin/vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-tsconfig-paths`). Removes: componentTagger, sandbox detection, error-logger plugins, HMR bridge
2. **Delete** `src/lib/lovable-error-reporting.ts` and its import in `src/routes/__root.tsx` (the `reportLovableError` call in the root ErrorComponent)
3. **Edit `package.json`** — remove: `@lovable.dev/vite-tanstack-config`, `@lovable.dev/mcp-js`, `@lovable.dev/vite-plugin-dev-server-bridge`, `@lovable.dev/vite-plugin-hmr-gate`, `nitro` (if you're not deploying to Cloudflare Workers)
4. **Delete** `bunfig.toml` `minimumReleaseAgeExcludes` entries for `@lovable.dev/*` (or delete the whole guard)
5. **Delete** `.lovable/` folder and `AGENTS.md`
6. **Edit `src/routes/__root.tsx`** `head()` — change `title` and `description` from any "Lovable" defaults to your app name
7. **Search-and-replace** any remaining "Lovable" mentions in JSX/text (grep pattern provided)
8. **Optional:** remove the Lovable badge — none present in current code, but guide mentions where it would live if re-added

### Part E — Disable the AI chatbot
1. **Delete** `src/components/chatbot/FloatingChatbot.tsx`
2. **Delete** `src/routes/api/chat.ts`
3. **Delete** `src/lib/ai-gateway.server.ts`
4. **Edit** `src/routes/index.tsx` — remove the `<FloatingChatbot />` import and render
5. **Remove** `@ai-sdk/openai-compatible`, `@ai-sdk/react`, `ai` from `package.json`
6. **Appendix:** how to reintroduce it with your own OpenAI key (env var, minimal server-fn shape)

### Part F — Run it
1. Start Postgres, apply migrations, seed
2. `bun run dev` → http://localhost:8080
3. Trigger a test critical alarm via a `psql` INSERT snippet → verify sound + Mailgun email (if configured) + Ack/Dismiss round-trip

### Part G — Troubleshooting
- Port conflicts, `DATABASE_URL` malformed, migration errors on `auth.uid()` references, Mailgun 401, alarm sound blocked by autoplay policy, TypeScript errors after deleting `supabase/types.ts` (regenerate types with `pg-to-ts` or hand-type)

### Part H — Deploy (brief)
Options once Lovable is out: Docker + Node on any VPS, Vercel, Railway, or Fly.io. One paragraph each, no full walkthrough.

## Deliverable

One file overwritten: `LOCAL_SETUP.md` at the repo root. No other files change in this task — the guide tells you exactly what to change next. Approve and I'll write it.
