import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyCritical } from "@/lib/dashboard.functions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getAlarmSettingsSnapshot } from "@/hooks/use-alarm-settings";

export function CriticalAlarmListener() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notify = useServerFn(notifyCritical);
  const qc = useQueryClient();

  useEffect(() => {
    audioRef.current = new Audio("/sounds/alarm.wav");

    const sendEmail = async (alarmId: string) => {
      try {
        const res = await notify({ data: { alarmId } });
        if (res.status === "sent") toast.success("Email sent to 5 operators");
        else toast.message(`Notification logged (${res.status})`, {
          description: "Configure Mailgun connector to actually deliver email.",
        });
      } catch (e) {
        console.error(e);
        toast.error("Failed to notify operators");
      }
    };

    const channel = supabase
      .channel("critical-alarms")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alarms", filter: "is_critical=eq.true" },
        async (payload) => {
          const alarm = payload.new as { id: string; source: string; message: string };
          toast.error(`CRITICAL: ${alarm.source}`, {
            description: alarm.message,
            duration: 8000,
          });
          const settings = getAlarmSettingsSnapshot();
          const audio = audioRef.current;
          if (settings.soundEnabled && audio) {
            audio.volume = settings.volume;
            const onEnded = () => {
              audio.removeEventListener("ended", onEnded);
              void sendEmail(alarm.id);
            };
            audio.addEventListener("ended", onEnded);
            try {
              await audio.play();
            } catch {
              // autoplay blocked – send email immediately
              audio.removeEventListener("ended", onEnded);
              void sendEmail(alarm.id);
            }
          } else {
            // sound disabled – still notify immediately
            void sendEmail(alarm.id);
          }
          qc.invalidateQueries();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [notify, qc]);

  return null;
}
