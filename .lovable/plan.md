
## Goal

Create a single documentation file, `LOCAL_SETUP.md`, at the project root that walks you through exporting this Lovable project and running it locally on your PC via VS Code. No code or config changes — documentation only.

## What the guide will cover

1. **Prerequisites (install first)**
   - Git — https://git-scm.com
   - Node.js LTS (v20+) — https://nodejs.org
   - Bun (this project uses `bun` + `bunfig.toml`) — https://bun.sh
   - VS Code — https://code.visualstudio.com
   - Recommended VS Code extensions: ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript Nightly

2. **Get the code**
   - Option A: Export via GitHub from Lovable (Share → Export to GitHub), then `git clone <repo>`
   - Option B: Download ZIP from Lovable and extract
   - Open the folder in VS Code (`code .`)

3. **Install dependencies**
   - `bun install` (preferred; respects `bunfig.toml` supply-chain guard)
   - Fallback: `npm install`

4. **Environment variables (`.env`)**
   - The exported project already includes `.env` with the Lovable Cloud (Supabase) publishable keys — safe to keep as-is for local dev
   - Variables explained:
     - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — used by the browser
     - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` — used by server functions
   - Optional server-only secrets you may want to add locally:
     - `SUPABASE_SERVICE_ROLE_KEY` — required only if you run admin server functions locally (fetch from your Supabase dashboard if self-hosting; not available on Lovable Cloud)
     - `LOVABLE_API_KEY` — required for the AI chatbot (`/api/chat`)
     - `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` — required if you want real email delivery for critical alarms
   - How to create `.env.local` for overrides without touching the committed `.env`

5. **Run the dev server**
   - `bun run dev` (or `npm run dev`)
   - Opens on `http://localhost:8080`
   - Hot reload notes; how to stop the server

6. **Build & preview production**
   - `bun run build`
   - `bun run start` (or the project's preview script) to serve the built app
   - Explanation that the backend targets a Cloudflare Worker via Nitro — locally it runs via Vite's Node adapter

7. **Database**
   - The app talks to the hosted Lovable Cloud Supabase instance by default (no local DB needed)
   - If you want a fully local backend: install Docker + Supabase CLI, run `supabase start`, apply migrations from `supabase/migrations/`, then point the `.env` at `http://localhost:54321`
   - Where migrations live and how to add new ones

8. **Common commands cheatsheet**
   - `bun install`, `bun run dev`, `bun run build`, `bun run lint`, `bun run typecheck` (whichever scripts exist in `package.json`)

9. **Troubleshooting**
   - Port 8080 in use → kill process or change port
   - `Missing Supabase environment variable(s)` → check `.env`
   - `Unauthorized` from server functions → you're not signed in; the auth middleware requires a session
   - Chatbot returns 401/empty → `LOVABLE_API_KEY` missing
   - Critical-alarm emails not sending → Mailgun env vars missing (stub logs still write to `notification_log`)
   - Bun install blocked by 24h supply-chain guard → documented `bunfig.toml` behavior
   - Node version too old → upgrade to v20+

10. **VS Code tips**
    - Recommended `settings.json` snippets (format on save, ESLint auto-fix)
    - Debugging with the JavaScript Debug Terminal
    - Using the integrated terminal to run `bun` commands

11. **Project structure quick map**
    - Short table pointing to `src/routes/`, `src/components/`, `src/lib/*.functions.ts`, `src/integrations/supabase/`, `supabase/migrations/`

## Deliverable

One new file: `LOCAL_SETUP.md` at the repo root. Nothing else changes.
