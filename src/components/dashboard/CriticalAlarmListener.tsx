import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getActiveCriticalAlarms, notifyCritical } from "@/lib/dashboard.functions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getAlarmSettingsSnapshot } from "@/hooks/use-alarm-settings";

// Polls every 5s for new critical alarms. Replaces the anon realtime channel
// (which is no longer permitted now that alarms is authenticated-read-only).
export function CriticalAlarmListener() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);
  const fetchActive = useServerFn(getActiveCriticalAlarms);
  const notify = useServerFn(notifyCritical);
  const qc = useQueryClient();

  useEffect(() => {
    audioRef.current = new Audio("/sounds/alarm.wav");
    let cancelled = false;

    const sendEmail = async (alarmId: string) => {
      try {
        const { recipients } = getAlarmSettingsSnapshot();
        const res = await notify({ data: { alarmId, recipients } });
        if (res.status === "sent") toast.success(`Email sent to ${recipients.length} operator(s)`);
        else toast.message(`Notification logged (${res.status})`, {
          description: "Configure Mailgun connector to actually deliver email.",
        });
      } catch (e) {
        console.error(e);
        toast.error("Failed to notify operators");
      }
    };


    const handleNew = async (alarm: { id: string; source: string; message: string }) => {
      toast.error(`CRITICAL: ${alarm.source}`, { description: alarm.message, duration: 8000 });
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
          audio.removeEventListener("ended", onEnded);
          void sendEmail(alarm.id);
        }
      } else {
        void sendEmail(alarm.id);
      }
      qc.invalidateQueries();
    };

    const poll = async () => {
      try {
        const active = await fetchActive();
        if (cancelled) return;
        if (!primedRef.current) {
          active.forEach((a) => seenRef.current.add(a.id));
          primedRef.current = true;
          return;
        }
        for (const a of active) {
          if (!seenRef.current.has(a.id)) {
            seenRef.current.add(a.id);
            void handleNew({ id: a.id, source: a.source, message: a.message });
          }
        }
      } catch (e) {
        console.error("critical poll failed", e);
      }
    };

    void poll();
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [fetchActive, notify, qc]);

  return null;
}
