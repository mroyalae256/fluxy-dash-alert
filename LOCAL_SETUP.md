# Local Setup Guide — UETCL Monitoring Dashboard

Run this project on your own PC using VS Code. Follow the sections in order.

---

## 1. Prerequisites

Install these first (all free):

| Tool | Version | Download |
|---|---|---|
| **Git** | latest | https://git-scm.com/downloads |
| **Node.js** | v20 LTS or newer | https://nodejs.org |
| **Bun** | v1.1+ (this project uses `bun` + `bunfig.toml`) | https://bun.sh |
| **VS Code** | latest | https://code.visualstudio.com |

Verify installs in a terminal:

```bash
git --version
node --version   # v20.x.x or higher
bun --version    # 1.x.x
```

**Windows users:** install Bun via PowerShell:
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Recommended VS Code extensions

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`)

---

## 2. Get the code

### Option A — GitHub (recommended)
In Lovable: **GitHub → Connect / Export**. Then locally:
```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
code .
```

### Option B — Download ZIP
From Lovable: **Share → Download ZIP**, extract, then:
```bash
cd path/to/extracted-folder
code .
```

---

## 3. Install dependencies

From the project root:

```bash
bun install
```

Fallback if you can't install Bun:
```bash
npm install
```

> The project ships `bunfig.toml` with a 24-hour supply-chain guard that blocks packages published in the last day. If you add a brand-new package and see an install error, wait a day or add the package name to `minimumReleaseAgeExcludes` in `bunfig.toml`.

---

## 4. Environment variables

The exported project already includes a `.env` file with the Lovable Cloud (Supabase) publishable keys — **leave it as is** for a working local dev setup. Nothing to change to get started.

### What's in `.env`

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Anon/publishable key (safe to expose) |
| `VITE_SUPABASE_PROJECT_ID` | Browser | Project ref |
| `SUPABASE_URL` | Server functions | Same URL, server-side |
| `SUPABASE_PUBLISHABLE_KEY` | Server functions | Same key, server-side |
| `SUPABASE_PROJECT_ID` | Server functions | Project ref |

### Optional secrets (add to `.env.local`)

Create a `.env.local` file (git-ignored) alongside `.env` for local overrides:

```env
# Required only if you want the AI chatbot to answer
LOVABLE_API_KEY=your_lovable_ai_key

# Required only for real email delivery on critical alarms
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=mg.yourdomain.com

# Required only if you self-host Supabase and need admin/service-role access
# NOT available on Lovable Cloud
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Without these, the app still runs — the chatbot returns an auth error and critical-alarm emails are logged to `notification_log` instead of being delivered.

---

## 5. Run the dev server

```bash
bun run dev
```

Open http://localhost:8080 in your browser. Changes hot-reload automatically.

Stop the server with `Ctrl + C`.

---

## 6. Build for production

```bash
bun run build       # production build
bun run preview     # serve the built app locally
```

The backend targets a **Cloudflare Worker** (via Nitro) when deployed. Locally, Vite runs it on Node — you don't need any Cloudflare setup to develop.

---

## 7. Database

By default the app connects to the **hosted Lovable Cloud Supabase** instance defined in `.env`. **No local database is required.**

### If you want a fully local backend

1. Install **Docker Desktop** — https://www.docker.com/products/docker-desktop
2. Install the Supabase CLI — https://supabase.com/docs/guides/local-development/cli/getting-started
3. From the project root:
   ```bash
   supabase start                    # starts local Postgres + Studio
   supabase db reset                 # applies all migrations from supabase/migrations/
   ```
4. Copy the local URL + anon key printed by `supabase start` into `.env.local`:
   ```env
   VITE_SUPABASE_URL=http://localhost:54321
   VITE_SUPABASE_PUBLISHABLE_KEY=<local anon key>
   SUPABASE_URL=http://localhost:54321
   SUPABASE_PUBLISHABLE_KEY=<local anon key>
   ```
5. Open Supabase Studio at http://localhost:54323

Migrations live in `supabase/migrations/`. Add a new one with `supabase migration new <name>`.

---

## 8. Commands cheatsheet

| Command | What it does |
|---|---|
| `bun install` | Install dependencies |
| `bun run dev` | Start dev server on :8080 |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format all files with Prettier |

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `Port 8080 already in use` | Kill the process (`lsof -i :8080` on macOS/Linux, `netstat -ano \| findstr :8080` on Windows) or change the port in `vite.config.ts` |
| `Missing Supabase environment variable(s)` | Ensure `.env` exists and hasn't been deleted; restart the dev server after edits |
| Server functions return **Unauthorized** | You must be signed in — protected routes require a Supabase session |
| Chatbot returns 401 or empty response | `LOVABLE_API_KEY` is missing from `.env.local` |
| Critical alarms don't send email | `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` missing — emails are still logged to `notification_log` table |
| `bun install` blocked with "release age" error | Package too new — wait 24h or add to `minimumReleaseAgeExcludes` in `bunfig.toml` |
| `Unsupported engine` warnings | Upgrade Node.js to v20 LTS or newer |
| Alarm sound doesn't play | Browsers block autoplay — click anywhere on the page first to grant audio permission |
| Blank page / build errors after pulling changes | Run `bun install` again (dependencies may have changed) |

---

## 10. VS Code tips

Recommended workspace `settings.json` (create `.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

- Use **`Ctrl + `` `** (backtick) to open the integrated terminal and run `bun` commands.
- Use the **JavaScript Debug Terminal** (Command Palette → "Debug: JavaScript Debug Terminal") to set breakpoints in server functions.
- Install the recommended extensions above for the best DX.

---

## 11. Project structure

```
src/
├── routes/                         # File-based routing (TanStack Start)
│   ├── __root.tsx                  # Root layout — head metadata, providers
│   ├── index.tsx                   # Dashboard page (/)
│   └── api/chat.ts                 # Chatbot streaming endpoint
├── components/
│   ├── dashboard/                  # Status cards, charts, activity feed
│   ├── chatbot/FloatingChatbot.tsx # Floating AI chat panel
│   ├── neu/                        # Neumorphic UI primitives
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── dashboard.functions.ts      # Server functions (stats, ack, notify)
│   └── ai-gateway.server.ts        # Lovable AI Gateway client
├── hooks/use-alarm-settings.ts     # Sound on/off + volume (localStorage)
├── integrations/supabase/          # Auto-generated — do NOT edit
├── styles.css                      # Neumorphic tokens + Tailwind
└── router.tsx                      # Router setup

supabase/
└── migrations/                     # SQL migrations for schema + seed data
```

**Key entry point:** `src/routes/index.tsx` composes the dashboard you see at `/`.

---

## Need help?

- TanStack Start docs — https://tanstack.com/start
- Supabase docs — https://supabase.com/docs
- Lovable docs — https://docs.lovable.dev

Happy building.
