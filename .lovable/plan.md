
## Scope

Single-page neumorphic monitoring dashboard matching your sketch: three status cards (Events, Alarms, Critical Alarms), two graph cards (bar chart + today-vs-yesterday comparison), and a floating expandable chatbot. Seeded with mock data; critical alarms play a sound and trigger a stub email to 5 recipients.

> Note on stack: This is built in React + TanStack Start with Lovable Cloud (Postgres) — not Flutter/Python/MSSQL, as you confirmed.

## Layout (matches sketch)

```text
┌─────────────────────────────────────────────────┐
│  UETCL Monitoring               [user] [theme] │
├──────────────┬──────────────┬──────────────────┤
│   Events     │   Alarms     │  Critical Alarms │
│   [24h|7d]   │   count      │  count + 🔊      │
├──────────────┴──────────────┼──────────────────┤
│  Bar Graph (refresh 1 min)  │ Today vs Yesterday│
│  Events / Alarms / Critical │ Comparison chart  │
├─────────────────────────────┴──────────────────┤
│  Recent activity feed (sortable: all/ev/al/cr) │
└─────────────────────────────────────────────────┘
                                       [💬 Chat] ← floating
```

## Neumorphism design system

- Background: soft off-white `#e6e9ef` (light) / `#1f2330` (dark)
- Shadows: dual inset/outset (`8px 8px 16px #c8ccd4, -8px -8px 16px #ffffff`)
- Rounded 2xl, no hard borders, soft pressed/raised states for cards & buttons
- Font: Outfit (display) + Inter (body)
- Accent: electric blue `#3b82f6` for primary, amber for alarms, red for critical
- All tokens added to `src/styles.css` as semantic variables (`--neu-bg`, `--neu-shadow-out`, `--neu-shadow-in`, etc.) and mapped via `@theme inline`

## Features

### 1. Events card
- Toggle: **Last 24h** / **Last 7 days** (segmented neumorphic switch)
- Big count + spark line
- Click → opens drawer with sortable raw event list (by time / severity / source)

### 2. Alarms card
- Count of active alarms, severity breakdown chip row

### 3. Critical Alarms card
- Count + pulsing red indicator
- On new critical alarm: play `alarm.mp3`, show toast, call `notify-critical` server function which stubs sending email to 5 placeholder addresses (logged to `notification_log` table — swap to Resend/Lovable Emails later)

### 4. Bar graph card
- Recharts bar chart: Events / Alarms / Critical buckets
- Auto-refresh via `useQuery` with `refetchInterval: 60_000`

### 5. Comparison graph card
- Grouped bars: Today vs Yesterday for each category

### 6. Activity feed
- Unified sortable list with filter chips: All • Events • Alarms • Critical
- Sort by timestamp / severity / source

### 7. Floating chatbot
- FAB bottom-right (neumorphic circle). Expands to panel.
- Streaming chat via Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Server function fetches recent events/alarms summary from DB and injects into system prompt so the bot can answer "what happened today / how many critical alarms / show last 5 events"
- Built with AI Elements (Conversation, Message, PromptInput)

## Data model (Lovable Cloud / Postgres)

```text
events          (id, type, source, severity, message, raw jsonb, created_at)
alarms          (id, source, severity, message, is_critical bool, acknowledged bool, created_at, resolved_at)
notification_log(id, alarm_id, recipients text[], channel, status, sent_at)
```

- RLS: authenticated read; service_role write
- Seed migration inserts ~500 events + ~80 alarms (incl. ~10 critical) across last 7 days using `random()` + `now() - interval`
- A simulator server function (manually triggerable button "Generate test alarm") inserts a new critical alarm to demo the sound + email flow

## Server functions

- `getDashboardStats({ window: '24h' | '7d' })` → counts + bucketed series for bar graph
- `getComparisonStats()` → today vs yesterday buckets
- `getRecentActivity({ filter, sort, limit })` → unified feed
- `notifyCritical({ alarmId })` → writes to `notification_log` with 5 placeholder recipients (stub; real send wired later)
- `chatWithData({ messages })` → streams from Lovable AI with recent-data context

## File structure

```text
src/
  routes/
    __root.tsx
    index.tsx                    # dashboard page
    api/chat.ts                  # streaming chat endpoint
  components/
    dashboard/
      StatusCard.tsx
      EventsCard.tsx
      AlarmsCard.tsx
      CriticalAlarmsCard.tsx
      EventsBarChart.tsx
      ComparisonChart.tsx
      ActivityFeed.tsx
    chatbot/
      FloatingChatbot.tsx
    ui/neu/
      NeuCard.tsx
      NeuButton.tsx
      NeuToggle.tsx
  lib/
    dashboard.functions.ts       # createServerFn endpoints
    notifications.functions.ts
    ai-gateway.server.ts
    alarm-sound.ts               # plays /sounds/alarm.mp3
  styles.css                     # neumorphic tokens
  assets/
    alarm.mp3
supabase/migrations/
  0001_schema.sql                # tables + RLS + grants
  0002_seed.sql                  # mock data
```

## Out of scope (for this iteration)

- Real email sending (stubbed in `notification_log`; wire Lovable Emails when you provide the domain + 5 recipients)
- Authentication (open dashboard; can add later)
- MSSQL / Flutter / Python backend

Approve and I'll build it.
