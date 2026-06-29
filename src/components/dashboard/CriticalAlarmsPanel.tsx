import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveCriticalAlarms, acknowledgeAlarm, dismissAlarm } from "@/lib/dashboard.functions";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuButton } from "@/components/neu/NeuButton";
import { Siren, Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function CriticalAlarmsPanel() {
  const fn = useServerFn(getActiveCriticalAlarms);
  const ack = useServerFn(acknowledgeAlarm);
  const dismiss = useServerFn(dismissAlarm);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["active-critical"],
    queryFn: () => fn(),
    refetchInterval: 15_000,
  });

  const items = data ?? [];

  return (
    <NeuCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="neu-inset-sm p-2 text-critical"><Siren className="h-4 w-4" /></div>
          <div>
            <h3 className="text-lg font-semibold">Active critical alarms</h3>
            <p className="text-xs text-muted-foreground">Acknowledge or dismiss to silence</p>
          </div>
        </div>
        <span className="neu-inset-sm px-2.5 py-1 text-xs text-critical font-semibold">
          {items.length} active
        </span>
      </div>

      {items.length === 0 ? (
        <div className="neu-inset p-6 text-center text-sm text-muted-foreground">
          No active critical alarms. All systems nominal.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => (
            <li key={a.id} className="neu-inset p-3 flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-critical">{a.source}</span>
                  {a.substation && <span className="text-[10px] neu-raised-sm px-1.5 py-0.5">{a.substation}</span>}
                  {a.bay && <span className="text-[10px] text-muted-foreground">{a.bay}</span>}
                  {a.ioa_number != null && <span className="text-[10px] text-muted-foreground">IOA {a.ioa_number}</span>}
                </div>
                <p className="text-xs text-foreground/80 mt-1">{a.description ?? a.message}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                  {a.acknowledged && (
                    <span className="text-info">ack by {a.acknowledged_by ?? "operator"}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <NeuButton
                  onClick={async () => {
                    await ack({ data: { alarmId: a.id } });
                    toast.success("Acknowledged");
                    qc.invalidateQueries({ queryKey: ["active-critical"] });
                  }}
                  disabled={a.acknowledged}
                  className="!px-2.5 !py-1.5 text-xs flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" /> Ack
                </NeuButton>
                <NeuButton
                  onClick={async () => {
                    await dismiss({ data: { alarmId: a.id } });
                    toast.message("Dismissed");
                    qc.invalidateQueries();
                  }}
                  className="!px-2.5 !py-1.5 text-xs flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Dismiss
                </NeuButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </NeuCard>
  );
}
