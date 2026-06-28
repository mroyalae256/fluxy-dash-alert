import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, type StatsWindow } from "@/lib/dashboard.functions";
import { NeuCard } from "@/components/neu/NeuCard";
import { NeuToggle } from "@/components/neu/NeuToggle";
import { Activity, AlertTriangle, Siren } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function StatusCards({ onCriticalActive }: { onCriticalActive?: (n: number) => void }) {
  const [win, setWin] = useState<StatsWindow>("24h");
  const fn = useServerFn(getDashboardStats);
  const { data } = useQuery({
    queryKey: ["dashboard-stats-top", win],
    queryFn: () => fn({ data: { window: win } }),
    refetchInterval: 30_000,
  });

  const totals = data?.totals ?? { events: 0, alarms: 0, critical: 0, activeCritical: 0 };
  if (onCriticalActive) onCriticalActive(totals.activeCritical);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Events */}
      <NeuCard>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="neu-inset-sm p-2 text-info"><Activity className="h-4 w-4" /></div>
            <h3 className="font-semibold">Events</h3>
          </div>
          <NeuToggle
            value={win} onChange={setWin}
            options={[{ value: "24h", label: "24h" }, { value: "7d", label: "7d" }]}
          />
        </div>
        <div className="text-5xl font-bold font-display tabular-nums">{totals.events}</div>
        <p className="text-xs text-muted-foreground mt-2">Total raw events logged</p>
      </NeuCard>

      {/* Alarms */}
      <NeuCard>
        <div className="flex items-center gap-2 mb-3">
          <div className="neu-inset-sm p-2" style={{ color: "var(--warn)" }}><AlertTriangle className="h-4 w-4" /></div>
          <h3 className="font-semibold">Alarms</h3>
        </div>
        <div className="text-5xl font-bold font-display tabular-nums" style={{ color: "var(--warn)" }}>
          {totals.alarms}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Non-critical alarms in window</p>
      </NeuCard>

      {/* Critical */}
      <NeuCard className={cn(totals.activeCritical > 0 && "pulse-critical")}>
        <div className="flex items-center gap-2 mb-3">
          <div className="neu-inset-sm p-2 text-critical">
            <Siren className={cn("h-4 w-4", totals.activeCritical > 0 && "animate-pulse")} />
          </div>
          <h3 className="font-semibold">Critical Alarms</h3>
        </div>
        <div className="text-5xl font-bold font-display tabular-nums text-critical">{totals.critical}</div>
        <p className="text-xs text-muted-foreground mt-2">
          {totals.activeCritical} unresolved · email sent to 5 operators
        </p>
      </NeuCard>
    </div>
  );
}
