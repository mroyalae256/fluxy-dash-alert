import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyCritical } from "@/lib/dashboard.functions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function CriticalAlarmListener() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notify = useServerFn(notifyCritical);
  const qc = useQueryClient();

  useEffect(() => {
    audioRef.current = new Audio("/sounds/alarm.wav");
    audioRef.current.volume = 0.7;

    const channel = supabase
      .channel("critical-alarms")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alarms", filter: "is_critical=eq.true" },
        async (payload) => {
          const alarm = payload.new as { id: string; source: string; message: string };
          try { await audioRef.current?.play(); } catch { /* autoplay blocked */ }
          toast.error(`CRITICAL: ${alarm.source}`, {
            description: alarm.message,
            duration: 8000,
          });
          try {
            await notify({ data: { alarmId: alarm.id } });
            toast.success("Notified 5 operators by email (stub)");
          } catch (e) {
            console.error(e);
          }
          qc.invalidateQueries();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [notify, qc]);

  return null;
}
