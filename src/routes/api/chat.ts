import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Bad request", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Build context from DB
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
        const [{ count: events24 }, { count: alarms24 }, { count: critical24 }, { data: lastCritical }, { data: lastEvents }] =
          await Promise.all([
            supabase.from("events").select("*", { count: "exact", head: true }).gte("created_at", since24h),
            supabase.from("alarms").select("*", { count: "exact", head: true }).eq("is_critical", false).gte("created_at", since24h),
            supabase.from("alarms").select("*", { count: "exact", head: true }).eq("is_critical", true).gte("created_at", since24h),
            supabase.from("alarms").select("source,message,severity,created_at,acknowledged,resolved_at").eq("is_critical", true).order("created_at", { ascending: false }).limit(5),
            supabase.from("events").select("source,type,severity,message,created_at").order("created_at", { ascending: false }).limit(10),
          ]);

        const context = `You are the UETCL grid monitoring assistant. You have read-only access to the system. Be concise.

Last 24h summary:
- Events: ${events24 ?? 0}
- Alarms: ${alarms24 ?? 0}
- Critical alarms: ${critical24 ?? 0}

Recent critical alarms (most recent first):
${(lastCritical ?? []).map(a => `- [${a.created_at}] ${a.source}: ${a.message} (ack:${a.acknowledged} resolved:${a.resolved_at ? "yes" : "no"})`).join("\n") || "- none"}

Recent events (most recent first):
${(lastEvents ?? []).map(e => `- [${e.created_at}] ${e.source} (${e.severity}): ${e.message}`).join("\n") || "- none"}`;

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-2.5-flash"),
          system: context,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse();
      },
    },
  },
});
