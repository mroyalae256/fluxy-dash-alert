import { createServerFn } from "@tanstack/react-start";

async function publicClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type StatsWindow = "24h" | "7d";

export const getDashboardStats = createServerFn({ method: "GET" })
  .inputValidator((input: { window: StatsWindow }) => input)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const hours = data.window === "24h" ? 24 : 24 * 7;
    const since = new Date(Date.now() - hours * 3600_000).toISOString();
    const buckets = data.window === "24h" ? 24 : 7;
    const bucketMs = (hours / buckets) * 3600_000;

    const [{ data: events }, { data: alarms }] = await Promise.all([
      supabase.from("events").select("created_at,severity").gte("created_at", since),
      supabase.from("alarms").select("created_at,is_critical,acknowledged,resolved_at").gte("created_at", since),
    ]);

    const series: { label: string; events: number; alarms: number; critical: number }[] = [];
    const now = Date.now();
    for (let i = buckets - 1; i >= 0; i--) {
      const end = now - i * bucketMs;
      const start = end - bucketMs;
      const label = data.window === "24h"
        ? new Date(end).toLocaleTimeString([], { hour: "2-digit" })
        : new Date(end).toLocaleDateString([], { weekday: "short" });
      const ev = (events ?? []).filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t > start && t <= end;
      }).length;
      const al = (alarms ?? []).filter((a) => {
        const t = new Date(a.created_at).getTime();
        return t > start && t <= end && !a.is_critical;
      }).length;
      const cr = (alarms ?? []).filter((a) => {
        const t = new Date(a.created_at).getTime();
        return t > start && t <= end && a.is_critical;
      }).length;
      series.push({ label, events: ev, alarms: al, critical: cr });
    }

    const totalAlarms = (alarms ?? []).filter((a) => !a.is_critical).length;
    const totalCritical = (alarms ?? []).filter((a) => a.is_critical).length;
    const activeCritical = (alarms ?? []).filter((a) => a.is_critical && !a.resolved_at).length;

    return {
      totals: {
        events: events?.length ?? 0,
        alarms: totalAlarms,
        critical: totalCritical,
        activeCritical,
      },
      series,
    };
  });

export const getComparisonStats = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday.getTime() - 24 * 3600_000);

  const [{ data: events }, { data: alarms }] = await Promise.all([
    supabase.from("events").select("created_at").gte("created_at", startYesterday.toISOString()),
    supabase.from("alarms").select("created_at,is_critical").gte("created_at", startYesterday.toISOString()),
  ]);

  const inRange = (iso: string, from: Date, to: Date) => {
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t < to.getTime();
  };

  return [
    {
      category: "Events",
      yesterday: (events ?? []).filter((e) => inRange(e.created_at, startYesterday, startToday)).length,
      today: (events ?? []).filter((e) => inRange(e.created_at, startToday, now)).length,
    },
    {
      category: "Alarms",
      yesterday: (alarms ?? []).filter((a) => !a.is_critical && inRange(a.created_at, startYesterday, startToday)).length,
      today: (alarms ?? []).filter((a) => !a.is_critical && inRange(a.created_at, startToday, now)).length,
    },
    {
      category: "Critical",
      yesterday: (alarms ?? []).filter((a) => a.is_critical && inRange(a.created_at, startYesterday, startToday)).length,
      today: (alarms ?? []).filter((a) => a.is_critical && inRange(a.created_at, startToday, now)).length,
    },
  ];
});

export type ActivityFilter = "all" | "events" | "alarms" | "critical";
export type ActivitySort = "newest" | "severity";

export const getRecentActivity = createServerFn({ method: "GET" })
  .inputValidator((input: { filter: ActivityFilter; sort: ActivitySort; limit?: number }) => input)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const limit = data.limit ?? 50;
    const items: {
      id: string; kind: "event" | "alarm" | "critical";
      source: string; severity: string; message: string; created_at: string;
    }[] = [];

    if (data.filter === "all" || data.filter === "events") {
      const { data: ev } = await supabase
        .from("events").select("id,source,severity,message,created_at")
        .order("created_at", { ascending: false }).limit(limit);
      (ev ?? []).forEach((e) => items.push({ ...e, kind: "event" }));
    }
    if (data.filter === "all" || data.filter === "alarms" || data.filter === "critical") {
      let q = supabase.from("alarms").select("id,source,severity,message,is_critical,created_at")
        .order("created_at", { ascending: false }).limit(limit);
      if (data.filter === "critical") q = q.eq("is_critical", true);
      if (data.filter === "alarms") q = q.eq("is_critical", false);
      const { data: al } = await q;
      (al ?? []).forEach((a) => items.push({
        id: a.id, source: a.source, severity: a.severity, message: a.message,
        created_at: a.created_at, kind: a.is_critical ? "critical" : "alarm",
      }));
    }

    const sevRank: Record<string, number> = { critical: 4, high: 3, error: 3, medium: 2, warning: 2, low: 1, info: 0 };
    items.sort((a, b) => {
      if (data.sort === "severity") return (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return items.slice(0, limit);
  });

export const simulateCriticalAlarm = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sources = ["Substation-A", "Transformer-T1", "Line-132kV", "Grid-Control"];
  const messages = [
    "CRITICAL: Simulated transformer overload",
    "CRITICAL: Simulated line fault detected",
    "CRITICAL: Simulated bus voltage collapse",
  ];
  const { data, error } = await supabaseAdmin.from("alarms").insert({
    source: sources[Math.floor(Math.random() * sources.length)],
    severity: "critical",
    is_critical: true,
    acknowledged: false,
    message: messages[Math.floor(Math.random() * messages.length)],
  }).select().single();
  if (error) throw error;
  return data;
});

export const notifyCritical = createServerFn({ method: "POST" })
  .inputValidator((input: { alarmId: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const recipients = [
      "operator1@uetcl.example",
      "operator2@uetcl.example",
      "supervisor@uetcl.example",
      "control-room@uetcl.example",
      "oncall@uetcl.example",
    ];

    // Fetch alarm to include in email body
    const { data: alarm } = await supabaseAdmin
      .from("alarms")
      .select("source,message,severity,substation,bay,description,ioa_number,created_at")
      .eq("id", data.alarmId)
      .maybeSingle();

    // Email send via Mailgun (if connector is linked); otherwise stubbed.
    let status: "sent" | "stubbed" | "failed" = "stubbed";
    let providerInfo: { http_status?: number; error?: string } = {};
    const mgKey = process.env.MAILGUN_CONNECTION_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mgDomain = process.env.MAILGUN_DOMAIN;
    if (mgKey && lovableKey && mgDomain && alarm) {
      try {
        const body = new URLSearchParams({
          from: `UETCL Grid Monitor <alerts@${mgDomain}>`,
          to: recipients.join(","),
          subject: `CRITICAL ALARM: ${alarm.source} - ${alarm.message}`,
          text: `A critical alarm has been raised.

Source: ${alarm.source}
Substation: ${alarm.substation ?? "n/a"}
Bay: ${alarm.bay ?? "n/a"}
IOA: ${alarm.ioa_number ?? "n/a"}
Severity: ${alarm.severity}
Time: ${alarm.created_at}

${alarm.description ?? alarm.message}`,
        });
        const res = await fetch(`https://connector-gateway.lovable.dev/mailgun/${mgDomain}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": mgKey,
          },
          body,
        });
        status = res.ok ? "sent" : "failed";
        providerInfo = { http_status: res.status };
      } catch (e) {
        status = "failed";
        providerInfo = { error: String(e) };
      }
    }

    const { data: log, error } = await supabaseAdmin.from("notification_log").insert({
      alarm_id: data.alarmId,
      recipients,
      channel: "email",
      status,
    }).select().single();
    if (error) throw error;
    return { ...log, providerInfo };
  });

export const getActiveCriticalAlarms = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("alarms")
    .select("id,source,message,severity,substation,voltage_kv,bay,ioa_number,description,acknowledged,acknowledged_at,acknowledged_by,resolved_at,created_at")
    .eq("is_critical", true)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
});

export const acknowledgeAlarm = createServerFn({ method: "POST" })
  .inputValidator((input: { alarmId: string; by?: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("alarms")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: data.by ?? "operator",
      })
      .eq("id", data.alarmId)
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const dismissAlarm = createServerFn({ method: "POST" })
  .inputValidator((input: { alarmId: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("alarms")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", data.alarmId)
      .select()
      .single();
    if (error) throw error;
    return row;
  });
