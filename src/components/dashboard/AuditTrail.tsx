import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotificationLog } from "@/lib/dashboard.functions";
import { NeuCard } from "@/components/neu/NeuCard";
import { ScrollText, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  sent: { icon: CheckCircle2, className: "text-info", label: "Sent" },
  stubbed: { icon: Clock, className: "text-muted-foreground", label: "Stubbed" },
  failed: { icon: AlertTriangle, className: "text-critical", label: "Failed" },
};

export function AuditTrail() {
  const fn = useServerFn(getNotificationLog);
  const { data } = useQuery({
    queryKey: ["notification-log"],
    queryFn: () => fn({ data: { limit: 25 } }),
    refetchInterval: 10_000,
  });

  const rows = data ?? [];

  return (
    <NeuCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="neu-inset-sm p-2 text-primary"><ScrollText className="h-4 w-4" /></div>
          <div>
            <h3 className="text-lg font-semibold">Notification audit trail</h3>
            <p className="text-xs text-muted-foreground">Every critical-alarm email dispatched by the system</p>
          </div>
        </div>
        <span className="neu-inset-sm px-2.5 py-1 text-xs font-semibold">{rows.length} recent</span>
      </div>

      {rows.length === 0 ? (
        <div className="neu-inset p-6 text-center text-sm text-muted-foreground">
          No notifications have been sent yet.
        </div>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {rows.map((r) => {
            const st = statusStyles[r.status] ?? statusStyles.stubbed;
            const Icon = st.icon;
            return (
              <li key={r.id} className="neu-inset p-3 flex items-start gap-3">
                <div className={cn("neu-raised-sm p-1.5 shrink-0", st.className)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-semibold uppercase", st.className)}>{st.label}</span>
                    <span className="text-[10px] neu-raised-sm px-1.5 py-0.5">{r.channel}</span>
                    {r.alarm_id ? (
                      <span className="text-[10px] text-muted-foreground truncate">
                        alarm #{r.alarm_id.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">manual test</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/80 mt-1 truncate">
                    To: {r.recipients.join(", ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </NeuCard>
  );
}
