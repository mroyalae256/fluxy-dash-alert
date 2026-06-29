import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatFilter = "24h" | "7d" | "critical";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, filter = "24h" } = (await request.json()) as {
          messages: UIMessage[];
          filter?: ChatFilter;
        };
        if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const hours = filter === "7d" ? 24 * 7 : 24;
        const since = new Date(Date.now() - hours * 3600_000).toISOString();
        const eventsQ = supabase
          .from("events")
          .select("id,source,severity,message,substation,bay,ioa_number,created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(filter === "critical" ? 0 : 25);
        const alarmsQ = supabase
          .from("alarms")
          .select("id,source,severity,message,substation,bay,ioa_number,is_critical,acknowledged,resolved_at,created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(filter === "critical" ? 40 : 25);

        const [{ data: events }, { data: alarms }] = await Promise.all([eventsQ, alarmsQ]);
        const filteredAlarms = filter === "critical"
          ? (alarms ?? []).filter((a) => a.is_critical)
          : (alarms ?? []);

        const fmt = (rows: { id: string; source: string; severity: string; message: string; created_at: string; substation?: string | null; bay?: string | null; ioa_number?: number | null }[], kind: string) =>
          rows.slice(0, 20).map((r, i) =>
            `[${kind.toUpperCase()}#${i + 1} id=${r.id.slice(0, 8)}] ${r.created_at} ${r.substation ?? "-"}/${r.bay ?? "-"} IOA=${r.ioa_number ?? "-"} (${r.severity}) ${r.source}: ${r.message}`,
          ).join("\n");

        const ctx = `You are the UETCL grid monitoring assistant. Be concise and factual.
Active scope: ${filter === "7d" ? "Last 7 days" : filter === "critical" ? "Critical alarms (last 24h)" : "Last 24 hours"}.

EVENTS:
${(events ?? []).length ? fmt(events ?? [], "event") : "- none"}

ALARMS:
${filteredAlarms.length ? fmt(filteredAlarms as any[], filter === "critical" ? "critical" : "alarm") : "- none"}

CITATION RULES:
- When you reference a record, cite it inline with its bracket tag exactly as shown above, e.g. [ALARM#3 id=ab12cd34].
- End every answer with a "Sources:" line listing the tags you used. If you used no records, write "Sources: none".`;

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-2.5-flash"),
          system: ctx,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse();
      },
    },
  },
});
